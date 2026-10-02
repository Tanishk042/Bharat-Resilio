import { runCrdtTests } from "./crdt.test";
import { runPartitionHarness } from "./partition-harness";

async function main(): Promise<void> {
  runCrdtTests();
  await runPartitionHarness();
  console.log("mesh-node tests passed");
}

void main();
