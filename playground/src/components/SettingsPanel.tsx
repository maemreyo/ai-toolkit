import React, { useState, useEffect } from 'react'
import {
  Key,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Settings,
  Zap,
  Database,
  Activity,
  Shield
} from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '../lib/utils'

interface APIKeys {
  openai: string
  anthropic: string
  google: string
}

interface ConfigSettings {
  provider: 'openai' | 'anthropic' | 'google' | 'mock'
  model: string
  cacheEnabled: boolean
  cacheTTL: number
  rateLimitRPM: number
  maxRetries: number
  timeout: number
  debug: boolean
}

const providerModels = {
  openai: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-3.5-turbo-16k'],
  anthropic: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
  google: ['gemini-pro', 'gemini-pro-vision', 'palm-2'],
  mock: ['mock-model-v1']
}

const SettingsPanel: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<APIKeys>({
    openai: '',
    anthropic: '',
    google: ''
  })

  const [config, setConfig] = useState<ConfigSettings>({
    provider: 'mock',
    model: 'mock-model-v1',
    cacheEnabled: true,
    cacheTTL: 600000,
    rateLimitRPM: 60,
    maxRetries: 3,
    timeout: 30000,
    debug: true
  })

  const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({})
  const [isLoading, setIsLoading] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<{ [key: string]: 'idle' | 'testing' | 'success' | 'error' }>({})

  // Load saved settings on mount
  useEffect(() => {
    const savedKeys = localStorage.getItem('ai-toolkit-keys')
    const savedConfig = localStorage.getItem('ai-toolkit-config')

    if (savedKeys) {
      try {
        setApiKeys(JSON.parse(savedKeys))
      } catch (e) {
        console.warn('Failed to load saved API keys')
      }
    }

    if (savedConfig) {
      try {
        setConfig(JSON.parse(savedConfig))
      } catch (e) {
        console.warn('Failed to load saved config')
      }
    }
  }, [])

  const handleKeyChange = (provider: keyof APIKeys, value: string) => {
    setApiKeys(prev => ({ ...prev, [provider]: value }))
    setConnectionStatus(prev => ({ ...prev, [provider]: 'idle' }))
  }

  const handleConfigChange = (key: keyof ConfigSettings, value: any) => {
    setConfig(prev => {
      const newConfig = { ...prev, [key]: value }

      // Auto-update model when provider changes
      if (key === 'provider') {
        newConfig.model = providerModels[value][0]
      }

      return newConfig
    })
  }

  const toggleKeyVisibility = (provider: string) => {
    setShowKeys(prev => ({ ...prev, [provider]: !prev[provider] }))
  }

  const testConnection = async (provider: keyof APIKeys) => {
    if (!apiKeys[provider]) {
      toast.error(`Please enter ${provider.toUpperCase()} API key first`)
      return
    }

    setConnectionStatus(prev => ({ ...prev, [provider]: 'testing' }))

    try {
      // Simulate API test - in real implementation, you would test with actual API
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Mock success for demo
      setConnectionStatus(prev => ({ ...prev, [provider]: 'success' }))
      toast.success(`${provider.toUpperCase()} connection successful!`)
    } catch (error) {
      setConnectionStatus(prev => ({ ...prev, [provider]: 'error' }))
      toast.error(`${provider.toUpperCase()} connection failed`)
    }
  }

  const saveSettings = async () => {
    setIsLoading(true)

    try {
      // Save to localStorage
      localStorage.setItem('ai-toolkit-keys', JSON.stringify(apiKeys))
      localStorage.setItem('ai-toolkit-config', JSON.stringify(config))

      // Simulate saving delay
      await new Promise(resolve => setTimeout(resolve, 1000))

      toast.success('Settings saved successfully!')
    } catch (error) {
      toast.error('Failed to save settings')
    } finally {
      setIsLoading(false)
    }
  }

  const resetSettings = () => {
    setApiKeys({ openai: '', anthropic: '', google: '' })
    setConfig({
      provider: 'mock',
      model: 'mock-model-v1',
      cacheEnabled: true,
      cacheTTL: 600000,
      rateLimitRPM: 60,
      maxRetries: 3,
      timeout: 30000,
      debug: true
    })
    setConnectionStatus({})
    localStorage.removeItem('ai-toolkit-keys')
    localStorage.removeItem('ai-toolkit-config')
    toast.success('Settings reset to defaults')
  }

  const getConnectionIcon = (status: string) => {
    switch (status) {
      case 'testing':
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Settings className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">AI Provider Settings</h1>
          <p className="text-muted-foreground">Configure your API keys and provider preferences</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* API Keys Section */}
        <div className="space-y-6">
          <div className="card">
            <div className="card-header">
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                <h3 className="card-title">API Keys</h3>
              </div>
              <p className="card-description">
                Enter your API keys for different AI providers. Keys are stored locally.
              </p>
            </div>
            <div className="card-content space-y-4">
              {(Object.keys(apiKeys) as Array<keyof APIKeys>).map(provider => (
                <div key={provider} className="space-y-2">
                  <label className="text-sm font-medium capitalize flex items-center gap-2">
                    {provider.toUpperCase()}
                    {getConnectionIcon(connectionStatus[provider] || 'idle')}
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showKeys[provider] ? 'text' : 'password'}
                        value={apiKeys[provider]}
                        onChange={(e) => handleKeyChange(provider, e.target.value)}
                        placeholder={`Enter ${provider.toUpperCase()} API key`}
                        className="input pr-20"
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                        <button
                          type="button"
                          onClick={() => toggleKeyVisibility(provider)}
                          className="btn-ghost btn-sm"
                        >
                          {showKeys[provider] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => testConnection(provider)}
                      disabled={!apiKeys[provider] || connectionStatus[provider] === 'testing'}
                      className="btn-outline btn-sm"
                    >
                      Test
                    </button>
                  </div>
                  {provider === 'openai' && (
                    <p className="text-xs text-muted-foreground">
                      Get your key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener" className="text-primary hover:underline">OpenAI Platform</a>
                    </p>
                  )}
                  {provider === 'anthropic' && (
                    <p className="text-xs text-muted-foreground">
                      Get your key from <a href="https://console.anthropic.com/" target="_blank" rel="noopener" className="text-primary hover:underline">Anthropic Console</a>
                    </p>
                  )}
                  {provider === 'google' && (
                    <p className="text-xs text-muted-foreground">
                      Get your key from <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener" className="text-primary hover:underline">Google AI Studio</a>
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Configuration Section */}
        <div className="space-y-6">
          <div className="card">
            <div className="card-header">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                <h3 className="card-title">Provider Configuration</h3>
              </div>
              <p className="card-description">
                Choose your default provider and model settings
              </p>
            </div>
            <div className="card-content space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Default Provider</label>
                <select
                  value={config.provider}
                  onChange={(e) => handleConfigChange('provider', e.target.value as ConfigSettings['provider'])}
                  className="input"
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="google">Google AI</option>
                  <option value="mock">Mock (for testing)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Model</label>
                <select
                  value={config.model}
                  onChange={(e) => handleConfigChange('model', e.target.value)}
                  className="input"
                >
                  {providerModels[config.provider].map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Timeout (ms)</label>
                <input
                  type="number"
                  value={config.timeout}
                  onChange={(e) => handleConfigChange('timeout', parseInt(e.target.value))}
                  className="input"
                  min="5000"
                  max="120000"
                  step="1000"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Max Retries</label>
                <input
                  type="number"
                  value={config.maxRetries}
                  onChange={(e) => handleConfigChange('maxRetries', parseInt(e.target.value))}
                  className="input"
                  min="0"
                  max="10"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Debug Mode</label>
                <button
                  onClick={() => handleConfigChange('debug', !config.debug)}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    config.debug ? "bg-primary" : "bg-gray-200"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      config.debug ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                <h3 className="card-title">Performance Settings</h3>
              </div>
            </div>
            <div className="card-content space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Enable Caching</label>
                <button
                  onClick={() => handleConfigChange('cacheEnabled', !config.cacheEnabled)}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    config.cacheEnabled ? "bg-primary" : "bg-gray-200"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      config.cacheEnabled ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Cache TTL (ms)</label>
                <input
                  type="number"
                  value={config.cacheTTL}
                  onChange={(e) => handleConfigChange('cacheTTL', parseInt(e.target.value))}
                  className="input"
                  min="60000"
                  max="86400000"
                  step="60000"
                  disabled={!config.cacheEnabled}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Rate Limit (requests/min)</label>
                <input
                  type="number"
                  value={config.rateLimitRPM}
                  onChange={(e) => handleConfigChange('rateLimitRPM', parseInt(e.target.value))}
                  className="input"
                  min="1"
                  max="1000"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-6 border-t">
        <button
          onClick={resetSettings}
          className="btn-outline"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Reset to Defaults
        </button>

        <button
          onClick={saveSettings}
          disabled={isLoading}
          className="btn-primary"
        >
          {isLoading ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Settings
        </button>
      </div>

      {/* Security Notice */}
      <div className="card bg-muted/50">
        <div className="card-content">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-amber-500 mt-0.5" />
            <div>
              <h4 className="font-medium text-sm">Security Notice</h4>
              <p className="text-sm text-muted-foreground mt-1">
                API keys are stored locally in your browser and are not sent to any external servers except the respective AI providers.
                For production use, consider implementing proper key management and environment variables.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPanel