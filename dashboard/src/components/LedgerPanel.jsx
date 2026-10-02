import React from 'react';
import { FileText, Shield, Lock } from 'lucide-react';

function LedgerPanel({ ledgerStats }) {
  const [incidents, setIncidents] = React.useState([
    { id: 1, hash: '0x7f3a...', type: 'flood', verified: true, timestamp: '2 min ago' },
    { id: 2, hash: '0x9b2e...', type: 'earthquake', verified: true, timestamp: '5 min ago' },
  ]);

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <FileText className="w-5 h-5 text-resilio-primary" />
          <h2 className="text-lg font-semibold text-white">Incident Ledger</h2>
        </div>
        <div className="flex items-center space-x-1">
          <Lock className="w-4 h-4 text-resilio-success" />
          <span className="text-xs text-resilio-success">Blockchain</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/30">
          <div className="text-xs text-slate-400 mb-1">Verified</div>
          <div className="text-xl font-bold text-white">{incidents.length}</div>
        </div>
        <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/30">
          <div className="text-xs text-slate-400 mb-1">Total Blocks</div>
          <div className="text-xl font-bold text-white">{incidents.length + 12}</div>
        </div>
      </div>

      <div className="space-y-2">
        {incidents.map((inc) => (
          <div
            key={inc.id}
            className="bg-slate-700/50 rounded-lg p-3 border border-slate-600"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-white capitalize">{inc.type}</span>
              {inc.verified && (
                <Shield className="w-3 h-3 text-resilio-success" />
              )}
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-mono">{inc.hash}</span>
              <span className="text-slate-400">{inc.timestamp}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-700">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Network: Hardhat Local</span>
          <span>Gas: 150k avg</span>
        </div>
      </div>
    </div>
  );
}

export default LedgerPanel;
