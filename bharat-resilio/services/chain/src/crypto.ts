import { createHash, createPrivateKey, createPublicKey, sign, verify } from "node:crypto";

export function sha256(input: Buffer | string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function sha256Json(obj: unknown): string {
  return sha256(JSON.stringify(obj));
}

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

export interface KeyPair {
  publicKeyPem: string;
  privateKeyPem: string;
}

export function signPayload(privateKeyPem: string, payload: string): string {
  const signature = sign(null, Buffer.from(payload, "utf8"), createPrivateKey(privateKeyPem));
  return signature.toString("base64");
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
