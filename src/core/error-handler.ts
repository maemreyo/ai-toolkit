import Boom from "@hapi/boom";
import VError from "verror";

export interface ErrorContext {
  provider: string;
  operation: string;
  model?: string;
  attempt?: number;
  metadata?: Record<string, any>;
}

export interface EnhancedError extends Error {
  code?: string;
  status?: number;
  category?: string;
  userMessage?: string;
  isRetryable?: boolean;
  context?: ErrorContext;
  recommendations?: string[];
  timestamp?: string;
}

export class ErrorHandler {
  private errorHistory: Array<{
    timestamp: Date;
    error: EnhancedError;
    context: ErrorContext;
    resolved: boolean;
  }> = [];

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
    // Create enhanced error using VError
    const enhancedError = new VError(
      {
        name: this.getErrorName(error),
        cause: error,
        info: {
          ...context,
          originalError: {
            message: error.message,
            code: error.code,
            status: error.status,
          },
        },
      },
      this.getErrorMessage(error, context)
    ) as EnhancedError;

    // Add additional properties
    enhancedError.code = error.code || this.inferErrorCode(error);
    enhancedError.status = error.status || this.inferStatusCode(error);
    enhancedError.category = this.categorizeError(error);
    enhancedError.userMessage = this.getUserFriendlyMessage(enhancedError);
    enhancedError.isRetryable = this.isRetryable(enhancedError);
    enhancedError.context = context;
    enhancedError.recommendations = this.getRecommendations(enhancedError);
    enhancedError.timestamp = new Date().toISOString();

