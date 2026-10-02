import { ChainNodeService } from "./node";
import { generateKeyPairSync } from "node:crypto";

function demoKeyPair(): { publicKeyPem: string; privateKeyPem: string } {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519", {
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  // Real Ed25519 keys so transaction signing works out of the box (no external PKI).
  return {
    publicKeyPem: publicKey,
    privateKeyPem: privateKey,
  };
}

async function main(): Promise<void> {
  const nodeId = process.env.NODE_ID ?? "chain-a";
  const host = process.env.HOST ?? "127.0.0.1";
  const chainPort = Number(process.env.CHAIN_PORT ?? "9100");
  const apiPort = Number(process.env.API_PORT ?? "8201");

  // Deterministic demo keypair derived from node id (stand-in for mesh identity registry).
  // Real Ed25519 keypair (stand-in for mesh identity registry).
  const demo = demoKeyPair();
  const publicKeyPem = demo.publicKeyPem;
  const privateKeyPem = demo.privateKeyPem;

  const validatorNodeIds = (process.env.VALIDATORS ?? nodeId).split(",").map((s) => s.trim()).filter(Boolean);
  const seeds = (process.env.SEEDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      const [h, p] = entry.split(":");
      return { host: h, port: Number(p) };
    });

  const service = new ChainNodeService(
    {
      nodeId,
      publicKeyPem,
      privateKeyPem,
      host,
      chainPort,
      apiPort,
      seeds,
      validatorNodeIds,
      minValidatorSignatures: Number(process.env.MIN_VALIDATOR_SIGS ?? "1"),
      multisigThreshold: Number(process.env.MULTISIG_THRESHOLD ?? "0"),
      authorizedOracleKeys: []
    },
    Number(process.env.PROPOSE_INTERVAL_MS ?? "300")
  );

  await service.start();
  console.log(
    JSON.stringify(
      {
        nodeId,
        chainPort,
        apiPort,
        validators: validatorNodeIds,
        isValidator: service.isValidator()
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
