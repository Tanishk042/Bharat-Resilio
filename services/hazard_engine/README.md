# Multi-Task Hazard & Intensity Engine

Multi-task neural network for hazard severity prediction and danger tier classification.

## Overview

This module implements a shared-backbone neural network that:
- Takes multi-sensor input (seismic, barometric, hydrological, audio, etc.)
- Outputs severity score (0-10 scale) via regression head
- Outputs danger tier (Minimal/Warning/Catastrophic) via classification head

## Simulation vs. Reality

**What's simulated:**
- Training data uses synthetic generation with explicit rules
- Real multi-sensor disaster datasets don't exist in convenient labeled form

**What's real:**
- Multi-task learning architecture is production-ready
- Feature engineering follows real sensor data patterns
- API endpoints are fully functional

**PRODUCTION_TODO:**
- Replace synthetic data with real multi-sensor disaster dataset
- Collect labeled data from actual disaster events
- Calibrate feature scales based on real sensor hardware
- Validate model performance on historical disaster data

## Files

- `model.py` - Multi-task model architecture and loss functions
- `data_generator.py` - Synthetic multi-sensor data generation
- `train.py` - Training script
- `api.py` - FastAPI endpoint for predictions
- `models/` - Trained model weights

## Usage

### Training

```bash
cd services/hazard_engine
python train.py
```

This will:
1. Generate synthetic multi-sensor data (flood and earthquake scenarios)
2. Train the multi-task model
3. Evaluate on validation set
4. Save best model to `models/hazard_model_best.pth`

### API Server

```bash
cd services/hazard_engine
python api.py
```

Or with uvicorn directly:
```bash
uvicorn api:app --host 0.0.0.0 --port 8000
```

### API Usage

```bash
# Health check
curl http://localhost:8000/health

# Prediction
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "seismic_magnitude": 5.2,
    "seismic_frequency": 15.0,
    "barometric_pressure": 1005.0,
    "barometric_trend": -2.5,
    "water_level": 2.3,
    "water_flow_rate": 45.0,
    "wind_speed": 25.0,
    "temperature": 22.0,
    "audio_anomaly_weight": 0.65,
    "precipitation": 15.0
  }'
```

## Model Architecture

### Input Features (10 dimensions)
1. Seismic magnitude (0-10)
2. Seismic frequency (Hz)
3. Barometric pressure (hPa)
4. Barometric trend (hPa/hr)
5. Water level (meters)
6. Water flow rate (m³/s)
7. Wind speed (km/h)
8. Temperature (°C)
9. Audio anomaly weight (0-1)
10. Precipitation (mm/hr)

### Shared Backbone
- 3-layer MLP with BatchNorm, ReLU, Dropout
- Hidden dimensions: 64 → 64 → 32

### Regression Head
- Predicts severity score (0-10)
- MSE loss

### Classification Head
- Predicts danger tier (3 classes)
- Cross-entropy loss

### Multi-Task Loss
Combined weighted loss:
```
total_loss = w_reg * MSE(severity) + w_cls * CE(tier)
```

## Danger Tiers

- **Minimal (0)**: Severity < 3
- **Warning (1)**: Severity 3-7
- **Catastrophic (2)**: Severity > 7

## Synthetic Data Rules

The synthetic generator uses explicit rules to create realistic correlations:

**Flood scenarios:**
- High water level + high precipitation + dropping pressure = severe flood
- Audio anomaly weight is low (floods are less acoustic)

**Earthquake scenarios:**
- High seismic magnitude + high frequency = severe earthquake
- Audio anomaly weight correlates with magnitude

## Dependencies

- torch
- fastapi
- uvicorn
- pydantic
- numpy
- tqdm

## Expected Performance

Based on synthetic data:
- MAE (severity): ~0.5-1.0 on 0-10 scale
- Accuracy (tier): ~85-95%

**Note:** These are on synthetic data with known rules. Real-world performance depends on quality of labeled disaster data.
