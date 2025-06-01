import {
  AIProvider,
  GenerateOptions,
  SummarizeOptions,
  Classification,
  SentimentAnalysis,
  ImageGenerationOptions,
  ImageResult,
  ImageAnalysisOptions,
  ImageAnalysis,
  TranscriptionOptions,
  TranscriptionResult,
  SpeechOptions,
  CodeGenerationOptions,
  CodeResult
} from '../types'

export interface ProviderConfig {
  name: string
  apiKey?: string
  baseUrl?: string
  model?: string
  headers?: Record<string, string>
  maxRetries?: number
  timeout?: number
}

export abstract class BaseProvider implements AIProvider {
  public name: string
  protected config: ProviderConfig
  protected defaultModel: string

  constructor(config: ProviderConfig) {
    this.name = config.name
    this.config = config
    this.defaultModel = config.model || this.getDefaultModel()
  }

  /**
   * Get default model for provider
   */
  protected abstract getDefaultModel(): string

  /**
   * Validate API key format
   */
  protected validateApiKey(): void {
    if (!this.config.apiKey) {
      throw new Error(`API key required for ${this.name} provider`)
    }
  }

  /**
   * Get headers for API requests
   */
  protected getHeaders(additionalHeaders?: Record<string, string>): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...this.config.headers,
      ...additionalHeaders
    }
  }

  /**
   * Make API request with error handling
   */
  protected async makeRequest<T>(
    url: string,
    options: RequestInit
  ): Promise<T> {
    const timeout = this.config.timeout || 30000
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      })

      if (!response.ok) {
        const error = await this.parseError(response)
        throw error
      }

      return await response.json()
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`)
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * Parse API error response
   */
  protected async parseError(response: Response): Promise<Error> {
    let errorMessage = `${this.name} API error: ${response.status} ${response.statusText}`
    
    try {
      const errorData = await response.json()
      if (errorData.error?.message) {
        errorMessage = errorData.error.message
      } else if (errorData.message) {
        errorMessage = errorData.message
      }
    } catch {
      // Use default error message if parsing fails
    }

    const error = new Error(errorMessage) as any
    error.status = response.status
    error.provider = this.name
    
    return error
  }

  /**
   * Get model to use for request
   */
  protected getModel(options?: { model?: string }): string {
    return options?.model || this.config.model || this.defaultModel
  }

  // Default implementations that throw not implemented errors
  async generateText(prompt: string, options?: GenerateOptions): Promise<string> {
    throw new Error(`Text generation not implemented for ${this.name} provider`)
  }

  async *generateStream(prompt: string, options?: GenerateOptions): AsyncGenerator<string> {
    throw new Error(`Stream generation not implemented for ${this.name} provider`)
  }

  async generateEmbedding(text: string): Promise<number[]> {
    throw new Error(`Embedding generation not implemented for ${this.name} provider`)
  }

  async classifyText(text: string, labels: string[]): Promise<Classification> {
    throw new Error(`Text classification not implemented for ${this.name} provider`)
  }

  async summarize(text: string, options?: SummarizeOptions): Promise<string> {
    throw new Error(`Text summarization not implemented for ${this.name} provider`)
  }

  async analyzeSentiment(text: string): Promise<SentimentAnalysis> {
    throw new Error(`Sentiment analysis not implemented for ${this.name} provider`)
  }

  async generateImage(prompt: string, options?: ImageGenerationOptions): Promise<ImageResult> {
    throw new Error(`Image generation not implemented for ${this.name} provider`)
  }

  async analyzeImage(image: string | Blob, options?: ImageAnalysisOptions): Promise<ImageAnalysis> {
    throw new Error(`Image analysis not implemented for ${this.name} provider`)
  }

  async transcribeAudio(audio: Blob, options?: TranscriptionOptions): Promise<TranscriptionResult> {
    throw new Error(`Audio transcription not implemented for ${this.name} provider`)
  }

  async generateSpeech(text: string, options?: SpeechOptions): Promise<Blob> {
    throw new Error(`Speech generation not implemented for ${this.name} provider`)
  }

  async generateCode(prompt: string, options?: CodeGenerationOptions): Promise<CodeResult> {
    throw new Error(`Code generation not implemented for ${this.name} provider`)
  }

  async explainCode(code: string, language?: string): Promise<string> {
    throw new Error(`Code explanation not implemented for ${this.name} provider`)
  }
}