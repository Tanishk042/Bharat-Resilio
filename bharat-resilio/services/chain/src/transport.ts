import {
  createPrivateKey,
  createPublicKey,
  sign,
  verify
} from "node:crypto";

// === Message framing (length-prefixed) ===
// Reused by mesh and chain transports.

export interface WireMessage {
  type: string;
  senderNodeId: string;
  senderPublicKey: string;
  sequence: number;
  signature: string;
  payload: unknown;
}

const HEADER_SIZE = 4;

export function encodeFrame(message: WireMessage): Buffer {
  const json = JSON.stringify(message);
  const payload = Buffer.from(json, "utf8");
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
    try {
      messages.push(JSON.parse(buffer.subarray(offset + HEADER_SIZE, offset + totalLen).toString("utf8")) as WireMessage);
    } catch {
      // malformed frame, skip
    }
    offset += totalLen;
  }
  return { messages, remainder: buffer.subarray(offset) };
}

export function signPayload(privateKeyPem: string, payload: string): string {
  return sign(null, Buffer.from(payload, "utf8"), createPrivateKey(privateKeyPem)).toString("base64");
}

export function verifyPayload(publicKeyPem: string, payload: string, signature: string): boolean {
  try {
    return verify(
      null,
      Buffer.from(payload, "utf8"),
      createPublicKey(publicKeyPem),
      Buffer.from(signature, "base64")
    );
  } catch {
    return false;
  }
}

// === Canonical JSON for deterministic signing ===
export function canonicalStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
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

// Build and sign a message from fields (signature left empty, then computed).
export function signMessage(
  header: { type: string; senderNodeId: string; senderPublicKey: string; sequence: number },
  privateKeyPem: string,
  payload: unknown
): WireMessage {
  const unsigned: WireMessage = {
    ...header,
    signature: "",
    payload
  };
  const payloadToSign = canonicalStringify(unsigned);
  return {
    ...header,
    signature: signPayload(privateKeyPem, payloadToSign),
    payload
  };
}

export function verifyMessage(message: WireMessage): boolean {
  const unsigned: WireMessage = { ...message, signature: "" };
  const payloadToVerify = canonicalStringify(unsigned);
  return verifyPayload(message.senderPublicKey, payloadToVerify, message.signature);
}

// Alias for node.ts occur
export const signPayload2 = signPayload;
