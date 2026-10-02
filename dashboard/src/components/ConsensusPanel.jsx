import React from 'react';
import { ShieldCheck, Clock, CheckCircle, XCircle } from 'lucide-react';

function ConsensusPanel({ consensusStats, incidents }) {
  const stats = consensusStats || {
    total_incidents: 0,
    verified: 0,
    pending: 0,
    rejected: 0,
    verification_rate: 0
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-resilio-primary" />
          <h2 className="text-lg font-semibold text-white">Oracle Consensus</h2>
        </div>
        <span className="text-sm text-resilio-success font-medium">
          {(stats.verification_rate * 100).toFixed(0)}% Verified
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/30">
          <div className="flex items-center space-x-2 mb-1">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-sm text-slate-400">Verified</span>
          </div>
          <span className="text-2xl font-bold text-white">{stats.verified}</span>
        </div>
        <div className="bg-yellow-500/10 rounded-lg p-3 border border-yellow-500/30">
          <div className="flex items-center space-x-2 mb-1">
            <Clock className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-slate-400">Pending</span>
          </div>
          <span className="text-2xl font-bold text-white">{stats.pending}</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Total Incidents</span>
          <span className="text-white">{stats.total_incidents}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Rejected</span>
          <span className="text-resilio-danger">{stats.rejected}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Verification Rate</span>
          <span className="text-resilio-success">{(stats.verification_rate * 100).toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}

export default ConsensusPanel;
