// Provider factory and registration

import { registry } from '../core/registry';
import { createMockProvider } from './mock';
import { createOpenAIProvider } from './openai';

// Register built-in providers
export function registerBuiltinProviders(): void {
  // Mock provider for testing
  registry.register('mock', createMockProvider);

  // OpenAI provider
  registry.register('openai', createOpenAIProvider);

  // TODO: Add more providers
  // registry.register('anthropic', createAnthropicProvider);
  // registry.register('google', createGoogleProvider);
}

// Auto-register on import
registerBuiltinProviders();