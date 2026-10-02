# Resilio Disaster Coordination Platform

A decentralized disaster-coordination system with bioacoustic hazard detection, multi-sensor severity prediction, dynamic evacuation routing, and resilient failover infrastructure.

## Architecture Overview

Pipeline: `Acoustic sensor → edge anomaly gate → multi-task severity model → vision/text fusion → LLM-generated guidance → graph-based routing → mesh broadcast → resilient backend → incident dashboard`

## Repository Structure

```
resilio/
├── edge/                    # Edge ML modules
│   ├── acoustic_cnn/       # 1D-CNN training + inference
│   └── vision/             # YOLOv8-nano wrapper for hazard detection
├── services/                # Backend ML services
│   ├── hazard_engine/      # multi-task regression+classification model
│   ├── dex_llm_parser/     # free-text -> structured JSON extraction
│   ├── preparedness_engine/# RAG-based guidance generation
│   ├── routing_engine/     # spatio-temporal GNN + fallback router
│   ├── oracle_consensus/   # cross-sensor verification logic
│   └── api_gateway/        # unified API gateway
├── infra/                   # Infrastructure
│   ├── failover_cluster/   # active-passive health daemon + proxy
│   └── mesh_node/          # CRDT-based mesh sync service
├── ledger/                 # Solidity contracts + deploy scripts
├── dashboard/              # React frontend
├── scenarios/              # scripted demo scenarios
└── docker-compose.yml      # Orchestration
```

## Technology Stack

- **Edge/ML**: Python, PyTorch, ONNX, torchaudio
- **Backend**: FastAPI (Python), Node.js/TypeScript
- **LLM**: Ollama (local 3B-class instruct model)
- **Routing**: PyTorch Geometric, NetworkX
- **Mesh**: WebSocket-based simulation, Yjs/Automerge CRDTs
- **Encryption**: libsodium/signal-protocol bindings
- **Ledger**: Hardhat + Solidity (local testnet)
- **Frontend**: React + Tailwind CSS
- **Orchestration**: Docker Compose

## Phased Delivery

### Phase 1 (Core ML loop) ✅ COMPLETED
- ✅ Acoustic CNN + hazard engine + DeX-LLM parser
- ✅ FastAPI endpoints for all modules
- ✅ Synthetic data testing

### Phase 2 (Routing + Infra) ✅ COMPLETED
- ✅ GNN router + fallback (A*/Dijkstra)
- ✅ Failover cluster state machine

### Phase 3 (Mesh + Security) ✅ COMPLETED
- ✅ CRDT mesh sync with partition/recovery testing
- ✅ Device auth/signing (libsodium/Signal protocol)
- ✅ Oracle consensus verification logic

### Phase 4 (Guidance + Dashboard) ✅ COMPLETED
- ✅ RAG preparedness engine (ChromaDB + SentenceTransformer)
- ✅ React dashboard with live visualization
- ✅ End-to-end scenario runner (flood_drill.json)

### Phase 5 (Stretch) ✅ COMPLETED
- ✅ Edge Vision Module (YOLOv8-nano wrapper)
- ✅ Incident Ledger (Solidity + Hardhat)
- ✅ Docker Compose full stack

## Quick Start

```bash
# Start all services with Docker Compose
docker-compose up -d

# Access the dashboard
open http://localhost:3000

# Run demo scenario
cd scenarios
python runner.py flood_drill.json

# Test individual services
curl http://localhost:8080/health  # API Gateway
curl http://localhost:8001/health  # Acoustic CNN
curl http://localhost:8002/health  # Hazard Engine
curl http://localhost:8003/health  # DeX-LLM Parser
curl http://localhost:8004/health  # Routing Engine
curl http://localhost:8005/health  # Oracle Consensus
curl http://localhost:8006/health  # Preparedness Engine
curl http://localhost:8007/health  # Edge Vision
```

## Service Endpoints

| Service | Port | Endpoint |
|---------|------|----------|
| API Gateway | 8080 | http://localhost:8080 |
| Acoustic CNN | 8001 | http://localhost:8001 |
| Hazard Engine | 8002 | http://localhost:8002 |
| DeX-LLM Parser | 8003 | http://localhost:8003 |
| Routing Engine | 8004 | http://localhost:8004 |
| Oracle Consensus | 8005 | http://localhost:8005 |
| Preparedness Engine | 8006 | http://localhost:8006 |
| Edge Vision | 8007 | http://localhost:8007 |
| Failover Proxy | 8081 | http://localhost:8081 |
| Mesh Node A | 9001 | ws://localhost:9001 |
| Mesh Node B | 9002 | ws://localhost:9002 |
| Ollama LLM | 11434 | http://localhost:11434 |
| Chroma DB | 8008 | http://localhost:8008 |
| Dashboard | 3000 | http://localhost:3000 |

## Project Status

**All phases completed.** The Resilio Disaster Coordination Platform prototype is fully implemented with all specified modules.

### Completed Modules

1. **BEDWUM Edge Acoustic Engine** - 1D-CNN + spectrogram baseline with temporal gating
2. **Multi-Task Hazard Engine** - Severity regression + tier classification with synthetic data
3. **DeX-LLM Citizen Text Parser** - LLM-based parsing with redaction filter
4. **Spatio-Temporal GNN Routing** - Dynamic evacuation routing with A* fallback
5. **Active-Passive Failover Cluster** - State machine with health monitoring
6. **Mesh Networking** - CRDT-based sync with partition/recovery testing
7. **Device Authentication** - libsodium/Signal protocol implementation
8. **Oracle Consensus** - Incident verification with corroboration
9. **RAG Guidance Engine** - Emergency guidance with ChromaDB + SentenceTransformer
10. **React Dashboard** - Live visualization with TailwindCSS
11. **Scenario Runner** - End-to-end flood drill execution
12. **Edge Vision Module** - YOLOv8-nano wrapper for hazard detection
13. **Incident Ledger** - Solidity smart contract for audit logging
14. **Docker Compose** - Full stack orchestration

### Key Features

- **Modular Architecture**: Each module is independently deployable
- **Graceful Degradation**: Fallback mechanisms for reliability
- **Security**: Device authentication, encryption, consensus verification
- **Scalability**: Mesh networking, failover clustering
- **Audit Trail**: Blockchain-based incident logging
- **Real-time**: Live dashboard with WebSocket connections

### Production TODOs

Each module includes detailed PRODUCTION_TODO notes in its README:
- Replace simulated components with real hardware
- Train custom models on real disaster data
- Deploy to production networks
- Implement proper authentication/authorization
- Add monitoring and alerting
- Optimize for edge deployment

## Simulation vs. Reality

This prototype uses simulated equivalents for hardware-dependent components:
- **Simulated**: Physical TPM/PUF silicon, real drone fleets, real LoRa radios
- **Real**: ML models, routing algorithms, CRDT sync, encryption protocols
- **Swappable**: Clear interfaces for real hardware integration later

See individual module READMEs for detailed simulation notes.

## License

MIT License - See LICENSE file for details
