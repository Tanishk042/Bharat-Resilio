"""
FastAPI endpoint for Routing Engine.

Exposes:
- POST /route - Find evacuation route with GNN or fallback
- GET /health - Health check
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Set
import torch
import os

from model import RoutingEngine, SpatioTemporalGNN, create_synthetic_city_graph, RoutingMode


# Pydantic models for API
class RouteRequest(BaseModel):
    """Request for routing."""
    start_node: int = Field(..., description="Start intersection ID")
    goal_node: int = Field(..., description="Goal intersection ID")
    node_features: Optional[List[List[float]]] = Field(None, description="Node features for GNN")
    edge_features: Optional[List[List[float]]] = Field(None, description="Edge features for GNN")
    hazard_zones: Optional[Set[int]] = Field(None, description="Set of hazard zone node IDs")


class RouteResponse(BaseModel):
    """Routing response."""
    path: List[int] = Field(..., description="Sequence of intersection IDs")
    cost: float = Field(..., description="Total path cost")
    routing_mode: str = Field(..., description="Routing mode used (gnn or fallback)")
    density: float = Field(..., description="Sensor density (0-1)")
    gnn_available: bool = Field(..., description="Whether GNN model is available")


# FastAPI app
app = FastAPI(
    title="Routing Engine API",
    description="Spatio-temporal GNN evacuation routing with deterministic fallback",
    version="1.0.0"
)

# Global routing engine
routing_engine: Optional[RoutingEngine] = None


@app.on_event("startup")
async def load_engine():
    """Load routing engine on startup."""
    global routing_engine
    
    model_path = os.getenv('MODEL_PATH', 'services/routing_engine/models/routing_gnn_best.pth')
    density_threshold = float(os.getenv('DENSITY_THRESHOLD', '0.4'))
    
    # Create synthetic graph
    num_nodes = int(os.getenv('NUM_NODES', '50'))
    grid_size = int(os.getenv('GRID_SIZE', '8'))
    graph = create_synthetic_city_graph(num_intersections=num_nodes, grid_size=grid_size)
    
    # Load GNN model if available
    if os.path.exists(model_path):
        device = 'cuda' if torch.cuda.is_available() else 'cpu'
        gnn_model = SpatioTemporalGNN(node_feature_dim=4, edge_feature_dim=3)
        gnn_model.load_state_dict(torch.load(model_path, map_location=device))
        gnn_model.to(device)
        gnn_model.eval()
        print(f"GNN model loaded from {model_path} on {device}")
    else:
        print(f"GNN model not found at {model_path}, using fallback only")
        gnn_model = None
    
    routing_engine = RoutingEngine(
        graph=graph,
        gnn_model=gnn_model,
        density_threshold=density_threshold
    )
    
    print(f"Routing engine initialized: {graph.number_of_nodes()} nodes, {graph.number_of_edges()} edges")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "engine_loaded": routing_engine is not None,
        "gnn_available": routing_engine.gnn_model is not None if routing_engine else False,
        "graph_nodes": routing_engine.graph.number_of_nodes() if routing_engine else 0,
        "graph_edges": routing_engine.graph.number_of_edges() if routing_engine else 0
    }


@app.post("/route", response_model=RouteResponse)
async def find_route(request: RouteRequest):
    """
    Find evacuation route.
    
    Uses GNN if:
    - GNN model is available
    - Sensor density >= threshold (default 40%)
    - Node and edge features are provided
    
    Otherwise falls back to deterministic A*/Dijkstra routing.
    
    Args:
        request: RouteRequest with start, goal, and optional features
        
    Returns:
        RouteResponse with path, cost, and routing mode
    """
    if routing_engine is None:
        raise HTTPException(status_code=503, detail="Routing engine not loaded")
    
    # Convert features to tensors if provided
    node_features = None
    edge_features = None
    
    if request.node_features is not None:
        node_features = torch.tensor(request.node_features, dtype=torch.float32)
    
    if request.edge_features is not None:
        edge_features = torch.tensor(request.edge_features, dtype=torch.float32)
    
    # Find route
    result = routing_engine.route(
        start=request.start_node,
        goal=request.goal_node,
        node_features=node_features,
        edge_features=edge_features,
        hazard_zones=request.hazard_zones
    )
    
    return RouteResponse(**result)


@app.get("/graph/info")
async def graph_info():
    """Get graph information."""
    if routing_engine is None:
        raise HTTPException(status_code=503, detail="Routing engine not loaded")
    
    return {
        "num_nodes": routing_engine.graph.number_of_nodes(),
        "num_edges": routing_engine.graph.number_of_edges(),
        "density_threshold": routing_engine.density_gate.threshold,
        "current_density": routing_engine.density_gate.get_density()
    }


@app.post("/graph/reset_density")
async def reset_density():
    """Reset density gate state."""
    if routing_engine is None:
        raise HTTPException(status_code=503, detail="Routing engine not loaded")
    
    routing_engine.density_gate.reset()
    return {"status": "reset"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)
