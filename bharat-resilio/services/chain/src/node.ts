import * as net from "node:net";
import { createHash } from "node:crypto";
import { Duplex } from "node:stream";
import { createServer as createHttpServer, IncomingMessage, ServerResponse } from "node:http";
import { Block, Transaction } from "../../../packages/shared-types/src";
import { Blockchain } from "./blockchain";
import { PoAConsensus } from "./consensus";
import { encodeFrame, decodeFrames, signMessage, verifyMessage, signPayload } from "./transport";

// === Chain node ===
// Runs a permissioned PoA chain with N validator nodes gossiping blocks and
// syncing over raw TCP, sharing the same framing/signing layer as the mesh.

export interface ChainNodeConfig {
  nodeId: string;
  publicKeyPem: string;
  privateKeyPem: string;
  host: string;
  chainPort: number;
  apiPort: number;
  seeds: Array<{ host: string; port: number }>;
  validatorNodeIds: string[];
  minValidatorSignatures: number;
  multisigThreshold: number;
  authorizedOracleKeys: string[]; // public keys allowed to sign ReleaseFundsTx
  peerPublicKeys?: { [nodeId: string]: string };
}

interface PeerConn {
  socket: net.Socket;
  buffer: Buffer;
  peerNodeId?: string;
}

export class ChainNodeService {
  private readonly config: ChainNodeConfig;
  private readonly chain: Blockchain;
  private readonly consensus: PoAConsensus;
  private readonly connections = new Set<PeerConn>();
  private readonly knownAddresses = new Map<string, { host: string; port: number }>();
  private readonly peerTxs = new Map<string, Transaction>();
  private sequence = 0;
  private server = net.createServer();
  private apiServer = createHttpServer(this.handleHttp.bind(this));
  private timers: NodeJS.Timeout[] = [];
  private intervalMs: number;

  constructor(config: ChainNodeConfig, intervalMs = 300) {
    this.config = config;
    this.intervalMs = intervalMs;
    // All nodes share an identical genesis: proposer is the first validator in
    // lexicographic order, so every node starts from the same genesis hash and
    // chains can be synced and cross-validated.
    const sortedValidators = [...config.validatorNodeIds].sort();
    const genesisProposer = sortedValidators[0] ?? config.nodeId;
    this.chain = new Blockchain(genesisProposer);
    this.consensus = new PoAConsensus({
      nodeId: config.nodeId,
      publicKeyPem: config.publicKeyPem,
      privateKeyPem: config.privateKeyPem
    });
  }

  async start(): Promise<void> {
    const validatorKeys = this.loadValidatorPublicKeys();
    this.consensus.setValidators(
      this.config.validatorNodeIds.map((nodeId, i) => ({
        nodeId,
        publicKeyPem: this.config.peerPublicKeys?.[nodeId] ?? validatorKeys[i]
      }))
    );
    this.knownAddresses.set(this.config.nodeId, { host: this.config.host, port: this.config.chainPort });

    this.server.on("connection", (socket) => this.registerSocket(socket));
    this.server.listen(this.config.chainPort, this.config.host);

    this.apiServer.listen(this.config.apiPort, this.config.host);

    await this.waitListening(this.server);
    await this.waitListening(this.apiServer);

    for (const seed of this.config.seeds) {
      this.connectToAddress(seed.host, seed.port);
    }

    this.timers.push(setInterval(() => this.onTick(), this.intervalMs));
  }

  async stop(): Promise<void> {
    this.timers.forEach((t) => clearInterval(t));
    for (const conn of this.connections) conn.socket.destroy();
    this.server.close();
    this.apiServer.close();
  }

  // === Public API used by the orchestration layer / tests ===
  submitIncident(incidentId: string, tier: string, dataHash: string, reporterNodeId: string): void {
    const tx = this.createLogIncidentTx(incidentId, tier, dataHash, reporterNodeId);
    this.addTxAndGossip(tx);
  }

  getChain(): Block[] {
    return this.chain.getChain();
  }

  getState() {
    return this.chain.getState();
  }

  height(): number {
    return this.chain.height();
  }

  tipHash(): string {
    return this.chain.tip().hash;
  }

  isValidator(): boolean {
    return this.consensus.isValidator();
  }

