import { LRUCache } from 'lru-cache'
import crypto from 'crypto'
import { CacheConfig, GenerateOptions } from '../types'

interface CacheEntry<T = any> {
  key: string
  value: T
  timestamp: number
  hits: number
  metadata?: Record<string, any>
}

interface CacheOptions extends CacheConfig {
  namespace?: string
}

export class CacheManager {
  private cache: LRUCache<string, CacheEntry>
  private enabled: boolean
  private namespace: string
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0
  }

  constructor(options: CacheOptions) {
    this.enabled = options.enabled ?? true
    this.namespace = options.namespace || 'ai-toolkit'
    
    // Convert MB to bytes for max size
    const maxSizeBytes = (options.maxSize || 100) * 1024 * 1024
    
    this.cache = new LRUCache<string, CacheEntry>({
      max: 1000, // Max number of items
      maxSize: maxSizeBytes,
      sizeCalculation: (entry) => {
        // Estimate size of cached entry
        return JSON.stringify(entry).length
      },
      ttl: options.ttl || 600000, // 10 minutes default
      updateAgeOnGet: true,
      updateAgeOnHas: false,
      dispose: () => {
        this.stats.evictions++
      }
    })
    
    // Setup periodic cleanup
    this.setupCleanup()
  }

  /**
   * Generate cache key from request parameters
   */
  generateKey(
    method: string,
    params: any[],
    options?: Record<string, any>
  ): string {
    const keyData = {
      namespace: this.namespace,
      method,
      params: params.map(p => {
        if (typeof p === 'object') {
          return JSON.stringify(p, Object.keys(p).sort())
        }
        return String(p)
      }),
      options: options ? JSON.stringify(options, Object.keys(options).sort()) : null
    }
    
    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(keyData))
      .digest('hex')
    
    return `${this.namespace}:${method}:${hash}`
  }

  /**
   * Get value from cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    if (!this.enabled) return null
    
    const entry = this.cache.get(key)
    
    if (entry) {
      this.stats.hits++
      entry.hits++
      return entry.value as T
    }
    
    this.stats.misses++
    return null
  }

  /**
   * Set value in cache
   */
  async set<T = any>(
    key: string,
    value: T,
    metadata?: Record<string, any>
  ): Promise<void> {
    if (!this.enabled) return
    
    const entry: CacheEntry<T> = {
      key,
      value,
      timestamp: Date.now(),
      hits: 0,
      metadata
    }
    
    this.cache.set(key, entry)
  }

  /**
   * Delete from cache
   */
  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key)
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this.cache.clear()
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0
    }
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    return this.cache.has(key)
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? this.stats.hits / (this.stats.hits + this.stats.misses)
      : 0
    
    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100,
      size: this.cache.size,
      calculatedSize: this.cache.calculatedSize,
      maxSize: this.cache.maxSize,
      itemCount: this.cache.size,
      enabled: this.enabled
    }
  }

  /**
   * Get all cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys())
  }

  /**
   * Get cache entries with metadata
   */
  entries(): Array<{ key: string; metadata?: Record<string, any>; age: number }> {
    const entries: Array<{ key: string; metadata?: Record<string, any>; age: number }> = []
    
    for (const [key, entry] of this.cache.entries()) {
      entries.push({
        key,
        metadata: entry.metadata,
        age: Date.now() - entry.timestamp
      })
    }
    
    return entries
  }

  /**
   * Prune old entries
   */
  prune(): number {
    const beforeSize = this.cache.size
    this.cache.purgeStale()
    return beforeSize - this.cache.size
  }

  /**
   * Enable or disable cache
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    if (!enabled) {
      this.clear()
    }
  }

  /**
   * Update TTL for all entries
   */
  updateTTL(ttl: number): void {
    // LRUCache doesn't support updating TTL on existing entries
    // We need to recreate the cache with new TTL
    const entries = Array.from(this.cache.entries())
    
    this.cache = new LRUCache<string, CacheEntry>({
      max: this.cache.max,
      maxSize: this.cache.maxSize,
      ttl,
      updateAgeOnGet: true,
      updateAgeOnHas: false,
      sizeCalculation: (entry) => JSON.stringify(entry).length,
      dispose: () => {
        this.stats.evictions++
      }
    })
    
    // Restore entries
    for (const [key, entry] of entries) {
      this.cache.set(key, entry)
    }
  }

  /**
   * Get memory usage info
   */
  getMemoryUsage() {
    return {
      used: this.cache.calculatedSize,
      max: this.cache.maxSize,
      percentage: Math.round((this.cache.calculatedSize / this.cache.maxSize) * 100)
    }
  }

  /**
   * Setup periodic cleanup
   */
  private setupCleanup(): void {
    // Run cleanup every 5 minutes
    setInterval(() => {
      this.prune()
    }, 5 * 60 * 1000)
  }

  /**
   * Cache wrapper for async functions
   */
  async wrap<T>(
    key: string,
    fn: () => Promise<T>,
    options?: { ttl?: number; metadata?: Record<string, any> }
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key)
    if (cached !== null) {
      return cached
    }
    
    // Execute function
    const result = await fn()
    
    // Store in cache
    await this.set(key, result, options?.metadata)
    
    return result
  }

  /**
   * Create a cache key for text generation
   */
  createTextGenerationKey(
    prompt: string,
    options?: GenerateOptions,
    provider?: string,
    model?: string
  ): string {
    return this.generateKey('generateText', [prompt], {
      ...options,
      provider,
      model
    })
  }

  /**
   * Create a cache key for embeddings
   */
  createEmbeddingKey(
    text: string,
    provider?: string,
    model?: string
  ): string {
    return this.generateKey('generateEmbedding', [text], {
      provider,
      model
    })
  }

  /**
   * Export cache contents
   */
  export(): Record<string, any> {
    const data: Record<string, any> = {}
    
    for (const [key, entry] of this.cache.entries()) {
      data[key] = {
        value: entry.value,
        timestamp: entry.timestamp,
        hits: entry.hits,
        metadata: entry.metadata
      }
    }
    
    return data
  }

  /**
   * Import cache contents
   */
  import(data: Record<string, any>): void {
    this.clear()
    
    for (const [key, entry] of Object.entries(data)) {
      if (entry && typeof entry === 'object' && 'value' in entry) {
        this.cache.set(key, entry as CacheEntry)
      }
    }
  }
}