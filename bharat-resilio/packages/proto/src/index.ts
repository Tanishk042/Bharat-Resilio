import * as crypto from "node:crypto";

// === Message Framing ===
// Wire format: [4 bytes: payload length (big-endian)] [payload as JSON UTF-8]
// Handles TCP stream delimiting — partial reads are buffered until a full message arrives.

export interface WireMessage {
  type: string;
  senderNodeId: string;
  senderPublicKey: string;
  sequence: number;
  timestamp: number;
  signature: string;
  payload: unknown;
}

const HEADER_SIZE = 4;

export function encodeFrame(msg: WireMessage): Buffer {
  const json = JSON.stringify(msg);
  const payload = Buffer.from(json, "utf-8");
  const header = Buffer.alloc(HEADER_SIZE);
  header.writeUInt32BE(payload.length, 0);
  return Buffer.concat([header, payload]);
}

export function decodeFrames(buffer: Buffer): { messages: WireMessage[]; remainder: Buffer } {
  const messages: WireMessage[] = [];
  let offset = 0;

  while (offset + HEADER_SIZE <= buffer.length) {
    const payloadLen = buffer.readUInt32BE(offset);
    const totalLen = HEADER_SIZE + payloadLen;
    if (offset + totalLen > buffer.length) break;

    const raw = buffer.subarray(offset + HEADER_SIZE, offset + totalLen).toString("utf-8");
    try {
      messages.push(JSON.parse(raw) as WireMessage);
    } catch {
      // malformed frame, skip
    }
    offset += totalLen;
  }

  return { messages, remainder: buffer.subarray(offset) };
}

export class MessageFramer {
  private buffer: Buffer = Buffer.alloc(0);

  feed(data: Buffer): WireMessage[] {
    this.buffer = Buffer.concat([this.buffer, data]);
    const { messages, remainder } = decodeFrames(this.buffer);
    this.buffer = remainder;
    return messages;
  }

  remaining(): Buffer {
    return this.buffer;
  }
}

// === Signing & Verification (Node crypto — vetted Ed25519 implementation) ===

export interface KeyPair {
  publicKeyPem: string;
  privateKeyPem: string;
}

export function generateKeyPair(): KeyPair {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  return {
    publicKeyPem: publicKey.export({ type: "spki", format: "pem" }).toString(),
    privateKeyPem: privateKey.export({ type: "pkcs8", format: "pem" }).toString()
  };
}

export function signPayload(privateKeyPem: string, payload: string): string {
  const signature = crypto.sign(null, Buffer.from(payload, "utf8"), crypto.createPrivateKey(privateKeyPem));
  return signature.toString("base64");
}

export function verifyPayload(publicKeyPem: string, payload: string, signature: string): boolean {
  try {
    return crypto.verify(
      null,
      Buffer.from(payload, "utf8"),
      crypto.createPublicKey(publicKeyPem),
      Buffer.from(signature, "base64")
    );
  } catch {
    return false;
  }
}

// === Hashing ===
export function sha256(input: Buffer | string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function sha256Json(obj: unknown): string {
  return sha256(JSON.stringify(obj));
}

// === Canonical JSON (deterministic object key ordering for signing) ===
export function canonicalStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sortValue(entry));
  }
  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortValue((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value;
}

// === Signed Message Construction ===
let sequenceCounter = 0;

export function createSignedMessage<T>(
  type: string,
  senderNodeId: string,
  senderPublicKey: string,
  privateKeyPem: string,
  payload: T
): WireMessage {
  const message: WireMessage = {
    type,
    senderNodeId,
    senderPublicKey,
    sequence: ++sequenceCounter,
    timestamp: Date.now(),
    signature: "",
    payload
  };
  const payloadToSign = canonicalStringify({ ...message, signature: "" });
  message.signature = signPayload(privateKeyPem, payloadToSign);
  return message;
}

export function verifySignedMessage(message: WireMessage): boolean {
  const payloadToVerify = canonicalStringify({ ...message, signature: "" });
  return verifyPayload(message.senderPublicKey, payloadToVerify, message.signature);
}

// === Vector Clock Helpers ===
export type VectorClock = { [nodeId: string]: number };

export function emptyVectorClock(): VectorClock {
  return {};
}

export function incrementClock(clock: VectorClock, nodeId: string): VectorClock {
  return { ...clock, [nodeId]: (clock[nodeId] || 0) + 1 };
}

export function mergeClocks(a: VectorClock, b: VectorClock): VectorClock {
  const merged: VectorClock = { ...a };
  for (const [node, ts] of Object.entries(b)) {
    merged[node] = Math.max(merged[node] || 0, ts);
  }
  return merged;
}

export function clockCompare(a: VectorClock, b: VectorClock): "before" | "after" | "concurrent" {
  let aGreater = false;
  let bGreater = false;
  const allNodes = new Set([...Object.keys(a), ...Object.keys(b)]);

  for (const node of allNodes) {
    const va = a[node] || 0;
    const vb = b[node] || 0;
    if (va > vb) aGreater = true;
    if (vb > va) bGreater = true;
  }

  if (aGreater && bGreater) return "concurrent";
  if (aGreater) return "after";
  if (bGreater) return "before";
  return "after";
}