  // Submit a ReleaseFunds tx that is already multisig-signed by N oracles.
  submitFundsRelease(tx: Transaction): string | null {
    if (tx.type !== "ReleaseFunds") return "not release funds";
    const t = tx as Transaction;
    if (this.config.multisigThreshold <= 0) return "no multisig threshold";
    this.addTxAndGossip(t);
    return null;
  }

  private createLogIncidentTx(incidentId: string, tier: string, dataHash: string, reporterNodeId: string): Transaction {
    const data = { incidentId, tier, dataHash, reporterNodeId };
    const tx: Transaction = {
      txId: `tx-${incidentId}-${Date.now()}`,
      type: "LogIncident",
      data,
      timestamp: Date.now(),
      signer: this.config.publicKeyPem,
      signature: ""
    };
    tx.signature = signPayload(this.config.privateKeyPem, JSON.stringify({ txId: tx.txId, type: tx.type, data: tx.data, timestamp: tx.timestamp, signer: tx.signer }));
    return tx;
  }

  private loadValidatorPublicKeys(): string[] {
    // Deterministic demo keys derived from validator node ids.
    // In production these come from the mesh identity registry.
    return this.config.validatorNodeIds.map((nodeId) => {
      return `validator-${nodeId}-public`;
    });
  }

  private addTxAndGossip(tx: Transaction): void {
    this.peerTxs.set(tx.txId, tx);
    // Gossip the transaction to peers so the round-robin leader can include it.
    this.broadcastTx(tx);
    this.maybePropose();
  }

  private broadcastTx(tx: Transaction): void {
    for (const conn of this.connections) {
      if (conn.socket.destroyed) continue;
      this.sendTo(conn, "tx_gossip", { tx });
    }
  }

  private handleForeignTx(tx: Transaction): void {
    if (this.peerTxs.has(tx.txId)) return;
    this.peerTxs.set(tx.txId, tx);
    this.broadcastTx(tx);
  }

  private maybePropose(): void {
    if (!this.consensus.isMyTurn(this.chain.height() + 1)) return;
    this.proposeBlock();
  }

  private proposeBlock(): void {
    const txs = Array.from(this.peerTxs.values()).filter((tx) => !this.txInChain(tx.txId));
    if (txs.length === 0) return;
    const block = this.consensus.propose(this.chain, txs);
    // Add our own endorsement (proposer is a validator).
    const err = this.chain.validateAndAppend(block);
    if (err) return;
    txs.forEach((tx) => this.peerTxs.delete(tx.txId));
    this.broadcastBlock(block);
  }

  private txInChain(txId: string): boolean {
    for (const block of this.chain.getChain()) {
      if (block.transactions.some((tx) => tx.txId === txId)) return true;
    }
    return false;
  }

  private handleForeignBlock(block: Block): void {
    if (!this.validateForeignBlock(block)) return;
    this.chain.validateAndAppend(structuredClone(block));
  }

  // Validate a block from a peer (checks endorsement quorum).
  private validateForeignBlock(block: Block): boolean {
    const minSigs = Math.min(this.config.minValidatorSignatures, this.config.validatorNodeIds.length);
    const endorsementErr = this.consensus.validateBlockEndorsement(block, minSigs);
    if (endorsementErr) return false;
    return true;
  }

  private broadcastBlock(block: Block): void {
    for (const conn of this.connections) {
      if (conn.socket.destroyed) continue;
      this.sendTo(conn, "chain_block", { block });
    }
  }

  private onTick(): void {
    // Attempt to propose if it's our turn and we have pending txs.
    if (this.consensus.isMyTurn(this.chain.height() + 1) && this.peerTxs.size > 0) {
      this.proposeBlock();
    }
    // Gossip our tip periodically so peers can sync.
    this.gossipTip();
  }

  private gossipTip(): void {
    for (const conn of this.connections) {
      if (conn.socket.destroyed) continue;
      this.sendTo(conn, "chain_tip", {
        height: this.chain.height(),
        tipHash: this.chain.tip().hash
      });
    }
  }

  // === Transport plumbing (raw TCP + shared framing) ===

  private registerSocket(socket: net.Socket): void {
    const conn: PeerConn = { socket, buffer: Buffer.alloc(0) };
    this.connections.add(conn);
    socket.on("data", (chunk) => this.handleData(conn, chunk));
    socket.on("close", () => this.connections.delete(conn));
    socket.on("error", () => this.connections.delete(conn));
    this.sendHello(conn);
  }

