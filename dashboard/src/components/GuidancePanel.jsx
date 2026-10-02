import React, { useState } from 'react';
import { BookOpen, AlertCircle } from 'lucide-react';

function GuidancePanel() {
  const [guidance, setGuidance] = useState({
    hazard_type: 'flood',
    tier: 'Warning',
    text: 'Evacuate immediately to higher ground. Never walk or drive through flood waters - just 6 inches of moving water can knock you down. Turn around, don\'t drown. If you are in a vehicle and water rises around it, abandon it immediately and move to higher ground.',
    cached: true
  });

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <BookOpen className="w-5 h-5 text-resilio-primary" />
          <h2 className="text-lg font-semibold text-white">Emergency Guidance</h2>
        </div>
        {guidance.cached && (
          <span className="text-xs text-slate-400">● Cached</span>
        )}
      </div>

      <div className="mb-3">
        <div className="flex items-center space-x-2 mb-2">
          <AlertCircle className="w-4 h-4 text-resilio-accent" />
          <span className="text-sm font-medium capitalize text-white">
            {guidance.hazard_type} - {guidance.tier}
          </span>
        </div>
      </div>

      <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
        <p className="text-sm text-slate-300 leading-relaxed">{guidance.text}</p>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-700">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>RAG Context: 3 documents</span>
          <span>Generated: 2 min ago</span>
        </div>
      </div>
    </div>
  );
}

export default GuidancePanel;
