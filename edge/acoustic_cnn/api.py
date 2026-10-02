"""
FastAPI endpoint for Acoustic CNN.

Exposes:
- POST /predict - Predict hazard confidence from audio
- POST /stream - Process streaming audio with temporal gating
- GET /health - Health check
"""

from fastapi import FastAPI, HTTPException, UploadFile, File
from pydantic import BaseModel, Field
from typing import Optional, List
import torch
import numpy as np
import io
import soundfile as sf
import os

from model import RawWaveformCNN, TemporalGate


# Pydantic models for API
class AudioData(BaseModel):
    """Audio data as base64 or array."""
    samples: List[float] = Field(..., description="Audio samples (normalized to [-1, 1])")
    sample_rate: int = Field(16000, description="Sample rate in Hz")


class PredictionResponse(BaseModel):
    """Prediction response."""
    confidence: float = Field(..., description="Hazard confidence score (0-1)")
    is_hazard: bool = Field(..., description="Whether hazard is detected")
    threshold: float = Field(..., description="Confidence threshold used")


class StreamEvent(BaseModel):
    """Streaming event response."""
    type: str = Field(..., description="Event type (wake_signal or frame_processed)")
    confidence: Optional[float] = Field(None, description="Current confidence")
    consecutive_frames: Optional[int] = Field(None, description="Consecutive high-confidence frames")
    triggered: bool = Field(..., description="Whether wake signal triggered")
    timestamp: float = Field(..., description="Event timestamp")


# FastAPI app
app = FastAPI(
    title="Acoustic CNN API",
    description="Edge acoustic hazard detection with temporal gating",
    version="1.0.0"
)

# Global model and gate
model: Optional[RawWaveformCNN] = None
temporal_gate: Optional[TemporalGate] = None
device = 'cpu'
SAMPLE_RATE = 16000
WINDOW_SEC = 1.5
WINDOW_SAMPLES = int(SAMPLE_RATE * WINDOW_SEC)


@app.on_event("startup")
async def load_model():
    """Load model on startup."""
    global model, temporal_gate, device
    
    model_path = os.getenv('MODEL_PATH', 'edge/acoustic_cnn/models/raw_cnn_best.pth')
    
    if not os.path.exists(model_path):
        print(f"Warning: Model not found at {model_path}")
        print("Using untrained model for demonstration")
        model = RawWaveformCNN(sample_rate=SAMPLE_RATE, window_sec=WINDOW_SEC)
    else:
        device = 'cuda' if torch.cuda.is_available() else 'cpu'
        model = RawWaveformCNN(sample_rate=SAMPLE_RATE, window_sec=WINDOW_SEC)
        model.load_state_dict(torch.load(model_path, map_location=device))
        model.to(device)
        model.eval()
        print(f"Model loaded from {model_path} on {device}")
    
    # Initialize temporal gate
    confidence_threshold = float(os.getenv('CONFIDENCE_THRESHOLD', '0.95'))
    min_consecutive = int(os.getenv('MIN_CONSECUTIVE', '3'))
    temporal_gate = TemporalGate(
        confidence_threshold=confidence_threshold,
        min_consecutive=min_consecutive
    )
    print(f"Temporal gate initialized: threshold={confidence_threshold}, min_consecutive={min_consecutive}")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "device": device,
        "sample_rate": SAMPLE_RATE,
        "window_sec": WINDOW_SEC
    }


@app.post("/predict", response_model=PredictionResponse)
async def predict(audio_data: AudioData):
    """
    Predict hazard confidence from audio data.
    
    Args:
        audio_data: Audio samples and sample rate
        
    Returns:
        PredictionResponse with confidence and hazard detection
    """
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    # Convert to tensor
    audio_tensor = torch.tensor(audio_data.samples, dtype=torch.float32)
    
    # Pad or truncate to window length
    if len(audio_tensor) < WINDOW_SAMPLES:
        audio_tensor = torch.nn.functional.pad(audio_tensor, (0, WINDOW_SAMPLES - len(audio_tensor)))
    elif len(audio_tensor) > WINDOW_SAMPLES:
        audio_tensor = audio_tensor[:WINDOW_SAMPLES]
    
    # Add batch and channel dimensions
    audio_tensor = audio_tensor.unsqueeze(0).unsqueeze(0).to(device)
    
    # Predict
    with torch.no_grad():
        confidence = model(audio_tensor).item()
    
    is_hazard = confidence >= temporal_gate.confidence_threshold
    
    return PredictionResponse(
        confidence=round(confidence, 4),
        is_hazard=is_hazard,
        threshold=temporal_gate.confidence_threshold
    )


