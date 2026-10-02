import { createServer as createHttpServer, IncomingMessage, ServerResponse } from "node:http";
import net, { Socket } from "node:net";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import {
  HelloPayload,
  IncidentRecord,
  MeshSnapshot,
  MessageType,
  PeerAddress,
  PeerSnapshot,
  RegistryEntry,
  StateSyncPayload,
  WireMessage
} from "../../../packages/shared-types/src";
import { MeshState } from "./crdt";
import { acceptWebSocket, HealthFeedClient, sendJsonFrame, sendJsonResponse } from "./health-feed";
import { loadOrCreateIdentity, NodeIdentity } from "./crypto";
import { decodeFrames, encodeFrame, signMessage, verifyMessage } from "./framing";
import { dedupeById, sleep } from "./utils";

interface PeerConnection {
  socket: Socket;
  buffer: Buffer;
  peerNodeId?: string;
  addressKey: string;
}

export interface MeshNodeConfig {
  nodeId?: string;
  role: "civilian" | "authority" | "drone";
  host: string;
  meshPort: number;
  apiPort: number;
  seeds: Array<{ host: string; port: number }>;
  expectedSensorNodeIds: string[];
  dataDirectory: string;
}

export class MeshNodeService {
  private readonly config: MeshNodeConfig;
  private readonly state: MeshState;
  private readonly identity: NodeIdentity;
  private readonly peers = new Map<string, PeerSnapshot>();
  private readonly knownAddresses = new Map<string, PeerAddress>();
  private readonly blockedPeers = new Set<string>();
  private readonly connections = new Set<PeerConnection>();
  private readonly peerConnections = new Map<string, Set<PeerConnection>>();
  private readonly healthFeedClients = new Set<HealthFeedClient>();
  private readonly meshServer = net.createServer();
  private readonly apiServer = createHttpServer(this.handleHttpRequest.bind(this));
  private readonly timers: NodeJS.Timeout[] = [];
  private sequence = 0;

  constructor(config: MeshNodeConfig) {
    this.config = config;
    mkdirSync(config.dataDirectory, { recursive: true });
    this.identity = loadOrCreateIdentity(config.dataDirectory, config.nodeId);
    this.state = new MeshState(this.identity.nodeId);
    this.state.upsertRegistry({
      nodeId: this.identity.nodeId,
      publicKey: this.identity.publicKeyPem,
      role: this.config.role,
      authorized: true
    });
    this.knownAddresses.set(this.identity.nodeId, this.selfAddress());
  }

  async start(): Promise<void> {
    this.meshServer.on("connection", (socket) => this.registerSocket(socket));
    this.meshServer.listen(this.config.meshPort, this.config.host);

    this.apiServer.on("upgrade", (request, socket, head) => {
      if (request.url !== "/health/feed") {
        socket.destroy();
        return;
      }
      acceptWebSocket(request, socket, head, this.healthFeedClients);
      this.pushHealthSnapshot();
    });
    this.apiServer.listen(this.config.apiPort, this.config.host);

    await this.waitForServer(this.meshServer);
    await this.waitForServer(this.apiServer);

    for (const seed of this.config.seeds) {
      this.connectToAddress(seed.host, seed.port);
    }

    this.timers.push(setInterval(() => this.connectToKnownPeers(), 1500));
    this.timers.push(setInterval(() => this.broadcastStateSync(), 4000));
    this.timers.push(setInterval(() => this.sendHeartbeat(), 3000));
    this.timers.push(setInterval(() => this.pushHealthSnapshot(), 1000));
  }

  async stop(): Promise<void> {
    for (const timer of this.timers) {
      clearInterval(timer);
    }
    for (const connection of Array.from(this.connections)) {
      connection.socket.destroy();
    }
    this.meshServer.close();
    this.apiServer.close();
    for (const client of this.healthFeedClients) {
      client.socket.destroy();
    }
    await sleep(50);
  }

  getNodeId(): string {
    return this.identity.nodeId;
  }

  submitIncident(input: {
    id?: string;
    kind: string;
    location: string;
    severity: number;
    description: string;
  }): IncidentRecord {
    const incident = this.state.upsertIncident({
      id: input.id ?? `${this.identity.nodeId}-${Date.now()}`,
      kind: input.kind,
      location: input.location,
      severity: input.severity,
      description: input.description,
      reporterNodeId: this.identity.nodeId
    });
    this.broadcast("incident_upsert", { incident });
    this.pushHealthSnapshot();
    return incident;
  }

