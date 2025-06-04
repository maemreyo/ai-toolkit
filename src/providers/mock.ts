// Simple mock provider for testing

import { Provider, ProviderConfig, TextOptions, EmbeddingOptions } from '../core/provider';

export class MockProvider implements Provider {
  readonly name = 'mock';
  private config: ProviderConfig;
  private delay: number;

  constructor(config: ProviderConfig & { delay?: number }) {
    this.config = config;
    this.delay = config.delay || 100;
  }

  readonly capabilities = {
    streaming: true,
    embeddings: true,
    images: false,
    audio: false,
    functions: false
  };

  async text(prompt: string, options?: TextOptions): Promise<string> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, this.delay));

    const model = options?.model || this.config.model || 'mock-model';
    const temperature = options?.temperature || 0.7;

    return `Mock response to: "${prompt}"\nModel: ${model}\nTemperature: ${temperature}`;
  }

  async *textStream(prompt: string, options?: TextOptions): AsyncGenerator<string> {
    const response = await this.text(prompt, options);
    const words = response.split(' ');

    for (const word of words) {
      await new Promise(resolve => setTimeout(resolve, 20));
      yield word + ' ';
    }
  }

  async embedding(text: string, _options?: EmbeddingOptions): Promise<number[]> {
    await new Promise(resolve => setTimeout(resolve, this.delay));

    // Generate deterministic embedding based on text
    const hash = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const embedding = new Array(1536).fill(0).map((_, i) => {
      return Math.sin(hash + i) * 0.1;
    });

    return embedding;
  }
}

// Factory function for registry
export function createMockProvider(config: ProviderConfig): Provider {
  return new MockProvider(config);
}