@app.post("/predict/file")
async def predict_file(file: UploadFile = File(...)):
    """
    Predict hazard confidence from uploaded audio file.
    
    Supports WAV, FLAC, and other formats supported by soundfile.
    
    Args:
        file: Audio file upload
        
    Returns:
        PredictionResponse with confidence and hazard detection
    """
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        # Read audio file
        contents = await file.read()
        audio, sr = sf.read(io.BytesIO(contents))
        
        # Convert to mono if stereo
        if len(audio.shape) > 1:
            audio = audio.mean(axis=1)
        
        # Resample if needed (simple implementation)
        if sr != SAMPLE_RATE:
            # PRODUCTION_TODO: Implement proper resampling
            print(f"Warning: Sample rate {sr} differs from expected {SAMPLE_RATE}")
        
        # Normalize
        audio = audio.astype(np.float32)
        audio = audio / np.max(np.abs(audio) + 1e-8)
        
        # Truncate or pad to window length
        if len(audio) > WINDOW_SAMPLES:
            audio = audio[:WINDOW_SAMPLES]
        elif len(audio) < WINDOW_SAMPLES:
            audio = np.pad(audio, (0, WINDOW_SAMPLES - len(audio)))
        
        # Convert to tensor
        audio_tensor = torch.from_numpy(audio).unsqueeze(0).unsqueeze(0).to(device)
        
        # Predict
        with torch.no_grad():
            confidence = model(audio_tensor).item()
        
        is_hazard = confidence >= temporal_gate.confidence_threshold
        
        return PredictionResponse(
            confidence=round(confidence, 4),
            is_hazard=is_hazard,
            threshold=temporal_gate.confidence_threshold
        )
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing audio file: {str(e)}")


@app.post("/stream/reset")
async def reset_stream():
    """Reset the temporal gate state."""
    if temporal_gate is None:
        raise HTTPException(status_code=503, detail="Temporal gate not initialized")
    
    temporal_gate.reset()
    return {"status": "reset"}


@app.post("/stream/process", response_model=StreamEvent)
async def process_stream_frame(audio_data: AudioData):
    """
    Process a single frame of streaming audio with temporal gating.
    
    This endpoint maintains state across calls for temporal gating.
    Use /stream/reset to reset the gate state.
    
    Args:
        audio_data: Audio samples for one frame
        
    Returns:
        StreamEvent with frame processing results
    """
    if model is None or temporal_gate is None:
        raise HTTPException(status_code=503, detail="Model or temporal gate not loaded")
    
    # Convert to tensor
    audio_tensor = torch.tensor(audio_data.samples, dtype=torch.float32)
    
    # Pad or truncate to window length
    if len(audio_tensor) < WINDOW_SAMPLES:
        audio_tensor = torch.nn.functional.pad(audio_tensor, (0, WINDOW_SAMPLES - len(audio_tensor)))
    elif len(audio_tensor) > WINDOW_SAMPLES:
        audio_tensor = audio_tensor[:WINDOW_SAMPLES]
    
    # Add batch and channel dimensions
    audio_tensor = audio_tensor.unsqueeze(0).unsqueeze(0).to(device)
    
    # Predict
    with torch.no_grad():
        confidence = model(audio_tensor).item()
    
    # Process through temporal gate
    import time
    triggered, consecutive = temporal_gate.process_frame(confidence, time.time())
    
    event_type = "wake_signal" if triggered else "frame_processed"
    
    return StreamEvent(
        type=event_type,
        confidence=round(confidence, 4),
        consecutive_frames=consecutive,
        triggered=triggered,
        timestamp=time.time()
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
