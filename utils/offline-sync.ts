// import { io } from '../src/app' - Removed to avoid server-side import in client code

interface SyncItem {
  id: string
  type: string
  data: any
  timestamp: number
  synced: boolean
}

class OfflineSync {
  private static instance: OfflineSync
  private syncQueue: SyncItem[] = []
  private isOnline: boolean = false
  private db: IDBDatabase | null = null

  private constructor() {
    if (typeof window === "undefined") return
    this.isOnline = navigator.onLine
    this.initIndexedDB()
    this.setupEventListeners()
  }

  static getInstance(): OfflineSync {
    if (!OfflineSync.instance) {
      OfflineSync.instance = new OfflineSync()
    }
    return OfflineSync.instance
  }

  private async initIndexedDB() {
    const request = indexedDB.open('ResilioOfflineDB', 1)

    request.onerror = () => {
      console.error('Failed to open IndexedDB')
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains('syncQueue')) {
        db.createObjectStore('syncQueue', { keyPath: 'id' })
      }
    }

    request.onsuccess = (event) => {
      this.db = (event.target as IDBOpenDBRequest).result
      this.processSyncQueue()
    }
  }

  private setupEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true
      this.processSyncQueue()
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
    })
  }

  async addToSyncQueue(type: string, data: any) {
    const syncItem: SyncItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: Date.now(),
      synced: false
    }

    if (this.db) {
      const transaction = this.db.transaction(['syncQueue'], 'readwrite')
      const store = transaction.objectStore('syncQueue')
      await store.add(syncItem)
    }

    this.syncQueue.push(syncItem)
    if (this.isOnline) {
      this.processSyncQueue()
    }
  }

  private async processSyncQueue() {
    if (!this.isOnline || !this.db) return

    const transaction = this.db.transaction(['syncQueue'], 'readwrite')
    const store = transaction.objectStore('syncQueue')
    const request = store.getAll()

    request.onsuccess = async () => {
      const items = request.result
      for (const item of items) {
        if (!item.synced) {
          try {
            await this.syncItem(item)
            item.synced = true
            await store.put(item)
          } catch (error) {
            console.error(`Failed to sync item: ${item.id}`, error)
          }
        }
      }
    }
  }

  private async syncItem(item: SyncItem) {
    switch (item.type) {
      case 'operation':
        await this.syncOperation(item.data)
        break
      case 'alert':
        await this.syncAlert(item.data)
        break
      case 'volunteer':
        await this.syncVolunteer(item.data)
        break
      default:
        console.warn(`Unknown sync type: ${item.type}`)
    }
  }

  private async syncOperation(data: any) {
    // TODO: Implement sync with backend API
    return Promise.resolve({ success: true })
  }

  private async syncAlert(data: any) {
    // TODO: Implement sync with backend API
    return Promise.resolve({ success: true })
  }

  private async syncVolunteer(data: any) {
    // TODO: Implement sync with backend API
    return Promise.resolve({ success: true })
  }
}

export const offlineSync = OfflineSync.getInstance()