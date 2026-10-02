import React, { useState, useEffect } from 'react';
import Header from './Header';
import HazardPanel from './HazardPanel';
import RoutingPanel from './RoutingPanel';
import MeshPanel from './MeshPanel';
import ConsensusPanel from './ConsensusPanel';
import GuidancePanel from './GuidancePanel';
import SystemStatus from './SystemStatus';
import VisionPanel from './VisionPanel';
import LedgerPanel from './LedgerPanel';
import FailoverPanel from './FailoverPanel';
import FeaturePlaceholder from './FeaturePlaceholder';

function Dashboard({ apiUrl, wsUrl }) {
  const [systemHealth, setSystemHealth] = useState({});
  const [incidents, setIncidents] = useState([]);
  const [meshStatus, setMeshStatus] = useState(null);
  const [consensusStats, setConsensusStats] = useState(null);
  const [visionStats, setVisionStats] = useState(null);
  const [ledgerStats, setLedgerStats] = useState(null);
  const [failoverStatus, setFailoverStatus] = useState(null);

  useEffect(() => {
    // Poll system health every 5 seconds
    const healthInterval = setInterval(async () => {
      try {
        const response = await fetch(`${apiUrl}/health`);
        const data = await response.json();
        setSystemHealth(data);
      } catch (error) {
        console.error('Failed to fetch system health:', error);
      }
    }, 5000);

    // Poll consensus stats every 10 seconds
    const consensusInterval = setInterval(async () => {
      try {
        const response = await fetch('http://localhost:8005/statistics');
        const data = await response.json();
        setConsensusStats(data);
      } catch (error) {
        console.error('Failed to fetch consensus stats:', error);
      }
    }, 10000);

    // Poll incidents every 10 seconds
    const incidentsInterval = setInterval(async () => {
      try {
        const response = await fetch('http://localhost:8005/incidents');
        const data = await response.json();
        setIncidents(data.incidents || []);
      } catch (error) {
        console.error('Failed to fetch incidents:', error);
      }
    }, 10000);

    // Poll vision stats every 10 seconds
    const visionInterval = setInterval(async () => {
      try {
        const response = await fetch('http://localhost:8007/health');
        const data = await response.json();
        setVisionStats(data);
      } catch (error) {
        console.error('Failed to fetch vision stats:', error);
      }
    }, 10000);

    // Poll failover status every 5 seconds
    const failoverInterval = setInterval(async () => {
      try {
        const response = await fetch('http://localhost:8081/status');
        const data = await response.json();
        setFailoverStatus(data);
      } catch (error) {
        console.error('Failed to fetch failover status:', error);
      }
    }, 5000);

    return () => {
      clearInterval(healthInterval);
      clearInterval(consensusInterval);
      clearInterval(incidentsInterval);
      clearInterval(visionInterval);
      clearInterval(failoverInterval);
    };
  }, [apiUrl]);

  return (
    <div className="flex flex-col h-screen">
      <Header />
      
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* System Status */}
          <div className="lg:col-span-2 xl:col-span-3">
            <SystemStatus systemHealth={systemHealth} />
          </div>

          {/* Hazard Detection */}
          <HazardPanel apiUrl={apiUrl} />

          {/* Routing */}
          <RoutingPanel apiUrl={apiUrl} />

          {/* Failover Cluster */}
          <FailoverPanel failoverStatus={failoverStatus} />

          {/* Mesh Network */}
          <MeshPanel wsUrl={wsUrl} />

          {/* Consensus */}
          <ConsensusPanel consensusStats={consensusStats} incidents={incidents} />

          {/* Guidance */}
          <GuidancePanel />

          {/* Edge Vision */}
          <VisionPanel visionStats={visionStats} />

          {/* Incident Ledger */}
          <LedgerPanel ledgerStats={ledgerStats} />

          {/* Feature Placeholder - Future: Real-time Alerts */}
          <FeaturePlaceholder 
            title="Real-time Alerts"
            description="Configure alert thresholds and notification channels"
            icon="⚠️"
          />

          {/* Feature Placeholder - Future: Analytics */}
          <FeaturePlaceholder 
            title="Analytics Dashboard"
            description="Historical incident analysis and trend visualization"
            icon="📊"
          />

          {/* Feature Placeholder - Future: Resource Management */}
          <FeaturePlaceholder 
            title="Resource Management"
            description="Track and allocate emergency resources"
            icon="📦"
          />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
