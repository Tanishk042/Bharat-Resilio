"""
FastAPI endpoint for Hazard Engine.

Exposes:
- POST /predict - Predict severity and tier from sensor data
- GET /health - Health check
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
import torch
import numpy as np
import os

from model import MultiTaskHazardModel, DangerTier


# Pydantic models for API
class SensorData(BaseModel):
    """Sensor input data."""
    seismic_magnitude: float = Field(..., ge=0, le=10, description="Ground motion magnitude (0-10)")
    seismic_frequency: float = Field(..., ge=0, description="Dominant frequency (Hz)")
    barometric_pressure: float = Field(..., ge=900, le=1100, description="Atmospheric pressure (hPa)")
    barometric_trend: float = Field(..., description="Pressure change rate (hPa/hr)")
    water_level: float = Field(..., ge=0, description="Water level (meters above baseline)")
    water_flow_rate: float = Field(..., ge=0, description="Flow rate (m³/s)")
    wind_speed: float = Field(..., ge=0, description="Wind speed (km/h)")
    temperature: float = Field(..., description="Temperature (°C)")
    audio_anomaly_weight: float = Field(..., ge=0, le=1, description="Confidence from acoustic CNN (0-1)")
    precipitation: float = Field(..., ge=0, description="Precipitation rate (mm/hr)")


class HazardPrediction(BaseModel):
    """Prediction output."""
    severity_score: float = Field(..., description="Severity score (0-10)")
    danger_tier: int = Field(..., description="Danger tier (0=Minimal, 1=Warning, 2=Catastrophic)")
    tier_name: str = Field(..., description="Human-readable tier name")
    confidence: float = Field(..., description="Classification confidence (0-1)")


# FastAPI app
app = FastAPI(
    title="Hazard Engine API",
    description="Multi-task hazard prediction from multi-sensor data",
    version="1.0.0"
)

# Global model
model: Optional[MultiTaskHazardModel] = None
device = 'cpu'


@app.on_event("startup")
async def load_model():
    """Load model on startup."""
    global model, device
    
    model_path = os.getenv('MODEL_PATH', 'services/hazard_engine/models/hazard_model_best.pth')
    
    if not os.path.exists(model_path):
        print(f"Warning: Model not found at {model_path}")
        print("Using untrained model for demonstration")
        model = MultiTaskHazardModel(input_dim=10, hidden_dim=64)
    else:
        device = 'cuda' if torch.cuda.is_available() else 'cpu'
        model = MultiTaskHazardModel(input_dim=10, hidden_dim=64)
        model.load_state_dict(torch.load(model_path, map_location=device))
        model.to(device)
        model.eval()
        print(f"Model loaded from {model_path} on {device}")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "model_loaded": model is not None}


@app.post("/predict", response_model=HazardPrediction)
async def predict(data: SensorData):
    """
    Predict hazard severity and tier from sensor data.
    
    Args:
        data: Sensor readings from multiple sources
        
    Returns:
        HazardPrediction with severity score, danger tier, and confidence
    """
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    # Convert to tensor
    features = torch.tensor([[
        data.seismic_magnitude,
        data.seismic_frequency,
        data.barometric_pressure,
        data.barometric_trend,
        data.water_level,
        data.water_flow_rate,
        data.wind_speed,
        data.temperature,
        data.audio_anomaly_weight,
        data.precipitation
    ]], dtype=torch.float32).to(device)
    
    # Predict
    with torch.no_grad():
        prediction = model.predict(features)
    
    return HazardPrediction(
        severity_score=round(prediction['severity_score'], 2),
        danger_tier=prediction['danger_tier'],
        tier_name=prediction['tier_name'],
        confidence=round(prediction['confidence'], 4)
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
