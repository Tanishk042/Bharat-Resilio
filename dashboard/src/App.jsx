import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import './index.css';

function App() {
  const [apiUrl, setApiUrl] = useState(process.env.REACT_APP_API_URL || 'http://localhost:8080');
  const [wsUrl, setWsUrl] = useState(process.env.REACT_APP_WS_URL || 'ws://localhost:9001');

  return (
    <div className="min-h-screen bg-slate-900">
      <Dashboard apiUrl={apiUrl} wsUrl={wsUrl} />
    </div>
  );
}

export default App;
