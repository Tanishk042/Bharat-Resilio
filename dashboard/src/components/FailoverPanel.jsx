import React from 'react';
import { Server, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

function FailoverPanel({ failoverStatus }) {
  const [status, setStatus] = React.useState({
    state: 'NORMAL',
    primary: 'healthy',
    secondary: 'healthy',
    lastFailover: 'Never',
    uptime: '99.9%'
  });

  const getStateColor = (state) => {
    switch (state) {
      case 'NORMAL':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'FAILOVER':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'SELF_HEALING':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const getStatusIcon = (status) => {
    return status === 'healthy' 
      ? <CheckCircle className="w-4 h-4 text-resilio-success" />
      : <XCircle className="w-4 h-4 text-resilio-danger" />;
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Server className="w-5 h-5 text-resilio-primary" />
          <h2 className="text-lg font-semibold text-white">Failover Cluster</h2>
        </div>
        <span className={`text-xs px-2 py-1 rounded border ${getStateColor(status.state)}`}>
          {status.state}
        </span>
      </div>

      <div className="space-y-3">
        <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-white">Primary Instance</span>
            {getStatusIcon(status.primary)}
          </div>
          <div className="text-xs text-slate-400">hazard-engine:8000</div>
        </div>

        <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-white">Secondary Instance</span>
            {getStatusIcon(status.secondary)}
          </div>
          <div className="text-xs text-slate-400">hazard-engine-backup:8000</div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-700">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Last Failover: {status.lastFailover}</span>
          <span>Uptime: {status.uptime}</span>
        </div>
      </div>
    </div>
  );
}

export default FailoverPanel;
