// Simple AI client with clean API

import { Provider, ProviderConfig, ProviderType, TextOptions, EmbeddingOptions } from './provider';
import { registry } from './registry';

export interface AIClientConfig extends ProviderConfig {
  provider?: ProviderType;
  // Optional features
  features?: {
    cache?: boolean | { ttl?: number };
    rateLimit?: boolean | { rpm?: number };
    retry?: boolean | { maxAttempts?: number };
  };
}

export class AIClient {
  private provider: Provider;
  private config: AIClientConfig;

  constructor(config: AIClientConfig) {
    this.config = config;

    // Create provider
    const providerType = config.provider || 'openai';
    this.provider = registry.create(providerType, config);
  }

  /**
   * Generate text completion
   * @example
   * const response = await ai.text("Hello, AI!");
   */
  async text(prompt: string, options?: TextOptions): Promise<string> {
    return this.provider.text(prompt, options);
  }

  /**
   * Generate streaming text completion
   * @example
   * for await (const chunk of ai.textStream("Tell me a story")) {
   *   console.log(chunk);
   * }
   */
  async *textStream(prompt: string, options?: TextOptions): AsyncGenerator<string> {
    if (!this.provider.textStream) {
      throw new Error(`Provider ${this.provider.name} does not support streaming`);
    }

    yield* this.provider.textStream(prompt, options);
  }

  /**
   * Generate embeddings
   * @example
   * const embeddings = await ai.embedding("Hello world");
   */
  async embedding(text: string, options?: EmbeddingOptions): Promise<number[]> {
    if (!this.provider.embedding) {
      throw new Error(`Provider ${this.provider.name} does not support embeddings`);
    }

    return this.provider.embedding(text, options);
  }

  /**
   * Get provider capabilities
   */
  get capabilities() {
    return this.provider.capabilities || {
      streaming: !!this.provider.textStream,
      embeddings: !!this.provider.embedding,
      images: false,
      audio: false,
      functions: false
    };
  }

  /**
   * Get provider name
   */
  get providerName(): string {
    return this.provider.name;
  }

  /**
   * Switch provider
   */
  switchProvider(type: ProviderType, config?: ProviderConfig): void {
    const newConfig = { ...this.config, ...config, provider: type };
    this.provider = registry.create(type, newConfig);
    this.config = newConfig;
  }
}

/**
 * Create an AI client with simple API
 * @example
 * const ai = createAI('openai', { apiKey: 'sk-...' });
 * const response = await ai.text("Hello!");
 */
export function createAI(
  providerOrConfig: ProviderType | AIClientConfig,
  config?: AIClientConfig
): AIClient {
  // Handle both signatures:
  // createAI('openai', { apiKey: '...' })
  // createAI({ provider: 'openai', apiKey: '...' })

  if (typeof providerOrConfig === 'string') {
    return new AIClient({
      ...config,
      provider: providerOrConfig
    });
  }

  return new AIClient(providerOrConfig);
}