// Simple provider interface focusing on ease of use

export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  headers?: Record<string, string>;
}

export interface TextOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  stream?: boolean;
}

export interface EmbeddingOptions {
  model?: string;
}

export interface Provider {
  readonly name: string;

  // Core methods - simple names
  text(prompt: string, options?: TextOptions): Promise<string>;

  textStream?(prompt: string, options?: TextOptions): AsyncGenerator<string>;

  embedding?(text: string, options?: EmbeddingOptions): Promise<number[]>;

  // Optional capabilities
  readonly capabilities?: {
    streaming?: boolean;
    embeddings?: boolean;
    images?: boolean;
    audio?: boolean;
    functions?: boolean;
  };
}

// Provider types
export type ProviderType = 'openai' | 'anthropic' | 'google' | 'mock' | string;