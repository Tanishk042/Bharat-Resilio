import React from 'react';
import { Camera, Eye, AlertTriangle } from 'lucide-react';

function VisionPanel({ visionStats }) {
  const [detections, setDetections] = React.useState([
    { id: 1, type: 'person', confidence: 0.92, location: 'Zone A', time: '10s ago' },
    { id: 2, type: 'vehicle', confidence: 0.87, location: 'Zone B', time: '15s ago' },
  ]);

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Camera className="w-5 h-5 text-resilio-primary" />
          <h2 className="text-lg font-semibold text-white">Edge Vision</h2>
        </div>
        <span className="text-sm text-resilio-success font-medium">{detections.length} Active</span>
      </div>

      <div className="space-y-3">
        {detections.map((det) => (
          <div
            key={det.id}
            className="bg-slate-700/50 rounded-lg p-4 border border-slate-600"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Eye className="w-4 h-4 text-blue-400" />
                <span className="font-medium text-white capitalize">{det.type}</span>
              </div>
              <span className="text-xs text-slate-400">{det.confidence.toFixed(2)} confidence</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">{det.location}</span>
              <span className="text-slate-500">{det.time}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-700">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Model: YOLOv8-nano</span>
          <span>FPS: 15</span>
        </div>
      </div>
    </div>
  );
}

export default VisionPanel;
