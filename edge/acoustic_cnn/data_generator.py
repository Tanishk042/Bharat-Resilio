"""
Synthetic audio data generator for acoustic CNN training.

PRODUCTION_TODO: Replace with real disaster-acoustic dataset.
Current implementation uses:
- ESC-50/UrbanSound8K for "baseline noise" class
- Synthetically generated seismic/rumble audio for "anomaly" class

A production system needs properly curated, labeled disaster audio samples.
"""

import numpy as np
import torch
from torch.utils.data import Dataset
from typing import Tuple, Optional
import soundfile as sf
import os


class SyntheticAudioDataset(Dataset):
    """
    Synthetic dataset for hazard vs. baseline noise classification.
    
    Labels:
    - 0: Baseline noise (environmental sounds)
    - 1: Hazard signature (seismic rumble, structural failure)
    """
    
    def __init__(
        self,
        num_samples: int = 1000,
        sample_rate: int = 16000,
        window_sec: float = 1.5,
        hazard_ratio: float = 0.3,
        use_real_baseline: bool = False,
        baseline_path: Optional[str] = None
    ):
        self.num_samples = num_samples
        self.sample_rate = sample_rate
        self.window_sec = window_sec
        self.window_samples = int(sample_rate * window_sec)
        self.hazard_ratio = hazard_ratio
        
        # Generate synthetic data
        self.audio_data = []
        self.labels = []
        
        num_hazard = int(num_samples * hazard_ratio)
        num_baseline = num_samples - num_hazard
        
        print(f"Generating {num_hazard} hazard samples and {num_baseline} baseline samples...")
        
        # Generate hazard samples
        for _ in range(num_hazard):
            audio = self._generate_hazard_audio()
            self.audio_data.append(audio)
            self.labels.append(1)
        
        # Generate baseline samples
        for _ in range(num_baseline):
            if use_real_baseline and baseline_path and os.path.exists(baseline_path):
                audio = self._load_real_baseline(baseline_path)
            else:
                audio = self._generate_baseline_audio()
            self.audio_data.append(audio)
            self.labels.append(0)
        
        # Shuffle
        indices = np.random.permutation(len(self.audio_data))
        self.audio_data = [self.audio_data[i] for i in indices]
        self.labels = [self.labels[i] for i in indices]
        
        print(f"Dataset generated: {len(self.audio_data)} samples")
    
    def _generate_hazard_audio(self) -> np.ndarray:
        """
        Generate synthetic hazard audio (seismic rumble, structural failure).
        
        Characteristics:
        - Low-frequency dominant (20-200 Hz)
        - Amplitude modulation
        - Non-stationary
        """
        duration = self.window_sec
        t = np.linspace(0, duration, self.window_samples)
        
        # Base low-frequency rumble (multiple harmonics)
        audio = np.zeros_like(t)
        for freq in [30, 45, 60, 90]:
            amplitude = np.random.uniform(0.3, 0.7)
            phase = np.random.uniform(0, 2 * np.pi)
            audio += amplitude * np.sin(2 * np.pi * freq * t + phase)
        
        # Add amplitude modulation (simulating distance/intensity changes)
        mod_freq = np.random.uniform(0.5, 2.0)
        audio *= (0.5 + 0.5 * np.sin(2 * np.pi * mod_freq * t))
        
        # Add non-stationary bursts
        num_bursts = np.random.randint(2, 5)
        for _ in range(num_bursts):
            burst_start = np.random.uniform(0, duration - 0.2)
            burst_duration = np.random.uniform(0.05, 0.2)
            burst_freq = np.random.uniform(100, 300)
            burst_mask = (t >= burst_start) & (t < burst_start + burst_duration)
            audio[burst_mask] += np.random.uniform(0.2, 0.5) * np.sin(2 * np.pi * burst_freq * t[burst_mask])
        
        # Add noise
        audio += np.random.normal(0, 0.05, size=len(t))
        
        # Normalize
        audio = audio / np.max(np.abs(audio) + 1e-8)
        
        return audio.astype(np.float32)
    
    def _generate_baseline_audio(self) -> np.ndarray:
        """
        Generate synthetic baseline noise (environmental sounds).
        
        Characteristics:
        - Higher frequency content
        - More stationary
        - Lower amplitude
        """
        duration = self.window_sec
        t = np.linspace(0, duration, self.window_samples)
        
        # Pink noise approximation
        audio = np.random.normal(0, 1, size=len(t))
        
        # Apply 1/f filter (pink noise)
        fft = np.fft.fft(audio)
        freqs = np.fft.fftfreq(len(t), 1/self.sample_rate)
        fft = fft / (np.abs(freqs) + 1e-8)
        audio = np.real(np.fft.ifft(fft))
        
        # Add some tonal components (machinery, wind, etc.)
        num_tones = np.random.randint(0, 3)
        for _ in range(num_tones):
            freq = np.random.uniform(200, 2000)
            amplitude = np.random.uniform(0.05, 0.15)
            audio += amplitude * np.sin(2 * np.pi * freq * t)
        
        # Normalize
        audio = audio / np.max(np.abs(audio) + 1e-8)
        
        return audio.astype(np.float32)
    
    def _load_real_baseline(self, path: str) -> np.ndarray:
        """
        Load a real baseline audio sample from file.
        
        PRODUCTION_TODO: Implement proper dataset loading from ESC-50/UrbanSound8K.
        """
        try:
            audio, sr = sf.read(path)
            if sr != self.sample_rate:
                # Resample would be needed here
                pass
            
            # Trim or pad to window length
            if len(audio) > self.window_samples:
                start = np.random.randint(0, len(audio) - self.window_samples)
                audio = audio[start:start + self.window_samples]
            elif len(audio) < self.window_samples:
                audio = np.pad(audio, (0, self.window_samples - len(audio)))
            
            return audio.astype(np.float32)
        except Exception as e:
            print(f"Error loading baseline: {e}, falling back to synthetic")
            return self._generate_baseline_audio()
    
    def __len__(self) -> int:
        return len(self.audio_data)
    
    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, int]:
        audio = torch.from_numpy(self.audio_data[idx]).unsqueeze(0)  # Add channel dim
        label = self.labels[idx]
        return audio, label


def compute_spectrogram(audio: torch.Tensor, sample_rate: int = 16000, n_mels: int = 64) -> torch.Tensor:
    """
    Compute log-mel spectrogram from audio waveform.
    
    PRODUCTION_TODO: Use torchaudio.transforms.MelSpectrogram for production.
    This is a simplified numpy-based implementation for prototype.
    """
    import librosa
    
    audio_np = audio.squeeze().numpy()
    
    # Compute mel spectrogram
    mel_spec = librosa.feature.melspectrogram(
        y=audio_np,
        sr=sample_rate,
        n_mels=n_mels,
        n_fft=2048,
        hop_length=512
    )
    
    # Convert to log scale
    log_mel = librosa.power_to_db(mel_spec, ref=np.max)
    
    # Normalize
    log_mel = (log_mel - log_mel.mean()) / (log_mel.std() + 1e-8)
    
    return torch.from_numpy(log_mel).unsqueeze(0).float()


if __name__ == "__main__":
    # Test dataset generation
    dataset = SyntheticAudioDataset(num_samples=100, hazard_ratio=0.3)
    
    print(f"\nDataset size: {len(dataset)}")
    
    # Test a sample
    audio, label = dataset[0]
    print(f"Sample audio shape: {audio.shape}, label: {label}")
    
    # Test spectrogram computation
    spec = compute_spectrogram(audio)
    print(f"Spectrogram shape: {spec.shape}")
