import React, { useState, useRef, useEffect } from 'react'
import {
  Play,
  Square,
  Copy,
  Download,
  RefreshCw,
  Zap,
  Settings,
  FileText,
  Clock,
  DollarSign,
  BarChart3,
  Wand2
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAI } from '@matthew.ngo/ai-toolkit/react'
import { cn, copyToClipboard, downloadFile, formatDuration, formatCurrency } from '../lib/utils'

interface GenerationSettings {
  maxTokens: number
  temperature: number
  topP: number
  presencePenalty: number
  frequencyPenalty: number
  systemPrompt: string
  stream: boolean
}

const TextGeneration: React.FC = () => {
  const [prompt, setPrompt] = useState('')
  const [result, setResult] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [generationStats, setGenerationStats] = useState<{
    tokens: number
    duration: number
    cost: number
  } | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)
  const startTimeRef = useRef<number>(0)

  const [settings, setSettings] = useState<GenerationSettings>({
    maxTokens: 1000,
    temperature: 0.7,
    topP: 1,
    presencePenalty: 0,
    frequencyPenalty: 0,
    systemPrompt: 'You are a helpful AI assistant.',
    stream: false
  })

  const { generateText, generateStream, loading, error, stats } = useAI({
    config: JSON.parse(localStorage.getItem('ai-toolkit-config') || '{}'),
    onError: (err) => {
      toast.error(`Generation failed: ${err.message}`)
      setIsGenerating(false)
    }
  })

  const prompts = [
    "Write a short story about a robot learning to paint",
    "Explain quantum computing in simple terms",
    "Create a marketing plan for a sustainable fashion brand",
    "Write a poem about the beauty of code",
    "Describe the future of artificial intelligence",
    "Explain how to make the perfect cup of coffee",
    "Write a persuasive essay about the importance of space exploration"
  ]

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt')
      return
    }

    setIsGenerating(true)
    setResult('')
    setStreamingText('')
    setGenerationStats(null)
    startTimeRef.current = Date.now()

    try {
      if (settings.stream) {
        // Streaming generation
        let fullText = ''
        const stream = generateStream(prompt, {
          maxTokens: settings.maxTokens,
          temperature: settings.temperature,
          topP: settings.topP,
          presencePenalty: settings.presencePenalty,
          frequencyPenalty: settings.frequencyPenalty,
          systemPrompt: settings.systemPrompt,
        })

        for await (const chunk of stream) {
          if (abortControllerRef.current?.signal.aborted) break
          fullText += chunk
          setStreamingText(fullText)
        }

        setResult(fullText)
      } else {
        // Non-streaming generation
        const response = await generateText(prompt, {
          maxTokens: settings.maxTokens,
          temperature: settings.temperature,
          topP: settings.topP,
          presencePenalty: settings.presencePenalty,
          frequencyPenalty: settings.frequencyPenalty,
          systemPrompt: settings.systemPrompt,
        })

        setResult(response)
      }

      // Calculate stats
      const duration = Date.now() - startTimeRef.current
      const tokens = settings.maxTokens // Approximate, would be real token count in production
      const cost = tokens * 0.0001 // Approximate cost calculation

      setGenerationStats({
        tokens,
        duration,
        cost
      })

      toast.success('Text generated successfully!')
    } catch (err) {
      // Error is handled by the hook
    } finally {
      setIsGenerating(false)
    }
  }

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setIsGenerating(false)
    toast.info('Generation stopped')
  }

  const handleCopy = async () => {
    const textToCopy = result || streamingText
    if (!textToCopy) return

    try {
      await copyToClipboard(textToCopy)
      toast.success('Copied to clipboard!')
    } catch (err) {
      toast.error('Failed to copy text')
    }
  }

  const handleDownload = () => {
    const textToDownload = result || streamingText
    if (!textToDownload) return

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    downloadFile(textToDownload, `generated-text-${timestamp}.txt`)
    toast.success('Text downloaded!')
  }

  const handlePromptSelect = (selectedPrompt: string) => {
    setPrompt(selectedPrompt)
  }

  const handleSettingChange = (key: keyof GenerationSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const displayText = result || streamingText

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Text Generation</h1>
            <p className="text-muted-foreground">Generate text using AI language models</p>
          </div>
        </div>

        <button
          onClick={() => setShowSettings(!showSettings)}
          className="btn-outline"
        >
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Input Section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Prompt</h3>
              <p className="card-description">Enter your text generation prompt</p>
            </div>
            <div className="card-content space-y-4">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter your prompt here..."
                className="textarea min-h-[120px] resize-none"
                disabled={isGenerating}
              />

              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !prompt.trim()}
                    className="btn-primary"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Generate
                      </>
                    )}
                  </button>

                  {isGenerating && (
                    <button
                      onClick={handleStop}
                      className="btn-outline"
                    >
                      <Square className="h-4 w-4 mr-2" />
                      Stop
                    </button>
                  )}
                </div>

                <div className="text-sm text-muted-foreground">
                  {prompt.length} characters
                </div>
              </div>
            </div>
          </div>

          {/* Example Prompts */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Example Prompts</h3>
              <p className="card-description">Click to use these example prompts</p>
            </div>
            <div className="card-content">
              <div className="grid gap-2">
                {prompts.map((examplePrompt, index) => (
                  <button
                    key={index}
                    onClick={() => handlePromptSelect(examplePrompt)}
                    disabled={isGenerating}
                    className="text-left p-3 rounded-md border hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Wand2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{examplePrompt}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Settings Panel */}
        <div className="space-y-4">
          {showSettings && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Generation Settings</h3>
              </div>
              <div className="card-content space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Max Tokens</label>
                  <input
                    type="number"
                    value={settings.maxTokens}
                    onChange={(e) => handleSettingChange('maxTokens', parseInt(e.target.value))}
                    className="input"
                    min="1"
                    max="4000"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Temperature: {settings.temperature}</label>
                  <input
                    type="range"
                    value={settings.temperature}
                    onChange={(e) => handleSettingChange('temperature', parseFloat(e.target.value))}
                    className="w-full"
                    min="0"
                    max="2"
                    step="0.1"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Top P: {settings.topP}</label>
                  <input
                    type="range"
                    value={settings.topP}
                    onChange={(e) => handleSettingChange('topP', parseFloat(e.target.value))}
                    className="w-full"
                    min="0"
                    max="1"
                    step="0.05"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">System Prompt</label>
                  <textarea
                    value={settings.systemPrompt}
                    onChange={(e) => handleSettingChange('systemPrompt', e.target.value)}
                    className="textarea min-h-[80px]"
                    placeholder="System instructions for the AI..."
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Stream Response</label>
                  <button
                    onClick={() => handleSettingChange('stream', !settings.stream)}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                      settings.stream ? "bg-primary" : "bg-gray-200"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                        settings.stream ? "translate-x-6" : "translate-x-1"
                      )}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Stats */}
          {(generationStats || stats) && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Statistics</h3>
              </div>
              <div className="card-content space-y-3">
                {generationStats && (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Duration</span>
                      </div>
                      <span className="text-sm font-medium">
                        {formatDuration(generationStats.duration)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Tokens</span>
                      </div>
                      <span className="text-sm font-medium">
                        ~{generationStats.tokens}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Est. Cost</span>
                      </div>
                      <span className="text-sm font-medium">
                        {formatCurrency(generationStats.cost)}
                      </span>
                    </div>
                  </>
                )}

                {stats?.usage && (
                  <>
                    <div className="border-t pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Total Requests</span>
                        <span className="text-sm font-medium">{stats.usage.requestsCount}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Total Tokens</span>
                        <span className="text-sm font-medium">{stats.usage.tokensUsed}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Total Cost</span>
                        <span className="text-sm font-medium">
                          {formatCurrency(stats.usage.costEstimate)}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Output Section */}
      {(displayText || isGenerating) && (
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h3 className="card-title">Generated Text</h3>
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  disabled={!displayText}
                  className="btn-outline btn-sm"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  onClick={handleDownload}
                  disabled={!displayText}
                  className="btn-outline btn-sm"
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          <div className="card-content">
            <div className="min-h-[200px] p-4 bg-muted/50 rounded-md font-mono text-sm whitespace-pre-wrap">
              {displayText || (isGenerating && 'Generating...')}
              {isGenerating && settings.stream && (
                <span className="animate-pulse">▋</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="card border-destructive">
          <div className="card-content">
            <div className="flex items-center gap-2 text-destructive">
              <Zap className="h-4 w-4" />
              <span className="font-medium">Error</span>
            </div>
            <p className="text-sm mt-2">{error.message}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default TextGeneration