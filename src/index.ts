// Core exports
export { AIEngine } from './core/ai-engine';
export { CacheManager } from './core/cache-manager';
export { ConfigManager } from './core/config-manager';
export { EnhancedError, type ErrorContext } from './core/enhanced-error';
export { ErrorHandler } from './core/error-handler';
export { RateLimiter } from './core/rate-limiter';
export { RetryManager } from './core/retry-manager';
export { TokenManager } from './core/token-manager';

// Monitoring exports
export { Analytics } from './monitoring/analytics';
export { PerformanceMonitor } from './monitoring/performance-monitor';

// Provider exports
export * from './providers';

// Type exports
export * from './types';

// Configuration presets
export const AIPresets = {
  development: {
    provider: 'mock' as const,
    cache: {
      enabled: true,
      ttl: 600000,
      maxSize: 100,
      strategy: 'lru' as const,
    },
    debug: true,
  },

  production: {
    provider: 'openai' as const,
    model: 'gpt-3.5-turbo',
    cache: {
      enabled: true,
      ttl: 3600000,
      maxSize: 500,
      strategy: 'lru' as const,
    },
    rateLimit: {
      requestsPerMinute: 60,
      concurrent: 5,
      strategy: 'sliding-window' as const,
    },
    retry: {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoff: 'exponential' as const,
    },
  },

  highPerformance: {
    provider: 'openai' as const,
    model: 'gpt-3.5-turbo',
    cache: {
      enabled: true,
      ttl: 7200000,
      maxSize: 1000,
      strategy: 'lru' as const,
    },
    rateLimit: {
      requestsPerMinute: 100,
      concurrent: 10,
      strategy: 'token-bucket' as const,
    },
    fallbackProviders: ['anthropic', 'google'] as const,
  },

  costOptimized: {
    provider: 'openai' as const,
    model: 'gpt-3.5-turbo',
    cache: {
      enabled: true,
      ttl: 86400000,
      maxSize: 200,
      strategy: 'lfu' as const,
    },
    rateLimit: {
      requestsPerMinute: 30,
      concurrent: 5,
      strategy: 'fixed-window' as const,
    },
  },

  browserOptimized: {
    provider: 'openai' as const,
    model: 'gpt-3.5-turbo',
    cache: {
      enabled: true,
      ttl: 3600000,
      maxSize: 50, // Smaller cache for browser
      strategy: 'lru' as const,
    },
    rateLimit: {
      requestsPerMinute: 30,
      concurrent: 3, // Less concurrent requests in browser
      strategy: 'sliding-window' as const,
    },
    retry: {
      maxAttempts: 2,
      baseDelay: 1000,
      maxDelay: 10000,
      backoff: 'exponential' as const,
    },
  },
} as const;

// Quick start function
export async function createAI(
  config: Partial<import('./types').AIConfig> = {}
) {
  const { AIEngine } = await import('./core/ai-engine');

  // Use browser-optimized preset if in browser environment
  const defaultPreset =
    typeof window !== 'undefined'
      ? AIPresets.browserOptimized
      : AIPresets.production;

  return new AIEngine({
    ...defaultPreset,
    ...config,
  });
}

// Version
export const VERSION = '2.0.0';

// Browser compatibility check
export function checkBrowserCompatibility(): {
  compatible: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  if (typeof globalThis === 'undefined') {
    issues.push('globalThis is not defined');
  }

  if (typeof globalThis?.crypto?.subtle === 'undefined') {
    issues.push('Web Crypto API is not available');
  }

  if (typeof TextEncoder === 'undefined') {
    issues.push('TextEncoder is not available');
  }

  if (typeof fetch === 'undefined') {
    issues.push('Fetch API is not available');
  }

  return {
    compatible: issues.length === 0,
    issues,
  };
}
