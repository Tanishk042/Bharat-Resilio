import { createHash } from "node:crypto";

import { LamportClock } from "../../../packages/shared-types/src";

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
      .reduce<Record<string, unknown>>((accumulator, key) => {
        accumulator[key] = sortValue((value as Record<string, unknown>)[key]);
        return accumulator;
      }, {});
  }
  return value;
}

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function compareLamport(left: LamportClock, right: LamportClock): number {
  if (left.counter !== right.counter) {
    return left.counter - right.counter;
  }
  return left.nodeId.localeCompare(right.nodeId);
}

export function maxLamport(left: LamportClock, right: LamportClock): LamportClock {
  return compareLamport(left, right) >= 0 ? left : right;
}

export function cloneLamport(clock: LamportClock): LamportClock {
  return {
    counter: clock.counter,
    nodeId: clock.nodeId
  };
}

export function dedupeById<T extends { nodeId: string }>(entries: T[]): T[] {
  const latest = new Map<string, T>();
  for (const entry of entries) {
    latest.set(entry.nodeId, entry);
  }
  return Array.from(latest.values());
}
