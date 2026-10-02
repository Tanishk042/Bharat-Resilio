import assert from "node:assert/strict";
import { spawn, ChildProcess } from "node:child_process";
import { join } from "node:path";

import { sleep } from "../src/utils";

interface NodeRuntime {
  nodeId: string;
  meshPort: number;
  apiPort: number;
  process: ChildProcess;
}

async function postJson(port: number, path: string, payload: unknown): Promise<void> {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  assert.equal(response.ok, true, `POST ${path} failed on ${port}`);
}

async function getJson<T>(port: number, path: string): Promise<T> {
  const response = await fetch(`http://127.0.0.1:${port}${path}`);
  assert.equal(response.ok, true, `GET ${path} failed on ${port}`);
  return (await response.json()) as T;
}

async function waitFor(predicate: () => Promise<boolean>, timeoutMs: number, message: string): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if (await predicate()) {
        return;
      }
    } catch {
      // Ignore transient startup errors while polling.
    }
    await sleep(300);
  }
  throw new Error(message);
}

function spawnNode(nodeId: string, meshPort: number, apiPort: number, seeds: string): NodeRuntime {
  const child = spawn("node", [join(process.cwd(), "dist/services/mesh-node/src/cli.js")], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ID: nodeId,
      NODE_ROLE: "drone",
      HOST: "127.0.0.1",
      MESH_PORT: `${meshPort}`,
      API_PORT: `${apiPort}`,
      SEEDS: seeds,
      EXPECTED_SENSOR_NODE_IDS: "node-a,node-b,node-c,node-d",
      DATA_ROOT: ".mesh-test-data"
    },
    stdio: "ignore"
  });

  return {
    nodeId,
    meshPort,
    apiPort,
    process: child
  };
}

export async function runPartitionHarness(): Promise<void> {
  const nodes = [
    spawnNode("node-a", 7301, 8301, "127.0.0.1:7302,127.0.0.1:7303,127.0.0.1:7304"),
    spawnNode("node-b", 7302, 8302, "127.0.0.1:7301"),
    spawnNode("node-c", 7303, 8303, "127.0.0.1:7301"),
    spawnNode("node-d", 7304, 8304, "127.0.0.1:7301")
  ];

  try {
    await waitFor(
      async () => {
        const health = await getJson<{ peers: Array<{ nodeId: string; connected: boolean }> }>(8301, "/health");
        return ["node-b", "node-c", "node-d"].every((peerId) =>
          health.peers.some((peer) => peer.nodeId === peerId)
        );
      },
      15000,
      "nodes did not discover each other"
    );

    await postJson(8301, "/incidents", {
      id: "incident-initial",
      kind: "flood",
      location: "sector-a",
      severity: 5,
      description: "initial shared incident"
    });

    await waitFor(
      async () => {
        const snapshots = await Promise.all(nodes.map((node) => getJson<Array<{ id: string }>>(node.apiPort, "/state")));
        return snapshots.every((snapshot) => snapshot.some((incident) => incident.id === "incident-initial"));
      },
      12000,
      "initial incident did not replicate"
    );

    const leftGroup = ["node-a", "node-b"];
    const rightGroup = ["node-c", "node-d"];

    for (const left of leftGroup) {
      for (const right of rightGroup) {
        const leftNode = nodes.find((node) => node.nodeId === left)!;
        const rightNode = nodes.find((node) => node.nodeId === right)!;
        await postJson(leftNode.apiPort, "/control/block", { nodeId: right });
        await postJson(rightNode.apiPort, "/control/block", { nodeId: left });
      }
    }

    await sleep(1500);

    await postJson(8301, "/incidents", {
      id: "incident-left",
      kind: "bridge",
      location: "sector-left",
      severity: 7,
      description: "left partition update"
    });
    await postJson(8304, "/incidents", {
      id: "incident-right",
      kind: "medical",
      location: "sector-right",
      severity: 6,
      description: "right partition update"
    });

    const partitionedLeft = await getJson<Array<{ id: string }>>(8301, "/state");
    const partitionedRight = await getJson<Array<{ id: string }>>(8304, "/state");
    assert.equal(partitionedLeft.some((incident) => incident.id === "incident-right"), false);
    assert.equal(partitionedRight.some((incident) => incident.id === "incident-left"), false);

    for (const left of leftGroup) {
      for (const right of rightGroup) {
        const leftNode = nodes.find((node) => node.nodeId === left)!;
        const rightNode = nodes.find((node) => node.nodeId === right)!;
        await postJson(leftNode.apiPort, "/control/unblock", { nodeId: right });
        await postJson(rightNode.apiPort, "/control/unblock", { nodeId: left });
      }
    }

    await waitFor(
      async () => {
        const snapshots = await Promise.all(nodes.map((node) => getJson<Array<{ id: string }>>(node.apiPort, "/state")));
        return snapshots.every((snapshot) => {
          const ids = new Set(snapshot.map((incident) => incident.id));
          return ids.has("incident-initial") && ids.has("incident-left") && ids.has("incident-right");
        });
      },
      20000,
      "nodes did not converge after healing the partition"
    );
  } finally {
    for (const node of nodes) {
      node.process.kill("SIGTERM");
    }
  }
}
