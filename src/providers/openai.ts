// OpenAI provider with clean implementation

import OpenAI from 'openai';
import { Provider, ProviderConfig, TextOptions, EmbeddingOptions } from '../core/provider';

export class OpenAIProvider implements Provider {
  readonly name = 'openai';
  private client: OpenAI;
  private config: ProviderConfig;

  constructor(config: ProviderConfig) {
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.config = config;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      defaultHeaders: config.headers,
    });
  }

  readonly capabilities = {
    streaming: true,
    embeddings: true,
    images: true,
    audio: true,
    functions: true
  };

  async text(prompt: string, options?: TextOptions): Promise<string> {
    const completion = await this.client.chat.completions.create({
      model: options?.model || this.config.model || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: options?.systemPrompt || 'You are a helpful assistant.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: options?.temperature,
      max_tokens: options?.maxTokens,
      stream: false
    });

    return completion.choices[0]?.message?.content || '';
  }

  async *textStream(prompt: string, options?: TextOptions): AsyncGenerator<string> {
    const stream = await this.client.chat.completions.create({
      model: options?.model || this.config.model || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: options?.systemPrompt || 'You are a helpful assistant.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: options?.temperature,
      max_tokens: options?.maxTokens,
      stream: true
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }

  async embedding(text: string, options?: EmbeddingOptions): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: options?.model || 'text-embedding-ada-002',
      input: text
    });

    return response.data[0]?.embedding || [];
  }
}

// Factory function for registry
export function createOpenAIProvider(config: ProviderConfig): Provider {
  return new OpenAIProvider(config);
}