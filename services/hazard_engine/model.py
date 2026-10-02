"""
Multi-Task Hazard & Intensity Engine

Shared-backbone network with:
- Regression head: severity magnitude (0-10 scale)
- Classification head: danger tier (Minimal/Warning/Catastrophic)

PRODUCTION_TODO: Replace synthetic data with real multi-sensor disaster dataset.
Real-world deployment requires properly labeled multi-modal sensor data.
"""

import torch
import torch.nn as nn
from typing import Tuple
from enum import Enum


class DangerTier(Enum):
    """Danger tier classification."""
    MINIMAL = 0
    WARNING = 1
    CATASTROPHIC = 2


class MultiTaskHazardModel(nn.Module):
    """
    Multi-task model for hazard prediction.
    
    Input: Fixed-width feature vector from multiple sensors
    - Seismic data (magnitude, frequency)
    - Barometric pressure
    - Hydrological data (water level, flow rate)
    - Audio anomaly weight (from acoustic CNN)
    
    Outputs:
    - Regression: severity_score (0-10)
    - Classification: danger_tier (0, 1, 2)
    """
    
    def __init__(self, input_dim: int = 10, hidden_dim: int = 64):
        super().__init__()
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        
        # Shared backbone
        self.backbone = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.BatchNorm1d(hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.2),
            
            nn.Linear(hidden_dim, hidden_dim),
            nn.BatchNorm1d(hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.2),
            
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.BatchNorm1d(hidden_dim // 2),
            nn.ReLU(),
            nn.Dropout(0.2),
        )
        
        # Regression head (severity score)
        self.regression_head = nn.Sequential(
            nn.Linear(hidden_dim // 2, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
            nn.Sigmoid()  # Output 0-1, will scale to 0-10
        )
        
        # Classification head (danger tier)
        self.classification_head = nn.Sequential(
            nn.Linear(hidden_dim // 2, 32),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(32, 3)  # 3 classes: Minimal, Warning, Catastrophic
        )
    
    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Forward pass.
        
        Args:
            x: (batch, input_dim) sensor features
            
        Returns:
            (severity_score, danger_tier_logits)
            - severity_score: (batch, 1) in range [0, 1] (multiply by 10 for 0-10 scale)
            - danger_tier_logits: (batch, 3) class logits
        """
        # Shared feature extraction
        features = self.backbone(x)
        
        # Multi-task outputs
        severity = self.regression_head(features) * 10.0  # Scale to 0-10
        tier_logits = self.classification_head(features)
        
        return severity, tier_logits
    
    def predict(self, x: torch.Tensor) -> dict:
        """
        Full prediction with post-processing.
        
        Returns:
            dict with severity_score, danger_tier, confidence
        """
        self.eval()
        with torch.no_grad():
            severity, tier_logits = self.forward(x)
            tier_probs = torch.softmax(tier_logits, dim=1)
            tier_pred = torch.argmax(tier_probs, dim=1)
            confidence = torch.max(tier_probs, dim=1).values
        
        return {
            'severity_score': severity.item(),
            'danger_tier': tier_pred.item(),
            'tier_name': DangerTier(tier_pred.item()).name,
            'confidence': confidence.item()
        }


class MultiTaskLoss(nn.Module):
    """
    Combined loss for multi-task learning.
    
    Weighted combination of:
    - MSE loss for regression (severity)
    - Cross-entropy loss for classification (tier)
    """
    
    def __init__(self, regression_weight: float = 1.0, classification_weight: float = 1.0):
        super().__init__()
        self.regression_weight = regression_weight
        self.classification_weight = classification_weight
        
        self.mse_loss = nn.MSELoss()
        self.ce_loss = nn.CrossEntropyLoss()
    
    def forward(
        self,
        severity_pred: torch.Tensor,
        severity_true: torch.Tensor,
        tier_pred: torch.Tensor,
        tier_true: torch.Tensor
    ) -> Tuple[torch.Tensor, dict]:
        """
        Compute combined loss.
        
        Args:
            severity_pred: (batch, 1) predicted severity
            severity_true: (batch, 1) true severity
            tier_pred: (batch, 3) predicted tier logits
            tier_true: (batch,) true tier labels
            
        Returns:
            (total_loss, loss_dict)
        """
        # Regression loss
        reg_loss = self.mse_loss(severity_pred.squeeze(), severity_true.squeeze())
        
        # Classification loss
        cls_loss = self.ce_loss(tier_pred, tier_true)
        
        # Combined loss
        total_loss = (
            self.regression_weight * reg_loss +
            self.classification_weight * cls_loss
        )
        
        loss_dict = {
            'total_loss': total_loss.item(),
            'regression_loss': reg_loss.item(),
            'classification_loss': cls_loss.item()
        }
        
        return total_loss, loss_dict


if __name__ == "__main__":
    # Test model
    model = MultiTaskHazardModel(input_dim=10)
    
    # Test forward pass
    dummy_input = torch.randn(4, 10)
    severity, tier_logits = model(dummy_input)
    
    print(f"Severity output shape: {severity.shape}")
    print(f"Tier logits shape: {tier_logits.shape}")
    
    # Test prediction
    prediction = model.predict(dummy_input[:1])
    print(f"\nPrediction: {prediction}")
    
    # Test loss
    loss_fn = MultiTaskLoss()
    dummy_severity_true = torch.tensor([[5.0], [3.0], [7.0], [2.0]])
    dummy_tier_true = torch.tensor([0, 1, 2, 0])
    
    total_loss, loss_dict = loss_fn(severity, dummy_severity_true, tier_logits, dummy_tier_true)
    print(f"\nLoss: {loss_dict}")
