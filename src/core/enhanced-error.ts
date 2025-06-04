// New file: Custom error class to replace VError

export interface ErrorContext {
  provider?: string;
  operation?: string;
  model?: string;
  attempt?: number;
  metadata?: Record<string, any>;
}

export interface ErrorInfo {
  code?: string;
  status?: number;
  category?: string;
  isRetryable?: boolean;
  recommendations?: string[];
  timestamp?: string;
  originalError?: {
    message: string;
    code?: string;
    status?: number;
    stack?: string;
  };
}

/**
 * Enhanced Error class with context and metadata support
 */
export class EnhancedError extends Error {
  public readonly code?: string;
  public readonly status?: number;
  public readonly category?: string;
  public readonly context?: ErrorContext;
  public readonly info?: ErrorInfo;
  public readonly originalError?: Error;
  public readonly userMessage?: string;
  public readonly isRetryable?: boolean;
  public readonly recommendations?: string[];
  public readonly timestamp: string;

  constructor(
    message: string,
    options?: {
      cause?: Error;
      code?: string;
      status?: number;
      category?: string;
      context?: ErrorContext;
      info?: ErrorInfo;
      userMessage?: string;
      isRetryable?: boolean;
      recommendations?: string[];
    }
  ) {
    super(message);
    this.name = 'EnhancedError';
    this.timestamp = new Date().toISOString();

    // Set properties from options
    this.originalError = options?.cause;
    this.code = options?.code || this.inferCode(options?.cause);
    this.status = options?.status || this.inferStatus(options?.cause);
    this.category = options?.category || this.inferCategory(message, this.code);
    this.context = options?.context;
    this.info = options?.info;
    this.userMessage = options?.userMessage || this.generateUserMessage();
    this.isRetryable = options?.isRetryable ?? this.checkRetryable();
    this.recommendations =
      options?.recommendations || this.generateRecommendations();

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, EnhancedError);
    }
  }

  /**
   * Infer error code from cause
   */
  private inferCode(cause?: Error): string | undefined {
    if (!cause) return undefined;

    const error = cause as any;
    return error.code || error.errorCode || undefined;
  }

  /**
   * Infer HTTP status from cause
   */
  private inferStatus(cause?: Error): number | undefined {
    if (!cause) return undefined;

    const error = cause as any;
    return (
      error.status || error.statusCode || error.response?.status || undefined
    );
  }

  /**
   * Infer error category
   */
  private inferCategory(message: string, code?: string): string {
    const lowerMessage = message.toLowerCase();
    const numericCode = typeof code === 'string' ? parseInt(code) : code;

    // Authentication errors
    if (
      numericCode === 401 ||
      lowerMessage.includes('unauthorized') ||
      lowerMessage.includes('api key')
    ) {
      return 'authentication';
    }

    // Rate limiting
    if (numericCode === 429 || lowerMessage.includes('rate limit')) {
      return 'rate-limit';
    }

    // Validation errors
    if (
      numericCode === 400 ||
      lowerMessage.includes('invalid') ||
      lowerMessage.includes('validation')
    ) {
      return 'invalid-request';
    }

    // Not found
    if (numericCode === 404 || lowerMessage.includes('not found')) {
      return 'not-found';
    }

    // Permission errors
    if (numericCode === 403 || lowerMessage.includes('forbidden')) {
      return 'permission';
    }

    // Server errors
    if (
      (numericCode && numericCode >= 500) ||
      lowerMessage.includes('internal server')
    ) {
      return 'server-error';
    }

    // Network errors
    if (
      lowerMessage.includes('network') ||
      lowerMessage.includes('econnrefused')
    ) {
      return 'network';
    }

    // Timeout errors
    if (lowerMessage.includes('timeout') || code === 'ETIMEDOUT') {
      return 'timeout';
    }

    return 'unknown';
  }

  /**
   * Check if error is retryable
   */
  private checkRetryable(): boolean {
    const retryableCategories = [
      'rate-limit',
      'server-error',
      'network',
      'timeout',
    ];
    return retryableCategories.includes(this.category || '');
  }

  /**
   * Generate user-friendly message
   */
  private generateUserMessage(): string {
    const messages: Record<string, string> = {
      authentication: 'Authentication failed. Please check your API key.',
      'rate-limit': 'Rate limit exceeded. Please try again later.',
      'invalid-request': 'Invalid request. Please check your input.',
      'not-found': 'The requested resource was not found.',
      permission: 'You do not have permission to perform this action.',
      'server-error': 'Server error. Please try again later.',
      network: 'Network error. Please check your connection.',
      timeout: 'Request timed out. Please try again.',
      unknown: 'An unexpected error occurred. Please try again.',
    };

    return messages[this.category || 'unknown'] || (messages.unknown as any);
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    switch (this.category) {
      case 'authentication':
        recommendations.push('Verify your API key is correct');
        recommendations.push(
          'Check if the API key has the necessary permissions'
        );
        break;

      case 'rate-limit':
        recommendations.push('Implement request throttling');
        recommendations.push('Consider upgrading your API plan');
        break;

      case 'invalid-request':
        recommendations.push('Review the API documentation');
        recommendations.push('Validate input data before sending');
        break;

      case 'network':
        recommendations.push('Check your internet connection');
        recommendations.push('Verify firewall settings');
        break;

      case 'timeout':
        recommendations.push('Reduce request size');
        recommendations.push('Increase timeout settings');
        break;
    }

    return recommendations;
  }

  /**
   * Get error details for logging
   */
  getDetails(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      status: this.status,
      category: this.category,
      context: this.context,
      info: this.info,
      isRetryable: this.isRetryable,
      timestamp: this.timestamp,
      originalError: this.originalError
        ? {
            message: this.originalError.message,
            name: this.originalError.name,
            stack: this.originalError.stack,
          }
        : undefined,
    };
  }

  /**
   * Convert to JSON
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      userMessage: this.userMessage,
      code: this.code,
      status: this.status,
      category: this.category,
      isRetryable: this.isRetryable,
      recommendations: this.recommendations,
      timestamp: this.timestamp,
    };
  }

  /**
   * Create error from unknown type
   */
  static from(error: unknown, context?: ErrorContext): EnhancedError {
    if (error instanceof EnhancedError) {
      return error;
    }

    if (error instanceof Error) {
      return new EnhancedError(error.message, {
        cause: error,
        context,
      });
    }

    if (typeof error === 'string') {
      return new EnhancedError(error, { context });
    }

    if (error && typeof error === 'object') {
      const err = error as any;
      return new EnhancedError(err.message || String(error), {
        code: err.code,
        status: err.status,
        context,
      });
    }

    return new EnhancedError(String(error), { context });
  }
}
