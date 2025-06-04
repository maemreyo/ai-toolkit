import { LRUCache } from 'lru-cache';
import { CacheConfig, GenerateOptions } from '../types';

interface CacheEntry<T = any> {
  key: string;
  value: T;
  timestamp: number;
  hits: number;
  metadata?: Record<string, any>;
}

interface CacheOptions extends CacheConfig {
  namespace?: string;
}

export class CacheManager {
  private cache: LRUCache<string, CacheEntry>;
  private enabled: boolean;
  private namespace: string;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
  };

  constructor(options: CacheOptions) {
    this.enabled = options.enabled ?? true;
    this.namespace = options.namespace || 'ai-toolkit';

    // Convert MB to bytes for max size
    const maxSizeBytes = (options.maxSize || 100) * 1024 * 1024;

    this.cache = new LRUCache<string, CacheEntry>({
      max: 1000, // Max number of items
      maxSize: maxSizeBytes,
      sizeCalculation: (entry) => {
        // Estimate size of cached entry
        return JSON.stringify(entry).length;
      },
      ttl: options.ttl || 600000, // 10 minutes default
      updateAgeOnGet: true,
      updateAgeOnHas: false,
      dispose: () => {
        this.stats.evictions++;
      },
    });

    // Setup periodic cleanup
    this.setupCleanup();
  }

  /**
   * Generate hash using Web Crypto API or fallback
   */
  private async generateHash(data: string): Promise<string> {
    // Check if Web Crypto API is available
    if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
      try {
        // Use Web Crypto API
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);
        const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      } catch (error) {
        console.warn('Web Crypto API failed, using fallback', error);
        return this.generateHashFallback(data);
      }
    } else {
      // Use fallback for environments without Web Crypto API
      return this.generateHashFallback(data);
    }
  }

  /**
   * Fallback hash function for environments without Web Crypto API
   */
  private generateHashFallback(data: string): string {
    // Simple hash function (not cryptographically secure, but sufficient for caching)
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Convert to hex string
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  /**
   * Generate cache key from request parameters
   */
  async generateKey(
    method: string,
    params: any[],
    options?: Record<string, any>
  ): Promise<string> {
    const keyData = {
      namespace: this.namespace,
      method,
      params: params.map((p) => {
        if (typeof p === 'object') {
          return JSON.stringify(p, Object.keys(p).sort());
        }
        return String(p);
      }),
      options: options
        ? JSON.stringify(options, Object.keys(options).sort())
        : null,
    };

    const hash = await this.generateHash(JSON.stringify(keyData));
    return `${this.namespace}:${method}:${hash}`;
  }

  /**
   * Get value from cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    if (!this.enabled) return null;

    const entry = this.cache.get(key);

    if (entry) {
      this.stats.hits++;
      entry.hits++;
      return entry.value as T;
    }

    this.stats.misses++;
    return null;
  }

  /**
   * Set value in cache
   */
  async set<T = any>(
    key: string,
    value: T,
    metadata?: Record<string, any>
  ): Promise<void> {
    if (!this.enabled) return;

    const entry: CacheEntry<T> = {
      key,
      value,
      timestamp: Date.now(),
      hits: 0,
      metadata,
    };

    this.cache.set(key, entry);
  }

  /**
   * Delete from cache
   */
  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
    };
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate =
      this.stats.hits + this.stats.misses > 0
        ? this.stats.hits / (this.stats.hits + this.stats.misses)
        : 0;

    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100,
      size: this.cache.size,
      calculatedSize: this.cache.calculatedSize,
      maxSize: this.cache.maxSize,
      itemCount: this.cache.size,
      enabled: this.enabled,
    };
  }

  /**
   * Get all cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache entries with metadata
   */
  entries(): Array<{
    key: string;
    metadata?: Record<string, any>;
    age: number;
  }> {
    const entries: Array<{
      key: string;
      metadata?: Record<string, any>;
      age: number;
    }> = [];

    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      entries.push({
        key,
        metadata: entry.metadata,
        age: Date.now() - entry.timestamp,
      });
    });

    return entries;
  }

  /**
   * Prune old entries
   */
  prune(): number {
    const beforeSize = this.cache.size;
    this.cache.purgeStale();
    return beforeSize - this.cache.size;
  }

  /**
   * Enable or disable cache
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.clear();
    }
  }

  /**
   * Update TTL for all entries
   */
  updateTTL(ttl: number): void {
    // LRUCache doesn't support updating TTL on existing entries
    // We need to recreate the cache with new TTL
    const entries = Array.from(this.cache.entries());

    this.cache = new LRUCache<string, CacheEntry>({
      max: this.cache.max,
      maxSize: this.cache.maxSize,
      ttl,
      updateAgeOnGet: true,
      updateAgeOnHas: false,
      sizeCalculation: (entry) => JSON.stringify(entry).length,
      dispose: () => {
        this.stats.evictions++;
      },
    });

    // Restore entries
    for (const [key, entry] of entries) {
      this.cache.set(key, entry);
    }
  }

  /**
   * Get memory usage info
   */
  getMemoryUsage() {
    return {
      used: this.cache.calculatedSize,
      max: this.cache.maxSize,
      percentage: Math.round(
        (this.cache.calculatedSize / this.cache.maxSize) * 100
      ),
    };
  }

  /**
   * Setup periodic cleanup
   */
  private setupCleanup(): void {
    // Use setTimeout instead of setInterval for better browser compatibility
    const cleanup = () => {
      this.prune();
      // Schedule next cleanup
      if (typeof globalThis !== 'undefined') {
        setTimeout(cleanup, 5 * 60 * 1000); // 5 minutes
      }
    };

    // Start cleanup cycle
    if (typeof globalThis !== 'undefined') {
      setTimeout(cleanup, 5 * 60 * 1000);
    }
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
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Execute function
    const result = await fn();

    // Store in cache
    await this.set(key, result, options?.metadata);

    return result;
  }

  /**
   * Create a cache key for text generation
   */
  async createTextGenerationKey(
    prompt: string,
    options?: GenerateOptions,
    provider?: string,
    model?: string
  ): Promise<string> {
    return this.generateKey('generateText', [prompt], {
      ...options,
      provider,
      model,
    });
  }

  /**
   * Create a cache key for embeddings
   */
  async createEmbeddingKey(
    text: string,
    provider?: string,
    model?: string
  ): Promise<string> {
    return this.generateKey('generateEmbedding', [text], {
      provider,
      model,
    });
  }

  /**
   * Export cache contents
   */
  export(): Record<string, any> {
    const data: Record<string, any> = {};

    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      data[key] = {
        value: entry.value,
        timestamp: entry.timestamp,
        hits: entry.hits,
        metadata: entry.metadata,
      };
    });

    return data;
  }

  /**
   * Import cache contents
   */
  import(data: Record<string, any>): void {
    this.clear();

    for (const [key, entry] of Object.entries(data)) {
      if (entry && typeof entry === 'object' && 'value' in entry) {
        this.cache.set(key, entry as CacheEntry);
      }
    }
  }

  /**
   * Browser-specific: Save cache to localStorage
   */
  async saveToLocalStorage(
    storageKey: string = 'ai-toolkit-cache'
  ): Promise<void> {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      try {
        const data = this.export();
        localStorage.setItem(storageKey, JSON.stringify(data));
      } catch (error) {
        console.warn('Failed to save cache to localStorage', error);
      }
    }
  }

  /**
   * Browser-specific: Load cache from localStorage
   */
  async loadFromLocalStorage(
    storageKey: string = 'ai-toolkit-cache'
  ): Promise<void> {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      try {
        const data = localStorage.getItem(storageKey);
        if (data) {
          this.import(JSON.parse(data));
        }
      } catch (error) {
        console.warn('Failed to load cache from localStorage', error);
      }
    }
  }
}
