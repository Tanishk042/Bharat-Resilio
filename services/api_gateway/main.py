"""
Unified API Gateway for Phase 1 Services.

Provides a single entry point for:
- Acoustic CNN (hazard detection from audio)
- Hazard Engine (multi-sensor severity prediction)
- DeX-LLM Parser (citizen report parsing)

PRODUCTION_TODO: Add authentication, rate limiting, and proper load balancing.
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
import httpx
import os
from enum import Enum


class ServiceType(Enum):
    """Available services."""
    ACOUSTIC = "acoustic"
    HAZARD = "hazard"
    PARSER = "parser"


# FastAPI app
app = FastAPI(
    title="Resilio API Gateway",
    description="Unified gateway for Resilio disaster coordination services",
    version="1.0.0"
)

# Service URLs (from environment or defaults)
SERVICE_URLS = {
    ServiceType.ACOUSTIC: os.getenv('ACOUSTIC_SERVICE_URL', 'http://localhost:8001'),
    ServiceType.HAZARD: os.getenv('HAZARD_SERVICE_URL', 'http://localhost:8002'),
    ServiceType.PARSER: os.getenv('PARSER_SERVICE_URL', 'http://localhost:8003'),
}


@app.get("/")
async def root():
    """Root endpoint with service information."""
    return {
        "name": "Resilio API Gateway",
        "version": "1.0.0",
        "services": {
            "acoustic": SERVICE_URLS[ServiceType.ACOUSTIC],
            "hazard": SERVICE_URLS[ServiceType.HAZARD],
            "parser": SERVICE_URLS[ServiceType.PARSER]
        }
    }


@app.get("/health")
async def health_check():
    """Health check for all services."""
    health_status = {}
    
    for service_type, url in SERVICE_URLS.items():
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{url}/health")
                health_status[service_type.value] = {
                    "status": "healthy" if response.status_code == 200 else "unhealthy",
                    "url": url
                }
        except Exception as e:
            health_status[service_type.value] = {
                "status": "unreachable",
                "url": url,
                "error": str(e)
            }
    
    return health_status


# Acoustic CNN endpoints
@app.post("/acoustic/predict")
async def acoustic_predict(audio_data: Dict[str, Any]):
    """
    Proxy to acoustic CNN prediction endpoint.
    
    Args:
        audio_data: Audio samples and metadata
        
    Returns:
        Prediction from acoustic CNN
    """
    url = f"{SERVICE_URLS[ServiceType.ACOUSTIC]}/predict"
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=audio_data)
            response.raise_for_status()
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Acoustic service error: {str(e)}")


@app.post("/acoustic/stream/process")
async def acoustic_stream_process(audio_data: Dict[str, Any]):
    """
    Proxy to acoustic CNN streaming endpoint.
    
    Args:
        audio_data: Audio samples for one frame
        
    Returns:
        Stream event from acoustic CNN
    """
    url = f"{SERVICE_URLS[ServiceType.ACOUSTIC]}/stream/process"
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=audio_data)
            response.raise_for_status()
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Acoustic service error: {str(e)}")


@app.post("/acoustic/stream/reset")
async def acoustic_stream_reset():
    """Reset acoustic CNN temporal gate."""
    url = f"{SERVICE_URLS[ServiceType.ACOUSTIC]}/stream/reset"
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url)
            response.raise_for_status()
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Acoustic service error: {str(e)}")


# Hazard Engine endpoints
@app.post("/hazard/predict")
async def hazard_predict(sensor_data: Dict[str, Any]):
    """
    Proxy to hazard engine prediction endpoint.
    
    Args:
        sensor_data: Multi-sensor readings
        
    Returns:
        Hazard prediction (severity and tier)
    """
    url = f"{SERVICE_URLS[ServiceType.HAZARD]}/predict"
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=sensor_data)
            response.raise_for_status()
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Hazard service error: {str(e)}")


# DeX-LLM Parser endpoints
@app.post("/parser/parse")
async def parser_parse(request: Dict[str, Any]):
    """
    Proxy to DeX-LLM parser endpoint.
    
    Args:
        request: Parse request with text
        
    Returns:
        Parsed incident data
    """
    url = f"{SERVICE_URLS[ServiceType.PARSER]}/parse"
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:  # Longer timeout for LLM
            response = await client.post(url, json=request)
            response.raise_for_status()
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Parser service error: {str(e)}")


@app.post("/parser/redact")
async def parser_redact(text: str):
    """
    Proxy to DeX-LLM redaction endpoint.
    
    Args:
        text: Text to redact
        
    Returns:
        Redacted text and log
    """
    url = f"{SERVICE_URLS[ServiceType.PARSER]}/redact"
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=text)
            response.raise_for_status()
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Parser service error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
