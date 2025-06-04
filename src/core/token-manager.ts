import { decode, encode } from 'gpt-tokenizer';

interface TokenInfo {
  count: number;
  truncated: boolean;
  originalLength?: number;
}

interface ModelTokenLimits {
  [model: string]: number;
}

export class TokenManager {
  private tokenizers = new Map<string, (text: string) => number[]>();

  private tokenLimits: ModelTokenLimits = {
    // OpenAI models
    'gpt-4': 8192,
    'gpt-4-32k': 32768,
    'gpt-4-turbo': 128000,
    'gpt-4-turbo-preview': 128000,
    'gpt-3.5-turbo': 4096,
    'gpt-3.5-turbo-16k': 16384,

    // Anthropic models
    'claude-3-opus': 200000,
    'claude-3-sonnet': 200000,
    'claude-3-haiku': 200000,
    'claude-2.1': 200000,
    'claude-2': 100000,

    // Google models
    'gemini-pro': 30720,
    'gemini-pro-vision': 30720,
    'palm-2': 8192,

    // Default
    default: 4096,
  };

  private modelPricing = {
    // OpenAI pricing per 1K tokens
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },

    // Anthropic pricing per 1K tokens
    'claude-3-opus': { input: 0.015, output: 0.075 },
    'claude-3-sonnet': { input: 0.003, output: 0.015 },
    'claude-3-haiku': { input: 0.00025, output: 0.00125 },

    // Google pricing per 1K tokens
    'gemini-pro': { input: 0.0005, output: 0.0015 },

