import React, { useState, useEffect } from 'react'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  Clock,
  Zap,
  Users,
  Database,
  RefreshCw,
  Download,
  Calendar,
  Target,
  AlertTriangle,
  CheckCircle,
  Settings,
  Eye,
  Filter
} from 'lucide-react'
import { useAI } from '@matthew.ngo/ai-toolkit/react'
import { cn, formatCurrency, formatNumber, formatDuration, formatPercentage } from '../lib/utils'

interface MetricCard {
  title: string
  value: string
  change: number
  changeLabel: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}

interface ChartData {
  name: string
  value: number
  change?: number
}

interface ProviderMetrics {
  name: string
  requests: number
  tokens: number
  cost: number
  latency: number
  errorRate: number
  availability: number
}

interface UsagePattern {
  hour: number
  requests: number
  tokens: number
}

const Analytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h')
  const [selectedMetric, setSelectedMetric] = useState<'requests' | 'tokens' | 'cost' | 'latency'>('requests')
  const [isLoading, setIsLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const { stats } = useAI()

  // Mock analytics data - in real implementation, this would come from your analytics backend
  const [analyticsData, setAnalyticsData] = useState({
    metrics: {
      totalRequests: 1247,
      totalTokens: 892340,
      totalCost: 89.23,
      averageLatency: 1240,
      errorRate: 0.023,
      cacheHitRate: 0.67,
      activeUsers: 34,
      uptime: 0.998
    },
    trends: {
      requests: { current: 1247, previous: 1156, change: 7.9 },
      tokens: { current: 892340, previous: 834201, change: 7.0 },
      cost: { current: 89.23, previous: 82.15, change: 8.6 },
      latency: { current: 1240, previous: 1389, change: -10.7 }
    },
    providers: [
      { name: 'OpenAI', requests: 823, tokens: 623450, cost: 62.34, latency: 1180, errorRate: 0.015, availability: 99.9 },
      { name: 'Anthropic', requests: 312, tokens: 187234, cost: 18.73, latency: 1350, errorRate: 0.028, availability: 99.8 },
      { name: 'Google', requests: 98, tokens: 67123, cost: 6.71, latency: 980, errorRate: 0.041, availability: 99.5 },
      { name: 'Mock', requests: 14, tokens: 14533, cost: 1.45, latency: 120, errorRate: 0.0, availability: 100.0 }
    ] as ProviderMetrics[],
    operations: [
      { name: 'Text Generation', value: 567, change: 12.3 },
      { name: 'Chat', value: 342, change: 8.7 },
      { name: 'Code Generation', value: 189, change: -2.1 },
      { name: 'Summarization', value: 89, change: 15.6 },
      { name: 'Classification', value: 60, change: 22.4 }
    ],
    usage: Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      requests: Math.floor(Math.random() * 100) + 20,
      tokens: Math.floor(Math.random() * 50000) + 10000
    })) as UsagePattern[],
    errors: [
      { timestamp: new Date(Date.now() - 3600000), provider: 'OpenAI', error: 'Rate limit exceeded', count: 3 },
      { timestamp: new Date(Date.now() - 7200000), provider: 'Anthropic', error: 'API timeout', count: 1 },
      { timestamp: new Date(Date.now() - 10800000), provider: 'Google', error: 'Invalid request', count: 2 }
    ]
  })

  const metricCards: MetricCard[] = [
    {
      title: 'Total Requests',
      value: formatNumber(analyticsData.metrics.totalRequests),
      change: analyticsData.trends.requests.change,
      changeLabel: 'vs last period',
      icon: Activity,
      color: 'text-blue-600'
    },
    {
      title: 'Total Tokens',
      value: formatNumber(analyticsData.metrics.totalTokens),
      change: analyticsData.trends.tokens.change,
      changeLabel: 'vs last period',
      icon: Database,
      color: 'text-green-600'
    },
    {
      title: 'Total Cost',
      value: formatCurrency(analyticsData.metrics.totalCost),
      change: analyticsData.trends.cost.change,
      changeLabel: 'vs last period',
      icon: DollarSign,
      color: 'text-purple-600'
    },
    {
      title: 'Avg Latency',
      value: formatDuration(analyticsData.metrics.averageLatency),
      change: analyticsData.trends.latency.change,
      changeLabel: 'vs last period',
      icon: Clock,
      color: 'text-orange-600'
    }
  ]

  const handleRefresh = async () => {
    setIsLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Update with new mock data
    setAnalyticsData(prev => ({
      ...prev,
      metrics: {
        ...prev.metrics,
        totalRequests: prev.metrics.totalRequests + Math.floor(Math.random() * 50),
        totalTokens: prev.metrics.totalTokens + Math.floor(Math.random() * 10000),
        totalCost: prev.metrics.totalCost + Math.random() * 5
      }
    }))

    setIsLoading(false)
  }

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-600" />
    return <Activity className="h-4 w-4 text-gray-600" />
  }

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600'
    if (change < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  const getHealthStatus = (errorRate: number, availability: number) => {
    if (errorRate < 0.01 && availability > 99.5) return { status: 'healthy', color: 'text-green-600', icon: CheckCircle }
    if (errorRate < 0.05 && availability > 99.0) return { status: 'warning', color: 'text-yellow-600', icon: AlertTriangle }
    return { status: 'error', color: 'text-red-600', icon: AlertTriangle }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground">Monitor usage, performance, and costs</p>
          </div>
        </div>

        <div className="flex gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="input"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="btn-outline"
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </button>

          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="btn-outline"
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </button>

          <button className="btn-outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((metric, index) => (
          <div key={index} className="card">
            <div className="card-content p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{metric.title}</p>
                  <p className="text-2xl font-bold">{metric.value}</p>
                </div>
                <metric.icon className={cn("h-8 w-8", metric.color)} />
              </div>
              <div className="flex items-center mt-4">
                {getChangeIcon(metric.change)}
                <span className={cn("text-sm font-medium ml-1", getChangeColor(metric.change))}>
                  {metric.change > 0 ? '+' : ''}{metric.change.toFixed(1)}%
                </span>
                <span className="text-sm text-muted-foreground ml-2">{metric.changeLabel}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Usage Chart */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <h3 className="card-title">Usage Over Time</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedMetric('requests')}
                    className={cn(
                      "btn-sm text-xs",
                      selectedMetric === 'requests' ? "btn-primary" : "btn-outline"
                    )}
                  >
                    Requests
                  </button>
                  <button
                    onClick={() => setSelectedMetric('tokens')}
                    className={cn(
                      "btn-sm text-xs",
                      selectedMetric === 'tokens' ? "btn-primary" : "btn-outline"
                    )}
                  >
                    Tokens
                  </button>
                  <button
                    onClick={() => setSelectedMetric('cost')}
                    className={cn(
                      "btn-sm text-xs",
                      selectedMetric === 'cost' ? "btn-primary" : "btn-outline"
                    )}
                  >
                    Cost
                  </button>
                </div>
              </div>
            </div>
            <div className="card-content">
              <div className="h-64 flex items-end justify-between gap-2">
                {analyticsData.usage.map((point, index) => {
                  const value = selectedMetric === 'requests' ? point.requests :
                               selectedMetric === 'tokens' ? point.tokens / 1000 :
                               point.requests * 0.1 // Mock cost calculation
                  const maxValue = Math.max(...analyticsData.usage.map(p =>
                    selectedMetric === 'requests' ? p.requests :
                    selectedMetric === 'tokens' ? p.tokens / 1000 :
                    p.requests * 0.1
                  ))
                  const height = (value / maxValue) * 100

                  return (
                    <div key={index} className="flex flex-col items-center flex-1">
                      <div
                        className="w-full bg-primary rounded-t transition-all hover:bg-primary/80"
                        style={{ height: `${height}%` }}
                        title={`${point.hour}:00 - ${selectedMetric}: ${
                          selectedMetric === 'requests' ? formatNumber(value) :
                          selectedMetric === 'tokens' ? formatNumber(value * 1000) :
                          formatCurrency(value)
                        }`}
                      />
                      {index % 4 === 0 && (
                        <span className="text-xs text-muted-foreground mt-1">
                          {point.hour}:00
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Top Operations */}
        <div className="space-y-4">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Top Operations</h3>
              <p className="card-description">Most used AI operations</p>
            </div>
            <div className="card-content space-y-3">
              {analyticsData.operations.map((operation, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      index === 0 ? "bg-blue-500" :
                      index === 1 ? "bg-green-500" :
                      index === 2 ? "bg-purple-500" :
                      index === 3 ? "bg-orange-500" : "bg-gray-500"
                    )} />
                    <span className="text-sm font-medium">{operation.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">{formatNumber(operation.value)}</div>
                    <div className={cn(
                      "text-xs",
                      getChangeColor(operation.change)
                    )}>
                      {operation.change > 0 ? '+' : ''}{operation.change.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System Health */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">System Health</h3>
            </div>
            <div className="card-content space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Error Rate:</span>
                  <div className="font-medium">{formatPercentage(analyticsData.metrics.errorRate)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Cache Hit Rate:</span>
                  <div className="font-medium">{formatPercentage(analyticsData.metrics.cacheHitRate)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Active Users:</span>
                  <div className="font-medium">{analyticsData.metrics.activeUsers}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Uptime:</span>
                  <div className="font-medium">{formatPercentage(analyticsData.metrics.uptime)}</div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-sm">Recent Errors</h4>
                <div className="space-y-2">
                  {analyticsData.errors.slice(0, 3).map((error, index) => (
                    <div key={index} className="text-xs p-2 bg-muted/50 rounded">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{error.provider}</span>
                        <span className="text-muted-foreground">
                          {error.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-muted-foreground">{error.error}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Provider Performance */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Provider Performance</h3>
          <p className="card-description">Detailed metrics for each AI provider</p>
        </div>
        <div className="card-content">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Provider</th>
                  <th className="text-left p-2">Requests</th>
                  <th className="text-left p-2">Tokens</th>
                  <th className="text-left p-2">Cost</th>
                  <th className="text-left p-2">Latency</th>
                  <th className="text-left p-2">Error Rate</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {analyticsData.providers.map((provider, index) => {
                  const health = getHealthStatus(provider.errorRate, provider.availability)
                  return (
                    <tr key={index} className="border-b hover:bg-muted/50">
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-3 h-3 rounded-full",
                            provider.name === 'OpenAI' ? "bg-green-500" :
                            provider.name === 'Anthropic' ? "bg-orange-500" :
                            provider.name === 'Google' ? "bg-blue-500" : "bg-gray-500"
                          )} />
                          <span className="font-medium">{provider.name}</span>
                        </div>
                      </td>
                      <td className="p-2">{formatNumber(provider.requests)}</td>
                      <td className="p-2">{formatNumber(provider.tokens)}</td>
                      <td className="p-2">{formatCurrency(provider.cost)}</td>
                      <td className="p-2">{formatDuration(provider.latency)}</td>
                      <td className="p-2">{formatPercentage(provider.errorRate)}</td>
                      <td className="p-2">
                        <div className="flex items-center gap-1">
                          <health.icon className={cn("h-4 w-4", health.color)} />
                          <span className={cn("text-sm", health.color)}>
                            {health.status}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Analytics Settings</h3>
            <p className="card-description">Configure analytics and monitoring preferences</p>
          </div>
          <div className="card-content">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium">Data Collection</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Track Usage</label>
                    <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary">
                      <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Track Performance</label>
                    <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary">
                      <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Track Errors</label>
                    <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary">
                      <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Alerts</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">High Error Rate</label>
                    <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary">
                      <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">High Latency</label>
                    <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200">
                      <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Cost Threshold</label>
                    <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary">
                      <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Analytics