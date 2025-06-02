import { Analytics } from "../monitoring/analytics";
import { PerformanceMonitor } from "../monitoring/performance-monitor";
import { AnthropicProvider } from "../providers/anthropic-provider";
import { BaseProvider } from "../providers/base-provider";
import { GoogleProvider } from "../providers/google-provider";
import { MockProvider } from "../providers/mock-provider";
import { OpenAIProvider } from "../providers/openai-provider";
import {
  AIConfig,
  AIProviderType,
  Classification,
  CodeGenerationOptions,
  CodeResult,
  GenerateOptions,
  ImageGenerationOptions,
  ImageResult,
  SpeechOptions,
  SummarizeOptions,
  TokenUsage,
  TranscriptionOptions,
  TranscriptionResult,
} from "../types";
import { CacheManager } from "./cache-manager";
import { ConfigManager } from "./config-manager";
import { ErrorHandler } from "./error-handler";
import { RateLimiter } from "./rate-limiter";
import { RetryManager } from "./retry-manager";
import { TokenManager } from "./token-manager";

export interface AIEngineOptions extends Partial<AIConfig> {
  debug?: boolean;
}

export class AIEngine {
  private config: ConfigManager;
  private providers = new Map<AIProviderType, BaseProvider>();
  private cache: CacheManager;
  private rateLimiter: RateLimiter;
  private retryManager: RetryManager;
  private tokenManager: TokenManager;
  private errorHandler: ErrorHandler;
  private performanceMonitor: PerformanceMonitor;
  private analytics: Analytics;
  private debug: boolean;

  constructor(options: AIEngineOptions) {
    this.debug = options.debug || false;

    // Initialize core components
    this.config = new ConfigManager(options);
    this.cache = new CacheManager({
      ...this.config.getCacheConfig(),
      namespace: "ai-engine",
    });
    this.rateLimiter = new RateLimiter();
    this.retryManager = new RetryManager(this.config.getRetryConfig());
    this.tokenManager = new TokenManager();
    this.errorHandler = new ErrorHandler();
    this.performanceMonitor = new PerformanceMonitor();
    this.analytics = new Analytics();

    // Initialize providers
    this.initializeProviders();

    // Setup rate limiters
    this.setupRateLimiters();

    this.log("AI Engine initialized", { config: this.config.exportConfig() });
  }

  /**
   * Initialize providers based on configuration
   */
  private initializeProviders(): void {
    const mainProvider = this.config.getConfig().provider;
    const fallbackProviders = this.config.getFallbackProviders();
    const allProviders = [mainProvider, ...fallbackProviders];

    for (const providerType of allProviders) {
      try {
        const provider = this.createProvider(providerType);
        if (provider) {
          this.providers.set(providerType, provider);
          this.log(`Provider initialized: ${providerType}`);
        }
      } catch (error) {
        this.log(`Failed to initialize provider: ${providerType}`, error);
      }
    }
  }

  /**
   * Create a provider instance
   */
  private createProvider(type: AIProviderType): BaseProvider | null {
    const providerConfig = this.config.getProviderConfig(type);

    if (!providerConfig.apiKey && type !== "mock" && type !== "local") {
      this.log(`No API key for provider: ${type}`);
      return null;
    }

    const config = {
      name: type,
      apiKey: providerConfig.apiKey,
      model: providerConfig.model,
      baseUrl: providerConfig.baseUrl,
      headers: providerConfig.headers,
      timeout: this.config.getConfig().timeout,
      maxRetries: this.config.getConfig().maxRetries,
    };

    switch (type) {
      case "openai":
        return new OpenAIProvider(config);
      case "anthropic":
        return new AnthropicProvider(config);
      case "google":
        return new GoogleProvider(config);
      case "mock":
        return new MockProvider(config);
      default:
        return null;
    }
  }

  /**
   * Setup rate limiters for each provider
   */
  private setupRateLimiters(): void {
    const rateLimitConfig = this.config.getRateLimitConfig();

    for (const [providerType] of this.providers) {
      this.rateLimiter.createLimiter({
        id: providerType,
        ...rateLimitConfig,
      });
    }
  }

