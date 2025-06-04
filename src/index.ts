// Main entry point with simple exports

// Core exports
export { AIClient, createAI } from './core/client';
export type { AIClientConfig } from './core/client';
export type {
  EmbeddingOptions,
  Provider,
  ProviderConfig,
  ProviderType,
  TextOptions,
} from './core/provider';

// Provider registry
export { registry } from './core/registry';

// Import to register built-in providers
import './providers/factory';

// Re-export providers for direct use
export { MockProvider } from './providers/mock';
export { OpenAIProvider } from './providers/openai';

// Utility function to check if we're in a browser
export function isBrowser(): boolean {
  return (
    typeof window !== 'undefined' && typeof window.document !== 'undefined'
  );
}

// Version
export const VERSION = '3.0.0';
