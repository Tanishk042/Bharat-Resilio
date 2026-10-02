# BEDWUM Edge Acoustic Engine

1D-CNN for hazard detection from audio waveforms.

## Overview

This module implements acoustic anomaly detection using two approaches:
1. **Raw Waveform 1D-CNN** - Operates directly on audio samples (edge-deployable)
2. **Spectrogram 2D-CNN** - Baseline using log-mel spectrograms (for comparison)

Both models classify audio windows as:
- **0**: Baseline noise (environmental sounds)
- **1**: Hazard signature (seismic rumble, structural failure)

## Simulation vs. Reality

**What's simulated:**
- Training data uses synthetic audio generation
- Real disaster-acoustic datasets are scarce for prototype

**What's real:**
- CNN architectures are production-ready
- Temporal gating logic is implemented as specified
- ONNX export for edge deployment is functional

**PRODUCTION_TODO:**
- Replace synthetic data with real disaster-acoustic dataset
- Use ESC-50/UrbanSound8K for baseline noise class
- Collect or source real seismic/structural failure audio for hazard class
- Test ONNX models on target edge hardware

## Files

- `model.py` - CNN architectures and temporal gate
- `data_generator.py` - Synthetic audio data generation
- `train.py` - Training script for both models
- `inference.py` - Real-time inference with streaming simulator
- `models/` - Trained model weights and ONNX exports

## Usage

### Training

```bash
cd edge/acoustic_cnn
python train.py
```

This will:
1. Generate synthetic training data
2. Train both raw waveform and spectrogram models
3. Compare validation accuracies
4. Export best models to ONNX format

### Inference

```bash
cd edge/acoustic_cnn
python inference.py
```

This runs a streaming simulation that:
1. Generates synthetic audio in real-time
2. Processes it through the trained model
3. Applies temporal gating to reduce false positives
4. Emits wake_signal events when hazards are detected

## Model Architecture

### Raw Waveform CNN
- Input: (batch, 1, 24000) - 1.5 seconds at 16kHz
- 4 Conv1d blocks with BatchNorm, ReLU, MaxPool
- AdaptiveAvgPool1d for global pooling
- 2-layer MLP classifier with dropout
- Output: Sigmoid confidence score

### Spectrogram CNN
- Input: (batch, 1, 64, time_frames) - Log-mel spectrogram
- 4 Conv2d blocks with BatchNorm, ReLU, MaxPool
- AdaptiveAvgPool2d for global pooling
- 2-layer MLP classifier with dropout
- Output: Sigmoid confidence score

## Temporal Gating

To reduce false positives, the system requires:
- Confidence > 95% threshold
- Persist across N consecutive frames (default: 3)
- Only then triggers a wake_signal event

This prevents transient false positives from alerting.

## Dependencies

- torch
- torchaudio
- librosa
- soundfile
- numpy
- tqdm

## Expected Performance

Based on synthetic data:
- Raw waveform CNN: ~85-90% accuracy (noisier but faster)
- Spectrogram CNN: ~90-95% accuracy (more accurate but slower)

**Note:** These are on synthetic data. Real-world performance depends on quality of labeled disaster audio dataset.