  /**
   * Get provider with fallback support
   */
  private async getProvider(): Promise<{
    provider: BaseProvider;
    type: AIProviderType;
  }> {
    const mainType = this.config.getConfig().provider;
    const mainProvider = this.providers.get(mainType);

    if (mainProvider) {
      return { provider: mainProvider, type: mainType };
    }

    // Try fallback providers
    const fallbacks = this.config.getFallbackProviders();
    for (const fallbackType of fallbacks) {
      const fallbackProvider = this.providers.get(fallbackType);
      if (fallbackProvider) {
        this.log(`Using fallback provider: ${fallbackType}`);
        return { provider: fallbackProvider, type: fallbackType };
      }
    }

    throw new Error("No available providers");
  }

  /**
   * Execute operation with full pipeline
   */
  private async executeOperation<T>(
    operation: string,
    execute: (provider: BaseProvider) => Promise<T>,
    options?: {
      cacheKey?: string;
      estimatedTokens?: number;
      skipCache?: boolean;
    }
  ): Promise<T> {
    const operationId = `${operation}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Check cache
    if (!options?.skipCache && options?.cacheKey) {
      const cached = await this.cache.get<T>(options.cacheKey);
      if (cached !== null) {
        this.analytics.trackEvent({
          type: "cache_hit",
          provider: "cache",
          operation,
        });
        return cached;
      }
    }

    // Get provider
    const { provider, type: providerType } = await this.getProvider();

    // Start performance monitoring
    this.performanceMonitor.startOperation(
      operationId,
      operation,
      providerType
    );

    try {
      // Check token limits if needed
      if (options?.estimatedTokens) {
        const consumed = await this.rateLimiter.consumeTokens(
          providerType,
          options.estimatedTokens
        );
        if (!consumed) {
          throw new Error("Token limit exceeded");
        }
      }

      // Execute with rate limiting and retry
      const result = await this.rateLimiter.schedule(providerType, () =>
        this.retryManager.execute(() => execute(provider), {
          provider: providerType,
          operation,
        })
      );

      // End performance monitoring
      const perfReport = this.performanceMonitor.endOperation(
        operationId,
        true
      );

      // Track analytics
      this.analytics.trackEvent({
        type: "success",
        provider: providerType,
        operation,
        model: this.config.getModel(providerType),
        latency: perfReport?.duration,
      });

      // Cache result if applicable
      if (!options?.skipCache && options?.cacheKey) {
        await this.cache.set(options.cacheKey, result);
      }

      return result;
    } catch (error) {
      // Handle error
      const enhancedError = this.errorHandler.handleError(error, {
        provider: providerType,
        operation,
      });

      // End performance monitoring
      this.performanceMonitor.endOperation(
        operationId,
        false,
        enhancedError.message
      );

      // Track error
      this.analytics.trackEvent({
        type: "error",
        provider: providerType,
        operation,
        error: enhancedError.message,
      });

      throw enhancedError;
    }
  }

  /**
   * Generate text completion
   */
  async generateText(
    prompt: string,
    options?: GenerateOptions
  ): Promise<string> {
    const cacheKey = this.cache.createTextGenerationKey(
      prompt,
      options,
      this.config.getConfig().provider,
      this.config.getModel()
    );

    const estimatedTokens = await this.tokenManager.countTokens(
      prompt,
      this.config.getModel() || "gpt-3.5-turbo"
    );

    const result = await this.executeOperation(
      "generateText",
      (provider) => provider.generateText(prompt, options),
      {
        cacheKey,
        estimatedTokens,
        skipCache: options?.stream,
      }
    );

    // Track token usage
    const responseTokens = await this.tokenManager.countTokens(
      result,
      this.config.getModel() || "gpt-3.5-turbo"
    );

    const usage: TokenUsage = {
      promptTokens: estimatedTokens,
      completionTokens: responseTokens,
      totalTokens: estimatedTokens + responseTokens,
    };

    const cost =
      this.tokenManager.estimateCost(
        usage.promptTokens,
        this.config.getModel() || "gpt-3.5-turbo",
        "input"
      ) +
      this.tokenManager.estimateCost(
        usage.completionTokens,
        this.config.getModel() || "gpt-3.5-turbo",
        "output"
      );

    this.analytics.trackEvent({
      type: "success",
      provider: this.config.getConfig().provider,
      operation: "generateText",
      model: this.config.getModel(),
      tokens: {
        prompt: usage.promptTokens,
        completion: usage.completionTokens,
        total: usage.totalTokens,
      },
      cost,
    });

    return result;
  }

  /**
   * Generate streaming text completion
   */
  async *generateStream(
    prompt: string,
    options?: GenerateOptions
  ): AsyncGenerator<string> {
    const { provider, type: providerType } = await this.getProvider();

    if (!provider.generateStream) {
      throw new Error(`Provider ${providerType} does not support streaming`);
    }

    const operationId = `generateStream-${Date.now()}`;
    this.performanceMonitor.startOperation(
      operationId,
      "generateStream",
      providerType
    );

    try {
      yield* provider.generateStream(prompt, options);

      this.performanceMonitor.endOperation(operationId, true);

      this.analytics.trackEvent({
        type: "success",
        provider: providerType,
        operation: "generateStream",
        model: this.config.getModel(providerType),
      });
    } catch (error: any) {
      this.performanceMonitor.endOperation(operationId, false, error.message);

      this.analytics.trackEvent({
        type: "error",
        provider: providerType,
        operation: "generateStream",
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Generate embeddings
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const cacheKey = this.cache.createEmbeddingKey(
      text,
      this.config.getConfig().provider,
      this.config.getModel()
    );

    return this.executeOperation(
      "generateEmbedding",
      (provider) => provider.generateEmbedding(text),
      { cacheKey }
    );
  }

  /**
   * Classify text
   */
  async classifyText(text: string, labels: string[]): Promise<Classification> {
    const cacheKey = this.cache.generateKey("classifyText", [text, labels]);

    return this.executeOperation(
      "classifyText",
      (provider) => provider.classifyText(text, labels),
      { cacheKey }
    );
  }

  /**
   * Summarize text
   */
  async summarize(text: string, options?: SummarizeOptions): Promise<string> {
    const cacheKey = this.cache.generateKey("summarize", [text, options]);

    return this.executeOperation(
      "summarize",
      (provider) => provider.summarize(text, options),
      { cacheKey }
    );
  }

  /**
   * Generate image
   */
  async generateImage(
    prompt: string,
    options?: ImageGenerationOptions
  ): Promise<ImageResult> {
    return this.executeOperation("generateImage", (provider) =>
      provider.generateImage(prompt, options)
    );
  }

  /**
   * Transcribe audio
   */
  async transcribeAudio(
    audio: Blob,
    options?: TranscriptionOptions
  ): Promise<TranscriptionResult> {
    return this.executeOperation("transcribeAudio", (provider) =>
      provider.transcribeAudio(audio, options)
    );
  }

  /**
   * Generate speech
   */
  async generateSpeech(text: string, options?: SpeechOptions): Promise<Blob> {
    return this.executeOperation("generateSpeech", (provider) =>
      provider.generateSpeech(text, options)
    );
  }

  /**
   * Generate code
   */
  async generateCode(
    prompt: string,
    options?: CodeGenerationOptions
  ): Promise<CodeResult> {
    return this.executeOperation("generateCode", (provider) =>
      provider.generateCode(prompt, options)
    );
  }

  /**
   * Update configuration
   */
  async updateConfig(config: Partial<AIConfig>): Promise<void> {
    this.config.updateConfig(config);

    // Reinitialize components if needed
    this.initializeProviders();
    this.setupRateLimiters();

    this.log("Configuration updated", { config: this.config.exportConfig() });
  }

  /**
   * Get current statistics
   */
  getStats() {
    return {
      usage: this.analytics.getStats(),
      performance: this.performanceMonitor.getStats(),
      cache: this.cache.getStats(),
      rateLimiter: this.rateLimiter.getAllStats(),
      errors: this.errorHandler.getErrorStats(),
      health: this.performanceMonitor.getHealthStatus(),
    };
  }

  /**
   * Clear all caches and reset statistics
   */
  async reset(): Promise<void> {
    await this.cache.clear();
    this.analytics.reset();
    this.performanceMonitor.clearHistory();
    this.errorHandler.clearHistory();

    this.log("AI Engine reset");
  }

  /**
   * Log debug information
   */
  private log(message: string, data?: any): void {
    if (this.debug) {
      console.log(`[AI Engine] ${message}`, data || "");
    }
  }

  /**
   * Export configuration
   */
  exportConfig() {
    return this.config.exportConfig();
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): AIProviderType[] {
    return Array.from(this.providers.keys());
  }
}
