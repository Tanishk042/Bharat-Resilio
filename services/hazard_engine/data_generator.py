"""
Synthetic multi-sensor data generator for hazard engine training.

PRODUCTION_TODO: Replace with real multi-sensor disaster dataset.
Current implementation uses explicit rules to generate synthetic data:
- Flood height correlates with hydrological + barometric inputs
- Seismic magnitude correlates with ground motion sensors
- Audio anomaly weight from acoustic CNN

This allows the model to learn known relationships for demo purposes,
but real-world accuracy requires properly labeled disaster data.
"""

import numpy as np
import torch
from torch.utils.data import Dataset, DataLoader
from typing import Dict, Tuple
import json


class SyntheticHazardDataset(Dataset):
    """
    Synthetic dataset for multi-task hazard prediction.
    
    Features (10-dimensional):
    - seismic_magnitude: Ground motion magnitude (0-10)
    - seismic_frequency: Dominant frequency (Hz)
    - barometric_pressure: Atmospheric pressure (hPa)
    - barometric_trend: Pressure change rate (hPa/hr)
    - water_level: Water level (meters above baseline)
    - water_flow_rate: Flow rate (m³/s)
    - wind_speed: Wind speed (km/h)
    - temperature: Temperature (°C)
    - audio_anomaly_weight: Confidence from acoustic CNN (0-1)
    - precipitation: Precipitation rate (mm/hr)
    
    Targets:
    - severity_score: 0-10 scale
    - danger_tier: 0=Minimal, 1=Warning, 2=Catastrophic
    """
    
    def __init__(
        self,
        num_samples: int = 5000,
        hazard_type: str = 'mixed'  # 'flood', 'earthquake', 'mixed'
    ):
        self.num_samples = num_samples
        self.hazard_type = hazard_type
        
        self.features = []
        self.severity_scores = []
        self.danger_tiers = []
        
        print(f"Generating {num_samples} synthetic samples (type: {hazard_type})...")
        
        for _ in range(num_samples):
            features, severity, tier = self._generate_sample(hazard_type)
            self.features.append(features)
            self.severity_scores.append(severity)
            self.danger_tiers.append(tier)
        
        self.features = np.array(self.features, dtype=np.float32)
        self.severity_scores = np.array(self.severity_scores, dtype=np.float32)
        self.danger_tiers = np.array(self.danger_tiers, dtype=np.int64)
        
        print(f"Dataset generated: {len(self.features)} samples")
        print(f"Severity range: {self.severity_scores.min():.2f} - {self.severity_scores.max():.2f}")
        print(f"Tier distribution: {np.bincount(self.danger_tiers)}")
    
    def _generate_sample(self, hazard_type: str) -> Tuple[np.ndarray, float, int]:
        """Generate a single sample with known relationships."""
        
        if hazard_type == 'flood' or (hazard_type == 'mixed' and np.random.random() < 0.5):
            return self._generate_flood_sample()
        else:
            return self._generate_earthquake_sample()
    
    def _generate_flood_sample(self) -> Tuple[np.ndarray, float, int]:
        """Generate flood-related hazard sample."""
        
        # Base parameters
        water_level = np.random.uniform(0, 5)  # meters above baseline
        barometric_pressure = np.random.uniform(980, 1020)  # hPa
        barometric_trend = np.random.uniform(-5, 5)  # hPa/hr
        precipitation = np.random.uniform(0, 50)  # mm/hr
        water_flow_rate = water_level * np.random.uniform(10, 30)  # m³/s
        
        # Other sensors (less relevant for floods)
        seismic_magnitude = np.random.uniform(0, 2)
        seismic_frequency = np.random.uniform(1, 10)
        wind_speed = np.random.uniform(0, 30)
        temperature = np.random.uniform(10, 35)
        audio_anomaly_weight = np.random.uniform(0, 0.3)  # Low for floods
        
        # Calculate severity based on flood-specific rules
        # High water level + high precipitation + dropping pressure = severe flood
        flood_intensity = (
            0.4 * (water_level / 5) +
            0.3 * (precipitation / 50) +
            0.2 * (1 - (barometric_pressure - 980) / 40) +
            0.1 * (water_flow_rate / 150)
        )
        
        # Add some noise
        flood_intensity += np.random.normal(0, 0.1)
        flood_intensity = np.clip(flood_intensity, 0, 1)
        
        severity_score = flood_intensity * 10
        
        # Determine tier based on severity
        if severity_score < 3:
            tier = 0  # Minimal
        elif severity_score < 7:
            tier = 1  # Warning
        else:
            tier = 2  # Catastrophic
        
        features = np.array([
            seismic_magnitude,
            seismic_frequency,
            barometric_pressure,
            barometric_trend,
            water_level,
            water_flow_rate,
            wind_speed,
            temperature,
            audio_anomaly_weight,
            precipitation
        ], dtype=np.float32)
        
        return features, severity_score, tier
    
    def _generate_earthquake_sample(self) -> Tuple[np.ndarray, float, int]:
        """Generate earthquake-related hazard sample."""
        
        # Base parameters
        seismic_magnitude = np.random.uniform(0, 8)  # Richter scale
        seismic_frequency = np.random.uniform(1, 50)  # Hz
        audio_anomaly_weight = np.clip(seismic_magnitude / 8, 0, 1)  # Correlated
        
        # Other sensors (less relevant for earthquakes)
        barometric_pressure = np.random.uniform(990, 1010)
        barometric_trend = np.random.uniform(-2, 2)
        water_level = np.random.uniform(0, 1)
        water_flow_rate = np.random.uniform(0, 20)
        wind_speed = np.random.uniform(0, 20)
        temperature = np.random.uniform(15, 30)
        precipitation = np.random.uniform(0, 10)
        
        # Calculate severity based on earthquake-specific rules
        # High magnitude + high frequency = severe earthquake
        quake_intensity = (
            0.7 * (seismic_magnitude / 8) +
            0.2 * (seismic_frequency / 50) +
            0.1 * audio_anomaly_weight
        )
        
        # Add some noise
        quake_intensity += np.random.normal(0, 0.1)
        quake_intensity = np.clip(quake_intensity, 0, 1)
        
        severity_score = quake_intensity * 10
        
        # Determine tier based on severity
        if severity_score < 3:
            tier = 0  # Minimal
        elif severity_score < 7:
            tier = 1  # Warning
        else:
            tier = 2  # Catastrophic
        
        features = np.array([
            seismic_magnitude,
            seismic_frequency,
            barometric_pressure,
            barometric_trend,
            water_level,
            water_flow_rate,
            wind_speed,
            temperature,
            audio_anomaly_weight,
            precipitation
        ], dtype=np.float32)
        
        return features, severity_score, tier
    
    def __len__(self) -> int:
        return len(self.features)
    
    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        features = torch.from_numpy(self.features[idx])
        severity = torch.tensor([self.severity_scores[idx]], dtype=torch.float32)
        tier = torch.tensor(self.danger_tiers[idx], dtype=torch.long)
        return features, severity, tier


def create_dataloaders(
    batch_size: int = 32,
    train_ratio: float = 0.8,
    hazard_type: str = 'mixed'
) -> Tuple[DataLoader, DataLoader]:
    """Create train and validation dataloaders."""
    
    dataset = SyntheticHazardDataset(num_samples=5000, hazard_type=hazard_type)
    
    train_size = int(train_ratio * len(dataset))
    val_size = len(dataset) - train_size
    
    train_dataset, val_dataset = torch.utils.data.random_split(
        dataset, [train_size, val_size]
    )
    
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)
    
    return train_loader, val_loader


if __name__ == "__main__":
    # Test dataset generation
    dataset = SyntheticHazardDataset(num_samples=100, hazard_type='mixed')
    
    print(f"\nDataset size: {len(dataset)}")
    
    # Test a sample
    features, severity, tier = dataset[0]
    print(f"Features shape: {features.shape}")
    print(f"Severity: {severity.item():.2f}")
    print(f"Tier: {tier.item()}")
    
    # Test dataloader
    train_loader, val_loader = create_dataloaders(batch_size=16)
    print(f"\nTrain batches: {len(train_loader)}")
    print(f"Val batches: {len(val_loader)}")