    // Default free
    default: { input: 0, output: 0 },
  };

  constructor() {
    // Initialize tokenizers for different models
    this.initializeTokenizers();
  }

  /**
   * Initialize tokenizers for different model families
   */
  private initializeTokenizers(): void {
    // Use the main encode function for all models
    // The gpt-tokenizer library will handle model-specific encoding internally
    const defaultTokenizer = (text: string) => encode(text);

    // GPT-4 models
    this.tokenizers.set('gpt-4', defaultTokenizer);
    this.tokenizers.set('gpt-4-32k', defaultTokenizer);
    this.tokenizers.set('gpt-4-turbo', defaultTokenizer);
    this.tokenizers.set('gpt-4-turbo-preview', defaultTokenizer);

    // GPT-3.5 models
    this.tokenizers.set('gpt-3.5-turbo', defaultTokenizer);
    this.tokenizers.set('gpt-3.5-turbo-16k', defaultTokenizer);

    // Default tokenizer for other models
    this.tokenizers.set('default', defaultTokenizer);
  }

  /**
   * Count tokens in text for a specific model
   */
  async countTokens(text: string, model: string): Promise<number> {
    try {
      // Get appropriate tokenizer for the model
      const tokenizer = this.getTokenizerForModel(model);
      const tokens = tokenizer(text);
      return tokens.length;
    } catch (error) {
      console.warn(
        `Failed to tokenize with model-specific tokenizer, using estimation`,
        error
      );
      // Fallback to character-based estimation
      return this.estimateTokens(text);
    }
  }

  /**
   * Get the appropriate tokenizer for a model
   */
  private getTokenizerForModel(model: string): (text: string) => number[] {
    // Direct match
    if (this.tokenizers.has(model)) {
      return this.tokenizers.get(model)!;
    }

    // Pattern matching for model families
    if (model.startsWith('gpt-4')) {
      return this.tokenizers.get('gpt-4')!;
    }
    if (model.startsWith('gpt-3.5')) {
      return this.tokenizers.get('gpt-3.5-turbo')!;
    }

    // Default tokenizer
    return this.tokenizers.get('default')!;
  }

  /**
   * Estimate tokens based on character count
   */
  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for English
    // Adjust for other languages if needed
    return Math.ceil(text.length / 4);
  }

  /**
   * Get token information for text
   */
  async getTokenInfo(
    text: string,
    model: string,
    maxTokens?: number
  ): Promise<TokenInfo> {
    const count = await this.countTokens(text, model);
    const limit =
      maxTokens ?? this.tokenLimits[model] ?? this.tokenLimits.default ?? 4096;

    return {
      count,
      truncated: count > limit,
      originalLength: text.length,
    };
  }

  /**
   * Validate if text fits within token limits
   */
  async validateTokenLimits(
    text: string,
    model: string,
    maxTokens?: number,
    responseTokens: number = 1000
  ): Promise<{ valid: boolean; availableTokens: number }> {
    const promptTokens = await this.countTokens(text, model);
    const modelLimit =
      this.tokenLimits[model] ?? this.tokenLimits.default ?? 4096;
    const limit = maxTokens ?? modelLimit;

    const totalRequired = promptTokens + responseTokens;
    const valid = totalRequired <= limit;
    const availableTokens = Math.max(0, limit - promptTokens);

    return { valid, availableTokens };
  }

  /**
   * Truncate text to fit within token limit
   */
  async truncateToTokenLimit(
    text: string,
    model: string,
    maxTokens: number,
    preserveEnd: boolean = false
  ): Promise<string> {
    const currentTokens = await this.countTokens(text, model);

    if (currentTokens <= maxTokens) {
      return text;
    }

    // Binary search for the right length
    let low = 0;
    let high = text.length;
    let bestFit = '';

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const substring = preserveEnd
        ? text.slice(text.length - mid)
        : text.slice(0, mid);

      const tokens = await this.countTokens(substring, model);

      if (tokens <= maxTokens) {
        bestFit = substring;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    // Add ellipsis if truncated
    if (preserveEnd) {
      return '...' + bestFit;
    } else {
      return bestFit + '...';
    }
  }

  /**
   * Split text into chunks that fit within token limits
   */
  async splitIntoChunks(
    text: string,
    model: string,
    chunkSize: number,
    overlap: number = 0
  ): Promise<string[]> {
    const chunks: string[] = [];
    const sentences = this.splitIntoSentences(text);

    let currentChunk = '';
    let currentTokens = 0;

    for (const sentence of sentences) {
      const sentenceTokens = await this.countTokens(sentence, model);

      if (currentTokens + sentenceTokens > chunkSize && currentChunk) {
        chunks.push(currentChunk.trim());

        // Handle overlap
        if (overlap > 0) {
          const overlapText = await this.getOverlapText(
            currentChunk,
            model,
            overlap
          );
          currentChunk = overlapText + ' ' + sentence;
          currentTokens = await this.countTokens(currentChunk, model);
        } else {
          currentChunk = sentence;
          currentTokens = sentenceTokens;
        }
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
        currentTokens += sentenceTokens;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Split text into sentences
   */
  private splitIntoSentences(text: string): string[] {
    // Improved sentence splitting with better handling of abbreviations
    const sentenceEnders = /[.!?]+/g;
    const abbreviations = new Set([
      'Dr',
      'Mr',
      'Mrs',
      'Ms',
      'Prof',
      'Sr',
      'Jr',
      'Inc',
      'Ltd',
      'Co',
      'Corp',
      'etc',
      'vs',
      'e.g',
      'i.e',
    ]);

    const parts = text.split(sentenceEnders);
    const sentences: string[] = [];

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]?.trim();
      if (!part) continue;

      // Check if this might be an abbreviation
      const lastWord = part.split(/\s+/).pop() || '';
      if (abbreviations.has(lastWord) && i < parts.length - 1) {
        // Merge with next part
        parts[i + 1] = part + '. ' + parts[i + 1];
      } else {
        sentences.push(part + '.');
      }
    }

    return sentences.filter((s) => s.length > 0);
  }

  /**
   * Get overlap text for chunking
   */
  private async getOverlapText(
    text: string,
    model: string,
    overlapTokens: number
  ): Promise<string> {
    const sentences = this.splitIntoSentences(text).reverse();
    let overlapText = '';
    let currentTokens = 0;

    for (const sentence of sentences) {
      const sentenceTokens = await this.countTokens(sentence, model);
      if (currentTokens + sentenceTokens <= overlapTokens) {
        overlapText = sentence + ' ' + overlapText;
        currentTokens += sentenceTokens;
      } else {
        break;
      }
    }

    return overlapText.trim();
  }

  /**
   * Estimate cost for tokens
   */
  estimateCost(
    tokens: number,
    model: string,
    type: 'input' | 'output' = 'input'
  ): number {
    const pricing =
      this.modelPricing[model as keyof typeof this.modelPricing] ??
      this.modelPricing.default;
    return (tokens / 1000) * pricing[type];
  }

  /**
   * Get model token limit
   */
  getModelTokenLimit(model: string): number {
    return this.tokenLimits[model] ?? this.tokenLimits.default ?? 4096;
  }

  /**
   * Get all model limits
   */
  getAllModelLimits(): ModelTokenLimits {
    return { ...this.tokenLimits };
  }

  /**
   * Estimate tokens for a conversation
   */
  async estimateConversationTokens(
    messages: Array<{ role: string; content: string }>,
    model: string
  ): Promise<number> {
    let totalTokens = 0;

    for (const message of messages) {
      // Add tokens for role and content
      totalTokens += await this.countTokens(
        `${message.role}: ${message.content}`,
        model
      );
      // Add separator tokens (approximate)
      totalTokens += 4;
    }

    return totalTokens;
  }

  /**
   * Decode tokens back to text
   */
  async decodeTokens(tokens: number[], _model: string): Promise<string> {
    try {
      // gpt-tokenizer supports decoding
      return decode(tokens);
    } catch (error) {
      console.warn('Failed to decode tokens', error);
      return '';
    }
  }
}
