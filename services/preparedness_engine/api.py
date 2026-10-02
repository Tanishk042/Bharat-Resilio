"""
FastAPI endpoint for Preparedness Engine.

Exposes:
- POST /guidance - Get emergency guidance for hazard situation
- GET /stats - Get engine statistics
- POST /documents/add - Add documents to vector store
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict

from rag_engine import PreparednessEngine


# Pydantic models
class GuidanceRequest(BaseModel):
    """Request for emergency guidance."""
    hazard_type: str = Field(..., description="Type of hazard")
    tier: str = Field(..., description="Danger tier (Minimal, Warning, Catastrophic)")
    zone_id: str = Field("default", description="Zone identifier")


class DocumentAddRequest(BaseModel):
    """Request to add documents."""
    documents: List[Dict] = Field(..., description="List of documents with 'text' and 'metadata' fields")


# FastAPI app
app = FastAPI(
    title="Preparedness Engine API",
    description="RAG-based emergency guidance generation",
    version="1.0.0"
)

# Global engine
engine: Optional[PreparednessEngine] = None


@app.on_event("startup")
async def load_engine():
    """Load preparedness engine on startup."""
    global engine
    
    ollama_host = "http://localhost:11434"
    model_name = "llama3:8b"
    
    engine = PreparednessEngine(ollama_host, model_name)
    engine.initialize_sample_documents()
    
    print("Preparedness Engine initialized")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "engine_loaded": engine is not None
    }


@app.post("/guidance")
async def get_guidance(request: GuidanceRequest):
    """
    Get emergency guidance for a hazard situation.
    
    Uses RAG to retrieve relevant emergency documents and generates
    guidance using a local LLM grounded in those documents.
    
    Args:
        request: Guidance request with hazard type, tier, and zone
        
    Returns:
        Generated guidance with metadata
    """
    if engine is None:
        raise HTTPException(status_code=503, detail="Engine not loaded")
    
    guidance = engine.get_guidance(
        hazard_type=request.hazard_type,
        tier=request.tier,
        zone_id=request.zone_id
    )
    
    return guidance


@app.get("/stats")
async def get_stats():
    """
    Get engine statistics.
    
    Returns:
        Statistics about document store and cache
    """
    if engine is None:
        raise HTTPException(status_code=503, detail="Engine not loaded")
    
    return engine.get_stats()


@app.post("/documents/add")
async def add_documents(request: DocumentAddRequest):
    """
    Add documents to the vector store.
    
    Args:
        request: Document add request
        
    Returns:
        Success message
    """
    if engine is None:
        raise HTTPException(status_code=503, detail="Engine not loaded")
    
    engine.document_store.add_documents(request.documents)
    
    return {
        "status": "success",
        "message": f"Added {len(request.documents)} documents"
    }


@app.post("/cache/clear")
async def clear_cache():
    """Clear the guidance cache."""
    if engine is None:
        raise HTTPException(status_code=503, detail="Engine not loaded")
    
    engine.guidance_generator.clear_cache()
    
    return {
        "status": "success",
        "message": "Cache cleared"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8006)