    return enhancedError;
  }

  /**
   * Get error name based on category
   */
  private getErrorName(error: any): string {
    const category = this.categorizeError(error);

    const errorNames: Record<string, string> = {
      authentication: "AuthenticationError",
      "rate-limit": "RateLimitError",
      "invalid-request": "ValidationError",
      "server-error": "ServerError",
      network: "NetworkError",
      timeout: "TimeoutError",
      billing: "BillingError",
      "not-found": "NotFoundError",
      permission: "PermissionError",
    };

    return errorNames[category] || "AIProviderError";
  }

  /**
   * Get formatted error message
   */
  private getErrorMessage(error: any, context: ErrorContext): string {
    return `${context.operation} failed on ${context.provider}${
      context.model ? ` (model: ${context.model})` : ""
    }: ${error.message}`;
  }

  /**
   * Categorize error
   */
  private categorizeError(error: any): string {
    const message = error.message?.toLowerCase() || "";
    const code = error.code || error.status;

    if (
      code === 401 ||
      message.includes("unauthorized") ||
      message.includes("api key")
    ) {
      return "authentication";
    }

    if (
      code === 429 ||
      message.includes("rate limit") ||
      message.includes("quota exceeded")
    ) {
      return "rate-limit";
    }

    if (
      code === 402 ||
      message.includes("billing") ||
      message.includes("payment")
    ) {
      return "billing";
    }

    if (
      code === 400 ||
      message.includes("invalid") ||
      message.includes("validation")
    ) {
      return "invalid-request";
    }

    if (
      code === 403 ||
      message.includes("forbidden") ||
      message.includes("permission")
    ) {
      return "permission";
    }

    if (code === 404 || message.includes("not found")) {
      return "not-found";
    }

    if (code >= 500 || message.includes("internal server")) {
      return "server-error";
    }

    if (
      message.includes("network") ||
      message.includes("econnrefused") ||
      message.includes("enotfound")
    ) {
      return "network";
    }

    if (message.includes("timeout") || code === "ETIMEDOUT") {
      return "timeout";
    }

    return "unknown";
  }

  /**
   * Infer error code
   */
  private inferErrorCode(error: any): string {
    if (error.code) return error.code;

    const category = this.categorizeError(error);
    const codes: Record<string, string> = {
      authentication: "AUTH_ERROR",
      "rate-limit": "RATE_LIMIT_ERROR",
      "invalid-request": "VALIDATION_ERROR",
      "server-error": "SERVER_ERROR",
      network: "NETWORK_ERROR",
      timeout: "TIMEOUT_ERROR",
      billing: "BILLING_ERROR",
      "not-found": "NOT_FOUND",
      permission: "PERMISSION_DENIED",
    };

    return codes[category] || "UNKNOWN_ERROR";
  }

  /**
   * Infer HTTP status code
   */
  private inferStatusCode(error: any): number {
    if (error.status) return error.status;

    const category = this.categorizeError(error);
    const statuses: Record<string, number> = {
      authentication: 401,
      "rate-limit": 429,
      "invalid-request": 400,
      "server-error": 500,
      network: 503,
      timeout: 504,
      billing: 402,
      "not-found": 404,
      permission: 403,
    };

    return statuses[category] || 500;
  }

  /**
   * Get user-friendly error message
   */
  private getUserFriendlyMessage(error: EnhancedError): string {
    const messages: Record<string, string> = {
      authentication:
        "Authentication failed. Please check your API key and ensure it has the necessary permissions.",
      "rate-limit":
        "Rate limit exceeded. Please wait a moment before trying again.",
      billing:
        "There is an issue with your billing or quota. Please check your account status.",
      "invalid-request":
        "The request contains invalid parameters. Please check your input and try again.",
      "server-error":
        "The AI service is temporarily unavailable. Please try again later.",
      network:
        "Network connection issue. Please check your internet connection and try again.",
      timeout:
        "The request timed out. Please try again with a shorter prompt or wait a moment.",
      "not-found":
        "The requested resource was not found. Please verify the endpoint or model name.",
      permission: "You do not have permission to perform this action.",
      unknown:
        "An unexpected error occurred. Please try again or contact support if the issue persists.",
    };

    return messages[error.category || "unknown"] as any;
  }

  /**
   * Determine if error is retryable
   */
  private isRetryable(error: EnhancedError): boolean {
    const retryableCategories = [
      "rate-limit",
      "server-error",
      "network",
      "timeout",
    ];
    return retryableCategories.includes(error.category || "");
  }

  /**
   * Get recommendations for resolving the error
   */
  private getRecommendations(error: EnhancedError): string[] {
    const recommendations: string[] = [];

    switch (error.category) {
      case "authentication":
        recommendations.push("Verify your API key is correct");
        recommendations.push(
          "Check if the API key has been revoked or expired"
        );
        recommendations.push(
          "Ensure the API key has the necessary permissions"
        );
        break;

      case "rate-limit":
        recommendations.push("Implement request queuing or throttling");
        recommendations.push(
          "Consider upgrading your API plan for higher limits"
        );
        recommendations.push("Spread requests over time to avoid bursts");
        break;

      case "billing":
        recommendations.push("Check your account balance and payment method");
        recommendations.push("Review your usage and adjust limits if needed");
        recommendations.push("Contact support if billing issues persist");
        break;

      case "invalid-request":
        recommendations.push(
          "Review the API documentation for correct parameters"
        );
        recommendations.push("Validate input data before sending requests");
        recommendations.push(
          "Check for any recent API changes or deprecations"
        );
        break;

      case "network":
        recommendations.push("Check your internet connection");
        recommendations.push("Verify firewall or proxy settings");
        recommendations.push("Try using a different network");
        break;

      case "timeout":
        recommendations.push("Reduce the size of your request");
        recommendations.push("Increase timeout settings if possible");
        recommendations.push("Break large requests into smaller chunks");
        break;
    }

    // Add context-specific recommendations
    if (error.context?.attempt && error.context.attempt > 2) {
      recommendations.push("Consider using a fallback provider");
      recommendations.push("Implement circuit breaker pattern");
    }

    return recommendations;
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
   * Create HTTP-friendly error using Boom
   */
  createHttpError(error: EnhancedError): Boom.Boom {
    const boomError = Boom.boomify(error, {
      statusCode: error.status || 500,
      message: error.userMessage,
    });

    // Add custom data
    boomError.output.payload.code = error.code;
    boomError.output.payload.category = error.category;
    boomError.output.payload.isRetryable = error.isRetryable;
    boomError.output.payload.recommendations = error.recommendations;

    return boomError;
  }

  /**
   * Get error statistics
   */
  getErrorStats(timeWindow?: number): {
    total: number;
    byCategory: Record<string, number>;
    byProvider: Record<string, number>;
    resolutionRate: number;
    recentErrors: Array<{
      timestamp: string;
      category: string;
      provider: string;
      message: string;
    }>;
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
      recentErrors: [] as any[],
    };

    relevantErrors.forEach((entry) => {
      // Count by category
      const category = entry.error.category || "unknown";
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;

      // Count by provider
      const provider = entry.context.provider;
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
      error: {
        message: entry.error.message,
        code: entry.error.code,
        category: entry.error.category,
        userMessage: entry.error.userMessage,
        isRetryable: entry.error.isRetryable,
        recommendations: entry.error.recommendations,
      },
      context: entry.context,
      resolved: entry.resolved,
    }));
  }
}
