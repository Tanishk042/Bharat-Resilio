"""
Training script for Multi-Task Hazard Engine.
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from typing import Dict
import numpy as np
from tqdm import tqdm
import os

from model import MultiTaskHazardModel, MultiTaskLoss, DangerTier
from data_generator import create_dataloaders


class Trainer:
    """Trainer for multi-task hazard model."""
    
    def __init__(
        self,
        model: nn.Module,
        device: str = 'cpu',
        learning_rate: float = 0.001,
        regression_weight: float = 1.0,
        classification_weight: float = 1.0
    ):
        self.model = model.to(device)
        self.device = device
        self.criterion = MultiTaskLoss(
            regression_weight=regression_weight,
            classification_weight=classification_weight
        )
        self.optimizer = optim.Adam(model.parameters(), lr=learning_rate)
        self.scheduler = optim.lr_scheduler.ReduceLROnPlateau(
            self.optimizer, mode='min', patience=5, factor=0.5
        )
        
        self.history = {
            'train_loss': [],
            'val_loss': [],
            'train_reg_loss': [],
            'val_reg_loss': [],
            'train_cls_loss': [],
            'val_cls_loss': [],
            'train_mae': [],
            'val_mae': [],
            'train_acc': [],
            'val_acc': []
        }
    
    def train_epoch(self, dataloader: DataLoader) -> Dict[str, float]:
        """Train for one epoch."""
        self.model.train()
        total_loss = 0.0
        total_reg_loss = 0.0
        total_cls_loss = 0.0
        total_mae = 0.0
        correct = 0
        total = 0
        
        for features, severity, tier in tqdm(dataloader, desc="Training"):
            features = features.to(self.device)
            severity = severity.to(self.device)
            tier = tier.to(self.device)
            
            # Forward pass
            self.optimizer.zero_grad()
            severity_pred, tier_pred = self.model(features)
            
            # Loss
            loss, loss_dict = self.criterion(severity_pred, severity, tier_pred, tier)
            
            # Backward pass
            loss.backward()
            self.optimizer.step()
            
            # Statistics
            total_loss += loss_dict['total_loss']
            total_reg_loss += loss_dict['regression_loss']
            total_cls_loss += loss_dict['classification_loss']
            
            # MAE for regression
            mae = torch.abs(severity_pred.squeeze() - severity.squeeze()).mean().item()
            total_mae += mae
            
            # Accuracy for classification
            tier_probs = torch.softmax(tier_pred, dim=1)
            tier_pred_class = torch.argmax(tier_probs, dim=1)
            correct += (tier_pred_class == tier).sum().item()
            total += tier.size(0)
        
        n = len(dataloader)
        return {
            'loss': total_loss / n,
            'reg_loss': total_reg_loss / n,
            'cls_loss': total_cls_loss / n,
            'mae': total_mae / n,
            'acc': correct / total
        }
    
    def validate(self, dataloader: DataLoader) -> Dict[str, float]:
        """Validate the model."""
        self.model.eval()
        total_loss = 0.0
        total_reg_loss = 0.0
        total_cls_loss = 0.0
        total_mae = 0.0
        correct = 0
        total = 0
        
        with torch.no_grad():
            for features, severity, tier in tqdm(dataloader, desc="Validation"):
                features = features.to(self.device)
                severity = severity.to(self.device)
                tier = tier.to(self.device)
                
                severity_pred, tier_pred = self.model(features)
                loss, loss_dict = self.criterion(severity_pred, severity, tier_pred, tier)
                
                total_loss += loss_dict['total_loss']
                total_reg_loss += loss_dict['regression_loss']
                total_cls_loss += loss_dict['classification_loss']
                
                mae = torch.abs(severity_pred.squeeze() - severity.squeeze()).mean().item()
                total_mae += mae
                
                tier_probs = torch.softmax(tier_pred, dim=1)
                tier_pred_class = torch.argmax(tier_probs, dim=1)
                correct += (tier_pred_class == tier).sum().item()
                total += tier.size(0)
        
        n = len(dataloader)
        return {
            'loss': total_loss / n,
            'reg_loss': total_reg_loss / n,
            'cls_loss': total_cls_loss / n,
            'mae': total_mae / n,
            'acc': correct / total
        }
    
    def train(
        self,
        train_loader: DataLoader,
        val_loader: DataLoader,
        epochs: int = 50,
        save_path: str = None
    ) -> Dict[str, list]:
        """Full training loop."""
        best_val_loss = float('inf')
        
        for epoch in range(epochs):
            print(f"\nEpoch {epoch + 1}/{epochs}")
            
            train_metrics = self.train_epoch(train_loader)
            val_metrics = self.validate(val_loader)
            
            # Record history
            self.history['train_loss'].append(train_metrics['loss'])
            self.history['val_loss'].append(val_metrics['loss'])
            self.history['train_reg_loss'].append(train_metrics['reg_loss'])
            self.history['val_reg_loss'].append(val_metrics['reg_loss'])
            self.history['train_cls_loss'].append(train_metrics['cls_loss'])
            self.history['val_cls_loss'].append(val_metrics['cls_loss'])
            self.history['train_mae'].append(train_metrics['mae'])
            self.history['val_mae'].append(val_metrics['mae'])
            self.history['train_acc'].append(train_metrics['acc'])
            self.history['val_acc'].append(val_metrics['acc'])
            
            print(f"Train Loss: {train_metrics['loss']:.4f}, MAE: {train_metrics['mae']:.4f}, Acc: {train_metrics['acc']:.4f}")
            print(f"Val Loss: {val_metrics['loss']:.4f}, MAE: {val_metrics['mae']:.4f}, Acc: {val_metrics['acc']:.4f}")
            
            # Learning rate scheduling
            self.scheduler.step(val_metrics['loss'])
            
            # Save best model
            if val_metrics['loss'] < best_val_loss and save_path:
                best_val_loss = val_metrics['loss']
                os.makedirs(os.path.dirname(save_path), exist_ok=True)
                torch.save(self.model.state_dict(), save_path)
                print(f"Best model saved to {save_path}")
        
        return self.history


def main():
    """Main training function."""
    # Configuration
    INPUT_DIM = 10
    HIDDEN_DIM = 64
    BATCH_SIZE = 32
    EPOCHS = 30
    LEARNING_RATE = 0.001
    REGRESSION_WEIGHT = 1.0
    CLASSIFICATION_WEIGHT = 1.0
    
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    print(f"Using device: {device}")
    
    # Create dataloaders
    train_loader, val_loader = create_dataloaders(
        batch_size=BATCH_SIZE,
        train_ratio=0.8,
        hazard_type='mixed'
    )
    
    # Create model
    model = MultiTaskHazardModel(input_dim=INPUT_DIM, hidden_dim=HIDDEN_DIM)
    
    # Train
    trainer = Trainer(
        model,
        device=device,
        learning_rate=LEARNING_RATE,
        regression_weight=REGRESSION_WEIGHT,
        classification_weight=CLASSIFICATION_WEIGHT
    )
    
    history = trainer.train(
        train_loader,
        val_loader,
        epochs=EPOCHS,
        save_path='services/hazard_engine/models/hazard_model_best.pth'
    )
    
    # Final evaluation
    print("\n" + "="*60)
    print("FINAL RESULTS")
    print("="*60)
    print(f"Final Val Loss: {history['val_loss'][-1]:.4f}")
    print(f"Final Val MAE: {history['val_mae'][-1]:.4f}")
    print(f"Final Val Accuracy: {history['val_acc'][-1]:.4f}")
    
    # Test prediction
    print("\nTesting prediction on sample...")
    model.load_state_dict(torch.load('services/hazard_engine/models/hazard_model_best.pth'))
    sample_input = torch.randn(1, INPUT_DIM)
    prediction = model.predict(sample_input)
    print(f"Sample prediction: {prediction}")


if __name__ == "__main__":
    main()
