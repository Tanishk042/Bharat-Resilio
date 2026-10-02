# Bharat Resilio Architecture

## Monorepo layout

This implementation establishes the requested `bharat-resilio/` monorepo shell and delivers the custom mesh subsystem under `services/mesh-node`.

- `apps/frontend/`: reserved landing point for the existing React portals
- `services/mesh-node/`: native TCP mesh transport, CRDT replication, identity registry, health API
- `services/ml-models/`: placeholder for custom-built CNN, detector, GNN, and compact transformer models
- `services/backend-api/`: placeholder for orchestration and API gateway work
- `services/chain/`: placeholder for the independent blockchain service
- `packages/shared-types/`: cross-service TypeScript contracts
- `packages/proto/mesh.proto`: protobuf schema for mesh wire messages
- `infra/docker-compose.yml`: local multi-node mesh bootstrapping

## Mesh-node design

### Transport

The mesh node uses raw Node.js TCP sockets from `node:net`, not `ws`, `libp2p`, or any external mesh SDK. Messages are sent as:

1. a 4-byte big-endian length prefix
2. a JSON-serialized wire envelope containing a fixed header
3. a typed payload matching the schemas in `packages/proto/mesh.proto`

This ensures correct framing across partial TCP reads.

### Signed identity

Each node persists an Ed25519 keypair on first boot inside its local data directory. Outbound messages are signed with the private key; inbound messages are verified before routing. The local identity registry stores:

- `nodeId`
- `publicKey`
- `role`
- `authorized`
- Lamport update metadata

### Discovery and peer table

Peer discovery uses the allowed seed-list strategy. Nodes bootstrap from configured seed addresses, then gossip discovered peers with `peer_announce` messages. Each node maintains a local peer table with:

- host and port
- role
- current connectivity
- last-seen timestamp
- partition-block status used by the test harness

### CRDT choice

The incident registry uses a custom Last-Write-Wins register map backed by Lamport clocks. This was chosen over an OR-Set because the main object is a mutable incident record keyed by stable incident IDs. For this workload, whole-record replacement is simpler and deterministic while still giving:

- commutativity
- associativity
- idempotence

The same merge primitive is reused for the local identity registry.

### Health surface

Each mesh node exposes:

- `GET /health`
- `GET /peers`
- `GET /state`
- `GET /registry`
- `WS /health/feed`

The WebSocket feed is implemented with a native HTTP upgrade handshake and basic server-to-client text frames so it remains within the "no external networking framework" boundary.

### Partition harness

The test harness starts multiple independent node processes, blocks cross-group peers via the local control API, applies divergent updates, heals the partition, and asserts convergence across all replicas.
