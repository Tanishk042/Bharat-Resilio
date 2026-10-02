import React, { useState, useEffect } from 'react';
import { Network, Wifi, WifiOff } from 'lucide-react';

function MeshPanel({ wsUrl }) {
  const [nodes, setNodes] = useState([
    { id: 'node-a', status: 'connected', incidents: 5, lastSync: '2s ago' },
    { id: 'node-b', status: 'connected', incidents: 3, lastSync: '5s ago' },
    { id: 'node-c', status: 'disconnected', incidents: 0, lastSync: '1m ago' },
  ]);

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Network className="w-5 h-5 text-resilio-primary" />
          <h2 className="text-lg font-semibold text-white">Mesh Network</h2>
        </div>
        <span className="text-sm text-resilio-success font-medium">
          {nodes.filter(n => n.status === 'connected').length} Connected
        </span>
      </div>

      <div className="space-y-3">
        {nodes.map((node) => (
          <div
            key={node.id}
            className="bg-slate-700/50 rounded-lg p-4 border border-slate-600"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-white">{node.id}</span>
              {node.status === 'connected' ? (
                <Wifi className="w-4 h-4 text-resilio-success" />
              ) : (
                <WifiOff className="w-4 h-4 text-resilio-danger" />
              )}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Incidents: {node.incidents}</span>
              <span className="text-slate-500">{node.lastSync}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-700">
        <div className="text-xs text-slate-400">
          <div className="flex items-center justify-between mb-1">
            <span>CRDT Version</span>
            <span>v42</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Last Sync</span>
            <span>2s ago</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MeshPanel;
