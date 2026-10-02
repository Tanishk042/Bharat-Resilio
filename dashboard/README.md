# Resilio Dashboard

React-based dashboard for the Resilio Disaster Coordination Platform.

## Overview

Modern React dashboard with live visualization:
- Real-time hazard detection display
- Evacuation routing visualization
- Mesh network status
- Oracle consensus statistics
- Emergency guidance display
- System health monitoring

## Tech Stack

- React 18
- TailwindCSS for styling
- Lucide React for icons
- Recharts for data visualization
- Axios for API calls

## Simulation vs. Reality

**What's simulated:**
- Mock data for demonstration
- Simulated WebSocket connections
- Placeholder API endpoints

**What's real:**
- React architecture is production-ready
- Component structure is modular
- Styling uses modern TailwindCSS
- API integration pattern is correct

**PRODUCTION_TODO:**
- Connect to real backend APIs
- Implement actual WebSocket connections
- Add real-time data streaming
- Implement authentication
- Add data persistence

## Files

- `src/App.jsx` - Main application component
- `src/components/Dashboard.jsx` - Main dashboard layout
- `src/components/Header.jsx` - Header with status indicators
- `src/components/SystemStatus.jsx` - System health display
- `src/components/HazardPanel.jsx` - Hazard detection panel
- `src/components/RoutingPanel.jsx` - Evacuation routing panel
- `src/components/MeshPanel.jsx` - Mesh network status
- `src/components/ConsensusPanel.jsx` - Oracle consensus stats
- `src/components/GuidancePanel.jsx` - Emergency guidance display

## Usage

### Development

```bash
cd dashboard
npm install
npm start
```

### Production Build

```bash
cd dashboard
npm run build
```

### Environment Variables

```bash
export REACT_APP_API_URL=http://localhost:8080
export REACT_APP_WS_URL=ws://localhost:9001
```

## Dashboard Components

### Header
- Platform branding
- Mesh connection status
- Active alert count

### System Status
- Service health indicators
- API endpoint status
- Last update timestamp

### Hazard Detection
- Active hazard list
- Severity indicators
- Tier classification
- Time since detection

### Evacuation Routes
- Active evacuation routes
- Routing mode (GNN/Fallback)
- Path cost
- Sensor density

### Mesh Network
- Node connection status
- Incident counts per node
- CRDT version
- Last sync time

### Oracle Consensus
- Verification statistics
- Pending incidents
- Verification rate
- Rejected incidents

### Emergency Guidance
- RAG-generated guidance
- Hazard type and tier
- Cached status
- Context document count

## API Integration

The dashboard polls the following endpoints:
- `/proxy/status` - System health (every 5s)
- `/statistics` - Consensus stats (every 10s)
- `/incidents` - Incident list (every 10s)

WebSocket connections:
- Mesh node status (simulated)

## Styling

Uses TailwindCSS with custom Resilio colors:
- Primary: #2563eb (blue)
- Secondary: #1e40af (dark blue)
- Accent: #f59e0b (amber)
- Danger: #dc2626 (red)
- Success: #16a34a (green)

## Dependencies

- react
- react-dom
- react-scripts
- lucide-react
- recharts
- axios
- tailwindcss
- autoprefixer
- postcss

## Expected Performance

Based on simulation:
- Initial load: ~2s
- API polling: 5-10s intervals
- WebSocket latency: < 100ms (local)
- UI updates: < 50ms

**Note:** Production performance depends on backend API response times and network conditions.

## Production Deployment

For production deployment:
1. Connect to real backend APIs
2. Implement authentication/authorization
3. Add error handling and retry logic
4. Implement proper logging
5. Add data persistence
6. Optimize for performance (code splitting, lazy loading)
7. Add monitoring and analytics
8. Implement proper WebSocket reconnection logic
