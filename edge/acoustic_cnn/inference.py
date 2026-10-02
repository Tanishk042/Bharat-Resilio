"""
Inference script for acoustic CNN with temporal gating.

Streams audio through the model and emits wake_signal events when hazard detected.
"""

import torch
import numpy as np
from typing import Optional, Callable
import queue
import threading
import time

from model import RawWaveformCNN, TemporalGate


class AcousticInferenceEngine:
    """
    Real-time inference engine for acoustic hazard detection.
    
    Processes audio streams through the CNN and applies temporal gating
    to reduce false positives.
    """
    
    def __init__(
        self,
        model_path: str,
        sample_rate: int = 16000,
        window_sec: float = 1.5,
        confidence_threshold: float = 0.95,
        min_consecutive: int = 3,
        device: str = 'cpu'
    ):
        self.sample_rate = sample_rate
        self.window_sec = window_sec
        self.window_samples = int(sample_rate * window_sec)
        self.device = device
        
        # Load model
        self.model = RawWaveformCNN(sample_rate=sample_rate, window_sec=window_sec)
        self.model.load_state_dict(torch.load(model_path, map_location=device))
        self.model.to(device)
        self.model.eval()
        
        # Temporal gate
        self.gate = TemporalGate(
            confidence_threshold=confidence_threshold,
            min_consecutive=min_consecutive
        )
        
        # Audio buffer
        self.audio_buffer = np.zeros(self.window_samples, dtype=np.float32)
        self.buffer_index = 0
        
        # Event callback
        self.wake_callback: Optional[Callable] = None
    
    def set_wake_callback(self, callback: Callable):
        """Set callback function for wake_signal events."""
        self.wake_callback = callback
    
    def process_audio_chunk(self, audio_chunk: np.ndarray) -> Optional[dict]:
        """
        Process a chunk of audio data.
        
        Args:
            audio_chunk: Audio samples (float32, normalized to [-1, 1])
            
        Returns:
            Event dict if wake signal triggered, None otherwise
        """
        # Add to buffer
        chunk_len = len(audio_chunk)
        if self.buffer_index + chunk_len > self.window_samples:
            # Buffer overflow, shift and add
            shift = (self.buffer_index + chunk_len) - self.window_samples
            self.audio_buffer = np.roll(self.audio_buffer, -shift)
            self.audio_buffer[-chunk_len:] = audio_chunk
            self.buffer_index = self.window_samples
        else:
            self.audio_buffer[self.buffer_index:self.buffer_index + chunk_len] = audio_chunk
            self.buffer_index += chunk_len
        
        # Process if buffer is full
        if self.buffer_index >= self.window_samples:
            return self._process_window()
        
        return None
    
    def _process_window(self) -> Optional[dict]:
        """Process a full window of audio."""
        # Prepare input
        audio_tensor = torch.from_numpy(self.audio_buffer).unsqueeze(0).unsqueeze(0)
        audio_tensor = audio_tensor.to(self.device)
        
        # Inference
        with torch.no_grad():
            confidence = self.model(audio_tensor).item()
        
        # Temporal gating
        triggered, consecutive = self.gate.process_frame(confidence, time.time())
        
        # Reset buffer
        self.buffer_index = 0
        
        # Emit event if triggered
        if triggered and self.wake_callback:
            event = {
                'type': 'wake_signal',
                'confidence': confidence,
                'consecutive_frames': consecutive,
                'timestamp': time.time(),
                'model': 'raw_waveform_cnn'
            }
            self.wake_callback(event)
            return event
        
        return None
    
    def reset(self):
        """Reset the inference engine state."""
        self.audio_buffer = np.zeros(self.window_samples, dtype=np.float32)
        self.buffer_index = 0
        self.gate.reset()


class StreamingSimulator:
    """
    Simulates streaming audio for testing.
    
    Generates synthetic audio and feeds it through the inference engine.
    """
    
    def __init__(self, inference_engine: AcousticInferenceEngine):
        self.engine = inference_engine
        self.running = False
        self.thread = None
    
    def _generate_audio_stream(self):
        """Generate synthetic audio stream."""
        chunk_size = 1600  # 100ms chunks at 16kHz
        hazard_active = False
        hazard_timer = 0
        
        while self.running:
            # Decide whether to generate hazard
            if not hazard_active and np.random.random() < 0.01:  # 1% chance per chunk
                hazard_active = True
                hazard_timer = np.random.randint(20, 50)  # 2-5 seconds of hazard
            
            # Generate audio chunk
            if hazard_active:
                chunk = self._generate_hazard_chunk(chunk_size)
                hazard_timer -= 1
                if hazard_timer <= 0:
                    hazard_active = False
            else:
                chunk = self._generate_baseline_chunk(chunk_size)
            
            # Process through engine
            self.engine.process_audio_chunk(chunk)
            
            # Simulate real-time (100ms per chunk)
            time.sleep(0.1)
    
    def _generate_hazard_chunk(self, size: int) -> np.ndarray:
        """Generate hazard audio chunk."""
        t = np.linspace(0, size / 16000, size)
        audio = np.zeros_like(t)
        
        # Low-frequency rumble
        for freq in [30, 45, 60]:
            amplitude = np.random.uniform(0.3, 0.7)
            phase = np.random.uniform(0, 2 * np.pi)
            audio += amplitude * np.sin(2 * np.pi * freq * t + phase)
        
        # Add noise
        audio += np.random.normal(0, 0.05, size=len(t))
        
        # Normalize
        audio = audio / np.max(np.abs(audio) + 1e-8)
        
        return audio.astype(np.float32)
    
    def _generate_baseline_chunk(self, size: int) -> np.ndarray:
        """Generate baseline audio chunk."""
        audio = np.random.normal(0, 1, size)
        
        # Pink noise approximation
        fft = np.fft.fft(audio)
        freqs = np.fft.fftfreq(size, 1/16000)
        fft = fft / (np.abs(freqs) + 1e-8)
        audio = np.real(np.fft.ifft(fft))
        
        # Normalize
        audio = audio / np.max(np.abs(audio) + 1e-8)
        
        return audio.astype(np.float32)
    
    def start(self):
        """Start streaming simulation."""
        self.running = True
        self.thread = threading.Thread(target=self._generate_audio_stream)
        self.thread.start()
        print("Streaming simulation started")
    
    def stop(self):
        """Stop streaming simulation."""
        self.running = False
        if self.thread:
            self.thread.join()
        print("Streaming simulation stopped")


def main():
    """Main inference demo."""
    # Check if model exists
    model_path = 'edge/acoustic_cnn/models/raw_cnn_best.pth'
    
    try:
        # Create inference engine
        engine = AcousticInferenceEngine(
            model_path=model_path,
            device='cpu'
        )
        
        # Set up event callback
        def on_wake_signal(event):
            print(f"\n⚠️  WAKE SIGNAL DETECTED!")
            print(f"   Confidence: {event['confidence']:.4f}")
            print(f"   Consecutive frames: {event['consecutive_frames']}")
            print(f"   Timestamp: {event['timestamp']}")
        
        engine.set_wake_callback(on_wake_signal)
        
        # Create and start simulator
        simulator = StreamingSimulator(engine)
        
        print("Starting acoustic inference simulation...")
        print("Press Ctrl+C to stop\n")
        
        simulator.start()
        
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            simulator.stop()
            print("\nSimulation stopped")
    
    except FileNotFoundError:
        print(f"Model not found at {model_path}")
        print("Please train the model first by running: python edge/acoustic_cnn/train.py")


if __name__ == "__main__":
    main()
