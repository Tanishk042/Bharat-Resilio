import { IncidentRecord, LamportClock, RegistryEntry } from "../../../packages/shared-types/src";
import { compareLamport, cloneLamport, maxLamport, sha256 } from "./utils";

type ClockedEntity = IncidentRecord | RegistryEntry;

function compareEntities<T extends ClockedEntity>(left: T, right: T): number {
  const lamportComparison = compareLamport(left.updatedAt, right.updatedAt);
  if (lamportComparison !== 0) {
    return lamportComparison;
  }

  return sha256(JSON.stringify(left)).localeCompare(sha256(JSON.stringify(right)));
}

class LwwMap<T extends ClockedEntity> {
  private readonly entries = new Map<string, T>();
  private readonly keyOf: (entry: T) => string;

  constructor(keyOf: (entry: T) => string) {
    this.keyOf = keyOf;
  }

  upsert(entry: T): boolean {
    const key = this.keyOf(entry);
    const existing = this.entries.get(key);
    if (!existing || compareEntities(existing, entry) < 0) {
      this.entries.set(key, structuredClone(entry));
      return true;
    }
    return false;
  }

  merge(entries: T[]): boolean {
    let changed = false;
    for (const entry of entries) {
      changed = this.upsert(entry) || changed;
    }
    return changed;
  }

  values(): T[] {
    return Array.from(this.entries.values()).map((entry) => structuredClone(entry));
  }
}

export class MeshState {
  private readonly incidents = new LwwMap<IncidentRecord>((entry) => entry.id);
  private readonly registry = new LwwMap<RegistryEntry>((entry) => entry.nodeId);
  private lamport: LamportClock;

  constructor(nodeId: string) {
    this.lamport = { counter: 0, nodeId };
  }

  currentLamport(): LamportClock {
    return cloneLamport(this.lamport);
  }

  tick(): LamportClock {
    this.lamport = {
      counter: this.lamport.counter + 1,
      nodeId: this.lamport.nodeId
    };
    return this.currentLamport();
  }

  observe(clock: LamportClock): LamportClock {
    this.lamport = {
      counter: Math.max(this.lamport.counter, clock.counter) + 1,
      nodeId: this.lamport.nodeId
    };
    return this.currentLamport();
  }

  upsertIncident(incident: Omit<IncidentRecord, "updatedAt"> & { updatedAt?: LamportClock }): IncidentRecord {
    const record: IncidentRecord = {
      ...incident,
      updatedAt: incident.updatedAt ?? this.tick()
    };
    this.incidents.upsert(record);
    this.lamport = maxLamport(this.lamport, record.updatedAt);
    return structuredClone(record);
  }

  upsertRegistry(entry: Omit<RegistryEntry, "updatedAt"> & { updatedAt?: LamportClock }): RegistryEntry {
    const record: RegistryEntry = {
      ...entry,
      updatedAt: entry.updatedAt ?? this.tick()
    };
    this.registry.upsert(record);
    this.lamport = maxLamport(this.lamport, record.updatedAt);
    return structuredClone(record);
  }

  mergeState(input: {
    incidents: IncidentRecord[];
    registry: RegistryEntry[];
    lamport?: LamportClock;
  }): boolean {
    if (input.lamport) {
      this.observe(input.lamport);
    }
    const incidentChanged = this.incidents.merge(input.incidents);
    const registryChanged = this.registry.merge(input.registry);
    return incidentChanged || registryChanged;
  }

  incidentsSnapshot(): IncidentRecord[] {
    return this.incidents.values().sort((left, right) => left.id.localeCompare(right.id));
  }

  registrySnapshot(): RegistryEntry[] {
    return this.registry.values().sort((left, right) => left.nodeId.localeCompare(right.nodeId));
  }
}
