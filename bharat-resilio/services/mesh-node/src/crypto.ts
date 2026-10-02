import {
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign,
  verify
} from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { sha256 } from "./utils";

export interface NodeIdentity {
  nodeId: string;
  publicKeyPem: string;
  privateKeyPem: string;
}

export function loadOrCreateIdentity(dataDirectory: string, requestedNodeId?: string): NodeIdentity {
  mkdirSync(dataDirectory, { recursive: true });
  const identityPath = join(dataDirectory, "identity.json");

  if (existsSync(identityPath)) {
    return JSON.parse(readFileSync(identityPath, "utf8")) as NodeIdentity;
  }

  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString();
  const privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  const derivedNodeId = `node-${sha256(publicKeyPem).slice(0, 16)}`;
  const identity: NodeIdentity = {
    nodeId: requestedNodeId ?? derivedNodeId,
    publicKeyPem,
    privateKeyPem
  };

  writeFileSync(identityPath, `${JSON.stringify(identity, null, 2)}\n`, "utf8");
  return identity;
}

export function signPayload(privateKeyPem: string, payload: string): string {
  const signature = sign(null, Buffer.from(payload, "utf8"), createPrivateKey(privateKeyPem));
  return signature.toString("base64");
}

export function verifyPayload(publicKeyPem: string, payload: string, signature: string): boolean {
  return verify(
    null,
    Buffer.from(payload, "utf8"),
    createPublicKey(publicKeyPem),
    Buffer.from(signature, "base64")
  );
}

export function deriveNodeId(publicKeyPem: string): string {
  return `node-${sha256(publicKeyPem).slice(0, 16)}`;
}
