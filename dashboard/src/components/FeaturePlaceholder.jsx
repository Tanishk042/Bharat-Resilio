import React from 'react';

function FeaturePlaceholder({ title, description, icon }) {
  return (
    <div className="bg-slate-800/50 rounded-xl border border-dashed border-slate-600 p-6 flex flex-col items-center justify-center text-center min-h-[200px]">
      <div className="text-4xl mb-3 opacity-50">{icon}</div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-400">{description}</p>
      <div className="mt-4 px-3 py-1 bg-slate-700 rounded-full text-xs text-slate-300">
        Coming Soon
      </div>
    </div>
  );
}

export default FeaturePlaceholder;
