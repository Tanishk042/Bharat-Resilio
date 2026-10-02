import React from 'react';
import { Shield, Network, AlertTriangle } from 'lucide-react';

function Header() {
  return (
    <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-resilio-primary p-2 rounded-lg">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Resilio</h1>
            <p className="text-sm text-slate-400">Disaster Coordination Platform</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-slate-700 px-3 py-2 rounded-lg">
            <Network className="w-4 h-4 text-resilio-success" />
            <span className="text-sm text-slate-300">Mesh Connected</span>
          </div>
          <div className="flex items-center space-x-2 bg-slate-700 px-3 py-2 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-resilio-accent" />
            <span className="text-sm text-slate-300">Active Alerts: 3</span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
