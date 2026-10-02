"""
FastAPI endpoint for DeX-LLM Parser.

Exposes:
- POST /parse - Parse citizen report text into structured format
- GET /health - Health check
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
import os

from parser import DexLLMParser


# Pydantic models for API
class ParseRequest(BaseModel):
    """Request for parsing citizen report."""
    text: str = Field(..., min_length=1, max_length=10000, description="Citizen report text")
    use_llm: bool = Field(True, description="Whether to use LLM (fallback to keyword matching if False)")


class ParseResponse(BaseModel):
    """Response from parsing."""
    hazard_classification: str = Field(..., description="Type of hazard")
    extracted_location: Dict[str, Any] = Field(..., description="Location information")
    criticality_index: int = Field(..., description="Criticality score (0-10)")
    description_summary: str = Field(..., description="Brief summary")
    confidence: float = Field(..., description="Parser confidence")
    redacted_text: str = Field(..., description="Text with sensitive info redacted")
    redaction_log: Dict[str, list] = Field(..., description="Log of redacted information")
    original_text_length: int = Field(..., description="Length of original text")
    redacted_text_length: int = Field(..., description="Length of redacted text")


# FastAPI app
app = FastAPI(
    title="DeX-LLM Parser API",
    description="Structured extraction from citizen reports with sensitive information redaction",
    version="1.0.0"
)

# Global parser
parser: Optional[DexLLMParser] = None


@app.on_event("startup")
async def load_parser():
    """Load parser on startup."""
    global parser
    
    ollama_host = os.getenv('OLLAMA_HOST', 'http://localhost:11434')
    model_name = os.getenv('OLLAMA_MODEL', 'llama3:8b')
    
    parser = DexLLMParser(
        ollama_host=ollama_host,
        model_name=model_name
    )
    
    print(f"DeX-LLM Parser initialized with Ollama at {ollama_host}")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "parser_loaded": parser is not None,
        "ollama_host": os.getenv('OLLAMA_HOST', 'http://localhost:11434')
    }


@app.post("/parse", response_model=ParseResponse)
async def parse_report(request: ParseRequest):
    """
    Parse citizen report text into structured format.
    
    This endpoint:
    1. Redacts sensitive information (coordinates, phones, emails, operational codes)
    2. Extracts structured data using LLM or fallback keyword matching
    3. Returns validated JSON response
    
    Args:
        request: ParseRequest with text and optional use_llm flag
        
    Returns:
        ParseResponse with structured incident data
    """
    if parser is None:
        raise HTTPException(status_code=503, detail="Parser not loaded")
    
    try:
        result = parser.parse(request.text)
        
        # Check for errors
        if 'error' in result:
            raise HTTPException(status_code=422, detail=f"Parsing error: {result['error']}")
        
        return ParseResponse(**result)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@app.post("/redact")
async def redact_only(text: str):
    """
    Redact sensitive information without parsing.
    
    Useful for preprocessing text before other operations.
    
    Args:
        text: Text to redact
        
    Returns:
        Dict with redacted text and redaction log
    """
    if parser is None:
        raise HTTPException(status_code=503, detail="Parser not loaded")
    
    redacted, log = parser.redaction_filter.redact(text)
    
    return {
        "redacted_text": redacted,
        "redaction_log": log,
        "has_sensitive_info": len(log) > 0
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
