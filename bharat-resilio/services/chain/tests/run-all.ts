import { runChainCoreTests, runPoATests, runMultisigTests, runForkChoiceTests } from "./chain.test";
import { runChainIntegrationTest } from "./integration.test";

async function main(): Promise<void> {
  runChainCoreTests();
  runPoATests();
  runMultisigTests();
  runForkChoiceTests();
  await runChainIntegrationTest();
  console.log("chain-node tests passed");
}

void main();
