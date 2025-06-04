import React, { useState, useRef } from 'react'
import {
  Sparkles,
  Play,
  Copy,
  Download,
  RefreshCw,
  Settings,
  Zap,
  FileText,
  Upload,
  BarChart3,
  Clock,
  Hash,
  Type,
  Target,
  Eye,
  Minimize
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAI } from '@matthew.ngo/ai-toolkit/react'
import { cn, copyToClipboard, downloadFile, formatDuration } from '../lib/utils'

interface SummarizationSettings {
  model: string
  style: 'extractive' | 'abstractive' | 'bullet-points' | 'key-insights' | 'executive'
  length: 'brief' | 'medium' | 'detailed'
  tone: 'neutral' | 'formal' | 'casual' | 'technical'
  maxTokens: number
  temperature: number
  focusAreas: string[]
}

interface SummaryResult {
  id: string
  originalText: string
  summary: string
  style: string
  length: string
  keyPoints?: string[]
  wordCount: number
  compressionRatio: number
  readingTime: number
  timestamp: Date
}

const models = [
  { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI' },
  { id: 'claude-3', name: 'Claude 3', provider: 'Anthropic' },
  { id: 'bart-large', name: 'BART Large', provider: 'Facebook' },
  { id: 'pegasus', name: 'Pegasus', provider: 'Google' },
  { id: 'mock-model', name: 'Mock Model', provider: 'Demo' }
]

const styles = [
  { id: 'extractive', name: 'Extractive', description: 'Extract key sentences from original text' },
  { id: 'abstractive', name: 'Abstractive', description: 'Generate new text that captures main ideas' },
  { id: 'bullet-points', name: 'Bullet Points', description: 'Create structured bullet point summary' },
  { id: 'key-insights', name: 'Key Insights', description: 'Focus on main insights and conclusions' },
  { id: 'executive', name: 'Executive Summary', description: 'Business-focused executive summary' }
]

const lengths = [
  { id: 'brief', name: 'Brief', description: '1-2 sentences', tokens: 50 },
  { id: 'medium', name: 'Medium', description: '1-2 paragraphs', tokens: 150 },
  { id: 'detailed', name: 'Detailed', description: '3-4 paragraphs', tokens: 300 }
]

const tones = [
  { id: 'neutral', name: 'Neutral', description: 'Objective and balanced' },
  { id: 'formal', name: 'Formal', description: 'Professional and formal' },
  { id: 'casual', name: 'Casual', description: 'Conversational and easy to read' },
  { id: 'technical', name: 'Technical', description: 'Technical and precise' }
]

const sampleTexts = [
  `Artificial Intelligence (AI) has emerged as one of the most transformative technologies of the 21st century, revolutionizing industries from healthcare to transportation. At its core, AI refers to the development of computer systems that can perform tasks typically requiring human intelligence, such as visual perception, speech recognition, decision-making, and language translation.

The field of AI encompasses several key areas, including machine learning, natural language processing, computer vision, and robotics. Machine learning, a subset of AI, enables systems to automatically learn and improve from experience without being explicitly programmed. This technology has found applications in recommendation systems, fraud detection, predictive analytics, and autonomous vehicles.

Natural Language Processing (NLP) allows machines to understand, interpret, and generate human language. This technology powers virtual assistants like Siri and Alexa, language translation services, and sentiment analysis tools. Computer vision enables machines to interpret and analyze visual information from the world, driving innovations in medical imaging, autonomous vehicles, and quality control in manufacturing.

The impact of AI on society has been profound. In healthcare, AI-powered diagnostic tools can detect diseases earlier and more accurately than traditional methods. In finance, algorithmic trading and risk assessment have transformed how markets operate. In transportation, autonomous vehicles promise to reduce accidents and improve traffic efficiency.

However, the rapid advancement of AI also raises important ethical and societal concerns. Issues such as job displacement, privacy, algorithmic bias, and the potential for misuse require careful consideration. As AI continues to evolve, it will be crucial to develop frameworks for responsible AI development and deployment that maximize benefits while minimizing risks.

The future of AI holds immense promise, with potential breakthroughs in areas such as artificial general intelligence, quantum computing integration, and brain-computer interfaces. As we stand on the brink of an AI-driven future, it is essential to approach this technology with both excitement and caution, ensuring that its development serves the greater good of humanity.`,

  `Climate change represents one of the most pressing challenges facing humanity in the 21st century. The phenomenon refers to long-term shifts in global or regional climate patterns, primarily attributed to increased levels of greenhouse gases in the atmosphere due to human activities since the mid-20th century.

The primary driver of current climate change is the emission of greenhouse gases, particularly carbon dioxide (CO2), methane (CH4), and nitrous oxide (N2O). These gases trap heat in the Earth's atmosphere, leading to a gradual increase in global temperatures. The burning of fossil fuels for energy production, transportation, and industrial processes accounts for the majority of CO2 emissions.

The effects of climate change are already visible across the globe. Rising global temperatures have led to the melting of polar ice caps and glaciers, resulting in sea-level rise that threatens coastal communities. Extreme weather events, including hurricanes, droughts, floods, and heatwaves, have become more frequent and intense. Changes in precipitation patterns affect agriculture, water resources, and ecosystem dynamics.

The impacts extend beyond environmental concerns to encompass economic and social dimensions. Agricultural productivity is affected by changing weather patterns, threatening food security in vulnerable regions. Infrastructure damage from extreme weather events costs billions of dollars annually. Climate change disproportionately affects developing countries and marginalized communities that have limited resources for adaptation.

Addressing climate change requires urgent and coordinated global action. The Paris Agreement, adopted in 2015, represents a landmark international effort to limit global warming to well below 2°C above pre-industrial levels. Achieving this goal requires rapid decarbonization of the global economy through the transition to renewable energy sources, improvement in energy efficiency, and development of carbon capture technologies.

Individual actions also play a crucial role in addressing climate change. Reducing energy consumption, choosing sustainable transportation options, supporting renewable energy, and making environmentally conscious consumer choices can collectively make a significant impact. Education and awareness-raising are essential for building public support for climate action and creating the political will necessary for systemic change.`
]

const Summarization: React.FC = () => {
  const [text, setText] = useState('')
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [summaries, setSummaries] = useState<SummaryResult[]>([])
  const [selectedSummary, setSelectedSummary] = useState<SummaryResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [settings, setSettings] = useState<SummarizationSettings>({
    model: 'mock-model',
    style: 'abstractive',
    length: 'medium',
    tone: 'neutral',
    maxTokens: 150,
    temperature: 0.3,
    focusAreas: []
  })

  const { summarizeText, loading, error } = useAI({
    config: JSON.parse(localStorage.getItem('ai-toolkit-config') || '{}'),
    onError: (err) => {
      toast.error(`Summarization failed: ${err.message}`)
      setIsSummarizing(false)
    }
  })

  const generateMockSummary = (text: string): string => {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const keyWords = ['AI', 'technology', 'climate', 'change', 'development', 'impact', 'future', 'important', 'global', 'systems']

    // Create different summary styles
    switch (settings.style) {
      case 'extractive':
        // Pick key sentences
        const keySentences = sentences
          .filter(s => keyWords.some(word => s.toLowerCase().includes(word.toLowerCase())))
          .slice(0, settings.length === 'brief' ? 2 : settings.length === 'medium' ? 4 : 6)
        return keySentences.join('. ') + '.'

      case 'bullet-points':
        const points = [
          'Key technological advancement driving significant change',
          'Multiple applications across various industries',
          'Important societal and ethical considerations',
          'Future developments hold great promise',
          'Requires careful planning and responsible implementation'
        ].slice(0, settings.length === 'brief' ? 3 : settings.length === 'medium' ? 4 : 5)
        return points.map(p => `• ${p}`).join('\n')

      case 'key-insights':
        return settings.length === 'brief'
          ? 'The text discusses significant technological or environmental changes with far-reaching implications for society.'
          : settings.length === 'medium'
          ? 'The content explores major developments that are transforming industries and society. Key themes include technological advancement, societal impact, and the need for responsible implementation to address challenges and maximize benefits.'
          : 'The text provides comprehensive coverage of transformative developments affecting multiple sectors. Central themes include technological innovation, widespread industry applications, significant societal implications, and the importance of ethical considerations. The discussion emphasizes both opportunities and challenges, highlighting the need for balanced approaches to maximize positive outcomes while mitigating potential risks.'

      case 'executive':
        return settings.length === 'brief'
          ? 'Executive Summary: Major technological/environmental developments present significant opportunities and challenges requiring strategic response.'
          : settings.length === 'medium'
          ? 'Executive Summary: The analysis reveals substantial changes driven by technological advancement with broad industry implications. Key considerations include implementation strategies, risk management, and stakeholder impact. Recommendations focus on proactive adaptation and responsible development practices.'
          : 'Executive Summary: This comprehensive analysis examines transformative developments with significant business and societal implications. Key findings indicate widespread industry disruption, evolving consumer expectations, and regulatory considerations. Strategic recommendations include investment in adaptation capabilities, stakeholder engagement protocols, and risk mitigation frameworks. Implementation should prioritize sustainable practices and ethical considerations to ensure long-term value creation.'

      default: // abstractive
        return settings.length === 'brief'
          ? 'The content examines significant developments that are reshaping industries and society through technological advancement.'
          : settings.length === 'medium'
          ? 'This analysis explores major technological and societal developments that are fundamentally changing how we live and work. The discussion covers various applications, benefits, and challenges while emphasizing the importance of responsible implementation to maximize positive outcomes.'
          : 'The comprehensive examination reveals how emerging technologies and global phenomena are creating unprecedented opportunities and challenges across multiple sectors. The analysis highlights the transformative nature of these developments, their wide-ranging applications, and significant implications for society. Key themes include the balance between innovation and responsibility, the need for adaptive strategies, and the importance of addressing ethical considerations to ensure beneficial outcomes for all stakeholders.'
    }
  }

  const calculateWordCount = (text: string): number => {
    return text.trim().split(/\s+/).length
  }

  const calculateReadingTime = (wordCount: number): number => {
    return Math.ceil(wordCount / 200) // Assuming 200 words per minute
  }

  const handleSummarize = async () => {
    if (!text.trim()) {
      toast.error('Please enter text to summarize')
      return
    }

    if (text.trim().length < 100) {
      toast.error('Text is too short to summarize effectively')
      return
    }

    setIsSummarizing(true)

    try {
      // For demo purposes, generate mock summary
      await new Promise(resolve => setTimeout(resolve, 2000))

      const summary = generateMockSummary(text)
      const originalWordCount = calculateWordCount(text)
      const summaryWordCount = calculateWordCount(summary)

      const result: SummaryResult = {
        id: `summary_${Date.now()}`,
        originalText: text,
        summary,
        style: settings.style,
        length: settings.length,
        keyPoints: settings.style === 'bullet-points' ? summary.split('\n').filter(p => p.trim()) : undefined,
        wordCount: summaryWordCount,
        compressionRatio: originalWordCount / summaryWordCount,
        readingTime: calculateReadingTime(summaryWordCount),
        timestamp: new Date()
      }

      setSummaries(prev => [result, ...prev])
      setSelectedSummary(result)
      toast.success('Summary generated successfully!')
    } catch (err) {
      // Error handled by hook
    } finally {
      setIsSummarizing(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('text/')) {
      toast.error('Please select a text file')
      return
    }

    try {
      const content = await file.text()
      setText(content)
      toast.success(`Loaded ${file.name}`)
    } catch (err) {
      toast.error('Failed to read file')
    }
  }

  const handleCopy = async (content: string) => {
    try {
      await copyToClipboard(content)
      toast.success('Copied to clipboard!')
    } catch (err) {
      toast.error('Failed to copy content')
    }
  }

  const handleDownload = (summary: SummaryResult) => {
    const content = `Original Text:\n${summary.originalText}\n\nSummary (${summary.style}, ${summary.length}):\n${summary.summary}\n\nStatistics:\n- Word Count: ${summary.wordCount}\n- Compression Ratio: ${summary.compressionRatio.toFixed(1)}:1\n- Reading Time: ${summary.readingTime} min\n- Generated: ${summary.timestamp.toLocaleString()}`

    downloadFile(content, `summary-${summary.id}.txt`)
    toast.success('Summary downloaded!')
  }

  const handleExportAll = () => {
    if (summaries.length === 0) {
      toast.error('No summaries to export')
      return
    }

    const data = {
      summaries: summaries.map(s => ({
        originalText: s.originalText,
        summary: s.summary,
        style: s.style,
        length: s.length,
        wordCount: s.wordCount,
        compressionRatio: s.compressionRatio,
        timestamp: s.timestamp.toISOString()
      })),
      settings,
      exportedAt: new Date().toISOString()
    }

    downloadFile(JSON.stringify(data, null, 2), 'summaries-export.json')
    toast.success('All summaries exported!')
  }

  const handleSettingChange = (key: keyof SummarizationSettings, value: any) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value }

      // Update max tokens when length changes
      if (key === 'length') {
        const lengthConfig = lengths.find(l => l.id === value)
        if (lengthConfig) {
          newSettings.maxTokens = lengthConfig.tokens
        }
      }

      return newSettings
    })
  }

  const handleTextSelect = (selectedText: string) => {
    setText(selectedText)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Text Summarization</h1>
            <p className="text-muted-foreground">Generate concise summaries from long texts using AI</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="btn-outline"
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </button>
          <button
            onClick={handleExportAll}
            disabled={summaries.length === 0}
            className="btn-outline"
          >
            <Download className="h-4 w-4 mr-2" />
            Export All
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Input Section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Text Input</h3>
              <p className="card-description">Enter the text you want to summarize</p>
            </div>
            <div className="card-content space-y-4">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste your long text here..."
                className="textarea min-h-[200px] resize-none"
                disabled={isSummarizing}
              />

              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={handleSummarize}
                    disabled={isSummarizing || !text.trim() || text.trim().length < 100}
                    className="btn-primary"
                  >
                    {isSummarizing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Summarizing...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Generate Summary
                      </>
                    )}
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.md"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSummarizing}
                    className="btn-outline"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload File
                  </button>
                </div>

                <div className="text-sm text-muted-foreground">
                  {calculateWordCount(text)} words • {calculateReadingTime(calculateWordCount(text))} min read
                </div>
              </div>
            </div>
          </div>

          {/* Sample Texts */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Sample Texts</h3>
              <p className="card-description">Click to use these example texts for summarization</p>
            </div>
            <div className="card-content">
              <div className="space-y-2">
                {sampleTexts.map((sampleText, index) => (
                  <button
                    key={index}
                    onClick={() => handleTextSelect(sampleText)}
                    disabled={isSummarizing}
                    className="text-left p-3 rounded-md border hover:bg-accent hover:text-accent-foreground transition-colors w-full"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">
                        Sample {index + 1} ({calculateWordCount(sampleText)} words)
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {sampleText.substring(0, 150)}...
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Summary Results */}
          {summaries.length > 0 && (
            <div className="card">
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <h3 className="card-title">Generated Summaries</h3>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{summaries.length} summaries</span>
                  </div>
                </div>
              </div>
              <div className="card-content">
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {summaries.map((summary) => (
                    <div
                      key={summary.id}
                      className={cn(
                        "p-4 border rounded-lg cursor-pointer transition-colors",
                        selectedSummary?.id === summary.id
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      )}
                      onClick={() => setSelectedSummary(summary)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                              {summary.style}
                            </span>
                            <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                              {summary.length}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {summary.compressionRatio.toFixed(1)}:1 compression
                            </span>
                          </div>
                          <p className="text-sm line-clamp-3">{summary.summary}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {summary.timestamp.toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCopy(summary.summary)
                            }}
                            className="btn-ghost btn-sm"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDownload(summary)
                            }}
                            className="btn-ghost btn-sm"
                          >
                            <Download className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Settings Panel */}
        <div className="space-y-4">
          {showSettings && (
            <>
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Model Settings</h3>
                </div>
                <div className="card-content space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Model</label>
                    <select
                      value={settings.model}
                      onChange={(e) => handleSettingChange('model', e.target.value)}
                      className="input"
                    >
                      {models.map(model => (
                        <option key={model.id} value={model.id}>
                          {model.name} ({model.provider})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Temperature: {settings.temperature}</label>
                    <input
                      type="range"
                      value={settings.temperature}
                      onChange={(e) => handleSettingChange('temperature', parseFloat(e.target.value))}
                      className="w-full"
                      min="0"
                      max="1"
                      step="0.1"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Max Tokens</label>
                    <input
                      type="number"
                      value={settings.maxTokens}
                      onChange={(e) => handleSettingChange('maxTokens', parseInt(e.target.value))}
                      className="input"
                      min="50"
                      max="1000"
                      step="50"
                    />
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Summary Style</h3>
                </div>
                <div className="card-content space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Style</label>
                    <div className="space-y-2">
                      {styles.map(style => (
                        <button
                          key={style.id}
                          onClick={() => handleSettingChange('style', style.id)}
                          className={cn(
                            "w-full text-left p-3 rounded-md border transition-colors",
                            settings.style === style.id
                              ? "border-primary bg-primary/5"
                              : "hover:bg-muted/50"
                          )}
                        >
                          <div className="font-medium text-sm">{style.name}</div>
                          <div className="text-xs text-muted-foreground">{style.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Length</label>
                    <div className="space-y-2">
                      {lengths.map(length => (
                        <button
                          key={length.id}
                          onClick={() => handleSettingChange('length', length.id)}
                          className={cn(
                            "w-full text-left p-3 rounded-md border transition-colors",
                            settings.length === length.id
                              ? "border-primary bg-primary/5"
                              : "hover:bg-muted/50"
                          )}
                        >
                          <div className="font-medium text-sm">{length.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {length.description} (~{length.tokens} tokens)
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tone</label>
                    <select
                      value={settings.tone}
                      onChange={(e) => handleSettingChange('tone', e.target.value)}
                      className="input"
                    >
                      {tones.map(tone => (
                        <option key={tone.id} value={tone.id}>
                          {tone.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Selected Summary Details */}
          {selectedSummary && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Summary Details</h3>
              </div>
              <div className="card-content space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Summary</h4>
                  <div className="bg-muted/50 p-3 rounded-md text-sm max-h-32 overflow-y-auto">
                    {selectedSummary.keyPoints ? (
                      <div className="space-y-1">
                        {selectedSummary.keyPoints.map((point, i) => (
                          <div key={i}>{point}</div>
                        ))}
                      </div>
                    ) : (
                      selectedSummary.summary
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Style:</span>
                    <div className="font-medium capitalize">{selectedSummary.style}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Length:</span>
                    <div className="font-medium capitalize">{selectedSummary.length}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Word Count:</span>
                    <div className="font-medium">{selectedSummary.wordCount}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Compression:</span>
                    <div className="font-medium">{selectedSummary.compressionRatio.toFixed(1)}:1</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Reading Time:</span>
                    <div className="font-medium">{selectedSummary.readingTime} min</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Created:</span>
                    <div className="font-medium">{selectedSummary.timestamp.toLocaleTimeString()}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Statistics */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Statistics</h3>
            </div>
            <div className="card-content space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total Summaries</span>
                <span className="font-medium">{summaries.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Current Style</span>
                <span className="font-medium capitalize">{settings.style}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Target Length</span>
                <span className="font-medium capitalize">{settings.length}</span>
              </div>
              {summaries.length > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span>Avg. Compression</span>
                    <span className="font-medium">
                      {(summaries.reduce((sum, s) => sum + s.compressionRatio, 0) / summaries.length).toFixed(1)}:1
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Last Summary</span>
                    <span className="font-medium">
                      {summaries[0]?.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

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

export default Summarization