"""
BEDWUM Edge Acoustic Engine - 1D-CNN for hazard detection from audio.

This module implements both:
1. Raw waveform 1D-CNN (edge-deployable)
2. Spectrogram baseline (for comparison)

PRODUCTION_TODO: Replace synthetic data with real disaster-acoustic dataset.
Real-world deployment requires properly curated labeled audio samples.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Tuple, Optional


class RawWaveformCNN(nn.Module):
    """
    1D-CNN operating directly on raw audio waveforms.
    
    Input: (batch, 1, samples) - 16kHz mono audio
    Output: (batch, 1) - sigmoid confidence score for hazard detection
    """
    
    def __init__(self, sample_rate: int = 16000, window_sec: float = 1.5):
        super().__init__()
        self.sample_rate = sample_rate
        self.window_sec = window_sec
        self.input_samples = int(sample_rate * window_sec)
        
        # Convolutional blocks with strided convolutions
        self.conv_blocks = nn.Sequential(
            # Block 1: 1kHz -> 500Hz effective resolution
            nn.Conv1d(1, 32, kernel_size=64, stride=2, padding=32),
            nn.BatchNorm1d(32),
            nn.ReLU(),
            nn.MaxPool1d(kernel_size=2, stride=2),
            
            # Block 2
            nn.Conv1d(32, 64, kernel_size=32, stride=2, padding=16),
            nn.BatchNorm1d(64),
            nn.ReLU(),
            nn.MaxPool1d(kernel_size=2, stride=2),
            
            # Block 3
            nn.Conv1d(64, 128, kernel_size=16, stride=2, padding=8),
            nn.BatchNorm1d(128),
            nn.ReLU(),
            nn.MaxPool1d(kernel_size=2, stride=2),
            
            # Block 4
            nn.Conv1d(128, 256, kernel_size=8, stride=2, padding=4),
            nn.BatchNorm1d(256),
            nn.ReLU(),
        )
        
        # Adaptive pooling to handle variable input lengths
        self.adaptive_pool = nn.AdaptiveAvgPool1d(1)
        
        # Classification head
        self.classifier = nn.Sequential(
            nn.Dropout(0.3),
            nn.Linear(256, 128),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(128, 1),
            nn.Sigmoid()
        )
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Forward pass.
        
        Args:
            x: (batch, 1, samples) raw waveform
            
        Returns:
            (batch, 1) confidence scores
        """
        # Ensure correct input shape
        if x.dim() == 2:
            x = x.unsqueeze(1)
        
        # Pad or truncate to expected length
        if x.size(-1) < self.input_samples:
            x = F.pad(x, (0, self.input_samples - x.size(-1)))
        elif x.size(-1) > self.input_samples:
            x = x[:, :, :self.input_samples]
        
        # Convolutional feature extraction
        features = self.conv_blocks(x)
        
        # Global pooling
        pooled = self.adaptive_pool(features).squeeze(-1)
        
        # Classification
        output = self.classifier(pooled)
        
        return output


class SpectrogramCNN(nn.Module):
    """
    2D-CNN operating on log-mel spectrograms (baseline for comparison).
    
    This is typically more accurate than raw waveform CNNs at this model size,
    but requires more computation (FFT + 2D conv).
    
    Input: (batch, 1, mel_bins, time_frames)
    Output: (batch, 1) - sigmoid confidence score
    """
    
    def __init__(self, mel_bins: int = 64):
        super().__init__()
        self.mel_bins = mel_bins
        
        # 2D convolutional blocks
        self.conv_blocks = nn.Sequential(
            nn.Conv2d(1, 32, kernel_size=3, stride=1, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(),
            nn.MaxPool2d(kernel_size=2, stride=2),
            
            nn.Conv2d(32, 64, kernel_size=3, stride=1, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.MaxPool2d(kernel_size=2, stride=2),
            
            nn.Conv2d(64, 128, kernel_size=3, stride=1, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(),
            nn.MaxPool2d(kernel_size=2, stride=2),
            
            nn.Conv2d(128, 256, kernel_size=3, stride=1, padding=1),
            nn.BatchNorm2d(256),
            nn.ReLU(),
        )
        
        self.adaptive_pool = nn.AdaptiveAvgPool2d((1, 1))
        
        self.classifier = nn.Sequential(
            nn.Dropout(0.3),
            nn.Linear(256, 128),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(128, 1),
            nn.Sigmoid()
        )
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Forward pass.
        
        Args:
            x: (batch, 1, mel_bins, time_frames) spectrogram
            
        Returns:
            (batch, 1) confidence scores
        """
        features = self.conv_blocks(x)
        pooled = self.adaptive_pool(features).view(features.size(0), -1)
        output = self.classifier(pooled)
        return output


class TemporalGate:
    """
    Temporal pattern verification to reduce false positives.
    
    Requires >95% confidence windows to persist across N consecutive frames
    before triggering a wake signal.
    """
    
    def __init__(self, confidence_threshold: float = 0.95, min_consecutive: int = 3):
        self.confidence_threshold = confidence_threshold
        self.min_consecutive = min_consecutive
        self.consecutive_count = 0
        self.last_trigger_time = None
    
    def process_frame(self, confidence: float, timestamp: Optional[float] = None) -> Tuple[bool, int]:
        """
        Process a single frame's confidence score.
        
        Args:
            confidence: Model confidence score [0, 1]
            timestamp: Optional timestamp for the frame
            
        Returns:
            (triggered, consecutive_count) - Whether wake signal should trigger
        """
        if confidence >= self.confidence_threshold:
            self.consecutive_count += 1
        else:
            self.consecutive_count = 0
        
        triggered = self.consecutive_count >= self.min_consecutive
        
        if triggered and timestamp is not None:
            self.last_trigger_time = timestamp
        
        return triggered, self.consecutive_count
    
    def reset(self):
        """Reset the gate state."""
        self.consecutive_count = 0
        self.last_trigger_time = None


def export_to_onnx(model: nn.Module, output_path: str, sample_rate: int = 16000, window_sec: float = 1.5):
    """
    Export model to ONNX format for edge deployment.
    
    PRODUCTION_TODO: Test ONNX export on target edge hardware before deployment.
    """
    model.eval()
    dummy_input = torch.randn(1, 1, int(sample_rate * window_sec))
    
    torch.onnx.export(
        model,
        dummy_input,
        output_path,
        export_params=True,
        opset_version=14,
        input_names=['audio'],
        output_names=['confidence'],
        dynamic_axes={
            'audio': {0: 'batch_size'},
            'confidence': {0: 'batch_size'}
        }
    )
    print(f"Model exported to {output_path}")


if __name__ == "__main__":
    # Test model instantiation
    raw_model = RawWaveformCNN()
    spec_model = SpectrogramCNN()
    
    # Test forward pass
    dummy_audio = torch.randn(2, 1, 24000)  # 2 samples, 1.5 sec at 16kHz
    dummy_spec = torch.randn(2, 1, 64, 100)  # 2 spectrograms
    
    raw_output = raw_model(dummy_audio)
    spec_output = spec_model(dummy_spec)
    
    print(f"Raw waveform CNN output shape: {raw_output.shape}")
    print(f"Spectrogram CNN output shape: {spec_output.shape}")
    
    # Test temporal gate
    gate = TemporalGate()
    for conf in [0.96, 0.97, 0.98, 0.94, 0.96, 0.97]:
        triggered, count = gate.process_frame(conf)
        print(f"Confidence: {conf:.2f}, Consecutive: {count}, Triggered: {triggered}")
