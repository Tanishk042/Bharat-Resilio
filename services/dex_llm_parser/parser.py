"""
DeX-LLM Citizen Text Parser

Deterministic-as-possible structured extraction from free-text reports.

Uses a local small instruct model (Ollama) with:
- Tightly constrained system prompt
- JSON-schema-validated output (pydantic)
- Sensitive information redaction filter (regex + NER-based)
- Retry logic for robustness

PRODUCTION_TODO: Consider using a larger fine-tuned model for production.
The prototype uses a small 3B-class model for demonstration.
"""

import re
import json
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, validator
from enum import Enum
import httpx
import time


class HazardType(Enum):
    """Hazard classification types."""
    FLOOD = "flood"
    EARTHQUAKE = "earthquake"
    FIRE = "fire"
    LANDSLIDE = "landslide"
    STORM = "storm"
    TSUNAMI = "tsunami"
    OTHER = "other"
    UNKNOWN = "unknown"


class ExtractedLocation(BaseModel):
    """Extracted location information."""
    description: str = Field(..., description="Human-readable location description")
    coordinates: Optional[str] = Field(None, description="GPS coordinates if present (will be redacted)")
    landmark: Optional[str] = Field(None, description="Nearby landmark or building")
    zone_id: Optional[str] = Field(None, description="Zone or district identifier")


class ParsedIncident(BaseModel):
    """Structured extraction from citizen report."""
    hazard_classification: HazardType = Field(..., description="Type of hazard")
    extracted_location: ExtractedLocation = Field(..., description="Location information")
    criticality_index: int = Field(..., ge=0, le=10, description="Criticality score (0-10)")
    description_summary: str = Field(..., description="Brief summary of the incident")
    confidence: float = Field(..., ge=0, le=1, description="Parser confidence score")
    
    @validator('criticality_index')
    def validate_criticality(cls, v):
        """Ensure criticality is in valid range."""
        if not 0 <= v <= 10:
            raise ValueError("Criticality index must be between 0 and 10")
        return v


class RedactionFilter:
    """
    Sensitive information redaction filter.
    
    Uses regex patterns to detect and redact:
    - GPS coordinates (lat/lon)
    - Phone numbers
    - Email addresses
    - Operational codenames (pattern-based)
    
    PRODUCTION_TODO: Add NER-based detection for names, addresses, etc.
    Current implementation is regex-based for auditability.
    """
    
    # Patterns for sensitive information
    PATTERNS = {
        'gps_coordinates': [
            r'\b\d{1,3}\.\d+,\s*\d{1,3}\.\d+\b',  # lat,lon
            r'\b\d+°\d+\'[NS],\s*\d+°\d+\'[EW]\b',  # DMS format
        ],
        'phone_numbers': [
            r'\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b',  # US format
            r'\b\+\d{1,3}[-.\s]?\d{3,}\b',  # International
        ],
        'email_addresses': [
            r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
        ],
        'operational_codes': [
            r'\bOP-[A-Z]{2,}\d*\b',  # Operation codes
            r'\bCODENAME-[A-Z]{2,}\b',  # Codename pattern
        ],
    }
    
    def __init__(self):
        """Compile regex patterns."""
        self.compiled_patterns = {}
        for category, patterns in self.PATTERNS.items():
            self.compiled_patterns[category] = [re.compile(p) for p in patterns]
    
    def redact(self, text: str) -> tuple[str, Dict[str, List[str]]]:
        """
        Redact sensitive information from text.
        
        Args:
            text: Input text to redact
            
        Returns:
            (redacted_text, redaction_log) - Redacted text and log of what was redacted
        """
        redacted_text = text
        redaction_log = {}
        
        for category, patterns in self.compiled_patterns.items():
            matches = []
            for pattern in patterns:
                for match in pattern.finditer(redacted_text):
                    matches.append(match.group())
                    redacted_text = redacted_text.replace(match.group(), f"[REDACTED_{category.upper()}]")
            
            if matches:
                redaction_log[category] = matches
        
        return redacted_text, redaction_log
    
    def has_sensitive_info(self, text: str) -> bool:
        """Check if text contains sensitive information."""
        for patterns in self.compiled_patterns.values():
            for pattern in patterns:
                if pattern.search(text):
                    return True
        return False


