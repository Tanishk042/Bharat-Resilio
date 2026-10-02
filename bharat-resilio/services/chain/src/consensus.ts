import { Block, Transaction } from "../../../packages/shared-types/src";
import { Blockchain } from "./blockchain";
import { blockHashFields, computeBlockHash, computeMerkleRoot, txHash } from "./chain";
import { signPayload, verifyPayload, sha256Json } from "./crypto";

export interface ValidatorInfo {
  nodeId: string;
  publicKeyPem: string;
}

// === Proof-of-Authority consensus ===
// Validators take turns proposing blocks in a deterministic round-robin order.
// Each proposed block carries validator signatures from other validators who
// have validated and accepted it (a lightweight committee acknowledgment).

export class PoAConsensus {
  private validators: ValidatorInfo[] = [];
  private identityNodeId: string;
  private selfPublicKeyPem: string;
  private selfPrivateKeyPem: string;

  constructor(self: { nodeId: string; publicKeyPem: string; privateKeyPem: string }) {
    this.identityNodeId = self.nodeId;
    this.selfPublicKeyPem = self.publicKeyPem;
    this.selfPrivateKeyPem = self.privateKeyPem;
  }

  setValidators(validators: ValidatorInfo[]): void {
    this.validators = [...validators].sort((a, b) => a.nodeId.localeCompare(b.nodeId));
  }

  getValidators(): ValidatorInfo[] {
    return [...this.validators];
  }

  isValidator(): boolean {
    return this.validators.some((v) => v.nodeId === this.identityNodeId);
  }

  // Deterministic round-robin proposer for a given height.
  proposerFor(height: number): string | null {
    if (this.validators.length === 0) return null;
    return this.validators[height % this.validators.length].nodeId;
  }

  isMyTurn(height: number): boolean {
    return this.proposerFor(height) === this.identityNodeId;
  }

  // Propose a block for the given height on top of `chain`.
  propose(chain: Blockchain, txs: Transaction[]): Block {
    const tip = chain.tip();
    const block: Block = {
      index: tip.index + 1,
      timestamp: Date.now(),
      previousHash: tip.hash,
      merkleRoot: computeMerkleRoot(txs) ?? "0".repeat(64),
      transactions: txs,
      hash: "",
      proposer: this.identityNodeId,
      validatorSignatures: []
    };
    const hash = computeBlockHash(block);
    block.hash = hash;

    // Proposer signs the block too.
    const proposerSig = this.signBlockPayload(block);
    block.validatorSignatures = [{ signer: this.selfPublicKeyPem, signature: proposerSig }];
    return block;
  }

  // Sign the block's immutable fields (this node's endorsement).
  signBlock(block: Block): { signer: string; signature: string } {
    return {
      signer: this.selfPublicKeyPem,
      signature: this.signBlockPayload(block)
    };
  }

  private signBlockPayload(block: Block): string {
    const payload = blockHashFields({
      index: block.index,
      timestamp: block.timestamp,
      previousHash: block.previousHash,
      merkleRoot: block.merkleRoot,
      transactions: block.transactions,
      proposer: block.proposer
    });
    return signPayload(this.selfPrivateKeyPem, payload);
  }

  // Verify a validator's endorsement on a block.
  verifyBlockSignature(block: Block, publicKeyPem: string, signature: string): boolean {
    const payload = blockHashFields({
      index: block.index,
      timestamp: block.timestamp,
      previousHash: block.previousHash,
      merkleRoot: block.merkleRoot,
      transactions: block.transactions,
      proposer: block.proposer
    });
    return verifyPayload(publicKeyPem, payload, signature);
  }

  // Check that a block is proposed by the correct round-robin validator AND
  // carries a valid endorsement from a quorum of validators.
  validateBlockEndorsement(block: Block, minValidatorSignatures: number): string | null {
    const expectedProposer = this.proposerFor(block.index);
    if (block.proposer !== expectedProposer) {
      return `block proposed by ${block.proposer}, expected ${expectedProposer}`;
    }

    const validatorsByKey = new Map(
      this.validators.map((v) => [v.publicKeyPem.trim(), v.nodeId])
    );

    const seen = new Set<string>();
    let validCount = 0;
    for (const sig of block.validatorSignatures ?? []) {
      const signerPk = sig.signer.trim();
      const validatorNodeId = validatorsByKey.get(signerPk);
      if (!validatorNodeId) continue;
      if (seen.has(validatorNodeId)) continue;
      if (!this.verifyBlockSignature(block, signerPk, sig.signature)) continue;
      seen.add(validatorNodeId);
      validCount++;
    }

    if (validCount < minValidatorSignatures) {
      return `insufficient validator signatures: ${validCount}/${minValidatorSignatures}`;
    }
    return null;
  }

  validateTransaction(tx: Transaction): string | null {
    if (!tx.txId || !tx.timestamp || !tx.signer || !tx.signature) {
      return "invalid transaction structure";
    }
    // Verify the signer's endorsement if we know this node.
    const validator = this.validators.find((v) => v.publicKeyPem.trim() === tx.signer.trim());
    if (validator) {
      const payload = sha256Json({ txId: tx.txId, type: tx.type, data: tx.data, timestamp: tx.timestamp, signer: tx.signer });
      if (!verifyPayload(tx.signer, payload, tx.signature)) {
        return "invalid transaction signature";
      }
    }
    return null;
  }
}
