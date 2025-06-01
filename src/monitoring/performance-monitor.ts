interface PerformanceMetrics {
  operationId: string
  operation: string
  provider: string
  startTime: number
  endTime?: number
  duration?: number
  success: boolean
  error?: string
  metadata?: Record<string, any>
}

interface PerformanceReport {
  operationId: string
  operation: string
  provider: string
  duration: number
  success: boolean
  error?: string
  timestamp: string
}

interface PerformanceStats {
  averageLatency: number
  minLatency: number
  maxLatency: number
  successRate: number
  errorRate: number
  throughput: number
  percentiles: {
    p50: number
    p90: number
    p95: number
    p99: number
  }
}

export class PerformanceMonitor {
  private metrics = new Map<string, PerformanceMetrics>()
  private history: PerformanceReport[] = []
  private maxHistorySize = 10000
  private windowSize = 300000 // 5 minutes

  /**
   * Start monitoring an operation
   */
  startOperation(
    operationId: string,
    operation: string,
    provider: string,
    metadata?: Record<string, any>
  ): void {
    this.metrics.set(operationId, {
      operationId,
      operation,
      provider,
      startTime: performance.now(),
      success: false,
      metadata
    })
  }

  /**
   * End monitoring an operation
   */
  endOperation(
    operationId: string,
    success: boolean = true,
    error?: string
  ): PerformanceReport | null {
    const metrics = this.metrics.get(operationId)
    if (!metrics) return null

    metrics.endTime = performance.now()
    metrics.duration = metrics.endTime - metrics.startTime
    metrics.success = success
    metrics.error = error

    const report: PerformanceReport = {
      operationId: metrics.operationId,
      operation: metrics.operation,
      provider: metrics.provider,
      duration: metrics.duration,
      success: metrics.success,
      error: metrics.error,
      timestamp: new Date().toISOString()
    }

    this.history.push(report)
    this.metrics.delete(operationId)

    // Maintain history size
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize / 2)
    }

    return report
  }

  /**
   * Get performance statistics
   */
  getStats(
    filters?: {
      provider?: string
      operation?: string
      timeWindow?: number
    }
  ): PerformanceStats {
    const cutoff = Date.now() - (filters?.timeWindow || this.windowSize)
    
    let relevantReports = this.history.filter(
      report => new Date(report.timestamp).getTime() > cutoff
    )

    if (filters?.provider) {
      relevantReports = relevantReports.filter(r => r.provider === filters.provider)
    }

    if (filters?.operation) {
      relevantReports = relevantReports.filter(r => r.operation === filters.operation)
    }

    if (relevantReports.length === 0) {
      return {
        averageLatency: 0,
        minLatency: 0,
        maxLatency: 0,
        successRate: 0,
        errorRate: 0,
        throughput: 0,
        percentiles: { p50: 0, p90: 0, p95: 0, p99: 0 }
      }
    }

    // Calculate metrics
    const latencies = relevantReports.map(r => r.duration).sort((a, b) => a - b)
    const successCount = relevantReports.filter(r => r.success).length
    const totalCount = relevantReports.length

    return {
      averageLatency: latencies.reduce((sum, l) => sum + l, 0) / latencies.length,
      minLatency: latencies[0],
      maxLatency: latencies[latencies.length - 1],
      successRate: successCount / totalCount,
      errorRate: (totalCount - successCount) / totalCount,
      throughput: totalCount / ((filters?.timeWindow || this.windowSize) / 1000), // per second
      percentiles: {
        p50: this.getPercentile(latencies, 50),
        p90: this.getPercentile(latencies, 90),
        p95: this.getPercentile(latencies, 95),
        p99: this.getPercentile(latencies, 99)
      }
    }
  }

  /**
   * Get performance by provider
   */
  getStatsByProvider(): Record<string, PerformanceStats> {
    const providers = new Set(this.history.map(r => r.provider))
    const stats: Record<string, PerformanceStats> = {}

    for (const provider of providers) {
      stats[provider] = this.getStats({ provider })
    }

    return stats
  }

  /**
   * Get performance by operation
   */
  getStatsByOperation(): Record<string, PerformanceStats> {
    const operations = new Set(this.history.map(r => r.operation))
    const stats: Record<string, PerformanceStats> = {}

    for (const operation of operations) {
      stats[operation] = this.getStats({ operation })
    }

    return stats
  }

  /**
   * Get performance trends
   */
  getTrends(
    interval: 'minute' | 'hour' | 'day' = 'hour',
    limit: number = 24
  ): Array<{
    timestamp: string
    stats: PerformanceStats
  }> {
    const intervalMs = {
      minute: 60000,
      hour: 3600000,
      day: 86400000
    }[interval]

    const now = Date.now()
    const trends: Array<{ timestamp: string; stats: PerformanceStats }> = []

    for (let i = 0; i < limit; i++) {
      const endTime = now - (i * intervalMs)
      const startTime = endTime - intervalMs

      const stats = this.getStats({ timeWindow: now - startTime })
      
      trends.unshift({
        timestamp: new Date(endTime).toISOString(),
        stats
      })
    }

    return trends
  }

  /**
   * Get error analysis
   */
  getErrorAnalysis(): {
    totalErrors: number
    errorsByType: Record<string, number>
    errorsByProvider: Record<string, number>
    commonErrors: Array<{ error: string; count: number }>
  } {
    const errors = this.history.filter(r => !r.success && r.error)
    const errorCounts = new Map<string, number>()
    const errorsByProvider: Record<string, number> = {}

    for (const report of errors) {
      if (report.error) {
        errorCounts.set(report.error, (errorCounts.get(report.error) || 0) + 1)
        errorsByProvider[report.provider] = (errorsByProvider[report.provider] || 0) + 1
      }
    }

    // Get common errors
    const commonErrors = Array.from(errorCounts.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Categorize errors
    const errorsByType: Record<string, number> = {
      timeout: 0,
      rateLimit: 0,
      authentication: 0,
      network: 0,
      other: 0
    }

    for (const [error, count] of errorCounts) {
      if (error.includes('timeout')) errorsByType.timeout += count
      else if (error.includes('rate limit')) errorsByType.rateLimit += count
      else if (error.includes('auth') || error.includes('401')) errorsByType.authentication += count
      else if (error.includes('network')) errorsByType.network += count
      else errorsByType.other += count
    }

    return {
      totalErrors: errors.length,
      errorsByType,
      errorsByProvider,
      commonErrors
    }
  }

  /**
   * Get slow operations
   */
  getSlowOperations(threshold?: number): PerformanceReport[] {
    const defaultThreshold = this.getStats().percentiles.p95
    const slowThreshold = threshold || defaultThreshold || 5000

    return this.history
      .filter(r => r.duration > slowThreshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 100)
  }

  /**
   * Calculate percentile
   */
  private getPercentile(values: number[], percentile: number): number {
    const index = Math.ceil((percentile / 100) * values.length) - 1
    return values[Math.max(0, index)]
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.history = []
    this.metrics.clear()
  }

  /**
   * Export performance data
   */
  exportData(): {
    history: PerformanceReport[]
    stats: PerformanceStats
    statsByProvider: Record<string, PerformanceStats>
    statsByOperation: Record<string, PerformanceStats>
    errorAnalysis: ReturnType<typeof this.getErrorAnalysis>
  } {
    return {
      history: this.history,
      stats: this.getStats(),
      statsByProvider: this.getStatsByProvider(),
      statsByOperation: this.getStatsByOperation(),
      errorAnalysis: this.getErrorAnalysis()
    }
  }

  /**
   * Get active operations
   */
  getActiveOperations(): PerformanceMetrics[] {
    return Array.from(this.metrics.values())
  }

  /**
   * Check health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy'
    issues: string[]
  } {
    const stats = this.getStats()
    const issues: string[] = []

    // Check success rate
    if (stats.successRate < 0.95) {
      issues.push(`Low success rate: ${(stats.successRate * 100).toFixed(1)}%`)
    }

    // Check latency
    if (stats.p95 > 5000) {
      issues.push(`High P95 latency: ${stats.p95.toFixed(0)}ms`)
    }

    // Check throughput
    if (stats.throughput < 0.1) {
      issues.push(`Low throughput: ${stats.throughput.toFixed(2)} req/s`)
    }

    const status = issues.length === 0 ? 'healthy' : 
                  issues.length === 1 ? 'degraded' : 'unhealthy'

    return { status, issues }
  }
}