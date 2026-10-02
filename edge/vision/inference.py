"""
Real-time inference engine for Edge Vision Module.

Processes video streams for hazard detection.
"""

import cv2
import numpy as np
import time
from typing import Optional, Callable
from model import VisionModel


class VisionInferenceEngine:
    """Real-time vision inference engine."""
    
    def __init__(
        self,
        model: VisionModel,
        confidence_threshold: float = 0.5,
        frame_skip: int = 5  # Process every Nth frame for efficiency
    ):
        self.model = model
        self.confidence_threshold = confidence_threshold
        self.frame_skip = frame_skip
        self.frame_count = 0
        self.last_detection_time = 0
        self.detection_callback: Optional[Callable] = None
    
    def set_detection_callback(self, callback: Callable):
        """Set callback for hazard detection events."""
        self.detection_callback = callback
    
    def process_frame(self, frame: np.ndarray) -> Optional[dict]:
        """
        Process a single video frame.
        
        Args:
            frame: Video frame as numpy array
            
        Returns:
            Detection result or None if frame skipped
        """
        self.frame_count += 1
        
        # Skip frames for efficiency
        if self.frame_count % self.frame_skip != 0:
            return None
        
        # Run hazard detection
        result = self.model.detect_hazards(frame, self.confidence_threshold)
        
        # Trigger callback if hazard detected
        if result['hazard_detected'] and self.detection_callback:
            self.detection_callback(result)
        
        return result
    
    def process_video_stream(self, source: str = 0, duration: int = 30):
        """
        Process video stream from camera or file.
        
        Args:
            source: Video source (camera index or file path)
            duration: Duration in seconds to process
        """
        cap = cv2.VideoCapture(source)
        
        if not cap.isOpened():
            print(f"Error: Could not open video source {source}")
            return
        
        print(f"Processing video stream from {source}")
        print(f"Duration: {duration}s")
        print(f"Frame skip: {self.frame_skip}")
        
        start_time = time.time()
        fps_counter = 0
        fps_start = time.time()
        
        try:
            while True:
                # Check duration
                if time.time() - start_time > duration:
                    print("Duration reached, stopping")
                    break
                
                # Read frame
                ret, frame = cap.read()
                if not ret:
                    print("End of video stream")
                    break
                
                # Process frame
                result = self.process_frame(frame)
                
                # Calculate FPS
                fps_counter += 1
                if time.time() - fps_start >= 1.0:
                    fps = fps_counter / (time.time() - fps_start)
                    print(f"FPS: {fps:.1f}", end='\r')
                    fps_counter = 0
                    fps_start = time.time()
                
                # Display frame with detections (optional)
                if result and result['hazard_detected']:
                    self._draw_detections(frame, result)
                    cv2.imshow('Vision Detection', frame)
                    
                    if cv2.waitKey(1) & 0xFF == ord('q'):
                        break
        
        finally:
            cap.release()
            cv2.destroyAllWindows()
            print("\nVideo processing complete")
    
    def _draw_detections(self, frame: np.ndarray, result: dict):
        """Draw detection boxes on frame."""
        for det in result['detections']:
            x1, y1, x2, y2 = det['bbox']
            confidence = det['confidence']
            class_name = det['class']
            
            # Draw box
            cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), (0, 255, 0), 2)
            
            # Draw label
            label = f"{class_name}: {confidence:.2f}"
            cv2.putText(frame, label, (int(x1), int(y1) - 10),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)


class VisionSimulator:
    """Simulates video stream for testing without camera."""
    
    def __init__(self, width: int = 640, height: int = 480):
        self.width = width
        self.height = height
    
    def generate_frame(self) -> np.ndarray:
        """Generate a synthetic video frame."""
        # Create random frame
        frame = np.random.randint(0, 255, (self.height, self.width, 3), dtype=np.uint8)
        
        # Add some structure (gradient)
        for y in range(self.height):
            for x in range(self.width):
                frame[y, x] = [
                    int(255 * x / self.width),
                    int(255 * y / self.height),
                    128
                ]
        
        return frame
    
    def simulate_stream(self, duration: int = 10, fps: int = 30):
        """
        Simulate video stream.
        
        Args:
            duration: Duration in seconds
            fps: Frames per second
        """
        print(f"Simulating video stream: {duration}s @ {fps}fps")
        
        frame_interval = 1.0 / fps
        start_time = time.time()
        frame_count = 0
        
        while time.time() - start_time < duration:
            frame = self.generate_frame()
            frame_count += 1
            yield frame
            time.sleep(frame_interval)
        
        print(f"Simulated {frame_count} frames")


if __name__ == "__main__":
    # Test inference engine
    print("Testing Vision Inference Engine\n")
    
    model = VisionModel()
    engine = VisionInferenceEngine(model, confidence_threshold=0.5, frame_skip=5)
    
    # Set detection callback
    def on_hazard_detected(result):
        print(f"\n⚠️  HAZARD DETECTED!")
        print(f"   Types: {result['hazard_types']}")
        print(f"   Severity: {result['severity']}")
    
    engine.set_detection_callback(on_hazard_detected)
    
    # Test with simulator
    print("1. Testing with video simulator...")
    simulator = VisionSimulator()
    
    for i, frame in enumerate(simulator.simulate_stream(duration=5, fps=30)):
        if i % 10 == 0:
            print(f"Processing frame {i}")
        result = engine.process_frame(frame)
    
    print("\n2. Testing with synthetic frame...")
    dummy_frame = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
    result = engine.process_frame(dummy_frame)
    print(f"Result: {result}")
    
    print("\nAll tests completed!")
