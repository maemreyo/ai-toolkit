import Bottleneck from "bottleneck";
import { RateLimitConfig } from "../types";

interface RateLimiterOptions extends RateLimitConfig {
  id: string;
}

interface LimiterStats {
  running: number;
  queued: number;
  done: number;
  failed: number;
  reservoir?: number | null;
}

export class RateLimiter {
  private limiters = new Map<string, Bottleneck>();
  private tokenBuckets = new Map<string, TokenBucket>();

  /**
   * Create or get a rate limiter for a specific provider/key
   */
  createLimiter(options: RateLimiterOptions): Bottleneck {
    const existingLimiter = this.limiters.get(options.id);
    if (existingLimiter) {
      return existingLimiter;
    }

    // Configure based on strategy
    let limiterConfig: Bottleneck.ConstructorOptions;

    switch (options.strategy) {
      case "token-bucket":
        limiterConfig = this.createTokenBucketConfig(options);
        break;

      case "fixed-window":
        limiterConfig = this.createFixedWindowConfig(options);
        break;

      case "sliding-window":
      default:
        limiterConfig = this.createSlidingWindowConfig(options);
        break;
    }

    const limiter = new Bottleneck(limiterConfig);

    // Add event handlers
    limiter.on("error", (error) => {
      console.error(`Rate limiter error for ${options.id}:`, error);
    });

    limiter.on("failed", async (error) => {
      console.warn(`Job failed in rate limiter ${options.id}:`, error);
      // Retry logic can be added here
    });

    this.limiters.set(options.id, limiter);

    // Create token bucket if needed
    if (options.tokensPerMinute || options.tokensPerHour) {
      this.createTokenBucket(options);
    }

    return limiter;
  }

  /**
   * Get limiter by ID
   */
  getLimiter(id: string): Bottleneck | undefined {
    return this.limiters.get(id);
  }

  /**
   * Schedule a job with rate limiting
   */
  async schedule<T>(
    limiterId: string,
    fn: () => Promise<T>,
    priority?: number
  ): Promise<T> {
    const limiter = this.limiters.get(limiterId);
    if (!limiter) {
      throw new Error(`No rate limiter found with ID: ${limiterId}`);
    }

    const options: Bottleneck.JobOptions = {};
    if (priority !== undefined) {
      (options as any).priority = priority;
    }

    return limiter.schedule(options, fn);
  }

  /**
   * Check and consume tokens
   */
  async consumeTokens(limiterId: string, tokens: number): Promise<boolean> {
    const bucket = this.tokenBuckets.get(limiterId);
    if (!bucket) {
      return true; // No token limit configured
    }

    return bucket.consume(tokens);
  }

  /**
   * Get statistics for a limiter
   */
  async getStats(limiterId: string): Promise<LimiterStats | null> {
    const limiter = this.limiters.get(limiterId);
    if (!limiter) {
      return null;
    }

    const counts = await limiter.counts();
    const reservoir = await limiter.currentReservoir();

    return {
      running: counts.RUNNING,
      queued: counts.QUEUED,
      done: counts.DONE || 0,
      failed: (counts as any).FAILED || 0,
      reservoir,
    };
  }

  /**
   * Get all limiter statistics
   */
  async getAllStats(): Promise<Record<string, LimiterStats>> {
    const stats: Record<string, LimiterStats> = {};

    for (const [id] of this.limiters) {
      const limiterStats = await this.getStats(id);
      if (limiterStats) {
        stats[id] = limiterStats;
      }
    }

    return stats;
  }

  /**
   * Update limiter configuration
   */
  async updateLimiter(
    id: string,
    newConfig: Partial<RateLimiterOptions>
  ): Promise<void> {
    const limiter = this.limiters.get(id);
    if (!limiter) {
      throw new Error(`No rate limiter found with ID: ${id}`);
    }

    // Bottleneck doesn't support updating configuration directly
    // We need to create a new limiter
    const currentConfig = await this.getLimiterConfig(id);
    const mergedConfig = { ...currentConfig, ...newConfig, id };

    // Stop the old limiter
    await limiter.stop();
    this.limiters.delete(id);

    // Create new limiter with updated config
    this.createLimiter(mergedConfig as RateLimiterOptions);
  }

  /**
   * Clear queued jobs for a limiter
   */
  async clearQueue(limiterId: string): Promise<void> {
    const limiter = this.limiters.get(limiterId);
    if (limiter) {
      await limiter.stop({ dropWaitingJobs: true });
    }
  }

