import { AIConfig, AIConfigSchema, AIProviderType } from '../types'

export class ConfigManager {
  private config: AIConfig
  private encryptedKeys = new Map<string, string>()

  constructor(config: Partial<AIConfig>) {
    // Validate and parse config
    this.config = AIConfigSchema.parse(config)
    
    // Handle API keys
    if (this.config.apiKey) {
      this.encryptedKeys.set(this.config.provider, this.encryptApiKey(this.config.apiKey))
    }
    
    if (this.config.apiKeys) {
      Object.entries(this.config.apiKeys).forEach(([provider, key]) => {
        this.encryptedKeys.set(provider, this.encryptApiKey(key))
      })
    }
  }

  getConfig(): AIConfig {
    return { ...this.config }
  }

  getProviderConfig(provider?: AIProviderType) {
    const targetProvider = provider || this.config.provider
    
    return {
      provider: targetProvider,
      apiKey: this.getApiKey(targetProvider),
      model: this.getModel(targetProvider),
      baseUrl: this.config.baseUrl,
      headers: this.config.headers
    }
  }

  getApiKey(provider?: AIProviderType): string | undefined {
    const targetProvider = provider || this.config.provider
    const encryptedKey = this.encryptedKeys.get(targetProvider)
    
    if (encryptedKey) {
      return this.decryptApiKey(encryptedKey)
    }
    
    return undefined
  }

  getModel(provider?: AIProviderType): string | undefined {
    const targetProvider = provider || this.config.provider
    
    if (this.config.models && this.config.models[targetProvider]) {
      return this.config.models[targetProvider]
    }
    
    return this.config.model
  }

  getCacheConfig() {
    return this.config.cache || {
      enabled: true,
      ttl: 600000,
      maxSize: 100,
      strategy: 'lru' as const
    }
  }

  getRateLimitConfig() {
    return this.config.rateLimit || {
      requestsPerMinute: 60,
      strategy: 'sliding-window' as const,
      concurrent: 5
    }
  }

  getRetryConfig() {
    return this.config.retry || {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoff: 'exponential' as const
    }
  }

  getFallbackProviders(): AIProviderType[] {
    return this.config.fallbackProviders || []
  }

  updateConfig(updates: Partial<AIConfig>) {
    const newConfig = { ...this.config, ...updates }
    this.config = AIConfigSchema.parse(newConfig)
    
    // Update encrypted keys if needed
    if (updates.apiKey) {
      this.encryptedKeys.set(this.config.provider, this.encryptApiKey(updates.apiKey))
    }
    
    if (updates.apiKeys) {
      Object.entries(updates.apiKeys).forEach(([provider, key]) => {
        this.encryptedKeys.set(provider, this.encryptApiKey(key))
      })
    }
  }

  // Simple encryption for API keys (in production, use proper encryption)
  private encryptApiKey(key: string): string {
    // This is a simple obfuscation - in production, use proper encryption
    return Buffer.from(key).toString('base64')
  }

  private decryptApiKey(encryptedKey: string): string {
    return Buffer.from(encryptedKey, 'base64').toString('utf-8')
  }

  // Validate provider configuration
  validateProvider(provider: AIProviderType): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    const apiKey = this.getApiKey(provider)
    if (!apiKey && provider !== 'local' && provider !== 'mock') {
      errors.push(`API key required for provider: ${provider}`)
    }
    
    const model = this.getModel(provider)
    if (!model) {
      errors.push(`Model not specified for provider: ${provider}`)
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }

  // Export configuration (without sensitive data)
  exportConfig(): Record<string, any> {
    const { apiKey, apiKeys, ...safeConfig } = this.config
    
    return {
      ...safeConfig,
      hasApiKey: !!apiKey || !!apiKeys,
      configuredProviders: Array.from(this.encryptedKeys.keys())
    }
  }
}