class DexLLMParser:
    """
    Main parser for extracting structured information from citizen reports.
    
    Uses Ollama with a local small instruct model.
    """
    
    def __init__(
        self,
        ollama_host: str = "http://localhost:11434",
        model_name: str = "llama3:8b",  # or another small instruct model
        max_retries: int = 3,
        retry_delay: float = 1.0
    ):
        self.ollama_host = ollama_host
        self.model_name = model_name
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self.redaction_filter = RedactionFilter()
        
        # System prompt for structured extraction
        self.system_prompt = """You are a disaster response information extractor. Your task is to extract structured information from citizen reports about hazards.

Extract the following fields:
1. hazard_classification: Type of hazard (flood, earthquake, fire, landslide, storm, tsunami, other, or unknown)
2. extracted_location: Location information including description, coordinates (if present), landmark, zone_id
3. criticality_index: Criticality score from 0-10 (0=minor, 10=extremely critical)
4. description_summary: Brief summary of the incident (1-2 sentences)
5. confidence: Your confidence in this extraction (0.0-1.0)

Respond ONLY with valid JSON. No additional text."""
    
    def parse(self, text: str) -> Dict[str, Any]:
        """
        Parse citizen report text into structured format.
        
        Args:
            text: Free-text citizen report
            
        Returns:
            Dict with parsed incident data and redaction log
        """
        # Step 1: Redact sensitive information
        redacted_text, redaction_log = self.redaction_filter.redact(text)
        
        # Step 2: Extract structured information via LLM
        parsed_data = self._extract_with_llm(redacted_text)
        
        # Step 3: Validate with Pydantic
        try:
            validated = ParsedIncident(**parsed_data)
            result = validated.dict()
        except Exception as e:
            # If validation fails, return with error flag
            result = {
                'error': str(e),
                'raw_llm_output': parsed_data,
                'redacted_text': redacted_text,
                'redaction_log': redaction_log
            }
            return result
        
        # Add redaction information
        result['redacted_text'] = redacted_text
        result['redaction_log'] = redaction_log
        result['original_text_length'] = len(text)
        result['redacted_text_length'] = len(redacted_text)
        
        return result
    
    def _extract_with_llm(self, text: str) -> Dict[str, Any]:
        """
        Extract structured information using Ollama LLM.
        
        Args:
            text: Redacted input text
            
        Returns:
            Parsed JSON dict
        """
        prompt = f"{self.system_prompt}\n\nReport: {text}\n\nJSON response:"
        
        for attempt in range(self.max_retries):
            try:
                response = self._call_ollama(prompt)
                parsed = json.loads(response)
                return parsed
            except json.JSONDecodeError as e:
                print(f"JSON parse error (attempt {attempt + 1}/{self.max_retries}): {e}")
                if attempt < self.max_retries - 1:
                    time.sleep(self.retry_delay)
                else:
                    # Return fallback structure
                    return self._fallback_extraction(text)
            except Exception as e:
                print(f"LLM call error (attempt {attempt + 1}/{self.max_retries}): {e}")
                if attempt < self.max_retries - 1:
                    time.sleep(self.retry_delay)
                else:
                    return self._fallback_extraction(text)
        
        return self._fallback_extraction(text)
    
    def _call_ollama(self, prompt: str) -> str:
        """Call Ollama API."""
        url = f"{self.ollama_host}/api/generate"
        
        payload = {
            "model": self.model_name,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.3,  # Low temperature for deterministic output
                "num_predict": 500
            }
        }
        
        with httpx.Client(timeout=30.0) as client:
            response = client.post(url, json=payload)
            response.raise_for_status()
            result = response.json()
            return result.get("response", "")
    
    def _fallback_extraction(self, text: str) -> Dict[str, Any]:
        """
        Fallback extraction using simple keyword matching.
        
        Used when LLM fails or is unavailable.
        """
        text_lower = text.lower()
        
        # Simple hazard classification
        hazard_keywords = {
            'flood': ['flood', 'water', 'rising', 'inundated'],
            'earthquake': ['earthquake', 'quake', 'tremor', 'shaking'],
            'fire': ['fire', 'burning', 'flame', 'smoke'],
            'landslide': ['landslide', 'mudslide', 'slope', 'collapse'],
            'storm': ['storm', 'hurricane', 'typhoon', 'wind'],
            'tsunami': ['tsunami', 'tidal wave', 'surge']
        }
        
        hazard_type = HazardType.UNKNOWN
        for h_type, keywords in hazard_keywords.items():
            if any(kw in text_lower for kw in keywords):
                hazard_type = HazardType(h_type)
                break
        
        # Simple criticality estimation
        critical_keywords = {
            'emergency': 8,
            'critical': 9,
            'severe': 7,
            'dangerous': 6,
            'urgent': 7,
            'help': 5,
            'trapped': 9,
            'injured': 8
        }
        
        criticality = 3  # Default
        for kw, score in critical_keywords.items():
            if kw in text_lower:
                criticality = max(criticality, score)
        
        return {
            'hazard_classification': hazard_type.value,
            'extracted_location': {
                'description': 'Unknown location',
                'coordinates': None,
                'landmark': None,
                'zone_id': None
            },
            'criticality_index': min(criticality, 10),
            'description_summary': text[:200] + '...' if len(text) > 200 else text,
            'confidence': 0.5  # Low confidence for fallback
        }


if __name__ == "__main__":
    # Test the parser
    parser = DexLLMParser()
    
    # Test cases
    test_reports = [
        "There's a major flood on Main Street near the library. Water is rising fast and people are trapped in their homes at coordinates 40.7128, -74.0060.",
        "Earthquake! I felt strong shaking at my apartment on Oak Avenue. Call emergency at 555-1234.",
        "Fire reported in the industrial zone. Smoke is visible from the warehouse district.",
        "Landslide blocking Highway 101 near mile marker 45. Cars are stuck.",
        "Storm surge approaching the coast. Evacuation ordered for Zone A residents."
    ]
    
    print("Testing DeX-LLM Parser with redaction filter\n")
    print("="*60)
    
    for i, report in enumerate(test_reports, 1):
        print(f"\nTest Report {i}:")
        print(f"Original: {report}")
        
        result = parser.parse(report)
        
        print(f"\nParsed Result:")
        print(json.dumps(result, indent=2, default=str))
        print("="*60)
