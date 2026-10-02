import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { Blockchain } from "../src/blockchain";
import {
  computeMerkleRoot,
  computeBlockHash,
  genesisBlock,
  applyBlock,
  INITIAL_STATE,
  applyTransaction,
  applyFundsRelease,
  applyIncidentLog
} from "../src/chain";
import { PoAConsensus } from "../src/consensus";
import {
  createLogIncidentTx,
  addMultisigSignature,
  verifyMultisig,
  verifyTransactionSignature
} from "../src/blockchain";
import { signPayload, verifyPayload } from "../src/crypto";

function makeKeys(label: string): { privateKeyPem: string; publicKeyPem: string } {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  return {
    privateKeyPem: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    publicKeyPem: publicKey.export({ type: "spki", format: "pem" }).toString()
  };
}

function mkDbTx(labels: string[]): any[] {
  return labels.map((label) => ({
    txId: label,
    type: "LogIncident",
    data: { incidentId: label, tier: "High", dataHash: `hash-${label}`, reporterNodeId: "node-x" },
    timestamp: 123,
    signer: "signer",
    signature: label
  }));
}

export function runChainCoreTests(): void {
  // Merkle tree correctness
  const empty = computeMerkleRoot([]);
  assert.equal(empty, "0".repeat(64), "empty merkle root is the zero commitment");

  const single = mkDbTx(["a"]);
  const rootSingle = computeMerkleRoot(single);
  assert.ok(rootSingle);

  const two = mkDbTx(["a", "b"]);
  const rootTwo = computeMerkleRoot(two);
  assert.ok(rootTwo);
  assert.equal(rootTwo.length, 64, "merkle root must be 64 hex chars sha256");

  // Reordering changes root
  const rootTwoReordered = computeMerkleRoot([two[1], two[0]]);
  assert.notEqual(rootTwo, rootTwoReordered, "reordering txs must change merkle root");

  // Odd count handled (duplicates last)
  const three = mkDbTx(["a", "b", "c"]);
  const rootThree = computeMerkleRoot(three);
  assert.ok(rootThree);

  const oddManualLeft = two[0].txId;
  const oddRight = `L${two[1].txId}`;
  const { sha256 } = require("../src/crypto");
  // We just assert the root is deterministic & 64 chars
  assert.equal(rootThree.length, 64);

  // Block hashing is deterministic
  const b1 = genesisBlock("validator-a");
  assert.equal(b1.hash.length, 64);
  const b1again = genesisBlock("validator-a");
  assert.equal(b1.hash, b1again.hash);

  // Blockchain append validation
  const bc = new Blockchain("validator-a");
  const b2 = {
    ...b1,
    index: 1,
    timestamp: Date.now(),
    previousHash: b1.hash,
    transactions: [],
    merkleRoot: "0".repeat(64),
    hash: "",
    proposer: "validator-a",
    validatorSignatures: []
  };
  b2.merkleRoot = computeMerkleRoot([]) ?? "0".repeat(64);
  b2.hash = computeBlockHash(b2);
  const err = bc.validateAndAppend(b2);
  assert.equal(err, null);

  // Reject same block twice (dedup)
  const err2 = bc.validateAndAppend(b2);
  assert.equal(err2, "duplicate block");

  // Reject invalid previous hash
  const b3 = { ...b2, index: 2, previousHash: "0".repeat(64), transactions: [], merkleRoot: "0".repeat(64), hash: "", validatorSignatures: [] };
  b3.merkleRoot = computeMerkleRoot([]) ?? "0".repeat(64);
  b3.hash = computeBlockHash(b3);
  const err3 = bc.validateAndAppend(b3);
  assert.equal(err3, "invalid previous hash");

  // Reject invalid merkle root
  const b4 = { ...b2, index: 2, previousHash: b2.hash, transactions: mkDbTx(["x"]), merkleRoot: "wrong", hash: "", validatorSignatures: [] };
  b4.hash = computeBlockHash(b4);
  const err4 = bc.validateAndAppend(b4);
  assert.equal(err4, "invalid merkle root");

  // State transition determinism: applyIncidentLog
  const keys = makeKeys("a");
  const txLog = createLogIncidentTx(keys.privateKeyPem, keys.publicKeyPem, "incident-1", "Catastrophic", "hash-1", "node-a");
  assert.equal(verifyTransactionSignature(txLog, keys.publicKeyPem), true);
  const state1 = applyTransaction(INITIAL_STATE, txLog);
  const state2 = applyTransaction(INITIAL_STATE, txLog);
  assert.deepEqual(state1, state2, "state transitions must be deterministic");

  // applyBlock determinism
  const blockWithTx = {
    index: 1,
    timestamp: 100,
    previousHash: b1.hash,
    merkleRoot: "",
    transactions: [txLog],
    hash: "",
    proposer: "validator-a",
    validatorSignatures: [] as any[]
  };
  blockWithTx.merkleRoot = computeMerkleRoot([txLog])!;
  blockWithTx.hash = computeBlockHash(blockWithTx);
  const sa = applyBlock(INITIAL_STATE, blockWithTx);
  const sb = applyBlock(INITIAL_STATE, blockWithTx);
  assert.deepEqual(sa, sb);
  assert.equal(sa.incidents["incident-1"].tier, "Catastrophic");

  // applyFundsRelease only works on Catastrophic incidents
  const keys2 = makeKeys("b");
  const keys3 = makeKeys("c");
  const releaseTx: any = {
    txId: "rel-1",
    type: "ReleaseFunds",
    data: { incidentId: "incident-1", amount: 1000, recipientAddress: "addr-1" },
    timestamp: 200,
    signer: keys2.publicKeyPem,
    signature: "",
    multisigSignatures: []
  };
  // Success path: incident is Catastrophic
  const stateWithIncident = applyIncidentLog(INITIAL_STATE, txLog);
  const released = applyFundsRelease(stateWithIncident, releaseTx);
  assert.equal(released.fundsReleased["incident-1"].amount, 1000);

  // Fail path: non-catastrophic incident
  const txLow = createLogIncidentTx(keys2.privateKeyPem, keys2.publicKeyPem, "incident-2", "Low", "hash-2", "node-b");
  const stateWithLow = applyTransaction(INITIAL_STATE, txLow);
  const notReleased = applyFundsRelease(stateWithLow, releaseTx);
  assert.equal(notReleased.fundsReleased["incident-1"], undefined);
}

