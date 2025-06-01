import { AIUsageStats, ProviderStats, ModelStats, ErrorStats } from '../types'

interface AnalyticsEvent {
  timestamp: Date
  type: 'request' | 'success' | 'error' | 'cache_hit' | 'rate_limit'
  provider: string
  operation: string
  model?: string
  tokens?: {
    prompt: number
    completion: number
    total: number
  }
  cost?: number
  latency?: number
  error?: string
  metadata?: Record<string, any>
}

interface UsageTrend {
  timestamp: string
  requests: number
  tokens: number
  cost: number
  errors: number
}

export class Analytics {
  private events: AnalyticsEvent[] = []
  private maxEvents = 100000
  private stats: AIUsageStats = {
    tokensUsed: 0,
    requestsCount: 0,
    costEstimate: 0,
    lastReset: new Date(),
    byProvider: {},
    byModel: {},
    byCapability: {},
    errors: []
  }

  /**
   * Track an analytics event
   */
  trackEvent(event: Omit<AnalyticsEvent, 'timestamp'>): void {
    const fullEvent: AnalyticsEvent = {
      ...event,
      timestamp: new Date()
    }

    this.events.push(fullEvent)

    // Update statistics
    this.updateStats(fullEvent)

    // Maintain event size
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents / 2)
    }
  }

  /**
   * Update statistics based on event
   */
  private updateStats(event: AnalyticsEvent): void {
    // Update global stats
    if (event.type === 'success') {
      this.stats.requestsCount++
      
      if (event.tokens) {
        this.stats.tokensUsed += event.tokens.total
      }
      
      if (event.cost) {
        this.stats.costEstimate += event.cost
      }
    }

    // Update provider stats
    if (!this.stats.byProvider[event.provider]) {
      this.stats.byProvider[event.provider] = {
        requests: 0,
        tokens: 0,
        cost: 0,
        averageLatency: 0,
        errorRate: 0
      }
    }

    const providerStats = this.stats.byProvider[event.provider]
    
    if (event.type === 'success' || event.type === 'error') {
      providerStats.requests++
    }

    if (event.type === 'success') {
      if (event.tokens) {
        providerStats.tokens += event.tokens.total
      }
      if (event.cost) {
        providerStats.cost += event.cost
      }
      if (event.latency) {
        // Update average latency
        const prevTotal = providerStats.averageLatency * (providerStats.requests - 1)
        providerStats.averageLatency = (prevTotal + event.latency) / providerStats.requests
      }
    }

    if (event.type === 'error') {
      providerStats.errorRate = this.calculateErrorRate(event.provider)
    }

    // Update model stats
    if (event.model) {
      if (!this.stats.byModel[event.model]) {
        this.stats.byModel[event.model] = {
          requests: 0,
          tokens: 0,
          inputTokens: 0,
          outputTokens: 0,
          cost: 0
        }
      }

      const modelStats = this.stats.byModel[event.model]
      
      if (event.type === 'success') {
        modelStats.requests++
        
        if (event.tokens) {
          modelStats.tokens += event.tokens.total
          modelStats.inputTokens += event.tokens.prompt
          modelStats.outputTokens += event.tokens.completion
        }
        
        if (event.cost) {
          modelStats.cost += event.cost
        }
      }
    }

    // Update capability stats
    if (!this.stats.byCapability[event.operation]) {
      this.stats.byCapability[event.operation] = 0
    }
    
    if (event.type === 'success') {
      this.stats.byCapability[event.operation]++
    }

    // Update error stats
    if (event.type === 'error' && event.error) {
      this.updateErrorStats(event)
    }
  }

  /**
   * Calculate error rate for a provider
   */
  private calculateErrorRate(provider: string): number {
    const providerEvents = this.events.filter(e => e.provider === provider)
    const errors = providerEvents.filter(e => e.type === 'error').length
    const total = providerEvents.filter(e => 
      e.type === 'success' || e.type === 'error'
    ).length

    return total > 0 ? errors / total : 0
  }

  /**
   * Update error statistics
   */
  private updateErrorStats(event: AnalyticsEvent): void {
    if (!event.error) return

    const existingError = this.stats.errors?.find(
      e => e.error === event.error && e.provider === event.provider
    )

    if (existingError) {
      existingError.count++
    } else {
      this.stats.errors?.push({
        timestamp: event.timestamp,
        provider: event.provider,
        error: event.error,
        count: 1
      })
    }

    // Keep only recent errors
    if (this.stats.errors && this.stats.errors.length > 100) {
      this.stats.errors = this.stats.errors
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 50)
    }
  }

  /**
   * Get current usage statistics
   */
  getStats(): AIUsageStats {
    return {
      ...this.stats,
      byProvider: { ...this.stats.byProvider },
      byModel: { ...this.stats.byModel },
      byCapability: { ...this.stats.byCapability },
      errors: [...(this.stats.errors || [])]
    }
  }

  /**
   * Get usage trends over time
   */
  getTrends(
    interval: 'hour' | 'day' | 'week' | 'month' = 'day',
    limit: number = 30
  ): UsageTrend[] {
    const intervalMs = {
      hour: 3600000,
      day: 86400000,
      week: 604800000,
      month: 2592000000
    }[interval]

    const now = Date.now()
    const trends: UsageTrend[] = []

    for (let i = 0; i < limit; i++) {
      const endTime = now - (i * intervalMs)
      const startTime = endTime - intervalMs

      const periodEvents = this.events.filter(e => {
        const eventTime = e.timestamp.getTime()
        return eventTime >= startTime && eventTime < endTime
      })

      const successEvents = periodEvents.filter(e => e.type === 'success')

      trends.unshift({
        timestamp: new Date(endTime).toISOString(),
        requests: successEvents.length,
        tokens: successEvents.reduce((sum, e) => sum + (e.tokens?.total || 0), 0),
        cost: successEvents.reduce((sum, e) => sum + (e.cost || 0), 0),
        errors: periodEvents.filter(e => e.type === 'error').length
      })
    }

    return trends
  }

  /**
   * Get top operations by usage
   */
  getTopOperations(limit: number = 10): Array<{
    operation: string
    count: number
    percentage: number
  }> {
    const total = Object.values(this.stats.byCapability).reduce((sum, count) => sum + count, 0)
    
    return Object.entries(this.stats.byCapability)
      .map(([operation, count]) => ({
        operation,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
  }

  /**
   * Get cost breakdown
   */
  getCostBreakdown(): {
    total: number
    byProvider: Record<string, number>
    byModel: Record<string, number>
    byOperation: Record<string, number>
  } {
    const byOperation: Record<string, number> = {}

    // Calculate cost by operation
    this.events
      .filter(e => e.type === 'success' && e.cost)
      .forEach(e => {
        byOperation[e.operation] = (byOperation[e.operation] || 0) + (e.cost || 0)
      })

    return {
      total: this.stats.costEstimate,
      byProvider: Object.entries(this.stats.byProvider).reduce((acc, [provider, stats]) => {
        acc[provider] = stats.cost
        return acc
      }, {} as Record<string, number>),
      byModel: Object.entries(this.stats.byModel).reduce((acc, [model, stats]) => {
        acc[model] = stats.cost
        return acc
      }, {} as Record<string, number>),
      byOperation
    }
  }

  /**
   * Get provider comparison
   */
  getProviderComparison(): Array<{
    provider: string
    stats: ProviderStats
    rank: {
      speed: number
      reliability: number
      cost: number
      overall: number
    }
  }> {
    const providers = Object.entries(this.stats.byProvider).map(([provider, stats]) => ({
      provider,
      stats
    }))

    // Rank by different metrics
    const speedRanked = [...providers].sort((a, b) => a.stats.averageLatency - b.stats.averageLatency)
    const reliabilityRanked = [...providers].sort((a, b) => a.stats.errorRate - b.stats.errorRate)
    const costRanked = [...providers].sort((a, b) => 
      (a.stats.cost / a.stats.tokens) - (b.stats.cost / b.stats.tokens)
    )

    return providers.map(({ provider, stats }) => {
      const speedRank = speedRanked.findIndex(p => p.provider === provider) + 1
      const reliabilityRank = reliabilityRanked.findIndex(p => p.provider === provider) + 1
      const costRank = costRanked.findIndex(p => p.provider === provider) + 1
      
      return {
        provider,
        stats,
        rank: {
          speed: speedRank,
          reliability: reliabilityRank,
          cost: costRank,
          overall: Math.round((speedRank + reliabilityRank + costRank) / 3)
        }
      }
    })
  }

  /**
   * Get recommendations based on usage
   */
  getRecommendations(): string[] {
    const recommendations: string[] = []
    const stats = this.getStats()
    const providerComparison = this.getProviderComparison()

    // Cost optimization
    if (stats.costEstimate > 100) {
      recommendations.push('Consider using cheaper models for simple tasks to reduce costs')
    }

    // Provider recommendations
    providerComparison.forEach(({ provider, stats, rank }) => {
      if (stats.errorRate > 0.05) {
        recommendations.push(`${provider} has high error rate (${(stats.errorRate * 100).toFixed(1)}%). Consider using fallback providers.`)
      }
      
      if (stats.averageLatency > 5000) {
        recommendations.push(`${provider} has high latency. Enable caching for frequently used prompts.`)
      }
    })

    // Cache recommendations
    const cacheHits = this.events.filter(e => e.type === 'cache_hit').length
    const totalRequests = stats.requestsCount
    const cacheHitRate = totalRequests > 0 ? cacheHits / totalRequests : 0

    if (cacheHitRate < 0.2 && totalRequests > 100) {
      recommendations.push('Low cache hit rate. Consider increasing cache TTL or size.')
    }

    // Rate limit recommendations
    const rateLimitEvents = this.events.filter(e => e.type === 'rate_limit').length
    if (rateLimitEvents > 10) {
      recommendations.push('Frequent rate limiting detected. Implement request queuing or upgrade API limits.')
    }

    return recommendations
  }

  /**
   * Reset statistics
   */
  reset(): void {
    this.stats = {
      tokensUsed: 0,
      requestsCount: 0,
      costEstimate: 0,
      lastReset: new Date(),
      byProvider: {},
      byModel: {},
      byCapability: {},
      errors: []
    }
    this.events = []
  }

  /**
   * Export analytics data
   */
  exportData(): {
    stats: AIUsageStats
    trends: UsageTrend[]
    topOperations: ReturnType<typeof this.getTopOperations>
    costBreakdown: ReturnType<typeof this.getCostBreakdown>
    providerComparison: ReturnType<typeof this.getProviderComparison>
    recommendations: string[]
  } {
    return {
      stats: this.getStats(),
      trends: this.getTrends(),
      topOperations: this.getTopOperations(),
      costBreakdown: this.getCostBreakdown(),
      providerComparison: this.getProviderComparison(),
      recommendations: this.getRecommendations()
    }
  }
}