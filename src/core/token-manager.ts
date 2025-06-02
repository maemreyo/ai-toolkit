import { encode } from "gpt-tokenizer";
import { encoding_for_model, get_encoding } from "tiktoken";

interface TokenInfo {
  count: number;
  truncated: boolean;
  originalLength?: number;
}

interface ModelTokenLimits {
  [model: string]: number;
}

export class TokenManager {
  // // private encoders = new Map<string, any>()

  private tokenLimits: ModelTokenLimits = {
    // OpenAI models
    "gpt-4": 8192,
    "gpt-4-32k": 32768,
    "gpt-4-turbo": 128000,
    "gpt-4-turbo-preview": 128000,
    "gpt-3.5-turbo": 4096,
    "gpt-3.5-turbo-16k": 16384,

    // Anthropic models
    "claude-3-opus": 200000,
    "claude-3-sonnet": 200000,
    "claude-3-haiku": 200000,
    "claude-2.1": 200000,
    "claude-2": 100000,

    // Google models
    "gemini-pro": 30720,
    "gemini-pro-vision": 30720,
    "palm-2": 8192,

    // Default
    default: 4096,
  };

  private modelPricing = {
    // OpenAI pricing per 1K tokens
    "gpt-4": { input: 0.03, output: 0.06 },
    "gpt-4-turbo": { input: 0.01, output: 0.03 },
    "gpt-3.5-turbo": { input: 0.0005, output: 0.0015 },

    // Anthropic pricing per 1K tokens
    "claude-3-opus": { input: 0.015, output: 0.075 },
    "claude-3-sonnet": { input: 0.003, output: 0.015 },
    "claude-3-haiku": { input: 0.00025, output: 0.00125 },

    // Google pricing per 1K tokens
    "gemini-pro": { input: 0.0005, output: 0.0015 },

    // Default free
    default: { input: 0, output: 0 },
  };

  /**
   * Count tokens in text for a specific model
   */
  async countTokens(text: string, model: string): Promise<number> {
    try {
      // Use tiktoken for OpenAI models
      if (
        model.includes("gpt") ||
        model.includes("davinci") ||
        model.includes("turbo")
      ) {
        return this.countTokensWithTiktoken(text, model);
      }

      // Use gpt-tokenizer as fallback for other models
      return encode(text).length;
    } catch (error) {
      // Fallback to character-based estimation
      return this.estimateTokens(text);
    }
  }

  /**
   * Count tokens using tiktoken
   */
  private countTokensWithTiktoken(text: string, model: string): number {
    try {
      // Try to get encoding for specific model
      const encoder = encoding_for_model(model as any);
      const tokens = encoder.encode(text);
      const count = tokens.length;
      encoder.free(); // Free memory
      return count;
    } catch {
      // Fallback to cl100k_base encoding
      const encoder = get_encoding("cl100k_base");
      const tokens = encoder.encode(text);
      const count = tokens.length;
      encoder.free();
      return count;
    }
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
      maxTokens ?? this.tokenLimits[model] ?? this.tokenLimits.default;

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
    const modelLimit = this.tokenLimits[model] ?? this.tokenLimits.default;
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
    let bestFit = "";

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
      return "..." + bestFit;
    } else {
      return bestFit + "...";
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

    let currentChunk = "";
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
          currentChunk = overlapText + " " + sentence;
          currentTokens = await this.countTokens(currentChunk, model);
        } else {
          currentChunk = sentence;
          currentTokens = sentenceTokens;
        }
      } else {
        currentChunk += (currentChunk ? " " : "") + sentence;
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
    // Simple sentence splitting - can be improved with better NLP
    return text.match(/[^.!?]+[.!?]+/g) || [text];
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
    let overlapText = "";
    let currentTokens = 0;

    for (const sentence of sentences) {
      const sentenceTokens = await this.countTokens(sentence, model);
      if (currentTokens + sentenceTokens <= overlapTokens) {
        overlapText = sentence + " " + overlapText;
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
    type: "input" | "output" = "input"
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
    return this.tokenLimits[model] ?? this.tokenLimits.default;
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
}