  blockPeer(nodeId: string): void {
    this.blockedPeers.add(nodeId);
    for (const connection of this.peerConnections.get(nodeId) ?? []) {
      connection.socket.destroy();
    }
    const peer = this.peers.get(nodeId);
    if (peer) {
      peer.blocked = true;
      peer.connected = false;
    }
    this.pushHealthSnapshot();
  }

  unblockPeer(nodeId: string): void {
    this.blockedPeers.delete(nodeId);
    const peer = this.peers.get(nodeId);
    if (peer) {
      peer.blocked = false;
    }
    const address = this.knownAddresses.get(nodeId);
    if (address) {
      this.connectToAddress(address.host, address.port);
    }
    this.pushHealthSnapshot();
  }

  snapshot(): MeshSnapshot {
    const peers = Array.from(this.peers.values()).sort((left, right) => left.nodeId.localeCompare(right.nodeId));
    return {
      nodeId: this.identity.nodeId,
      role: this.config.role,
      peers,
      incidents: this.state.incidentsSnapshot(),
      registry: this.state.registrySnapshot(),
      lamport: this.state.currentLamport(),
      availabilityPercent: this.computeAvailability(peers)
    };
  }

  private selfAddress(): PeerAddress {
    return {
      nodeId: this.identity.nodeId,
      host: this.config.host,
      port: this.config.meshPort,
      role: this.config.role
    };
  }

  private async waitForServer(server: net.Server | ReturnType<typeof createHttpServer>): Promise<void> {
    if (server.listening) {
      return;
    }
    await new Promise<void>((resolve) => server.once("listening", resolve));
  }

  private registerSocket(socket: Socket): void {
    const remote = socket.remoteAddress ?? "unknown";
    const connection: PeerConnection = {
      socket,
      buffer: Buffer.alloc(0),
      addressKey: `${remote}:${socket.remotePort ?? 0}`
    };
    this.connections.add(connection);
    socket.on("data", (chunk) => this.handleSocketData(connection, chunk));
    socket.on("close", () => this.handleSocketClose(connection));
    socket.on("error", () => this.handleSocketClose(connection));
    this.sendHello(connection);
  }

  private handleSocketData(connection: PeerConnection, chunk: Buffer): void {
    connection.buffer = Buffer.concat([connection.buffer, chunk]);
    const { messages, remainder } = decodeFrames(connection.buffer);
    connection.buffer = remainder;

    for (const message of messages) {
      if (!this.verifyInboundMessage(connection, message)) {
        connection.socket.destroy();
        return;
      }
      this.routeMessage(connection, message);
    }
  }

  private verifyInboundMessage(connection: PeerConnection, message: WireMessage): boolean {
    try {
      if (!verifyMessage(message)) {
        return false;
      }
      const existing = this.state
        .registrySnapshot()
        .find((entry) => entry.nodeId === message.header.senderNodeId);
      if (existing && existing.publicKey !== message.header.senderPublicKey) {
        return false;
      }
      if (this.blockedPeers.has(message.header.senderNodeId)) {
        return false;
      }
      connection.peerNodeId = message.header.senderNodeId;
      this.bindConnectionToPeer(connection);
      this.touchPeer(
        message.header.senderNodeId,
        {
          nodeId: message.header.senderNodeId,
          host: this.peers.get(message.header.senderNodeId)?.host ?? connection.socket.remoteAddress ?? "127.0.0.1",
          port: this.peers.get(message.header.senderNodeId)?.port ?? 0,
          role: this.peers.get(message.header.senderNodeId)?.role ?? "civilian"
        },
        true
      );
      this.state.upsertRegistry({
        nodeId: message.header.senderNodeId,
        publicKey: message.header.senderPublicKey,
        role: this.peers.get(message.header.senderNodeId)?.role ?? "civilian",
        authorized: true
      });
      return true;
    } catch {
      return false;
    }
  }

  private bindConnectionToPeer(connection: PeerConnection): void {
    if (!connection.peerNodeId) {
      return;
    }
    const set = this.peerConnections.get(connection.peerNodeId) ?? new Set<PeerConnection>();
    set.add(connection);
    this.peerConnections.set(connection.peerNodeId, set);
  }

