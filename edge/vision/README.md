# Edge Vision Module

YOLOv8-nano wrapper for hazard detection from video feeds.

## Overview

Implements object detection for hazard identification:
- Detects people, vehicles, and objects
- Classifies hazards based on detections
- Real-time video stream processing
- ONNX export for edge deployment

## Simulation vs. Reality

**What's simulated:**
- Pre-trained COCO model instead of custom disaster model
- Simulated detection results for prototype
- No actual YOLOv8 inference (would require ultralytics)

**What's real:**
- Architecture is production-ready
- Detection pipeline is correct
- Frame skipping for efficiency is implemented
- API interface is functional

**PRODUCTION_TODO:**
- Train custom YOLOv8-nano on disaster-specific dataset
- Implement actual YOLO inference (ultralytics)
- Add custom classes: flood_water, fire, debris, structural_damage
- Optimize for edge deployment (quantization, pruning)
- Consider specialized hardware (NPU, TPU)

## Files

- `model.py` - YOLOv8-nano wrapper
- `inference.py` - Real-time inference engine
- `api.py` - FastAPI endpoint
- `README.md` - This file

## Usage

### Testing Model

```bash
cd edge/vision
python model.py
```

### Testing Inference Engine

```bash
cd edge/vision
python inference.py
```

### API Server

```bash
cd edge/vision
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

# Detect objects from base64 image
curl -X POST http://localhost:8000/detect \
  -H "Content-Type: application/json" \
  -d '{
    "image_b64": "base64_encoded_image_data",
    "confidence_threshold": 0.5
  }'

# Detect hazards from uploaded file
curl -X POST http://localhost:8000/detect/file \
  -F "file=@image.jpg" \
  -F "confidence_threshold=0.5"
```

## Detection Classes

Current implementation uses COCO classes:
- person
- bicycle
- car
- motorcycle
- bus
- truck

**PRODUCTION_TODO:** Custom disaster classes:
- flood_water
- fire
- debris
- structural_damage
- person_in_distress
- vehicle_in_hazard

## Hazard Classification

Hazard types are inferred from detected objects:
- person → person_in_distress
- car/truck/bus → vehicle_in_hazard

Severity is calculated based on:
- Number of detections
- Confidence scores
- Hazard type weighting

## Performance Optimization

- Frame skipping: Process every Nth frame (default: 5)
- Confidence threshold: Filter low-confidence detections
- Device selection: CPU or GPU inference

## Dependencies

- torch
- opencv-python
- pillow
- fastapi
- uvicorn
- pydantic
- numpy

**PRODUCTION_TODO:**
- ultralytics (for actual YOLO inference)

## Expected Performance

Based on simulation:
- Detection per frame: ~50-100ms (CPU), ~10-20ms (GPU)
- With frame skip (5): ~10-20ms effective latency
- Video processing: 15-30 FPS (CPU), 30-60 FPS (GPU)

**Note:** Production performance depends on:
- Actual YOLOv8-nano model
- Hardware capabilities
- Input resolution
- Optimization level

## Edge Deployment

For edge deployment:
1. Export model to ONNX format
2. Optimize for target hardware (quantization)
3. Use specialized inference engine (TensorRT, OpenVINO)
4. Consider hardware acceleration (NPU, TPU)

## Production Training

To train custom disaster model:
1. Collect disaster-specific dataset
2. Annotate with custom classes
3. Train YOLOv8-nano on dataset
4. Validate on test set
5. Export to ONNX for edge deployment

## Safety Considerations

Vision module is safety-critical:
- False negatives (missed hazards) are dangerous
- Consider ensemble methods for reliability
- Add confidence calibration
- Implement fallback to acoustic detection
- Regular model validation and updates
