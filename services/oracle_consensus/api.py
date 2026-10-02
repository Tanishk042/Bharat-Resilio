"""
FastAPI endpoint for Oracle Consensus Service.

Exposes:
- POST /incident/submit - Submit incident for verification
- POST /sensor/stream - Add sensor telemetry stream
- GET /incident/{id} - Get incident status
- GET /incidents - List all incidents
- GET /statistics - Get verification statistics
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime

from device_auth import DeviceRegistry, DeviceKeyPair
from consensus import OracleConsensusEngine, IncidentStatus


# Pydantic models
class IncidentSubmitRequest(BaseModel):
    """Request to submit incident."""
    incident_id: str = Field(..., description="Unique incident identifier")
    hazard_type: str = Field(..., description="Type of hazard")
    location: str = Field(..., description="Location description")
    severity: int = Field(..., ge=0, le=10, description="Severity score (0-10)")
    telemetry: Dict = Field(..., description="Signed telemetry data")


class SensorStreamRequest(BaseModel):
    """Request to add sensor stream."""
    device_id: str = Field(..., description="Sensor device ID")
    telemetry: Dict = Field(..., description="Sensor telemetry data")


# FastAPI app
app = FastAPI(
    title="Oracle Consensus API",
    description="Incident verification with device authentication and corroboration",
    version="1.0.0"
)

# Global engine
engine: Optional[OracleConsensusEngine] = None
registry: Optional[DeviceRegistry] = None


@app.on_event("startup")
async def load_engine():
    """Load consensus engine on startup."""
    global engine, registry
    
    registry = DeviceRegistry()
    
    # Register some test devices
    # PRODUCTION_TODO: In production, devices are registered during provisioning
    test_device = DeviceKeyPair("sensor-001")
    registry.register_device("sensor-001", test_device.get_public_key_hex())
    
    test_device2 = DeviceKeyPair("sensor-002")
    registry.register_device("sensor-002", test_device2.get_public_key_hex())
    
    test_device3 = DeviceKeyPair("sensor-003")
    registry.register_device("sensor-003", test_device3.get_public_key_hex())
    
    engine = OracleConsensusEngine(
        registry,
        time_window_seconds=300,
        min_corroborations=1
    )
    
    print("Oracle Consensus Engine initialized")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "engine_loaded": engine is not None,
        "registered_devices": len(registry.list_devices()) if registry else 0
    }


@app.post("/incident/submit")
async def submit_incident(request: IncidentSubmitRequest):
    """
    Submit incident for verification.
    
    The incident will be verified by:
    1. Checking device signature validity
    2. Finding corroborating sensor data
    3. Checking time/location proximity
    
    Args:
        request: Incident submission request
        
    Returns:
        Verification result
    """
    if engine is None:
        raise HTTPException(status_code=503, detail="Consensus engine not loaded")
    
    result = engine.submit_incident(
        incident_id=request.incident_id,
        hazard_type=request.hazard_type,
        location=request.location,
        severity=request.severity,
        telemetry=request.telemetry
    )
    
    return result


@app.post("/sensor/stream")
async def add_sensor_stream(request: SensorStreamRequest):
    """
    Add sensor telemetry stream for corroboration.
    
    Args:
        request: Sensor stream request
        
    Returns:
        Success message
    """
    if engine is None:
        raise HTTPException(status_code=503, detail="Consensus engine not loaded")
    
    engine.add_sensor_stream(request.device_id, request.telemetry)
    
    return {
        "status": "success",
        "message": f"Sensor stream added for {request.device_id}"
    }


@app.get("/incident/{incident_id}")
async def get_incident(incident_id: str):
    """
    Get incident status.
    
    Args:
        incident_id: Incident identifier
        
    Returns:
        Incident details
    """
    if engine is None:
        raise HTTPException(status_code=503, detail="Consensus engine not loaded")
    
    incident = engine.get_incident(incident_id)
    if incident is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    return incident


@app.get("/incidents")
async def list_incidents(status: Optional[str] = None):
    """
    List all incidents.
    
    Args:
        status: Optional filter by status (pending, verified, rejected)
        
    Returns:
        List of incidents
    """
    if engine is None:
        raise HTTPException(status_code=503, detail="Consensus engine not loaded")
    
    # Parse status filter
    status_filter = None
    if status:
        try:
            status_filter = IncidentStatus(status)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status}")
    
    incidents = engine.list_incidents(status_filter)
    
    return {
        "incidents": incidents,
        "count": len(incidents)
    }


@app.get("/statistics")
async def get_statistics():
    """
    Get verification statistics.
    
    Returns:
        Statistics about incident verification
    """
    if engine is None:
        raise HTTPException(status_code=503, detail="Consensus engine not loaded")
    
    return engine.get_statistics()


@app.post("/devices/register")
async def register_device(device_id: str, public_key: str):
    """
    Register a new device.
    
    PRODUCTION_TODO: This should be done during device provisioning.
    """
    if registry is None:
        raise HTTPException(status_code=503, detail="Registry not loaded")
    
    success = registry.register_device(device_id, public_key)
    if not success:
        raise HTTPException(status_code=400, detail="Device already registered")
    
    return {
        "status": "success",
        "message": f"Device {device_id} registered"
    }


@app.get("/devices")
async def list_devices():
    """List all registered devices."""
    if registry is None:
        raise HTTPException(status_code=503, detail="Registry not loaded")
    
    return {
        "devices": registry.list_devices()
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8005)
