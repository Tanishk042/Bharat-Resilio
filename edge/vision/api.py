"""
FastAPI endpoint for Edge Vision Module.

Exposes:
- POST /detect - Run object detection on image
- POST /detect/hazard - Detect hazards in image
- GET /health - Health check
"""

from fastapi import FastAPI, HTTPException, UploadFile, File
from pydantic import BaseModel, Field
from typing import Optional, List
import numpy as np
import io
from PIL import Image
import base64

from model import VisionModel


# Pydantic models
class ImageData(BaseModel):
    """Image data as base64."""
    image_b64: str = Field(..., description="Base64-encoded image")
    confidence_threshold: float = Field(0.5, ge=0.0, le=1.0, description="Confidence threshold")


class DetectionResponse(BaseModel):
    """Detection response."""
    detections: List[dict]
    detection_count: int


class HazardResponse(BaseModel):
    """Hazard detection response."""
    hazard_detected: bool
    hazard_types: List[str]
    severity: float
    detections: List[dict]
    detection_count: int


# FastAPI app
app = FastAPI(
    title="Edge Vision API",
    description="YOLOv8-nano wrapper for hazard detection",
    version="1.0.0"
)

# Global model
model: Optional[VisionModel] = None


@app.on_event("startup")
async def load_model():
    """Load vision model on startup."""
    global model
    
    model_path = "edge/vision/models/yolov8n.pt"
    model = VisionModel(model_path=model_path, device='cpu')
    
    print("Edge Vision API initialized")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "model_loaded": model is not None and model.model_loaded
    }


@app.post("/detect", response_model=DetectionResponse)
async def detect_objects(request: ImageData):
    """
    Run object detection on image.
    
    Args:
        request: Image data with base64 encoding
        
    Returns:
        Detection results
    """
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        # Decode base64 image
        image_data = base64.b64decode(request.image_b64)
        image = Image.open(io.BytesIO(image_data))
        image_np = np.array(image)
        
        # Run detection
        detections = model.detect(image_np, request.confidence_threshold)
        
        return DetectionResponse(
            detections=[
                {
                    'class': det.class_name,
                    'confidence': round(det.confidence, 3),
                    'bbox': [round(x, 1) for x in det.bbox]
                }
                for det in detections
            ],
            detection_count=len(detections)
        )
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing image: {str(e)}")


@app.post("/detect/hazard", response_model=HazardResponse)
async def detect_hazards(request: ImageData):
    """
    Detect hazards in image.
    
    Args:
        request: Image data with base64 encoding
        
    Returns:
        Hazard detection results
    """
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        # Decode base64 image
        image_data = base64.b64decode(request.image_b64)
        image = Image.open(io.BytesIO(image_data))
        image_np = np.array(image)
        
        # Run hazard detection
        result = model.detect_hazards(image_np, request.confidence_threshold)
        
        return HazardResponse(**result)
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing image: {str(e)}")


@app.post("/detect/file")
async def detect_from_file(
    file: UploadFile = File(...),
    confidence_threshold: float = 0.5
):
    """
    Detect hazards from uploaded image file.
    
    Args:
        file: Image file upload
        confidence_threshold: Confidence threshold
        
    Returns:
        Hazard detection results
    """
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        # Read image file
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        image_np = np.array(image)
        
        # Run hazard detection
        result = model.detect_hazards(image_np, confidence_threshold)
        
        return result
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing image file: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8007)
