"""
Training script for Spatio-Temporal GNN Routing Engine.

PRODUCTION_TODO: Replace synthetic training data with real routing data.
Current implementation uses synthetic scenarios for demonstration.
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torch_geometric.data import Data, Batch
import numpy as np
from tqdm import tqdm
import os

from model import SpatioTemporalGNN, create_synthetic_city_graph
import networkx as nx


class SyntheticRoutingDataset:
    """
    Synthetic dataset for routing model training.
    
    Generates scenarios with:
    - Random start/goal pairs
    - Simulated hazard zones
    - Congestion patterns
    """
    
    def __init__(
        self,
        num_scenarios: int = 1000,
        num_nodes: int = 50,
        grid_size: int = 8
    ):
        self.graph = create_synthetic_city_graph(num_nodes, grid_size)
        self.num_nodes = num_nodes
        self.num_edges = self.graph.number_of_edges()
        self.scenarios = []
        
        print(f"Generating {num_scenarios} synthetic routing scenarios...")
        
        for _ in range(num_scenarios):
            scenario = self._generate_scenario()
            self.scenarios.append(scenario)
        
        print(f"Dataset generated: {len(self.scenarios)} scenarios")
    
    def _generate_scenario(self) -> dict:
        """Generate a single routing scenario."""
        # Random start and goal
        nodes = list(self.graph.nodes())
        start = np.random.choice(nodes)
        goal = np.random.choice([n for n in nodes if n != start])
        
        # Random hazard zones
        num_hazard_zones = np.random.randint(0, 5)
        hazard_zones = set(np.random.choice(nodes, num_hazard_zones, replace=False))
        
        # Node features: [x, y, hazard_proximity, sensor_available]
        node_features = []
        for node in nodes:
            pos = self.graph.nodes[node]['pos']
            hazard_proximity = 1.0 if node in hazard_zones else 0.0
            sensor_available = 1.0 if np.random.random() > 0.2 else 0.0  # 80% availability
            node_features.append([pos[0], pos[1], hazard_proximity, sensor_available])
        
        node_features = torch.tensor(node_features, dtype=torch.float32)
        
        # Edge features: [congestion, hazard_proximity, length]
        edge_features = []
        edge_index = []
        for u, v in self.graph.edges():
            edge_index.append([u, v])
            congestion = np.random.uniform(0, 1)
            edge_hazard = 1.0 if (u in hazard_zones or v in hazard_zones) else 0.0
            length = self.graph[u][v]['weight']
            edge_features.append([congestion, edge_hazard, length])
        
        edge_features = torch.tensor(edge_features, dtype=torch.float32)
        edge_index = torch.tensor(edge_index, dtype=torch.long).t().contiguous()
        
        # Optimal path (using Dijkstra with hazard avoidance)
        search_graph = self.graph.copy()
        for u, v in search_graph.edges():
            if u in hazard_zones or v in hazard_zones:
                search_graph[u][v]['weight'] = float('inf')
        
        try:
            optimal_path = nx.dijkstra_path(search_graph, start, goal, weight='weight')
            optimal_cost = nx.path_weight(search_graph, optimal_path, weight='weight')
        except nx.NetworkXNoPath:
            optimal_path = []
            optimal_cost = float('inf')
        
        return {
            'node_features': node_features,
            'edge_features': edge_features,
            'edge_index': edge_index,
            'start': start,
            'goal': goal,
            'hazard_zones': hazard_zones,
            'optimal_path': optimal_path,
            'optimal_cost': optimal_cost
        }
    
    def __len__(self):
        return len(self.scenarios)
    
    def __getitem__(self, idx):
        return self.scenarios[idx]


class RoutingTrainer:
    """Trainer for GNN routing model."""
    
    def __init__(
        self,
        model: nn.Module,
        device: str = 'cpu',
        learning_rate: float = 0.001
    ):
        self.model = model.to(device)
        self.device = device
        self.optimizer = optim.Adam(model.parameters(), lr=learning_rate)
        self.scheduler = optim.lr_scheduler.ReduceLROnPlateau(
            self.optimizer, mode='min', patience=5, factor=0.5
        )
        
        self.train_losses = []
        self.val_losses = []
    
    def train_epoch(self, dataset: list) -> float:
        """Train for one epoch."""
        self.model.train()
        total_loss = 0.0
        
        np.random.shuffle(dataset)
        
        for scenario in tqdm(dataset, desc="Training"):
            node_features = scenario['node_features'].to(self.device)
            edge_features = scenario['edge_features'].to(self.device)
            edge_index = scenario['edge_index'].to(self.device)
            
            # Forward pass
            self.optimizer.zero_grad()
            predicted_weights = self.model(node_features, edge_index, edge_features)
            
            # Loss: encourage lower weights on optimal path edges
            # This is a simplified loss - production would use more sophisticated routing loss
            optimal_path = scenario['optimal_path']
            if not optimal_path:
                continue
            
            # Create target: low weights for edges in optimal path
            target = torch.ones_like(predicted_weights)
            for i in range(len(optimal_path) - 1):
                u, v = optimal_path[i], optimal_path[i + 1]
                # Find edge index
                for j, (eu, ev) in enumerate(zip(edge_index[0], edge_index[1])):
                    if (eu == u and ev == v) or (eu == v and ev == u):
                        target[j] = 0.0  # Low weight (high priority)
                        break
            
            loss = nn.functional.mse_loss(predicted_weights, target)
            
            # Backward pass
            loss.backward()
            self.optimizer.step()
            
            total_loss += loss.item()
        
        return total_loss / len(dataset)
    
    def validate(self, dataset: list) -> float:
        """Validate the model."""
        self.model.eval()
        total_loss = 0.0
        
        with torch.no_grad():
            for scenario in tqdm(dataset, desc="Validation"):
                node_features = scenario['node_features'].to(self.device)
                edge_features = scenario['edge_features'].to(self.device)
                edge_index = scenario['edge_index'].to(self.device)
                
                predicted_weights = self.model(node_features, edge_index, edge_features)
                
                optimal_path = scenario['optimal_path']
                if not optimal_path:
                    continue
                
                target = torch.ones_like(predicted_weights)
                for i in range(len(optimal_path) - 1):
                    u, v = optimal_path[i], optimal_path[i + 1]
                    for j, (eu, ev) in enumerate(zip(edge_index[0], edge_index[1])):
                        if (eu == u and ev == v) or (eu == v and ev == u):
                            target[j] = 0.0
                            break
                
                loss = nn.functional.mse_loss(predicted_weights, target)
                total_loss += loss.item()
        
        return total_loss / len(dataset)
    
    def train(
        self,
        train_dataset: list,
        val_dataset: list,
        epochs: int = 50,
        save_path: str = None
    ):
        """Full training loop."""
        best_val_loss = float('inf')
        
        for epoch in range(epochs):
            print(f"\nEpoch {epoch + 1}/{epochs}")
            
            train_loss = self.train_epoch(train_dataset)
            val_loss = self.validate(val_dataset)
            
            self.train_losses.append(train_loss)
            self.val_losses.append(val_loss)
            
            print(f"Train Loss: {train_loss:.4f}")
            print(f"Val Loss: {val_loss:.4f}")
            
            self.scheduler.step(val_loss)
            
            if val_loss < best_val_loss and save_path:
                best_val_loss = val_loss
                os.makedirs(os.path.dirname(save_path), exist_ok=True)
                torch.save(self.model.state_dict(), save_path)
                print(f"Best model saved to {save_path}")


def main():
    """Main training function."""
    # Configuration
    NODE_FEATURE_DIM = 4
    EDGE_FEATURE_DIM = 3
    HIDDEN_DIM = 64
    NUM_LAYERS = 2
    NUM_NODES = 50
    GRID_SIZE = 8
    NUM_SCENARIOS = 1000
    BATCH_SIZE = 32
    EPOCHS = 30
    LEARNING_RATE = 0.001
    
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    print(f"Using device: {device}")
    
    # Create dataset
    dataset = SyntheticRoutingDataset(num_scenarios=NUM_SCENARIOS, num_nodes=NUM_NODES, grid_size=GRID_SIZE)
    
    # Split into train/val
    train_size = int(0.8 * len(dataset))
    val_size = len(dataset) - train_size
    train_dataset = dataset.scenarios[:train_size]
    val_dataset = dataset.scenarios[train_size:]
    
    print(f"Train scenarios: {len(train_dataset)}, Val scenarios: {len(val_dataset)}")
    
    # Create model
    model = SpatioTemporalGNN(
        node_feature_dim=NODE_FEATURE_DIM,
        edge_feature_dim=EDGE_FEATURE_DIM,
        hidden_dim=HIDDEN_DIM,
        num_layers=NUM_LAYERS,
        use_attention=True
    )
    
    # Train
    trainer = RoutingTrainer(model, device=device, learning_rate=LEARNING_RATE)
    
    trainer.train(
        train_dataset,
        val_dataset,
        epochs=EPOCHS,
        save_path='services/routing_engine/models/routing_gnn_best.pth'
    )
    
    print("\n" + "="*60)
    print("FINAL RESULTS")
    print("="*60)
    print(f"Final Val Loss: {trainer.val_losses[-1]:.4f}")


if __name__ == "__main__":
    main()