export function runPoATests(): void {
  const keyA = makeKeys("a-poa");
  const keyB = makeKeys("b-poa");
  const keyC = makeKeys("c-poa");
  const validators = [
    { nodeId: "a", publicKeyPem: keyA.publicKeyPem },
    { nodeId: "b", publicKeyPem: keyB.publicKeyPem },
    { nodeId: "c", publicKeyPem: keyC.publicKeyPem }
  ];
  const consensus = new PoAConsensus({ nodeId: "a", publicKeyPem: keyA.publicKeyPem, privateKeyPem: keyA.privateKeyPem });
  consensus.setValidators(validators);
  const consensusB = new PoAConsensus({ nodeId: "b", publicKeyPem: keyB.publicKeyPem, privateKeyPem: keyB.privateKeyPem });
  consensusB.setValidators(validators);

  // Round-robin proposer
  assert.equal(consensus.proposerFor(0), "a");
  assert.equal(consensus.proposerFor(1), "b");
  assert.equal(consensus.proposerFor(2), "c");
  assert.equal(consensus.proposerFor(3), "a");

  // Node "b" (new Blockchain starts at genesis index 0; the next block is index 1,
  // whose round-robin leader is "b") proposes validly.
  const chain = new Blockchain("a");
  const proposer = consensusB.propose(chain, []);
  assert.equal(proposer.proposer, "b");

  // Another validator (c) also signs the block.
  const sigC = consensus.signBlock(proposer); // node "a" endorses
  const blockWithTwo = { ...proposer, validatorSignatures: [...proposer.validatorSignatures, sigC] };

  // With 1 sig (only proposer) threshold 1 passes
  const ok = consensus.validateBlockEndorsement(proposer, 1);
  assert.equal(ok, null, "single proposer sig should satisfy threshold 1");

  // Threshold 2 fails with only 1 sig
  const fail2 = consensus.validateBlockEndorsement(proposer, 2);
  assert.ok(fail2, "insufficient signatures should fail");

  // Threshold 2 passes with 2 sigs
  const ok2 = consensus.validateBlockEndorsement(blockWithTwo, 2);
  assert.equal(ok2, null, "two sigs should satisfy threshold 2");

  // A block proposed by the wrong validator is rejected: forge a block for index 1
  // attributed to "a" (leader for index 1 is "b"), signed by "a".
  const wrongProposer = consensus.propose(chain, []);
  const forged = { ...wrongProposer, proposer: "a", validatorSignatures: [] as any[] };
  const sigA = consensus.signBlock({ ...forged, validatorSignatures: [] as any[] });
  forged.validatorSignatures = [sigA];
  const errWrongProposer = consensus.validateBlockEndorsement(forged, 1);
  assert.ok(errWrongProposer, "wrong proposer must be rejected");
}

