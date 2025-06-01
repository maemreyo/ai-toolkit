import pRetry, { AbortError } from 'p-retry'
import { backOff } from 'exponential-backoff'
import VError from 'verror'
import { RetryConfig } from '../types'

interface RetryContext {
  provider: string
  operation: string
  model?: string
  metadata?: Record<string, any>
}

interface RetryOptions extends RetryConfig {
  onRetry?: (error: Error, attempt: number) => void
  shouldRetry?: (error: any) => boolean
}

export class RetryManager {
  private config: RetryConfig

  constructor(config: RetryConfig) {
    this.config = config
  }

  /**
   * Execute operation with retry logic
   */
  async execute<T>(
    operation: () => Promise<T>,
    context: RetryContext,
    options?: Partial<RetryOptions>
  ): Promise<T> {
    const mergedOptions = { ...this.config, ...options }
    
    return pRetry(
      async (attemptNumber) => {
        try {
          return await operation()
        } catch (error) {
          // Wrap error with context
          const wrappedError = this.wrapError(error, context, attemptNumber)
          
          // Check if we should retry
          if (!this.shouldRetry(error, mergedOptions)) {
            throw new AbortError(wrappedError)
          }
          
          // Call retry callback if provided
          if (mergedOptions.onRetry) {
            mergedOptions.onRetry(wrappedError, attemptNumber)
          }
          
          throw wrappedError
        }
      },
      {
        retries: mergedOptions.maxAttempts - 1,
        factor: mergedOptions.backoff === 'exponential' ? 2 : 1,
        minTimeout: mergedOptions.baseDelay,
        maxTimeout: mergedOptions.maxDelay,
        randomize: true,
        onFailedAttempt: (error) => {
          // Log failed attempts
          console.warn(
            `Retry attempt ${error.attemptNumber} failed for ${context.operation}:`,
            error.message
          )
        }
      }
    )
  }

  /**
   * Execute with custom exponential backoff
   */
  async executeWithBackoff<T>(
    operation: () => Promise<T>,
    context: RetryContext,
    options?: Partial<RetryOptions>
  ): Promise<T> {
    const mergedOptions = { ...this.config, ...options }
    
    try {
      return await backOff(operation, {
        numOfAttempts: mergedOptions.maxAttempts,
        startingDelay: mergedOptions.baseDelay,
        maxDelay: mergedOptions.maxDelay,
        jitter: 'full',
        timeMultiple: 2,
        retry: (error, attemptNumber) => {
          const shouldRetry = this.shouldRetry(error, mergedOptions)
          
          if (shouldRetry && mergedOptions.onRetry) {
            mergedOptions.onRetry(error, attemptNumber)
          }
          
          return shouldRetry
        }
      })
    } catch (error) {
      throw this.wrapError(error, context, mergedOptions.maxAttempts)
    }
  }

  /**
   * Wrap error with context information
   */
  private wrapError(error: any, context: RetryContext, attempt: number): Error {
    return new VError(
      {
        name: 'AIProviderError',
        cause: error,
        info: {
          ...context,
          attempt,
          timestamp: new Date().toISOString(),
          errorCode: error.code || error.status,
          errorType: this.categorizeError(error)
        }
      },
      `Failed to execute ${context.operation} on ${context.provider} (attempt ${attempt})`
    )
  }

  /**
   * Determine if error should trigger retry
   */
  private shouldRetry(error: any, options: RetryOptions): boolean {
    // Use custom retry logic if provided
    if (options.shouldRetry) {
      return options.shouldRetry(error)
    }
    
    // Check error categorization
    const errorType = this.categorizeError(error)
    
    switch (errorType) {
      case 'authentication':
      case 'invalid_request':
      case 'not_found':
      case 'permission_denied':
        // Don't retry these errors
        return false
      
      case 'rate_limit':
        // Always retry rate limits with backoff
        return true
      
      case 'server_error':
      case 'network':
      case 'timeout':
        // Retry these errors
        return true
      
      default:
        // Default to retry for unknown errors
        return true
    }
  }

  /**
   * Categorize error type
   */
  private categorizeError(error: any): string {
    const message = error.message?.toLowerCase() || ''
    const code = error.code || error.status
    
    // Authentication errors
    if (
      code === 401 ||
      message.includes('unauthorized') ||
      message.includes('api key') ||
      message.includes('authentication')
    ) {
      return 'authentication'
    }
    
    // Rate limiting
    if (code === 429 || message.includes('rate limit')) {
      return 'rate_limit'
    }
    
    // Invalid request
    if (
      code === 400 ||
      message.includes('invalid') ||
      message.includes('validation')
    ) {
      return 'invalid_request'
    }
    
    // Not found
    if (code === 404 || message.includes('not found')) {
      return 'not_found'
    }
    
    // Permission denied
    if (code === 403 || message.includes('forbidden')) {
      return 'permission_denied'
    }
    
    // Server errors
    if (code >= 500 || message.includes('internal server')) {
      return 'server_error'
    }
    
    // Network errors
    if (
      message.includes('network') ||
      message.includes('econnrefused') ||
      message.includes('enotfound') ||
      message.includes('econnreset')
    ) {
      return 'network'
    }
    
    // Timeout
    if (
      message.includes('timeout') ||
      message.includes('etimedout') ||
      code === 'ETIMEDOUT'
    ) {
      return 'timeout'
    }
    
    return 'unknown'
  }

  /**
   * Create a retry wrapper for a function
   */
  wrap<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    context: RetryContext,
    options?: Partial<RetryOptions>
  ): T {
    return (async (...args: Parameters<T>) => {
      return this.execute(() => fn(...args), context, options)
    }) as T
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Get current configuration
   */
  getConfig(): RetryConfig {
    return { ...this.config }
  }

  /**
   * Calculate delay for next retry
   */
  calculateDelay(attempt: number, options?: Partial<RetryOptions>): number {
    const mergedOptions = { ...this.config, ...options }
    
    let delay: number
    
    switch (mergedOptions.backoff) {
      case 'exponential':
        delay = Math.min(
          mergedOptions.baseDelay * Math.pow(2, attempt - 1),
          mergedOptions.maxDelay
        )
        break
      
      case 'linear':
        delay = Math.min(
          mergedOptions.baseDelay * attempt,
          mergedOptions.maxDelay
        )
        break
      
      case 'fixed':
      default:
        delay = mergedOptions.baseDelay
        break
    }
    
    // Add jitter to prevent thundering herd
    const jitter = delay * 0.2 * Math.random()
    return Math.floor(delay + jitter)
  }

  /**
   * Get retry statistics
   */
  getRetryStats(error: any): {
    shouldRetry: boolean
    errorType: string
    suggestedDelay: number
    maxAttempts: number
  } {
    const errorType = this.categorizeError(error)
    const shouldRetry = this.shouldRetry(error, this.config)
    
    // Suggest longer delays for rate limits
    let suggestedDelay = this.config.baseDelay
    if (errorType === 'rate_limit') {
      suggestedDelay = this.config.baseDelay * 2
    }
    
    return {
      shouldRetry,
      errorType,
      suggestedDelay,
      maxAttempts: this.config.maxAttempts
    }
  }
}