  private handleSocketClose(connection: PeerConnection): void {
    this.connections.delete(connection);
    if (connection.peerNodeId) {
      const peers = this.peerConnections.get(connection.peerNodeId);
      peers?.delete(connection);
      if (peers && peers.size === 0) {
        this.peerConnections.delete(connection.peerNodeId);
        const peer = this.peers.get(connection.peerNodeId);
        if (peer) {
          peer.connected = false;
        }
      }
    }
  }

  private connectToKnownPeers(): void {
    for (const peer of this.knownAddresses.values()) {
      if (peer.nodeId === this.identity.nodeId || this.blockedPeers.has(peer.nodeId)) {
        continue;
      }
      const alreadyConnected = (this.peerConnections.get(peer.nodeId)?.size ?? 0) > 0;
      if (!alreadyConnected) {
        this.connectToAddress(peer.host, peer.port);
      }
    }
  }

  private connectToAddress(host: string, port: number): void {
    const socket = net.createConnection({ host, port });
    socket.once("connect", () => this.registerSocket(socket));
    socket.once("error", () => socket.destroy());
  }

  private routeMessage(connection: PeerConnection, message: WireMessage): void {
    switch (message.header.type) {
      case "hello":
        this.handleHello(connection.peerNodeId ?? message.header.senderNodeId, message.payload as HelloPayload);
        this.sendStateSync(connection);
        this.broadcastPeerAnnouncement();
        break;
      case "peer_announce":
        this.ingestPeerList((message.payload as { peers: PeerAddress[] }).peers);
        break;
      case "incident_upsert":
        this.state.mergeState({
          incidents: [(message.payload as { incident: IncidentRecord }).incident],
          registry: []
        });
        break;
      case "registry_sync":
        this.state.mergeState({
          incidents: [],
          registry: (message.payload as { entries: RegistryEntry[] }).entries
        });
        break;
      case "state_sync":
        this.handleStateSync(message.payload as StateSyncPayload);
        break;
      case "ping":
        this.sendToConnection(connection, "pong", {
          nonce: (message.payload as { nonce: string }).nonce
        });
        break;
      case "pong":
        break;
      default:
        break;
    }
    if (connection.peerNodeId) {
      const peer = this.peers.get(connection.peerNodeId);
      if (peer) {
        peer.lastSeenAt = Date.now();
        peer.connected = true;
      }
    }
    this.pushHealthSnapshot();
  }

  private handleHello(senderNodeId: string, payload: HelloPayload): void {
    const remoteAddress: PeerAddress = {
      nodeId: senderNodeId,
      host: payload.host,
      port: payload.port,
      role: payload.role
    };
    this.ingestPeerList(payload.knownPeers);
    this.touchPeer(remoteAddress.nodeId, remoteAddress, true);
    this.knownAddresses.set(remoteAddress.nodeId, remoteAddress);
    this.state.upsertRegistry({
      nodeId: senderNodeId,
      publicKey: this.state.registrySnapshot().find((entry) => entry.nodeId === senderNodeId)?.publicKey ?? "",
      role: payload.role,
      authorized: true
    });
    this.state.mergeState({
      incidents: [],
      registry: payload.registry
    });
  }

  private handleStateSync(payload: StateSyncPayload): void {
    this.ingestPeerList(payload.peers);
    this.state.mergeState({
      incidents: payload.incidents,
      registry: payload.registry,
      lamport: payload.lamport
    });
  }

  private ingestPeerList(peers: PeerAddress[]): void {
    for (const peer of dedupeById(peers)) {
      if (peer.nodeId === this.identity.nodeId) {
        continue;
      }
      this.knownAddresses.set(peer.nodeId, peer);
      this.touchPeer(peer.nodeId, peer, (this.peerConnections.get(peer.nodeId)?.size ?? 0) > 0);
    }
  }

  private touchPeer(nodeId: string, address: PeerAddress, connected: boolean): void {
    const existing = this.peers.get(nodeId);
    this.peers.set(nodeId, {
      nodeId,
      host: address.host,
      port: address.port,
      role: address.role,
      connected,
      lastSeenAt: Date.now(),
      blocked: this.blockedPeers.has(nodeId)
    });
    if (existing && existing.connected && !connected) {
      this.peers.get(nodeId)!.connected = true;
    }
  }

  private broadcastStateSync(): void {
    this.broadcast("state_sync", {
      incidents: this.state.incidentsSnapshot(),
      registry: this.state.registrySnapshot(),
      peers: [this.selfAddress(), ...Array.from(this.knownAddresses.values())],
      lamport: this.state.currentLamport()
    });
    this.broadcast("registry_sync", {
      entries: this.state.registrySnapshot()
    });
  }

