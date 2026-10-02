export type NodeRole = "civilian" | "authority" | "drone" | "oracle" | "donor";

export interface LamportClock {
  counter: number;
  nodeId: string;
}

export interface IncidentRecord {
  id: string;
  kind: string;
  location: string;
  severity: number;
  description: string;
  reporterNodeId: string;
  updatedAt: LamportClock;
}

export interface RegistryEntry {
  nodeId: string;
  publicKey: string;
  role: NodeRole;
  authorized: boolean;
  updatedAt: LamportClock;
}

// === Mesh Protocol ===
export type MessageType =
  | "hello"
  | "peer_announce"
  | "incident_upsert"
  | "registry_sync"
  | "state_sync"
  | "ping"
  | "pong"
  | "chain_block"
  | "chain_request"
  | "chain_tip";

export interface WireMessageHeader {
  type: MessageType;
  senderNodeId: string;
  senderPublicKey: string;
  sequence: number;
  signature: string;
}

export interface WireMessage<TPayload = unknown> {
  header: WireMessageHeader;
  payload: TPayload;
}

export interface MeshPayload {
  incidents?: IncidentRecord[];
  registry?: RegistryEntry[];
  peers?: PeerAddress[];
  lamport?: LamportClock;
}

export interface PeerAddress {
  nodeId: string;
  host: string;
  port: number;
  role: NodeRole;
}

export interface PeerSnapshot {
  nodeId: string;
  host: string;
  port: number;
  role: NodeRole;
  connected: boolean;
  lastSeenAt: number;
  blocked: boolean;
}

export interface HelloPayload {
  role: NodeRole;
  host: string;
  port: number;
  knownPeers: PeerAddress[];
  registry: RegistryEntry[];
}

export interface StateSyncPayload {
  incidents: IncidentRecord[];
  registry: RegistryEntry[];
  peers: PeerAddress[];
  lamport: LamportClock;
}

export interface MeshSnapshot {
  nodeId: string;
  role: NodeRole;
  peers: PeerSnapshot[];
  incidents: IncidentRecord[];
  registry: RegistryEntry[];
  lamport: LamportClock;
  availabilityPercent: number;
}

// === Blockchain Types ===
export type TxType = "LogIncident" | "ReleaseFunds" | "RegisterNode" | "UpdateState";

export interface Transaction {
  txId: string;
  type: TxType;
  data: unknown;
  timestamp: number;
  signer: string;
  signature: string;
}

export interface LogIncidentTx extends Transaction {
  type: "LogIncident";
  data: {
    incidentId: string;
    tier: string;
    dataHash: string;
    reporterNodeId: string;
  };
}

export interface ReleaseFundsTx extends Transaction {
  type: "ReleaseFunds";
  data: {
    incidentId: string;
    amount: number;
    recipientAddress: string;
  };
  multisigSignatures: Array<{ signer: string; signature: string }>;
}

export interface Block {
  index: number;
  timestamp: number;
  previousHash: string;
  merkleRoot: string;
  transactions: Transaction[];
  hash: string;
  proposer: string;
  validatorSignatures: Array<{ signer: string; signature: string }>;
}

export interface ChainState {
  incidents: { [incidentId: string]: { tier: string; loggedAt: number; reportedBy: string } };
  fundsReleased: { [incidentId: string]: { amount: number; releasedAt: number } };
  registeredNodes: { [nodeId: string]: string };
}

// === API Types ===
export interface ParsedIncident {
  type: string;
  severity: string;
  locationText: string;
  entities: string[];
  rawJson: string;
}

export interface SensorReading {
  seismic?: number;
  barometric?: number;
  hydrological?: number;
  audioAnomaly?: number;
  temperature?: number;
}

export interface IncidentReport {
  id: string;
  description: string;
  location: { lat: number; lng: number };
  reportedBy: string;
  reportedAt: number;
  sensorData?: SensorReading;
  parsed?: ParsedIncident;
}

export interface MeshHealthSnapshot {
  totalKnownPeers: number;
  onlinePeers: number;
  dataAvailabilityPct: number;
  peerDetails: Array<{
    nodeId: string;
    status: "online" | "offline" | "stale";
    lastSeen: number;
  }>;
}

export interface RoutingPath {
  path: string[];
  estimatedTime: number;
  hazardProximity: number;
  confidence: number;
}

export interface PreparednessInstruction {
  topic: string;
  steps: string[];
  safetyNotes: string[];
  confidence: number;
  sources: string[];
}

export interface WSEventMap {
  "incidents:live": IncidentReport;
  "mesh:health": MeshHealthSnapshot;
  "routing:updates": RoutingPath;
  "chain:blocks": Block;
}
