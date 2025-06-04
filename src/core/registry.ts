// Provider registry for managing available providers

import { Provider, ProviderConfig, ProviderType } from './provider';

export type ProviderFactory = (config: ProviderConfig) => Provider;

export class ProviderRegistry {
  private static instance: ProviderRegistry;
  private factories = new Map<string, ProviderFactory>();

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  register(name: string, factory: ProviderFactory): void {
    this.factories.set(name, factory);
  }

  create(type: ProviderType, config: ProviderConfig): Provider {
    const factory = this.factories.get(type);

    if (!factory) {
      throw new Error(
        `Provider "${type}" not found. Available providers: ${Array.from(this.factories.keys()).join(', ')}`
      );
    }

    return factory(config);
  }

  has(type: string): boolean {
    return this.factories.has(type);
  }

  list(): string[] {
    return Array.from(this.factories.keys());
  }

  clear(): void {
    this.factories.clear();
  }
}

// Global registry instance
export const registry = ProviderRegistry.getInstance();