  private broadcastPeerAnnouncement(): void {
    this.broadcast("peer_announce", {
      peers: [this.selfAddress(), ...Array.from(this.knownAddresses.values())]
    });
  }

  private sendHeartbeat(): void {
    this.broadcast("ping", { nonce: `${Date.now()}` });
  }

  private sendHello(connection: PeerConnection): void {
    this.sendToConnection(connection, "hello", {
      role: this.config.role,
      host: this.config.host,
      port: this.config.meshPort,
      knownPeers: [this.selfAddress(), ...Array.from(this.knownAddresses.values())],
      registry: this.state.registrySnapshot()
    });
  }

  private sendStateSync(connection: PeerConnection): void {
    this.sendToConnection(connection, "state_sync", {
      incidents: this.state.incidentsSnapshot(),
      registry: this.state.registrySnapshot(),
      peers: [this.selfAddress(), ...Array.from(this.knownAddresses.values())],
      lamport: this.state.currentLamport()
    });
  }

  private broadcast(type: MessageType, payload: object): void {
    for (const connection of this.connections) {
      if (connection.socket.destroyed) {
        continue;
      }
      this.sendToConnection(connection, type, payload);
    }
  }

  private sendToConnection(connection: PeerConnection, type: MessageType, payload: object): void {
    const message = signMessage(
      {
        header: {
          type,
          senderNodeId: this.identity.nodeId,
          senderPublicKey: this.identity.publicKeyPem,
          sequence: ++this.sequence
        },
        payload
      },
      this.identity.privateKeyPem
    );
    connection.socket.write(encodeFrame(message));
  }

  private computeAvailability(peers: PeerSnapshot[]): number {
    if (this.config.expectedSensorNodeIds.length === 0) {
      return 100;
    }
    const reachable = this.config.expectedSensorNodeIds.filter((nodeId) => {
      if (nodeId === this.identity.nodeId) {
        return true;
      }
      return peers.some((peer) => peer.nodeId === nodeId && peer.connected);
    }).length;
    return Number(((reachable / this.config.expectedSensorNodeIds.length) * 100).toFixed(2));
  }

  private pushHealthSnapshot(): void {
    const snapshot = this.snapshot();
    for (const client of this.healthFeedClients) {
      sendJsonFrame(client, snapshot);
    }
  }

  private async handleHttpRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
    if (request.method === "GET" && url.pathname === "/health") {
      sendJsonResponse(response, 200, this.snapshot());
      return;
    }
    if (request.method === "GET" && url.pathname === "/peers") {
      sendJsonResponse(response, 200, this.snapshot().peers);
      return;
    }
    if (request.method === "GET" && url.pathname === "/state") {
      sendJsonResponse(response, 200, this.snapshot().incidents);
      return;
    }
    if (request.method === "GET" && url.pathname === "/registry") {
      sendJsonResponse(response, 200, this.snapshot().registry);
      return;
    }

    const body = await this.readRequestBody(request);
    if (request.method === "POST" && url.pathname === "/incidents") {
      const incident = this.submitIncident(body as {
        id?: string;
        kind: string;
        location: string;
        severity: number;
        description: string;
      });
      sendJsonResponse(response, 201, incident);
      return;
    }
    if (request.method === "POST" && url.pathname === "/control/block") {
      this.blockPeer(String((body as { nodeId: string }).nodeId));
      sendJsonResponse(response, 200, this.snapshot());
      return;
    }
    if (request.method === "POST" && url.pathname === "/control/unblock") {
      this.unblockPeer(String((body as { nodeId: string }).nodeId));
      sendJsonResponse(response, 200, this.snapshot());
      return;
    }
    sendJsonResponse(response, 404, { error: "not_found" });
  }

  private async readRequestBody(request: IncomingMessage): Promise<unknown> {
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    if (chunks.length === 0) {
      return {};
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  }
}

export function parseSeeds(input: string | undefined): Array<{ host: string; port: number }> {
  if (!input) {
    return [];
  }
  return input
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [host, port] = entry.split(":");
      return {
        host,
        port: Number(port)
      };
    });
}

export function resolveDataDirectory(baseDirectory: string, requestedNodeId: string | undefined, meshPort: number): string {
  const stableId = requestedNodeId ?? `mesh-${meshPort}`;
  return join(baseDirectory, stableId);
}
