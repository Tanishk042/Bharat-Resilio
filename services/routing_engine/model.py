"""
Spatio-Temporal GNN Evacuation Routing Engine

Implements:
- Spatio-temporal GNN for dynamic routing
- Deterministic A*/Dijkstra fallback
- Density gate for graceful degradation

PRODUCTION_TODO: Use real road network data (OpenStreetMap) instead of synthetic graph.
Production deployment requires accurate geographic data and real-time traffic feeds.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.nn import GCNConv, GATConv
from torch_geometric.data import Data
import networkx as nx
import numpy as np
from typing import List, Tuple, Dict, Optional
from enum import Enum
import heapq


class RoutingMode(Enum):
    """Routing mode."""
    GNN = "gnn"
    FALLBACK = "fallback"


class SpatioTemporalGNN(nn.Module):
    """
    Spatio-temporal GNN for evacuation routing.
    
    Architecture:
    - GCN/GAT layers for spatial graph processing
    - GRU for temporal dynamics
    - Edge feature prediction for routing weights
    
    Input: Graph with node features (position, hazard proximity) and edge features (congestion, hazard proximity)
    Output: Edge weights for routing
    """
    
    def __init__(
        self,
        node_feature_dim: int = 4,
        edge_feature_dim: int = 3,
        hidden_dim: int = 64,
        num_layers: int = 2,
        use_attention: bool = True
    ):
        super().__init__()
        self.node_feature_dim = node_feature_dim
        self.edge_feature_dim = edge_feature_dim
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers
        
        # Spatial graph layers
        if use_attention:
            self.conv_layers = nn.ModuleList([
                GATConv(hidden_dim if i > 0 else node_feature_dim, hidden_dim, heads=4, concat=False)
                for i in range(num_layers)
            ])
        else:
            self.conv_layers = nn.ModuleList([
                GCNConv(hidden_dim if i > 0 else node_feature_dim, hidden_dim)
                for i in range(num_layers)
            ])
        
        # Temporal GRU
        self.temporal_gru = nn.GRU(hidden_dim, hidden_dim, batch_first=True)
        
        # Edge weight prediction
        self.edge_predictor = nn.Sequential(
            nn.Linear(hidden_dim * 2 + edge_feature_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(hidden_dim, 1),
            nn.Sigmoid()
        )
    
    def forward(
        self,
        x: torch.Tensor,
        edge_index: torch.Tensor,
        edge_attr: torch.Tensor,
        temporal_features: Optional[torch.Tensor] = None
    ) -> torch.Tensor:
        """
        Forward pass.
        
        Args:
            x: Node features (num_nodes, node_feature_dim)
            edge_index: Edge indices (2, num_edges)
            edge_attr: Edge features (num_edges, edge_feature_dim)
            temporal_features: Optional temporal features (batch, time, feature_dim)
            
        Returns:
            Edge weights (num_edges, 1)
        """
        # Spatial processing
        h = x
        for conv in self.conv_layers:
            h = conv(h, edge_index)
            h = F.relu(h)
        
        # Temporal processing (if provided)
        if temporal_features is not None:
            h = h.unsqueeze(0).repeat(temporal_features.size(0), 1, 1)
            h, _ = self.temporal_gru(temporal_features, h.transpose(0, 1))
            h = h[-1]  # Take last time step
        
        # Edge weight prediction
        # Concatenate source and destination node features with edge attributes
        src_features = h[edge_index[0]]
        dst_features = h[edge_index[1]]
        edge_input = torch.cat([src_features, dst_features, edge_attr], dim=-1)
        
        edge_weights = self.edge_predictor(edge_input)
        
        return edge_weights


class DensityGate:
    """
    Density gate for graceful degradation.
    
    Tracks the fraction of graph nodes reporting live sensor data.
    If density drops below threshold, falls back to deterministic routing.
    """
    
    def __init__(self, threshold: float = 0.4):
        self.threshold = threshold
        self.node_status = {}  # node_id -> bool (has_live_data)
    
    def update_node_status(self, node_id: int, has_live_data: bool):
        """Update status of a node."""
        self.node_status[node_id] = has_live_data
    
    def get_density(self) -> float:
        """Get current density of live nodes."""
        if not self.node_status:
            return 0.0
        live_count = sum(1 for status in self.node_status.values() if status)
        return live_count / len(self.node_status)
    
    def should_use_gnn(self) -> bool:
        """Determine if GNN should be used based on density."""
        density = self.get_density()
        return density >= self.threshold
    
    def reset(self):
        """Reset all node statuses."""
        self.node_status.clear()


class FallbackRouter:
    """
    Deterministic A*/Dijkstra fallback router.
    
    Used when GNN density gate is triggered.
    Excludes hazard-zone edges by setting weight to infinity.
    """
    
    def __init__(self, graph: nx.Graph):
        self.graph = graph
    
    def find_path(
        self,
        start: int,
        goal: int,
        hazard_zones: set = None
    ) -> Tuple[List[int], float]:
        """
        Find path using A* algorithm.
        
        Args:
            start: Start node ID
            goal: Goal node ID
            hazard_zones: Set of node IDs in hazard zones (to avoid)
            
        Returns:
            (path, total_cost)
        """
        if hazard_zones is None:
            hazard_zones = set()
        
        # Create a copy of the graph for this search
        search_graph = self.graph.copy()
        
        # Set hazard zone edges to infinity
        for u, v in search_graph.edges():
            if u in hazard_zones or v in hazard_zones:
                search_graph[u][v]['weight'] = float('inf')
        
        # Use NetworkX's A* implementation
        try:
            path = nx.astar_path(
                search_graph,
                start,
                goal,
                heuristic=self._euclidean_heuristic,
                weight='weight'
            )
            total_cost = nx.path_weight(search_graph, path, weight='weight')
            return path, total_cost
        except nx.NetworkXNoPath:
            return [], float('inf')
    
    def _euclidean_heuristic(self, u: int, v: int) -> float:
        """Euclidean distance heuristic for A*."""
        u_pos = self.graph.nodes[u].get('pos', (0, 0))
        v_pos = self.graph.nodes[v].get('pos', (0, 0))
        return np.sqrt((u_pos[0] - v_pos[0])**2 + (u_pos[1] - v_pos[1])**2)


class RoutingEngine:
    """
    Main routing engine with GNN and fallback.
    """
    
    def __init__(
        self,
        graph: nx.Graph,
        gnn_model: Optional[SpatioTemporalGNN] = None,
        density_threshold: float = 0.4
    ):
        self.graph = graph
        self.gnn_model = gnn_model
        self.density_gate = DensityGate(threshold=density_threshold)
        self.fallback_router = FallbackRouter(graph)
        self.device = 'cpu'
        
        if gnn_model is not None:
            gnn_model.to(self.device)
            gnn_model.eval()
    
    def route(
        self,
        start: int,
        goal: int,
        node_features: Optional[torch.Tensor] = None,
        edge_features: Optional[torch.Tensor] = None,
        hazard_zones: set = None
    ) -> Dict:
        """
        Find evacuation route.
        
        Args:
            start: Start node ID
            goal: Goal node ID
            node_features: Node features for GNN (num_nodes, feature_dim)
            edge_features: Edge features for GNN (num_edges, feature_dim)
            hazard_zones: Set of hazard zone node IDs
            
        Returns:
            Dict with path, cost, and routing_mode
        """
        # Update density gate based on node features
        if node_features is not None:
            # Assume last feature indicates sensor availability
            for i, features in enumerate(node_features):
                has_live_data = features[-1].item() > 0.5
                self.density_gate.update_node_status(i, has_live_data)
        
        # Determine routing mode
        use_gnn = (
            self.gnn_model is not None and
            self.density_gate.should_use_gnn() and
            node_features is not None and
            edge_features is not None
        )
        
        if use_gnn:
            path, cost = self._route_with_gnn(start, goal, node_features, edge_features)
            mode = RoutingMode.GNN
        else:
            path, cost = self.fallback_router.find_path(start, goal, hazard_zones)
            mode = RoutingMode.FALLBACK
        
        return {
            'path': path,
            'cost': cost,
            'routing_mode': mode.value,
            'density': self.density_gate.get_density(),
            'gnn_available': self.gnn_model is not None
        }
    
    def _route_with_gnn(
        self,
        start: int,
        goal: int,
        node_features: torch.Tensor,
        edge_features: torch.Tensor
    ) -> Tuple[List[int], float]:
        """
        Route using GNN-predicted edge weights.
        
        Args:
            start: Start node ID
            goal: Goal node ID
            node_features: Node features
            edge_features: Edge features
            
        Returns:
            (path, total_cost)
        """
        # Get edge index from graph
        edge_index = torch.tensor(list(self.graph.edges())).t().contiguous()
        edge_index = edge_index.to(self.device)
        
        node_features = node_features.to(self.device)
        edge_features = edge_features.to(self.device)
        
        # Predict edge weights
        with torch.no_grad():
            predicted_weights = self.gnn_model(node_features, edge_index, edge_features)
        
        # Update graph with predicted weights
        weighted_graph = self.graph.copy()
        for i, (u, v) in enumerate(self.graph.edges()):
            weight = predicted_weights[i].item()
            # Convert to cost (higher weight = lower cost for routing)
            cost = 1.0 / (weight + 1e-8)
            weighted_graph[u][v]['weight'] = cost
        
        # Use Dijkstra with predicted weights
        try:
            path = nx.dijkstra_path(weighted_graph, start, goal, weight='weight')
            total_cost = nx.path_weight(weighted_graph, path, weight='weight')
            return path, total_cost
        except nx.NetworkXNoPath:
            return [], float('inf')


def create_synthetic_city_graph(
    num_intersections: int = 50,
    grid_size: int = 10
) -> nx.Graph:
    """
    Create a synthetic city road graph.
    
    Args:
        num_intersections: Number of intersections (nodes)
        grid_size: Size of the grid for node placement
        
    Returns:
        NetworkX graph with node positions and edge weights
    """
    graph = nx.Graph()
    
    # Create grid-based node positions
    positions = {}
    node_id = 0
    for i in range(grid_size):
        for j in range(grid_size):
            if node_id >= num_intersections:
                break
            positions[node_id] = (i, j)
            graph.add_node(node_id, pos=positions[node_id])
            node_id += 1
    
    # Add edges (roads) between nearby nodes
    for u in graph.nodes():
        for v in graph.nodes():
            if u >= v:
                continue
            u_pos = positions[u]
            v_pos = positions[v]
            distance = np.sqrt((u_pos[0] - v_pos[0])**2 + (u_pos[1] - v_pos[1])**2)
            
            # Connect if within certain distance (Manhattan-like grid)
            if distance <= 1.5:
                weight = distance * np.random.uniform(0.8, 1.2)  # Add some variation
                graph.add_edge(u, v, weight=weight)
    
    return graph


if __name__ == "__main__":
    # Test routing engine
    print("Creating synthetic city graph...")
    graph = create_synthetic_city_graph(num_intersections=50, grid_size=8)
    print(f"Graph: {graph.number_of_nodes()} nodes, {graph.number_of_edges()} edges")
    
    # Create routing engine without GNN (fallback only)
    engine = RoutingEngine(graph, gnn_model=None, density_threshold=0.4)
    
    # Test fallback routing
    start = 0
    goal = 40
    hazard_zones = {10, 11, 12, 20, 21}
    
    result = engine.route(start, goal, hazard_zones=hazard_zones)
    print(f"\nFallback routing result:")
    print(f"Path: {result['path']}")
    print(f"Cost: {result['cost']:.2f}")
    print(f"Mode: {result['routing_mode']}")
    print(f"Density: {result['density']:.2f}")
    
    # Test with GNN (untrained)
    print("\nTesting with untrained GNN...")
    gnn_model = SpatioTemporalGNN(node_feature_dim=4, edge_feature_dim=3)
    engine_with_gnn = RoutingEngine(graph, gnn_model=gnn_model, density_threshold=0.4)
    
    # Create dummy features
    num_nodes = graph.number_of_nodes()
    num_edges = graph.number_of_edges()
    node_features = torch.randn(num_nodes, 4)
    edge_features = torch.randn(num_edges, 3)
    
    result = engine_with_gnn.route(start, goal, node_features, edge_features, hazard_zones)
    print(f"GNN routing result:")
    print(f"Path: {result['path']}")
    print(f"Cost: {result['cost']:.2f}")
    print(f"Mode: {result['routing_mode']}")
    print(f"Density: {result['density']:.2f}")
