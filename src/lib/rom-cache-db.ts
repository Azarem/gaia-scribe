/**
 * IndexedDB-based ROM file caching system
 * 
 * Uses IndexedDB instead of localStorage to support large ROM files (up to 32MB+)
 * without base64 encoding overhead. Stores binary data directly as Blobs.
 */

interface RomCacheEntry {
  baseRomId: string // Primary key
  fileName: string
  fileSize: number
  lastModified: number
  blob: Blob // Binary ROM data stored directly
  cachedAt: number // Timestamp when cached
}

class RomCacheDB {
  private dbName = 'scribe-rom-cache'
  private storeName = 'roms'
  private version = 1
  private db: IDBDatabase | null = null

  /**
   * Initialize the IndexedDB database
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => {
        console.error('Failed to open ROM cache database:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        console.log('ROM cache database initialized')
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const objectStore = db.createObjectStore(this.storeName, { keyPath: 'baseRomId' })
          objectStore.createIndex('cachedAt', 'cachedAt', { unique: false })
          console.log('ROM cache object store created')
        }
      }
    })
  }

  /**
   * Ensure database is initialized before operations
   */
  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init()
    }
    if (!this.db) {
      throw new Error('Failed to initialize ROM cache database')
    }
    return this.db
  }

  /**
   * Save ROM file to IndexedDB cache
   */
  async saveRom(baseRomId: string, file: File, data: Uint8Array): Promise<void> {
    try {
      const db = await this.ensureDB()
      
      // Convert Uint8Array to Blob for efficient storage
      const blob = new Blob([data], { type: 'application/octet-stream' })
      
      const entry: RomCacheEntry = {
        baseRomId,
        fileName: file.name,
        fileSize: file.size,
        lastModified: file.lastModified,
        blob,
        cachedAt: Date.now()
      }

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite')
        const objectStore = transaction.objectStore(this.storeName)
        const request = objectStore.put(entry)

        request.onsuccess = () => {
          console.log(`ROM cached in IndexedDB for BaseRomID: ${baseRomId} (${(blob.size / 1024 / 1024).toFixed(2)}MB)`)
          resolve()
        }

        request.onerror = () => {
          console.error('Failed to cache ROM:', request.error)
          reject(request.error)
        }
      })
    } catch (error) {
      console.warn('Failed to save ROM to cache:', error)
      // Don't throw - caching is optional
    }
  }

  /**
   * Retrieve ROM file from IndexedDB cache
   */
  async getRom(baseRomId: string): Promise<{ file: File; data: Uint8Array } | null> {
    try {
      const db = await this.ensureDB()

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readonly')
        const objectStore = transaction.objectStore(this.storeName)
        const request = objectStore.get(baseRomId)

        request.onsuccess = async () => {
          const entry = request.result as RomCacheEntry | undefined

          if (!entry) {
            resolve(null)
            return
          }

          try {
            // Convert Blob back to Uint8Array
            const arrayBuffer = await entry.blob.arrayBuffer()
            const data = new Uint8Array(arrayBuffer)

            // Reconstruct File object
            const file = new File([data], entry.fileName, {
              lastModified: entry.lastModified
            })

            console.log(`ROM loaded from IndexedDB cache: ${baseRomId} (${(entry.blob.size / 1024 / 1024).toFixed(2)}MB)`)
            resolve({ file, data })
          } catch (error) {
            console.error('Failed to reconstruct ROM from cache:', error)
            resolve(null)
          }
        }

        request.onerror = () => {
          console.error('Failed to retrieve ROM from cache:', request.error)
          reject(request.error)
        }
      })
    } catch (error) {
      console.warn('Failed to load ROM from cache:', error)
      return null
    }
  }

  /**
   * Get ROM metadata without loading the full file
   */
  async getRomMetadata(baseRomId: string): Promise<{ name: string; size: number } | null> {
    try {
      const db = await this.ensureDB()

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readonly')
        const objectStore = transaction.objectStore(this.storeName)
        const request = objectStore.get(baseRomId)

        request.onsuccess = () => {
          const entry = request.result as RomCacheEntry | undefined

          if (!entry) {
            resolve(null)
            return
          }

          resolve({
            name: entry.fileName,
            size: entry.fileSize
          })
        }

        request.onerror = () => {
          console.error('Failed to retrieve ROM metadata:', request.error)
          reject(request.error)
        }
      })
    } catch (error) {
      console.warn('Failed to load ROM metadata:', error)
      return null
    }
  }

  /**
   * Check if ROM exists in cache
   */
  async hasRom(baseRomId: string): Promise<boolean> {
    try {
      const metadata = await this.getRomMetadata(baseRomId)
      return metadata !== null
    } catch (error) {
      return false
    }
  }

  /**
   * Delete ROM from cache
   */
  async deleteRom(baseRomId: string): Promise<void> {
    try {
      const db = await this.ensureDB()

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite')
        const objectStore = transaction.objectStore(this.storeName)
        const request = objectStore.delete(baseRomId)

        request.onsuccess = () => {
          console.log(`ROM cache cleared for BaseRomID: ${baseRomId}`)
          resolve()
        }

        request.onerror = () => {
          console.error('Failed to delete ROM from cache:', request.error)
          reject(request.error)
        }
      })
    } catch (error) {
      console.warn('Failed to delete ROM from cache:', error)
    }
  }

  /**
   * Clear all cached ROMs
   */
  async clearAll(): Promise<void> {
    try {
      const db = await this.ensureDB()

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite')
        const objectStore = transaction.objectStore(this.storeName)
        const request = objectStore.clear()

        request.onsuccess = () => {
          console.log('All ROM caches cleared')
          resolve()
        }

        request.onerror = () => {
          console.error('Failed to clear ROM cache:', request.error)
          reject(request.error)
        }
      })
    } catch (error) {
      console.warn('Failed to clear ROM cache:', error)
    }
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(): Promise<{ count: number; totalSize: number }> {
    try {
      const db = await this.ensureDB()

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readonly')
        const objectStore = transaction.objectStore(this.storeName)
        const request = objectStore.getAll()

        request.onsuccess = () => {
          const entries = request.result as RomCacheEntry[]
          const count = entries.length
          const totalSize = entries.reduce((sum, entry) => sum + entry.blob.size, 0)

          resolve({ count, totalSize })
        }

        request.onerror = () => {
          console.error('Failed to get storage stats:', request.error)
          reject(request.error)
        }
      })
    } catch (error) {
      console.warn('Failed to get storage stats:', error)
      return { count: 0, totalSize: 0 }
    }
  }
}

// Export singleton instance
export const romCacheDB = new RomCacheDB()

// Initialize on module load
romCacheDB.init().catch(error => {
  console.warn('Failed to initialize ROM cache database:', error)
})

