import { Block, ChainState, Transaction, ReleaseFundsTx } from "../../../packages/shared-types/src";
import {
  applyBlock,
  blockHashFields,
  computeBlockHash,
  computeMerkleRoot,
  genesisBlock,
  INITIAL_STATE,
  txHash
} from "./chain";
import { sha256Json, signPayload, verifyPayload } from "./crypto";

// === Blockchain class ===
// Manages the canonical chain, validates blocks, and derives state deterministically.

export class Blockchain {
  private chain: Block[] = [];
  private state: ChainState = INITIAL_STATE;

  constructor(genesisProposer: string) {
    this.chain = [genesisBlock(genesisProposer)];
    this.state = INITIAL_STATE;
  }

  tip(): Block {
    return this.chain[this.chain.length - 1];
  }

  height(): number {
    return this.chain.length - 1;
  }

  getChain(): Block[] {
    return this.chain.map((b) => structuredClone(b));
  }

  getState(): ChainState {
    return structuredClone(this.state);
  }

  getBlock(index: number): Block | undefined {
    return this.chain[index] ? structuredClone(this.chain[index]) : undefined;
  }

  // Validate a block against the current head. Returns error string or null if valid.
  validateAndAppend(block: Block): string | null {
    // Reject if this exact block is already known (idempotence / dedup).
    if (this.chain.some((existing) => existing.hash === block.hash)) {
      return "duplicate block";
    }

    const tip = this.tip();

    if (block.index !== tip.index + 1) {
      return `invalid index: expected ${tip.index + 1}, got ${block.index}`;
    }
    if (block.previousHash !== tip.hash) {
      return "invalid previous hash";
    }

    const root = computeMerkleRoot(block.transactions);
    if (root !== block.merkleRoot) {
      return "invalid merkle root";
    }

    const computed = computeBlockHash(block);
    if (computed !== block.hash) {
      return "invalid block hash";
    }

    this.chain.push(structuredClone(block));
    this.state = applyBlock(this.state, block);
    return null;
  }

  // Validate a foreign block against an explicit previous-hash snapshot (for sync).
  validateAgainst(block: Block, expectedPrevHash: string, expectedIndex: number): string | null {
    if (block.previousHash !== expectedPrevHash) {
      return "invalid previous hash during sync";
    }
    if (block.index !== expectedIndex) {
      return `invalid index during sync: got ${block.index}, expected ${expectedIndex}`;
    }
    const root = computeMerkleRoot(block.transactions);
    if (root !== block.merkleRoot) {
      return "invalid merkle root during sync";
    }
    const computed = computeBlockHash(block);
    if (computed !== block.hash) {
      return "invalid block hash during sync";
    }
    return null;
  }

  // Build a fresh chain + state from an array of blocks, validating each.
  static rebuildFromBlocks(blocks: Block[]): Blockchain | null {
    if (blocks.length === 0) return null;
    const bc = new Blockchain(blocks[0].proposer);
    for (let i = 1; i < blocks.length; i++) {
      const err = bc.validateAndAppend(blocks[i]);
      if (err) return null;
    }
    return bc;
  }

  // === Fork choice ===
  // Given two candidate chains (arrays of blocks), pick the winner by longest-then-lowest-hash.
  static forkChoice(a: Block[], b: Block[]): Block[] {
    if (a.length !== b.length) {
      return a.length > b.length ? a : b;
    }
    if (a.length === 0) return a;
    const lastA = a[a.length - 1];
    const lastB = b[b.length - 1];
    return lastA.hash.localeCompare(lastB.hash) <= 0 ? a : b;
  }
}

// === Transaction construction & signing ===

export function signTransaction(privateKeyPem: string, publicKeyPem: string, tx: Omit<Transaction, "signature">): Transaction {
  const payload = sha256Json({ txId: tx.txId, type: tx.type, data: tx.data, timestamp: tx.timestamp, signer: tx.signer });
  return {
    ...tx,
    signer: publicKeyPem,
    signature: signPayload(privateKeyPem, payload)
  } as Transaction;
}

export function verifyTransactionSignature(tx: Transaction, publicKeyPem: string): boolean {
  const payload = sha256Json({ txId: tx.txId, type: tx.type, data: tx.data, timestamp: tx.timestamp, signer: tx.signer });
  return verifyPayload(publicKeyPem, payload, tx.signature);
}

export function createLogIncidentTx(
  privateKeyPem: string,
  publicKeyPem: string,
  incidentId: string,
  tier: string,
  dataHash: string,
  reporterNodeId: string
): Transaction {
  const data = { incidentId, tier, dataHash, reporterNodeId };
  return signTransaction(privateKeyPem, publicKeyPem, {
    txId: `tx-${incidentId}-${Date.now()}`,
    type: "LogIncident",
    data,
    timestamp: Date.now(),
    signer: publicKeyPem
  } as Omit<Transaction, "signature">);
}

// === Multisig (N-of-M) for ReleaseFundsTx ===
// A ReleaseFundsTx requires signatures from at least N distinct authorized signers.

export function verifyMultisig(tx: ReleaseFundsTx, threshold: number, authorizedPublicKeys: string[]): boolean {
  const payload = sha256Json({
    txId: tx.txId,
    type: tx.type,
    data: tx.data,
    timestamp: tx.timestamp,
    signer: tx.signer
  });

  const authorizedSet = new Set(authorizedPublicKeys.map((pk) => pk.trim()));
  const seenSigners = new Set<string>();
  let validCount = 0;

  for (const sigEntry of tx.multisigSignatures ?? []) {
    const signerPk = sigEntry.signer.trim();
    if (!authorizedSet.has(signerPk)) continue;
    if (seenSigners.has(signerPk)) continue; // duplicate signer doesn't count twice
    if (!verifyPayload(signerPk, payload, sigEntry.signature)) continue;
    seenSigners.add(signerPk);
    validCount++;
  }

  return validCount >= threshold;
}

export function addMultisigSignature(
  tx: ReleaseFundsTx,
  privateKeyPem: string,
  publicKeyPem: string
): ReleaseFundsTx {
  const payload = sha256Json({
    txId: tx.txId,
    type: tx.type,
    data: tx.data,
    timestamp: tx.timestamp,
    signer: tx.signer
  });
  return {
    ...tx,
    multisigSignatures: [
      ...(tx.multisigSignatures ?? []),
      { signer: publicKeyPem, signature: signPayload(privateKeyPem, payload) }
    ]
  };
}
