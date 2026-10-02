import { Transaction, Block, ChainState } from "../../../packages/shared-types/src";
import { sha256, sha256Json, canonicalStringify } from "./crypto";

// === Merkle Tree (from scratch) ===
// Given a list of transaction hashes, build a binary Merkle tree and return the root.
// Odd counts duplicate the last hash. Returns null for empty lists.

export function computeMerkleRoot(txs: Transaction[]): string {
  if (txs.length === 0) return "0".repeat(64);
  let level = txs.map((tx) => txHash(tx));

  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = i + 1 < level.length ? level[i + 1] : left;
      next.push(sha256(`${left}${right}`));
    }
    level = next;
  }
  return level[0];
}

export function txHash(tx: Transaction): string {
  return sha256Json({
    txId: tx.txId,
    type: tx.type,
    data: tx.data,
    timestamp: tx.timestamp,
    signer: tx.signer,
    signature: tx.signature,
    multisigSignatures: (tx as { multisigSignatures?: unknown }).multisigSignatures ?? null
  });
}

// === Block hashing ===
// Block hash covers everything except validatorSignatures (so we can add sigs
// without changing proposer-produced hash) — standard practice.

export function blockHashFields(b: {
  index: number;
  timestamp: number;
  previousHash: string;
  merkleRoot: string;
  transactions: Transaction[];
  proposer: string;
}): string {
  return sha256(
    canonicalStringify({
      index: b.index,
      timestamp: b.timestamp,
      previousHash: b.previousHash,
      merkleRoot: b.merkleRoot,
      txHashes: b.transactions.map(txHash),
      proposer: b.proposer
    })
  );
}

export function computeBlockHash(b: Block): string {
  return blockHashFields({
    index: b.index,
    timestamp: b.timestamp,
    previousHash: b.previousHash,
    merkleRoot: b.merkleRoot,
    transactions: b.transactions,
    proposer: b.proposer
  });
}

// === Genesis ===
export function genesisBlock(proposer: string): Block {
  const block: Block = {
    index: 0,
    timestamp: 0,
    previousHash: "0".repeat(64),
    merkleRoot: sha256("genesis"),
    transactions: [],
    hash: "",
    proposer,
    validatorSignatures: []
  };
  block.hash = computeBlockHash(block);
  return block;
}

// === State-transition functions (deterministic, side-effect-free) ===
// Every honest node computes identical state by processing the same chain —
// these are pure functions of (state, tx) -> newState.

export const INITIAL_STATE: ChainState = {
  incidents: {},
  fundsReleased: {},
  registeredNodes: {}
};

export function applyIncidentLog(state: ChainState, tx: Transaction): ChainState {
  const data = tx.data as { incidentId: string; tier: string; dataHash: string; reporterNodeId: string };
  if (!data?.incidentId) return state;
  return {
    ...state,
    incidents: {
      ...state.incidents,
      [data.incidentId]: {
        tier: data.tier,
        loggedAt: tx.timestamp,
        reportedBy: data.reporterNodeId
      }
    }
  };
}

export function applyFundsRelease(
  state: ChainState,
  tx: Transaction
): ChainState {
  const data = tx.data as { incidentId: string; amount: number; recipientAddress: string };
  if (!data?.incidentId) return state;
  const incident = state.incidents[data.incidentId];
  if (!incident || incident.tier !== "Catastrophic") return state;
  const existing = state.fundsReleased[data.incidentId];
  return {
    ...state,
    fundsReleased: {
      ...state.fundsReleased,
      [data.incidentId]: {
        amount: (existing?.amount ?? 0) + data.amount,
        releasedAt: tx.timestamp
      }
    }
  };
}

export function applyRegisterNode(state: ChainState, tx: Transaction): ChainState {
  const data = tx.data as { nodeId: string; publicKey: string };
  if (!data?.nodeId) return state;
  return {
    ...state,
    registeredNodes: {
      ...state.registeredNodes,
      [data.nodeId]: data.publicKey
    }
  };
}

export function applyTransaction(state: ChainState, tx: Transaction): ChainState {
  switch (tx.type) {
    case "LogIncident":
      return applyIncidentLog(state, tx);
    case "ReleaseFunds":
      return applyFundsRelease(state, tx);
    case "RegisterNode":
      return applyRegisterNode(state, tx);
    default:
      return state;
  }
}

export function applyBlock(state: ChainState, block: Block): ChainState {
  let next = state;
  for (const tx of block.transactions) {
    next = applyTransaction(next, tx);
  }
  return next;
}