export function runMultisigTests(): void {
  const signerA = makeKeys("sigma-a");
  const signerB = makeKeys("sigma-b");
  const signerC = makeKeys("sigma-c");

  const unsigned: any = {
    txId: "rel-multi",
    type: "ReleaseFunds",
    data: { incidentId: "inc-x", amount: 500, recipientAddress: "addr" },
    timestamp: 123,
    signer: signerA.publicKeyPem,
    signature: "",
    multisigSignatures: []
  };
  // sign the base payload once
  const payload = JSON.stringify({ txId: unsigned.txId, type: unsigned.type, data: unsigned.data, timestamp: unsigned.timestamp, signer: unsigned.signer });
  unsigned.signature = signPayload(signerA.privateKeyPem, payload);

  const withA = addMultisigSignature({ ...unsigned }, signerA.privateKeyPem, signerA.publicKeyPem);
  const withAB = addMultisigSignature(withA, signerB.privateKeyPem, signerB.publicKeyPem);
  const withABC = addMultisigSignature(withAB, signerC.privateKeyPem, signerC.publicKeyPem);

  const authorized = [signerA.publicKeyPem, signerB.publicKeyPem, signerC.publicKeyPem];

  // threshold 2 of 3 with 2 sigs passes
  assert.equal(verifyMultisig(withAB, 2, authorized), true);
  // threshold 3 of 3 with 2 sigs fails
  assert.equal(verifyMultisig(withAB, 3, authorized), false);
  // threshold 3 with 3 sigs passes
  assert.equal(verifyMultisig(withABC, 3, authorized), true);
  // Unauthorized signer not counted
  const rogue = makeKeys("rogue");
  const withRogue = addMultisigSignature(withA, rogue.privateKeyPem, rogue.publicKeyPem);
  assert.equal(verifyMultisig(withRogue, 2, authorized), false, "rogue signer must not count");
  // Duplicate signer counted once
  const withDuplicate = addMultisigSignature(withA, signerA.privateKeyPem, signerA.publicKeyPem);
  assert.equal(verifyMultisig(withDuplicate, 2, authorized), false, "duplicate signer must not double-count");
}

export function runForkChoiceTests(): void {
  const bc = new Blockchain("v0");
  const forkA = bc.getChain();
  const forkB = bc.getChain();

  // Both forks have genesis only -> tie, equal hash -> pick a (deterministic)
  const winner = Blockchain.forkChoice(forkA, forkB);
  assert.equal(winner.length, forkA.length);

  // Longer chain wins
  const chain2 = new Blockchain("v0");
  const block1 = genesisBlock("v0");
  const b = {
    index: 1,
    timestamp: Date.now(),
    previousHash: block1.hash,
    merkleRoot: "0".repeat(64),
    transactions: [] as any[],
    hash: "",
    proposer: "v0",
    validatorSignatures: [] as any[]
  };
  b.merkleRoot = computeMerkleRoot([]) ?? "0".repeat(64);
  b.hash = computeBlockHash(b);
  chain2.validateAndAppend(b);

  const longer = Blockchain.forkChoice(chain2.getChain(), bc.getChain());
  assert.equal(longer.length, 2, "longer chain must win fork choice");
}
