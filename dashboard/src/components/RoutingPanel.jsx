import React, { useState } from 'react';
import { Route, MapPin, ArrowRight } from 'lucide-react';

function RoutingPanel({ apiUrl }) {
  const [routes, setRoutes] = useState([
    { id: 1, from: 'Zone A', to: 'Safe Zone 1', mode: 'gnn', cost: 2.3, status: 'active' },
    { id: 2, from: 'Zone B', to: 'Safe Zone 2', mode: 'fallback', cost: 3.1, status: 'active' },
  ]);

  const getModeColor = (mode) => {
    return mode === 'gnn' 
      ? 'bg-blue-500/20 text-blue-400' 
      : 'bg-orange-500/20 text-orange-400';
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Route className="w-5 h-5 text-resilio-primary" />
          <h2 className="text-lg font-semibold text-white">Evacuation Routes</h2>
        </div>
        <span className="text-sm text-resilio-success font-medium">{routes.length} Active</span>
      </div>

      <div className="space-y-3">
        {routes.map((route) => (
          <div
            key={route.id}
            className="bg-slate-700/50 rounded-lg p-4 border border-slate-600"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-white">{route.from}</span>
                <ArrowRight className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-white">{route.to}</span>
              </div>
              <span className={`text-xs px-2 py-1 rounded ${getModeColor(route.mode)}`}>
                {route.mode.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Cost: {route.cost.toFixed(1)}km</span>
              <span className="text-resilio-success text-xs">● {route.status}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-700">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Sensor Density: 78%</span>
          <span>GNN Mode: Active</span>
        </div>
      </div>
    </div>
  );
}

export default RoutingPanel;
