import { EnhancedError, ErrorContext } from './enhanced-error';

interface ErrorHistoryEntry {
  timestamp: Date;
  error: EnhancedError;
  context: ErrorContext;
  resolved: boolean;
}

interface ErrorStats {
  timestamp: string;
  category: string;
  provider: string;
  message: string;
}

export class ErrorHandler {
  private errorHistory: ErrorHistoryEntry[] = [];
  private maxHistorySize = 1000;

  /**
   * Handle and enhance error
   */
  handleError(error: any, context: ErrorContext): EnhancedError {
    const enhancedError = this.enhanceError(error, context);

    // Add to history
    this.addToHistory(enhancedError, context);

    return enhancedError;
  }

  /**
   * Enhance error with additional information
   */
  private enhanceError(error: any, context: ErrorContext): EnhancedError {
    // Use EnhancedError.from to create enhanced error
    const enhancedError = EnhancedError.from(error, context);

    // Add context-specific enhancements
    if (context.attempt && context.attempt > 1) {
      enhancedError.recommendations?.push(
        `This was attempt ${context.attempt}. Consider using a fallback provider.`
      );
    }

    return enhancedError;
  }

  /**
   * Add error to history
   */
  private addToHistory(error: EnhancedError, context: ErrorContext): void {
    this.errorHistory.push({
      timestamp: new Date(),
      error,
      context,
      resolved: false,
    });

    // Limit history size
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(-this.maxHistorySize / 2);
    }
  }

  /**
   * Create HTTP-friendly error response
   */
  createHttpError(error: EnhancedError): {
    statusCode: number;
    error: string;
    message: string;
    code?: string;
    category?: string;
    isRetryable?: boolean;
    recommendations?: string[];
  } {
    const statusCode = error.status || 500;
    const errorName = this.getHttpErrorName(statusCode);

    return {
      statusCode,
      error: errorName,
      message: error.userMessage || error.message,
      code: error.code,
      category: error.category,
      isRetryable: error.isRetryable,
      recommendations: error.recommendations,
    };
  }

  /**
   * Get HTTP error name from status code
   */
  private getHttpErrorName(statusCode: number): string {
    const errorNames: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      402: 'Payment Required',
      403: 'Forbidden',
      404: 'Not Found',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
      504: 'Gateway Timeout',
    };

    return errorNames[statusCode] || 'Unknown Error';
  }

  /**
   * Get error statistics
   */
  getErrorStats(timeWindow?: number): {
    total: number;
    byCategory: Record<string, number>;
    byProvider: Record<string, number>;
    resolutionRate: number;
    recentErrors: ErrorStats[];
  } {
    const cutoff = timeWindow ? Date.now() - timeWindow : 0;
    const relevantErrors = this.errorHistory.filter(
      (entry) => entry.timestamp.getTime() > cutoff
    );

    const stats = {
      total: relevantErrors.length,
      byCategory: {} as Record<string, number>,
      byProvider: {} as Record<string, number>,
      resolutionRate: 0,
      recentErrors: [] as ErrorStats[],
    };

    relevantErrors.forEach((entry) => {
      // Count by category
      const category = entry.error.category || 'unknown';
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;

      // Count by provider
      const provider = entry.context.provider || 'unknown';
      stats.byProvider[provider] = (stats.byProvider[provider] || 0) + 1;

      // Add to recent errors
      if (stats.recentErrors.length < 10) {
        stats.recentErrors.push({
          timestamp: entry.timestamp.toISOString(),
          category,
          provider,
          message: entry.error.message,
        });
      }
    });

    // Calculate resolution rate
    const resolved = relevantErrors.filter((e) => e.resolved).length;
    stats.resolutionRate =
      relevantErrors.length > 0 ? resolved / relevantErrors.length : 0;

    return stats;
  }

  /**
   * Mark error as resolved
   */
  markResolved(errorId: string): void {
    const entry = this.errorHistory.find(
      (e) => e.timestamp.toISOString() === errorId
    );
    if (entry) {
      entry.resolved = true;
    }
  }

  /**
   * Clear error history
   */
  clearHistory(): void {
    this.errorHistory = [];
  }

  /**
   * Export error history
   */
  exportHistory(): Array<{
    timestamp: string;
    error: any;
    context: ErrorContext;
    resolved: boolean;
  }> {
    return this.errorHistory.map((entry) => ({
      timestamp: entry.timestamp.toISOString(),
      error: entry.error.toJSON(),
      context: entry.context,
      resolved: entry.resolved,
    }));
  }

  /**
   * Get error trends
   */
  getErrorTrends(
    interval: 'hour' | 'day' | 'week' = 'day',
    limit: number = 7
  ): Array<{
    period: string;
    errors: number;
    byCategory: Record<string, number>;
  }> {
    const intervalMs = {
      hour: 3600000,
      day: 86400000,
      week: 604800000,
    }[interval];

    const now = Date.now();
    const trends: Array<{
      period: string;
      errors: number;
      byCategory: Record<string, number>;
    }> = [];

    for (let i = 0; i < limit; i++) {
      const endTime = now - i * intervalMs;
      const startTime = endTime - intervalMs;

      const periodErrors = this.errorHistory.filter((entry) => {
        const time = entry.timestamp.getTime();
        return time >= startTime && time < endTime;
      });

      const byCategory: Record<string, number> = {};
      periodErrors.forEach((entry) => {
        const category = entry.error.category || 'unknown';
        byCategory[category] = (byCategory[category] || 0) + 1;
      });

      trends.unshift({
        period: new Date(endTime).toISOString(),
        errors: periodErrors.length,
        byCategory,
      });
    }

    return trends;
  }

  /**
   * Get most common errors
   */
  getMostCommonErrors(limit: number = 5): Array<{
    message: string;
    count: number;
    category: string;
    lastOccurred: string;
  }> {
    const errorCounts = new Map<
      string,
      {
        count: number;
        category: string;
        lastOccurred: Date;
      }
    >();

    this.errorHistory.forEach((entry) => {
      const key = `${entry.error.category}:${entry.error.code || 'unknown'}`;
      const existing = errorCounts.get(key);

      if (existing) {
        existing.count++;
        if (entry.timestamp > existing.lastOccurred) {
          existing.lastOccurred = entry.timestamp;
        }
      } else {
        errorCounts.set(key, {
          count: 1,
          category: entry.error.category || 'unknown',
          lastOccurred: entry.timestamp,
        });
      }
    });

    return Array.from(errorCounts.entries())
      .map(([message, data]) => ({
        message,
        ...data,
        lastOccurred: data.lastOccurred.toISOString(),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
}
