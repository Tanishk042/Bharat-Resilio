# API Gateway

Unified entry point for Phase 1 Resilio services.

## Overview

The API Gateway provides a single endpoint for accessing:
- Acoustic CNN (hazard detection from audio)
- Hazard Engine (multi-sensor severity prediction)
- DeX-LLM Parser (citizen report parsing)

## Services

| Service | Endpoint | Description |
|---------|----------|-------------|
| Acoustic CNN | `/acoustic/predict` | Predict hazard from audio |
| Acoustic CNN | `/acoustic/stream/process` | Process streaming audio |
| Acoustic CNN | `/acoustic/stream/reset` | Reset temporal gate |
| Hazard Engine | `/hazard/predict` | Predict severity from sensors |
| DeX-LLM Parser | `/parser/parse` | Parse citizen reports |
| DeX-LLM Parser | `/parser/redact` | Redact sensitive info |

## Usage

### Start the Gateway

```bash
cd services/api_gateway
python main.py
```

Or with uvicorn:
```bash
uvicorn main:app --host 0.0.0.0 --port 8080
```

### Environment Variables

Configure service URLs:

```bash
export ACOUSTIC_SERVICE_URL=http://localhost:8001
export HAZARD_SERVICE_URL=http://localhost:8002
export PARSER_SERVICE_URL=http://localhost:8003
```

### API Examples

```bash
# Health check for all services
curl http://localhost:8080/health

# Acoustic prediction
curl -X POST http://localhost:8080/acoustic/predict \
  -H "Content-Type: application/json" \
  -d '{"samples": [0.1, -0.2, 0.3, ...], "sample_rate": 16000}'

# Hazard prediction
curl -X POST http://localhost:8080/hazard/predict \
  -H "Content-Type: application/json" \
  -d '{"seismic_magnitude": 5.2, "water_level": 2.3, ...}'

# Parse citizen report
curl -X POST http://localhost:8080/parser/parse \
  -H "Content-Type: application/json" \
  -d '{"text": "Flood on Main Street", "use_llm": true}'
```

## Architecture

The gateway acts as a reverse proxy:
1. Receives requests on port 8080
2. Forwards to appropriate service
3. Returns response to client

**PRODUCTION_TODO:**
- Add authentication (API keys, JWT)
- Add rate limiting
- Add request/response logging
- Add circuit breakers for service failures
- Add load balancing for multiple service instances

## Dependencies

- fastapi
- uvicorn
- httpx

## Starting All Phase 1 Services

To start all Phase 1 services locally:

```bash
# Terminal 1: Acoustic CNN
cd edge/acoustic_cnn
python api.py

# Terminal 2: Hazard Engine
cd services/hazard_engine
python api.py

# Terminal 3: DeX-LLM Parser
cd services/dex_llm_parser
python api.py

# Terminal 4: API Gateway
cd services/api_gateway
python main.py
```

Then access all services through the gateway at `http://localhost:8080`.
