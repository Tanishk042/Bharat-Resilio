import React from 'react';
import { Server, CheckCircle, XCircle, Clock } from 'lucide-react';

function SystemStatus({ systemHealth }) {
  const services = [
    { name: 'API Gateway', status: 'healthy', url: 'http://localhost:8080' },
    { name: 'Acoustic CNN', status: 'healthy', url: 'http://localhost:8001' },
    { name: 'Hazard Engine', status: 'healthy', url: 'http://localhost:8002' },
    { name: 'DeX-LLM Parser', status: 'healthy', url: 'http://localhost:8003' },
    { name: 'Routing Engine', status: 'healthy', url: 'http://localhost:8004' },
    { name: 'Oracle Consensus', status: 'healthy', url: 'http://localhost:8005' },
    { name: 'Preparedness Engine', status: 'healthy', url: 'http://localhost:8006' },
    { name: 'Edge Vision', status: 'healthy', url: 'http://localhost:8007' },
    { name: 'Failover Proxy', status: 'healthy', url: 'http://localhost:8081' },
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-resilio-success" />;
      case 'unhealthy':
        return <XCircle className="w-5 h-5 text-resilio-danger" />;
      case 'unreachable':
        return <XCircle className="w-5 h-5 text-resilio-danger" />;
      default:
        return <Clock className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500/10 text-green-400 border-green-500/30';
      case 'unhealthy':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'unreachable':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  const healthyCount = services.filter(s => s.status === 'healthy').length;

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Server className="w-5 h-5 text-resilio-primary" />
          <h2 className="text-lg font-semibold text-white">System Status</h2>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-resilio-success font-medium">
            {healthyCount}/{services.length} Healthy
          </span>
          <span className="text-sm text-slate-400">
            Last updated: {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {services.map((service, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg border ${getStatusColor(service.status)}`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">{service.name}</span>
              {getStatusIcon(service.status)}
            </div>
            <p className="text-xs opacity-75">{service.url}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SystemStatus;
