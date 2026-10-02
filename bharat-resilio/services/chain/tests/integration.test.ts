import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { ChainNodeService } from "../src/node";

function makeKeys(): { privateKeyPem: string; publicKeyPem: string } {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  return {
    privateKeyPem: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    publicKeyPem: publicKey.export({ type: "spki", format: "pem" }).toString()
  };
}

interface Runtime {
  service: ChainNodeService;
  chainPort: number;
  apiPort: number;
}

async function waitFor(predicate: () => boolean, timeoutMs: number, message: string): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(message);
}

export async function runChainIntegrationTest(): Promise<void> {
  const validatorIds = ["chain-a", "chain-b", "chain-c"];
  const keyMap: Record<string, { publicKeyPem: string; privateKeyPem: string }> = {
    "chain-a": makeKeys(),
    "chain-b": makeKeys(),
    "chain-c": makeKeys()
  };

  const services = validatorIds.map((nodeId, i) => {
    const chainPort = 9400 + i;
    const apiPort = 8400 + i;
    const peers = validatorIds.filter((n) => n !== nodeId).map((n, j) => ({
      host: "127.0.0.1",
      port: 9400 + validatorIds.indexOf(n)
    }));
    const service = new ChainNodeService(
      {
        nodeId,
        publicKeyPem: keyMap[nodeId].publicKeyPem,
        privateKeyPem: keyMap[nodeId].privateKeyPem,
        host: "127.0.0.1",
        chainPort,
        apiPort,
        seeds: peers,
        validatorNodeIds: validatorIds,
        minValidatorSignatures: 1,
        multisigThreshold: 2,
        authorizedOracleKeys: validatorIds.map((n) => keyMap[n].publicKeyPem),
        peerPublicKeys: { ...Object.fromEntries(validatorIds.map((n) => [n, keyMap[n].publicKeyPem])) }
      },
      200
    );
    return { service, chainPort, apiPort };
  });

  try {
    for (const rt of services) {
      await rt.service.start();
    }

    // Give nodes time to discover each other via mesh transport / seeds.
    await new Promise((r) => setTimeout(r, 1500));

    // Submit an incident from one node.
    services[0].service.submitIncident("incident-1", "Catastrophic", "hash-of-data-1", "chain-a");

    // Wait for all nodes to converge on the incident in their state.
    await waitFor(
      () => services.every((rt) => rt.service.getState().incidents["incident-1"] !== undefined),
      10000,
      "nodes did not converge on incident state"
    );

    // Submit another incident from a different node.
    services[1].service.submitIncident("incident-2", "High", "hash-of-data-2", "chain-b");

    await waitFor(
      () => {
        const heights = services.map((rt) => rt.service.height());
        const states = services.map((rt) => rt.service.getState());
        return states.every((s) => s.incidents["incident-2"] !== undefined) &&
          new Set(heights).size === 1;
      },
      10000,
      "nodes did not converge to identical chain height"
    );

    // All nodes must have identical chains.
    const chain0 = services[0].service.getChain();
    const chain1 = services[1].service.getChain();
    const chain2 = services[2].service.getChain();
    assert.deepEqual(chain1.map((b) => b.hash), chain0.map((b) => b.hash), "chains must be identical");
    assert.deepEqual(chain2.map((b) => b.hash), chain0.map((b) => b.hash), "chains must be identical");

    // Deterministic: all nodes compute identical state.
    const state0 = services[0].service.getState();
    const state1 = services[1].service.getState();
    const state2 = services[2].service.getState();
    assert.deepEqual(state0, state1);
    assert.deepEqual(state0, state2);
  } finally {
    for (const rt of services) {
      await rt.service.stop();
    }
  }
}
