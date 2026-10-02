import React, { useState, useEffect } from 'react';
import { Activity, AlertTriangle, Waves, Flame } from 'lucide-react';

function HazardPanel({ apiUrl }) {
  const [hazards, setHazards] = useState([
    { id: 1, type: 'flood', location: 'Zone A', severity: 7, tier: 'Warning', time: '2 min ago' },
    { id: 2, type: 'earthquake', location: 'Zone B', severity: 5, tier: 'Minimal', time: '5 min ago' },
    { id: 3, type: 'fire', location: 'Zone C', severity: 8, tier: 'Warning', time: '8 min ago' },
  ]);

  const getHazardIcon = (type) => {
    switch (type) {
      case 'flood':
        return <Waves className="w-5 h-5 text-blue-400" />;
      case 'earthquake':
        return <Activity className="w-5 h-5 text-orange-400" />;
      case 'fire':
        return <Flame className="w-5 h-5 text-red-400" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
    }
  };

  const getTierColor = (tier) => {
    switch (tier) {
      case 'Catastrophic':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'Warning':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'Minimal':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-resilio-accent" />
          <h2 className="text-lg font-semibold text-white">Hazard Detection</h2>
        </div>
        <span className="text-sm text-resilio-accent font-medium">{hazards.length} Active</span>
      </div>

      <div className="space-y-3">
        {hazards.map((hazard) => (
          <div
            key={hazard.id}
            className="bg-slate-700/50 rounded-lg p-4 border border-slate-600"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2">
                {getHazardIcon(hazard.type)}
                <span className="font-medium text-white capitalize">{hazard.type}</span>
              </div>
              <span className={`text-xs px-2 py-1 rounded border ${getTierColor(hazard.tier)}`}>
                {hazard.tier}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">{hazard.location}</span>
              <span className="text-slate-500">{hazard.time}</span>
            </div>
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Severity</span>
                <span>{hazard.severity}/10</span>
              </div>
              <div className="w-full bg-slate-600 rounded-full h-1.5">
                <div
                  className="bg-resilio-accent h-1.5 rounded-full transition-all"
                  style={{ width: `${hazard.severity * 10}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default HazardPanel;
