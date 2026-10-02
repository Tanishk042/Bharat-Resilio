import { resolve } from "node:path";

import { MeshNodeService, parseSeeds, resolveDataDirectory } from "./node";

async function main(): Promise<void> {
  const meshPort = Number(process.env.MESH_PORT ?? "7100");
  const requestedNodeId = process.env.NODE_ID;
  const dataRoot = resolve(process.cwd(), process.env.DATA_ROOT ?? ".mesh-data");

  const service = new MeshNodeService({
    nodeId: requestedNodeId,
    role: (process.env.NODE_ROLE as "civilian" | "authority" | "drone") ?? "civilian",
    host: process.env.HOST ?? "127.0.0.1",
    meshPort,
    apiPort: Number(process.env.API_PORT ?? "8100"),
    seeds: parseSeeds(process.env.SEEDS),
    expectedSensorNodeIds: (process.env.EXPECTED_SENSOR_NODE_IDS ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
    dataDirectory: resolveDataDirectory(dataRoot, requestedNodeId, meshPort)
  });

  await service.start();
  console.log(
    JSON.stringify(
      {
        nodeId: service.getNodeId(),
        meshPort,
        apiPort: Number(process.env.API_PORT ?? "8100")
      },
      null,
      2
    )
  );

  const shutdown = async () => {
    await service.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

void main();
