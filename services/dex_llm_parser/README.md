# DeX-LLM Citizen Text Parser

Deterministic-as-possible structured extraction from free-text citizen reports with sensitive information redaction.

## Overview

This module extracts structured information from unstructured citizen reports using:
- Local small instruct model (Ollama) for primary extraction
- Tightly constrained system prompt for deterministic output
- JSON-schema-validated output using Pydantic
- Sensitive information redaction filter (regex-based, auditable)
- Fallback keyword matching when LLM unavailable

## Simulation vs. Reality

**What's simulated:**
- Uses a small 3B-class model instead of fine-tuned 8B model
- LLM calls may fail in prototype (fallback handles gracefully)

**What's real:**
- Redaction filter is fully implemented and auditable
- Pydantic validation ensures structured output
- Retry logic for robustness
- Fallback extraction for graceful degradation

**PRODUCTION_TODO:**
- Consider using larger fine-tuned model for production
- Add NER-based detection for names, addresses (beyond regex)
- Implement proper model serving infrastructure
- Add monitoring for LLM failure rates

## Files

- `parser.py` - Main parser with redaction filter and LLM integration
- `test_parser.py` - Unit tests for adversarial/ambiguous inputs
- `api.py` - FastAPI endpoint for parsing
- `README.md` - This file

## Usage

### Standalone Testing

```bash
cd services/dex_llm_parser
python parser.py
```

This runs test cases demonstrating:
- GPS coordinate redaction
- Phone number redaction
- Email redaction
- Operational code redaction
- Structured extraction

### Unit Tests

```bash
cd services/dex_llm_parser
python test_parser.py
```

Tests cover:
- Redaction filter for all sensitive info types
- Parser with various input types
- Fallback extraction
- Pydantic validation
- Edge cases (empty, very long, ambiguous inputs)

### API Server

```bash
cd services/dex_llm_parser
python api.py
```

Or with uvicorn:
```bash
uvicorn api:app --host 0.0.0.0 --port 8000
```

### API Usage

```bash
# Health check
curl http://localhost:8000/health

# Parse report
curl -X POST http://localhost:8000/parse \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Flood at 40.7128, -74.0060 near the library. Call 555-1234 for help.",
    "use_llm": true
  }'

# Redact only
curl -X POST http://localhost:8000/redact \
  -H "Content-Type: application/json" \
  -d '"Contact me at 555-1234 or test@test.com"'
```

## Redaction Filter

The redaction filter detects and redacts:

### GPS Coordinates
- Decimal format: `40.7128, -74.0060`
- DMS format: `40°42'N, 74°00'W`

### Phone Numbers
- US format: `555-123-4567`
- International: `+1-555-123-4567`

### Email Addresses
- Standard format: `user@domain.com`

### Operational Codes
- Pattern: `OP-ALPHA23`, `CODENAME-DELTA`

**Design Note:** Regex-based for auditability. Production should add NER for names/addresses.

## Structured Output

The parser extracts:

```json
{
  "hazard_classification": "flood",
  "extracted_location": {
    "description": "Main Street near library",
    "coordinates": null,
    "landmark": "library",
    "zone_id": null
  },
  "criticality_index": 7,
  "description_summary": "Flood on Main Street near library",
  "confidence": 0.85,
  "redacted_text": "Flood at [REDACTED_GPS_COORDINATES] near the library...",
  "redaction_log": {
    "gps_coordinates": ["40.7128, -74.0060"]
  }
}
```

## Hazard Types

- `flood` - Water-related hazards
- `earthquake` - Seismic events
- `fire` - Fire-related incidents
- `landslide` - Slope failures
- `storm` - Wind/storm events
- `tsunami` - Large water waves
- `other` - Other hazard types
- `unknown` - Unable to classify

## Criticality Index

0-10 scale:
- **0-3**: Minor incidents
- **4-6**: Moderate incidents
- **7-8**: Severe incidents
- **9-10**: Critical emergencies

## Safety Considerations

This is the most safety-relevant text-processing step in the pipeline:

1. **Redaction happens before LLM** - Sensitive info never reaches the model
2. **Explicit rules** - Regex patterns are auditable, not relying on LLM judgment
3. **Validation** - Pydantic ensures output structure
4. **Fallback** - Keyword matching ensures graceful degradation
5. **Testing** - Unit tests cover adversarial and ambiguous inputs

## Dependencies

- fastapi
- uvicorn
- pydantic
- httpx
- ollama (local LLM service)

## Ollama Setup

To use the LLM features, install and run Ollama:

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model (e.g., Llama 3 8B)
ollama pull llama3:8b

# Start Ollama server
ollama serve
```

The parser will use fallback keyword matching if Ollama is unavailable.

## Expected Performance

- **Redaction**: Near-instant (regex-based)
- **LLM parsing**: 1-3 seconds per request (depends on model and hardware)
- **Fallback parsing**: < 100ms (keyword-based)

**Note:** Production deployment should use a dedicated LLM serving infrastructure.
