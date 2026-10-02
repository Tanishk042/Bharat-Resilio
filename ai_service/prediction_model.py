import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

class PredictionRequest(BaseModel):
    region: str
    weather_patterns: dict
    seismic_activity: float
    rainfall: float
    temperature: float
    population_density: float

@app.post("/predict")
async def predict_disaster(request: PredictionRequest):
    try:
        # Process input features
        features = process_features(request)
        
        # Make prediction
        prediction = model.predict_proba([features])[0]
        
        return {
            "probability": float(prediction[1]),
            "risk_level": get_risk_level(prediction[1]),
            "preventive_measures": generate_preventive_measures(prediction[1]),
            "emergency_plan": generate_emergency_plan(request.region)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))