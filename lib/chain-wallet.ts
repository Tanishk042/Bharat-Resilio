/**
 * Browser-side Ed25519 keypair management for the custom Bharat Resilio chain.
 * Uses Web Crypto API (not MetaMask/EVM).
 * Stores keypair in IndexedDB for persistence.
 */

const DB_NAME = "resilio-wallet"
const STORE_NAME = "keypairs"
const DB_VERSION = 1

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

function hexToBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.match(/.{1,2}/g)!.map((h) => parseInt(h, 16)))
  return bytes.buffer
}

export interface WalletIdentity {
  nodeId: string
  publicKeyHex: string
  privateKeyHex: string
  role: string
  createdAt: number
}

export async function generateWalletIdentity(
  role: string = "civilian"
): Promise<WalletIdentity> {
  const keyPair = await crypto.subtle.generateKey(
    { name: "Ed25519" },
    true,
    ["sign", "verify"]
  )

  const publicKeyBuffer = await crypto.subtle.exportKey("raw", keyPair.publicKey)
  const privateKeyBuffer = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey)

  const publicKeyHex = bufferToHex(publicKeyBuffer)
  const privateKeyHex = bufferToHex(privateKeyBuffer)

  const nodeId = `node-${publicKeyHex.slice(0, 16)}`

  const identity: WalletIdentity = {
    nodeId,
    publicKeyHex,
    privateKeyHex,
    role,
    createdAt: Date.now(),
  }

  const db = await openDB()
  const tx = db.transaction(STORE_NAME, "readwrite")
  tx.objectStore(STORE_NAME).put(identity, "current")
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })

  return identity
}

export async function loadWalletIdentity(): Promise<WalletIdentity | null> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, "readonly")
    const req = tx.objectStore(STORE_NAME).get("current")
    return new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

export async function signWithWallet(
  identity: WalletIdentity,
  data: string
): Promise<string> {
  const privateKeyBuffer = hexToBuffer(identity.privateKeyHex)
  const key = await crypto.subtle.importKey(
    "pkcs8",
    privateKeyBuffer,
    { name: "Ed25519" },
    false,
    ["sign"]
  )
  const signatureBuffer = await crypto.subtle.sign(
    "Ed25519",
    key,
    new TextEncoder().encode(data)
  )
  return bufferToHex(signatureBuffer)
}

export async function verifyWithWallet(
  publicKeyHex: string,
  data: string,
  signatureHex: string
): Promise<boolean> {
  try {
    const publicKeyBuffer = hexToBuffer(publicKeyHex)
    const key = await crypto.subtle.importKey(
      "raw",
      publicKeyBuffer,
      { name: "Ed25519" },
      false,
      ["verify"]
    )
    return crypto.subtle.verify(
      "Ed25519",
      key,
      hexToBuffer(signatureHex),
      new TextEncoder().encode(data)
    )
  } catch {
    return false
  }
}