  private handleData(conn: PeerConn, chunk: Buffer): void {
    conn.buffer = Buffer.concat([conn.buffer, chunk]);
    const { messages, remainder } = decodeFrames(conn.buffer);
    conn.buffer = remainder;
    for (const message of messages) {
      this.handleMessage(conn, message);
    }
  }

  private handleMessage(conn: PeerConn, message: ReturnType<typeof decodeFrames>["messages"][number]): void {
    if (!verifyMessage(message)) return;
    conn.peerNodeId = message.senderNodeId;
    this.routeMessage(conn, message);
  }

  private routeMessage(conn: PeerConn, message: unknown): void {
    const msg = message as { type: string; payload: any };
    switch (msg.type) {
      case "hello":
        this.sendTip(conn);
        break;
      case "chain_tip":
        this.handleChainTip(msg.payload);
        break;
      case "chain_request":
        this.handleChainRequest(conn, msg.payload);
        break;
      case "chain_block":
        this.handleForeignBlock(msg.payload.block as Block);
        this.broadcastBlock(msg.payload.block as Block);
        break;
      case "tx_gossip":
        this.handleForeignTx(msg.payload.tx as Transaction);
        break;
      default:
        break;
    }
  }

  private handleChainTip(payload: { height: number; tipHash: string }): void {
    if (payload.height > this.chain.height()) {
      // We're behind; request blocks from peers.
      // (In a fuller implementation we'd fetch from the peer; here gossip covers it.)
    }
  }

  private handleChainRequest(conn: PeerConn, payload: { fromIndex: number }): void {
    for (let i = payload.fromIndex; i <= this.chain.height(); i++) {
      const block = this.chain.getBlock(i);
      if (block) this.sendTo(conn, "chain_block", { block });
    }
  }

  private sendHello(conn: PeerConn): void {
    this.sendTo(conn, "hello", { nodeId: this.config.nodeId });
  }

  private sendTip(conn: PeerConn): void {
    this.sendTo(conn, "chain_tip", {
      height: this.chain.height(),
      tipHash: this.chain.tip().hash
    });
  }

  private sendTo(conn: PeerConn, type: string, payload: unknown): void {
    const reply = signMessage(
      {
        type,
        senderNodeId: this.config.nodeId,
        senderPublicKey: this.config.publicKeyPem,
        sequence: ++this.sequence
      },
      this.config.privateKeyPem,
      payload
    );
    conn.socket.write(encodeFrame(reply));
  }

  private connectToAddress(host: string, port: number): void {
    const socket = net.createConnection({ host, port });
    socket.once("connect", () => this.registerSocket(socket));
    socket.once("error", () => socket.destroy());
  }

  private waitListening(server: net.Server | ReturnType<typeof createHttpServer>): Promise<void> {
    if (server.listening) return Promise.resolve();
    return new Promise((resolve) => server.once("listening", resolve));
  }

  private async handleHttp(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    if (req.method === "GET" && url.pathname === "/chain") {
      this.json(res, 200, this.getChain());
      return;
    }
    if (req.method === "GET" && url.pathname === "/state") {
      this.json(res, 200, this.getState());
      return;
    }
    if (req.method === "GET" && url.pathname === "/health") {
      this.json(res, 200, {
        nodeId: this.config.nodeId,
        height: this.chain.height(),
        tipHash: this.chain.tip().hash,
        validators: this.config.validatorNodeIds,
        isValidator: this.consensus.isValidator()
      });
      return;
    }
    if (req.method === "POST" && url.pathname === "/incidents") {
      const body = await this.readBody(req);
      this.submitIncident(body.incidentId, body.tier, body.dataHash ?? "", body.reporterNodeId ?? this.config.nodeId);
      this.json(res, 201, { ok: true, height: this.chain.height() });
      return;
    }
    this.json(res, 404, { error: "not_found" });
  }

  private json(res: ServerResponse, status: number, payload: unknown): void {
    res.statusCode = status;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(payload, null, 2) + "\n");
  }

  private async readBody(req: IncomingMessage): Promise<any> {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  }
}

declare module "node:net" {}
