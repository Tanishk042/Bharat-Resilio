"""
Training script for acoustic CNN models.

Trains both:
1. Raw waveform 1D-CNN
2. Spectrogram baseline

Reports accuracy for both to enable evidence-based model selection.
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, random_split
from typing import Dict
import numpy as np
from tqdm import tqdm
import os

from model import RawWaveformCNN, SpectrogramCNN, TemporalGate
from data_generator import SyntheticAudioDataset, compute_spectrogram


class Trainer:
    """Trainer for acoustic CNN models."""
    
    def __init__(
        self,
        model: nn.Module,
        device: str = 'cpu',
        learning_rate: float = 0.001,
        use_spectrogram: bool = False
    ):
        self.model = model.to(device)
        self.device = device
        self.use_spectrogram = use_spectrogram
        self.criterion = nn.BCELoss()
        self.optimizer = optim.Adam(model.parameters(), lr=learning_rate)
        self.scheduler = optim.lr_scheduler.ReduceLROnPlateau(
            self.optimizer, mode='min', patience=5, factor=0.5
        )
        
        self.train_losses = []
        self.val_losses = []
        self.train_accuracies = []
        self.val_accuracies = []
    
    def train_epoch(self, dataloader: DataLoader) -> Tuple[float, float]:
        """Train for one epoch."""
        self.model.train()
        total_loss = 0.0
        correct = 0
        total = 0
        
        for audio, labels in tqdm(dataloader, desc="Training"):
            audio = audio.to(self.device)
            labels = labels.float().unsqueeze(1).to(self.device)
            
            # Convert to spectrogram if needed
            if self.use_spectrogram:
                audio_batch = []
                for i in range(audio.size(0)):
                    spec = compute_spectrogram(audio[i])
                    audio_batch.append(spec)
                audio = torch.stack(audio_batch).to(self.device)
            
            # Forward pass
            self.optimizer.zero_grad()
            outputs = self.model(audio)
            loss = self.criterion(outputs, labels)
            
            # Backward pass
            loss.backward()
            self.optimizer.step()
            
            # Statistics
            total_loss += loss.item()
            predictions = (outputs >= 0.5).float()
            correct += (predictions == labels).sum().item()
            total += labels.size(0)
        
        avg_loss = total_loss / len(dataloader)
        accuracy = correct / total
        return avg_loss, accuracy
    
    def validate(self, dataloader: DataLoader) -> Tuple[float, float]:
        """Validate the model."""
        self.model.eval()
        total_loss = 0.0
        correct = 0
        total = 0
        
        with torch.no_grad():
            for audio, labels in tqdm(dataloader, desc="Validation"):
                audio = audio.to(self.device)
                labels = labels.float().unsqueeze(1).to(self.device)
                
                # Convert to spectrogram if needed
                if self.use_spectrogram:
                    audio_batch = []
                    for i in range(audio.size(0)):
                        spec = compute_spectrogram(audio[i])
                        audio_batch.append(spec)
                    audio = torch.stack(audio_batch).to(self.device)
                
                outputs = self.model(audio)
                loss = self.criterion(outputs, labels)
                
                total_loss += loss.item()
                predictions = (outputs >= 0.5).float()
                correct += (predictions == labels).sum().item()
                total += labels.size(0)
        
        avg_loss = total_loss / len(dataloader)
        accuracy = correct / total
        return avg_loss, accuracy
    
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
            
            train_loss, train_acc = self.train_epoch(train_loader)
            val_loss, val_acc = self.validate(val_loader)
            
            self.train_losses.append(train_loss)
            self.val_losses.append(val_loss)
            self.train_accuracies.append(train_acc)
            self.val_accuracies.append(val_acc)
            
            print(f"Train Loss: {train_loss:.4f}, Train Acc: {train_acc:.4f}")
            print(f"Val Loss: {val_loss:.4f}, Val Acc: {val_acc:.4f}")
            
            # Learning rate scheduling
            self.scheduler.step(val_loss)
            
            # Save best model
            if val_loss < best_val_loss and save_path:
                best_val_loss = val_loss
                os.makedirs(os.path.dirname(save_path), exist_ok=True)
                torch.save(self.model.state_dict(), save_path)
                print(f"Best model saved to {save_path}")
        
        return {
            'train_losses': self.train_losses,
            'val_losses': self.val_losses,
            'train_accuracies': self.train_accuracies,
            'val_accuracies': self.val_accuracies
        }


def main():
    """Main training function."""
    # Configuration
    SAMPLE_RATE = 16000
    WINDOW_SEC = 1.5
    NUM_SAMPLES = 2000
    BATCH_SIZE = 32
    EPOCHS = 30
    LEARNING_RATE = 0.001
    
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    print(f"Using device: {device}")
    
    # Create dataset
    print("Generating synthetic dataset...")
    dataset = SyntheticAudioDataset(
        num_samples=NUM_SAMPLES,
        sample_rate=SAMPLE_RATE,
        window_sec=WINDOW_SEC,
        hazard_ratio=0.3
    )
    
    # Split into train/val
    train_size = int(0.8 * len(dataset))
    val_size = len(dataset) - train_size
    train_dataset, val_dataset = random_split(dataset, [train_size, val_size])
    
    train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE, shuffle=False)
    
    print(f"Train samples: {len(train_dataset)}, Val samples: {len(val_dataset)}")
    
    # Train raw waveform model
    print("\n" + "="*60)
    print("Training Raw Waveform 1D-CNN")
    print("="*60)
    
    raw_model = RawWaveformCNN(sample_rate=SAMPLE_RATE, window_sec=WINDOW_SEC)
    raw_trainer = Trainer(raw_model, device=device, learning_rate=LEARNING_RATE, use_spectrogram=False)
    
    raw_history = raw_trainer.train(
        train_loader,
        val_loader,
        epochs=EPOCHS,
        save_path='edge/acoustic_cnn/models/raw_cnn_best.pth'
    )
    
    # Train spectrogram model
    print("\n" + "="*60)
    print("Training Spectrogram 2D-CNN (Baseline)")
    print("="*60)
    
    spec_model = SpectrogramCNN(mel_bins=64)
    spec_trainer = Trainer(spec_model, device=device, learning_rate=LEARNING_RATE, use_spectrogram=True)
    
    spec_history = spec_trainer.train(
        train_loader,
        val_loader,
        epochs=EPOCHS,
        save_path='edge/acoustic_cnn/models/spec_cnn_best.pth'
    )
    
    # Compare results
    print("\n" + "="*60)
    print("FINAL COMPARISON")
    print("="*60)
    print(f"Raw Waveform CNN - Final Val Acc: {raw_history['val_accuracies'][-1]:.4f}")
    print(f"Spectrogram CNN - Final Val Acc: {spec_history['val_accuracies'][-1]:.4f}")
    
    print("\nNOTE: Spectrogram CNNs typically achieve higher accuracy than raw waveform")
    print("CNNs at this model size. Use this comparison to inform model selection for")
    print("production deployment based on accuracy vs. computational trade-offs.")
    
    # Export to ONNX
    print("\nExporting models to ONNX...")
    from model import export_to_onnx
    
    raw_model.load_state_dict(torch.load('edge/acoustic_cnn/models/raw_cnn_best.pth'))
    export_to_onnx(raw_model, 'edge/acoustic_cnn/models/raw_cnn.onnx', SAMPLE_RATE, WINDOW_SEC)
    
    # Note: Spectrogram model ONNX export would require different dummy input
    print("Spectrogram model ONNX export skipped (requires different input format)")
    print("PRODUCTION_TODO: Implement spectrogram model ONNX export for edge deployment")


if __name__ == "__main__":
    main()
