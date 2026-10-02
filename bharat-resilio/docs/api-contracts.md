# Mesh API Contracts

## HTTP API

Base URL: `http://{host}:{apiPort}`

### `GET /health`

Returns the current mesh snapshot.

```json
{
  "nodeId": "node-a",
  "role": "drone",
  "peers": [
    {
      "nodeId": "node-b",
      "host": "127.0.0.1",
      "port": 7102,
      "role": "drone",
      "connected": true,
      "lastSeenAt": 1750000000000,
      "blocked": false
    }
  ],
  "incidents": [],
  "registry": [],
  "lamport": {
    "counter": 5,
    "nodeId": "node-a"
  },
  "availabilityPercent": 66.67
}
```

### `GET /peers`

Returns the peer table only.

### `GET /state`

Returns the incident registry CRDT projection.

### `GET /registry`

Returns the local identity registry projection.

### `POST /incidents`

Creates or upserts an incident record on the local node, then broadcasts the signed update.

```json
{
  "id": "incident-left",
  "kind": "bridge",
  "location": "sector-left",
  "severity": 7,
  "description": "left partition update"
}
```

### `POST /control/block`

Drops and blocks all connections to the given peer ID. Used by the partition harness.

```json
{
  "nodeId": "node-c"
}
```

### `POST /control/unblock`

Removes a peer block and allows reconnection.

## WebSocket feed

Endpoint: `ws://{host}:{apiPort}/health/feed`

The server pushes full health snapshots whenever peer or state information changes. Frames are server-generated text frames carrying the same JSON payload as `GET /health`.

## Mesh wire envelope

Every TCP frame contains:

```json
{
  "header": {
    "type": "state_sync",
    "senderNodeId": "node-a",
    "senderPublicKey": "-----BEGIN PUBLIC KEY----- ...",
    "sequence": 42,
    "signature": "base64-ed25519-signature"
  },
  "payload": {
    "incidents": [],
    "registry": [],
    "peers": [],
    "lamport": {
      "counter": 42,
      "nodeId": "node-a"
    }
  }
}
```

The frame itself is length-prefixed with a 4-byte big-endian size header so receivers can reconstruct complete messages from partial reads.
