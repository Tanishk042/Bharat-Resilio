# Scenario Runner

End-to-end disaster drill scenario execution.

## Overview

Executes disaster drill scenarios by coordinating all Resilio modules:
- Hazard detection simulation
- Citizen report parsing
- Oracle consensus verification
- Guidance generation (RAG)
- Evacuation routing (GNN/Fallback)
- Mesh network sync
- Failover testing

## Simulation vs. Reality

**What's simulated:**
- Event timing is simulated (time-based execution)
- API calls are logged but not executed (demo mode)
- Sensor data is simulated

**What's real:**
- Scenario structure is production-ready
- Event ordering is correct
- Module coordination logic is sound
- Logging and reporting work correctly

**PRODUCTION_TODO:**
- Integrate with real-time service APIs
- Connect to actual sensor streams
- Implement proper error handling and retries
- Add real-time visualization
- Support multiple concurrent scenarios

## Files

- `flood_drill.json` - Flood drill scenario definition
- `runner.py` - Scenario execution engine
- `README.md` - This file

## Usage

### Run Scenario

```bash
cd scenarios
python runner.py
```

### Create Custom Scenario

Create a JSON file with the following structure:

```json
{
  "scenario_id": "unique_id",
  "name": "Scenario Name",
  "description": "Description",
  "duration_seconds": 300,
  "zones": [...],
  "timeline": [
    {
      "time": 0,
      "event": "event_type",
      "description": "Description"
    }
  ],
  "expected_outcomes": {...}
}
```

## Event Types

- `scenario_start` - Scenario initialization
- `hazard_detection` - Acoustic sensor detects hazard
- `citizen_report` - Citizen submits incident report
- `consensus_verification` - Oracle verifies incident
- `guidance_generation` - RAG generates guidance
- `routing_calculation` - GNN calculates route
- `routing_fallback` - Fallback routing
- `mesh_sync` - Mesh nodes sync via CRDT
- `failover_trigger` - Service failover
- `failover_recovery` - Service recovery
- `hazard_escalation` - Hazard severity increases
- `evacuation_complete` - Evacuation milestone
- `scenario_end` - Scenario completion

## Flood Drill Scenario

The included `flood_drill.json` simulates:
1. Initial flood detection in Zone A
2. Citizen report submission
3. Secondary flood in Zone B
4. Oracle consensus verification
5. RAG guidance generation
6. GNN routing calculation
7. Mesh network sync
8. Hazard escalation to catastrophic
9. Fallback routing (sensor density drop)
10. Failover trigger and recovery
11. Evacuation completion

## Expected Outcomes

The flood drill expects:
- 2 incidents verified
- 2 evacuation routes calculated
- 2 guidance messages generated
- 5 mesh sync events
- 1 failover event
- 95,000 people evacuated

## Event Logs

Event logs are saved to `scenarios/logs/{scenario_id}_log.json` with:
- Scenario ID and execution timestamp
- Total duration
- Complete event timeline with actual vs expected times

## Dependencies

- httpx
- asyncio (Python standard library)

## Production Deployment

For production deployment:
1. Connect to real service APIs
2. Implement real-time event streaming
3. Add monitoring and alerting
4. Support scenario templates
5. Add scenario validation
6. Implement scenario scheduling
7. Add multi-tenant support
8. Integrate with dashboard for visualization