  /**
   * Stop a limiter
   */
  async stopLimiter(limiterId: string): Promise<void> {
    const limiter = this.limiters.get(limiterId);
    if (limiter) {
      await limiter.stop();
      this.limiters.delete(limiterId);
    }

    const bucket = this.tokenBuckets.get(limiterId);
    if (bucket) {
      bucket.stop();
      this.tokenBuckets.delete(limiterId);
    }
  }

  /**
   * Stop all limiters
   */
  async stopAll(): Promise<void> {
    const stopPromises: Promise<void>[] = [];

    for (const [id] of this.limiters) {
      stopPromises.push(this.stopLimiter(id));
    }

    await Promise.all(stopPromises);
  }

  /**
   * Create sliding window configuration
   */
  private createSlidingWindowConfig(
    options: RateLimiterOptions
  ): Bottleneck.ConstructorOptions {
    const requestsPerMinute = options.requestsPerMinute || 60;
    const minTime = Math.ceil(60000 / requestsPerMinute); // ms between requests

    return {
      maxConcurrent: options.concurrent || 5,
      minTime,
      highWater: Math.max(100, requestsPerMinute * 2), // Queue size
      strategy: Bottleneck.strategy.LEAK, // Process queue steadily
      rejectOnDrop: false,
    };
  }

  /**
   * Create fixed window configuration
   */
  private createFixedWindowConfig(
    options: RateLimiterOptions
  ): Bottleneck.ConstructorOptions {
    const requestsPerMinute = options.requestsPerMinute || 60;

    return {
      maxConcurrent: options.concurrent || 5,
      reservoir: requestsPerMinute,
      reservoirRefreshInterval: 60000, // 1 minute
      reservoirRefreshAmount: requestsPerMinute,
      highWater: Math.max(100, requestsPerMinute * 2),
      strategy: Bottleneck.strategy.LEAK,
    };
  }

  /**
   * Create token bucket configuration
   */
  private createTokenBucketConfig(
    options: RateLimiterOptions
  ): Bottleneck.ConstructorOptions {
    const requestsPerMinute = options.requestsPerMinute || 60;
    const refillRate = Math.ceil(requestsPerMinute / 60); // tokens per second

    return {
      maxConcurrent: options.concurrent || 5,
      reservoir: requestsPerMinute,
      reservoirRefreshInterval: 1000, // Refill every second
      reservoirRefreshAmount: refillRate,
      highWater: Math.max(100, requestsPerMinute * 2),
      strategy: Bottleneck.strategy.LEAK,
    };
  }

  /**
   * Create token bucket for token-based rate limiting
   */
  private createTokenBucket(options: RateLimiterOptions): void {
    const bucket = new TokenBucket(options);
    this.tokenBuckets.set(options.id, bucket);
  }

  /**
   * Get limiter configuration (mock implementation)
   */
  private async getLimiterConfig(
    _id: string
  ): Promise<Partial<RateLimiterOptions>> {
    // In a real implementation, you might store configs separately
    return {
      requestsPerMinute: 60,
      strategy: "sliding-window",
      concurrent: 5,
    };
  }
}

/**
 * Token bucket implementation for token-based rate limiting
 */
class TokenBucket {
  private tokens: number;
  private maxTokens: number;
  private refillRate: number;
  private lastRefill: number;
  private interval?: NodeJS.Timeout;

  constructor(options: RateLimiterOptions) {
    this.maxTokens = options.tokensPerMinute || 100000;
    this.tokens = this.maxTokens;
    this.refillRate = this.maxTokens / 60000; // tokens per ms
    this.lastRefill = Date.now();

    // Start refill timer
    this.startRefillTimer();
  }

  /**
   * Try to consume tokens
   */
  consume(amount: number): boolean {
    this.refill();

    if (this.tokens >= amount) {
      this.tokens -= amount;
      return true;
    }

    return false;
  }

  /**
   * Get available tokens
   */
  getAvailable(): number {
    this.refill();
    return Math.floor(this.tokens);
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = elapsed * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * Start automatic refill timer
   */
  private startRefillTimer(): void {
    this.interval = setInterval(() => {
      this.refill();
    }, 1000); // Refill every second
  }

  /**
   * Stop the token bucket
   */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }
}
