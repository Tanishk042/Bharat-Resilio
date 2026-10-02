"use client"

/**
 * Offline-first caching layer for mesh incidents and chain blocks.
 * Stores the CRDT-replicated incident registry and recent blocks in IndexedDB
 * so the UI remains functional during network partitions.
 */

export interface CachedIncident {
  id: string
  kind: string
  location: string
  severity: number
  description: string
  reporterNodeId: string
  lamportCounter: number
  cachedAt: number
}

export interface CachedChainBlock {
  index: number
  hash: string
  previousHash: string
  txCount: number
  proposer: string
  cachedAt: number
}

const DB_NAME = "resilio-offline-cache"
const DB_VERSION = 1
const INCIDENT_STORE = "incidents"
const BLOCK_STORE = "blocks"
const META_STORE = "meta"

let dbPromise: Promise<IDBDatabase> | null = null

function openCacheDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(INCIDENT_STORE)) {
        db.createObjectStore(INCIDENT_STORE, { keyPath: "id" })
      }
      if (!db.objectStoreNames.contains(BLOCK_STORE)) {
        db.createObjectStore(BLOCK_STORE, { keyPath: "index" })
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

export async function cacheIncidents(incidents: CachedIncident[]): Promise<void> {
  try {
    const db = await openCacheDB()
    const tx = db.transaction(INCIDENT_STORE, "readwrite")
    for (const incident of incidents) {
      tx.objectStore(INCIDENT_STORE).put(incident)
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // IndexedDB unavailable — fail silently, functionality degrades
  }
}

export async function getCachedIncidents(): Promise<CachedIncident[]> {
  try {
    const db = await openCacheDB()
    const tx = db.transaction(INCIDENT_STORE, "readonly")
    const req = tx.objectStore(INCIDENT_STORE).getAll()
    return new Promise((resolve) => {
      req.onsuccess = () => resolve((req.result as CachedIncident[]) ?? [])
      req.onerror = () => resolve([])
    })
  } catch {
    return []
  }
}

export async function cacheBlock(block: CachedChainBlock): Promise<void> {
  try {
    const db = await openCacheDB()
    const tx = db.transaction(BLOCK_STORE, "readwrite")
    tx.objectStore(BLOCK_STORE).put(block)
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // noop
  }
}

export async function getCachedBlocks(): Promise<CachedChainBlock[]> {
  try {
    const db = await openCacheDB()
    const tx = db.transaction(BLOCK_STORE, "readonly")
    const req = tx.objectStore(BLOCK_STORE).getAll()
    return new Promise((resolve) => {
      req.onsuccess = () => resolve((req.result as CachedChainBlock[]) ?? [])
      req.onerror = () => resolve([])
    })
  } catch {
    return []
  }
}

export async function setConnectionStatus(connected: boolean): Promise<void> {
  try {
    const db = await openCacheDB()
    const tx = db.transaction(META_STORE, "readwrite")
    tx.objectStore(META_STORE).put({ connected, at: Date.now() }, "connection")
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // noop
  }
}