import React, { useState } from 'react'
import {
  Tag,
  Play,
  Copy,
  Download,
  RefreshCw,
  Settings,
  Zap,
  FileText,
  BarChart3,
  Target,
  Plus,
  Trash2,
  Eye,
  Filter
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAI } from '@matthew.ngo/ai-toolkit/react'
import { cn, copyToClipboard, downloadFile, formatPercentage } from '../lib/utils'

interface ClassificationSettings {
  model: string
  threshold: number
  maxLabels: number
  customLabels: string[]
  useCustomLabels: boolean
  multilabel: boolean
}

interface ClassificationResult {
  id: string
  text: string
  predictions: Array<{
    label: string
    confidence: number
    color?: string
  }>
  settings: ClassificationSettings
  timestamp: Date
}

const models = [
  { id: 'text-classification', name: 'BERT Base', provider: 'HuggingFace' },
  { id: 'distilbert-base', name: 'DistilBERT', provider: 'HuggingFace' },
  { id: 'roberta-base', name: 'RoBERTa', provider: 'HuggingFace' },
  { id: 'openai-classification', name: 'GPT-4 Classification', provider: 'OpenAI' },
  { id: 'mock-model', name: 'Mock Model', provider: 'Demo' }
]

const presetLabels = {
  sentiment: ['positive', 'negative', 'neutral'],
  emotion: ['joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust'],
  topic: ['technology', 'business', 'science', 'sports', 'entertainment', 'politics', 'health'],
  language: ['english', 'spanish', 'french', 'german', 'chinese', 'japanese'],
  intent: ['question', 'request', 'complaint', 'compliment', 'information', 'booking'],
  urgency: ['urgent', 'medium', 'low'],
  formality: ['formal', 'informal', 'neutral']
}

const sampleTexts = [
  "I absolutely love this new smartphone! The camera quality is amazing and the battery lasts all day.",
  "The service at this restaurant was terrible. We waited 45 minutes for our food and it was cold.",
  "Can you please help me understand how to reset my password? I've tried multiple times.",
  "Artificial intelligence is revolutionizing healthcare by enabling faster and more accurate diagnoses.",
  "The latest quarterly earnings report shows a 15% increase in revenue compared to last year.",
  "Breaking: Scientists discover new species of deep-sea fish in the Pacific Ocean.",
  "The football match last night was incredible! Three goals in the final 10 minutes.",
  "I'm feeling a bit anxious about my upcoming presentation. Any tips for managing nerves?",
  "Could you schedule a meeting for next Tuesday at 2 PM to discuss the project timeline?",
  "This movie was absolutely fantastic! The plot twists kept me engaged throughout."
]

const labelColors = [
  'bg-blue-100 text-blue-800',
  'bg-green-100 text-green-800',
  'bg-yellow-100 text-yellow-800',
  'bg-red-100 text-red-800',
  'bg-purple-100 text-purple-800',
  'bg-pink-100 text-pink-800',
  'bg-indigo-100 text-indigo-800',
  'bg-orange-100 text-orange-800'
]

const TextClassification: React.FC = () => {
  const [text, setText] = useState('')
  const [isClassifying, setIsClassifying] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [results, setResults] = useState<ClassificationResult[]>([])
  const [selectedResult, setSelectedResult] = useState<ClassificationResult | null>(null)
  const [newLabel, setNewLabel] = useState('')
  const [selectedPreset, setSelectedPreset] = useState<keyof typeof presetLabels>('sentiment')

  const [settings, setSettings] = useState<ClassificationSettings>({
    model: 'mock-model',
    threshold: 0.1,
    maxLabels: 5,
    customLabels: ['positive', 'negative', 'neutral'],
    useCustomLabels: false,
    multilabel: true
  })

  const { classifyText, loading, error } = useAI({
    config: JSON.parse(localStorage.getItem('ai-toolkit-config') || '{}'),
    onError: (err) => {
      toast.error(`Classification failed: ${err.message}`)
      setIsClassifying(false)
    }
  })

  const generateMockClassification = (text: string): ClassificationResult['predictions'] => {
    const labels = settings.useCustomLabels ? settings.customLabels : presetLabels[selectedPreset]
    const predictions: ClassificationResult['predictions'] = []

    // Generate mock predictions based on text content
    labels.forEach((label, index) => {
      let confidence = Math.random() * 0.3 + 0.1 // Base random confidence

      // Add some logic based on text content for more realistic results
      const textLower = text.toLowerCase()
      if (label === 'positive' && (textLower.includes('love') || textLower.includes('amazing') || textLower.includes('fantastic'))) {
        confidence += 0.6
      } else if (label === 'negative' && (textLower.includes('terrible') || textLower.includes('awful') || textLower.includes('bad'))) {
        confidence += 0.6
      } else if (label === 'question' && textLower.includes('?')) {
        confidence += 0.5
      } else if (label === 'technology' && (textLower.includes('ai') || textLower.includes('smartphone') || textLower.includes('tech'))) {
        confidence += 0.4
      }

      confidence = Math.min(confidence, 0.99)

      if (confidence >= settings.threshold) {
        predictions.push({
          label,
          confidence,
          color: labelColors[index % labelColors.length]
        })
      }
    })

    // Sort by confidence and limit results
    return predictions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, settings.maxLabels)
  }

  const handleClassify = async () => {
    if (!text.trim()) {
      toast.error('Please enter text to classify')
      return
    }

    setIsClassifying(true)

    try {
      // For demo purposes, generate mock classification
      await new Promise(resolve => setTimeout(resolve, 1000))

      const predictions = generateMockClassification(text)

      const result: ClassificationResult = {
        id: `class_${Date.now()}`,
        text,
        predictions,
        settings: { ...settings },
        timestamp: new Date()
      }

      setResults(prev => [result, ...prev])
      setSelectedResult(result)
      toast.success(`Classified with ${predictions.length} labels`)
    } catch (err) {
      // Error handled by hook
    } finally {
      setIsClassifying(false)
    }
  }

  const handleBatchClassify = async () => {
    setIsClassifying(true)

    try {
      const newResults: ClassificationResult[] = []

      for (const sampleText of sampleTexts) {
        await new Promise(resolve => setTimeout(resolve, 200))

        const predictions = generateMockClassification(sampleText)
        const result: ClassificationResult = {
          id: `class_${Date.now()}_${Math.random()}`,
          text: sampleText,
          predictions,
          settings: { ...settings },
          timestamp: new Date()
        }
        newResults.push(result)
      }

      setResults(prev => [...newResults, ...prev])
      toast.success(`Classified ${newResults.length} sample texts`)
    } catch (err) {
      // Error handled by hook
    } finally {
      setIsClassifying(false)
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

  const handleDownload = (result: ClassificationResult) => {
    const data = {
      text: result.text,
      predictions: result.predictions,
      settings: result.settings,
      timestamp: result.timestamp.toISOString()
    }

    downloadFile(JSON.stringify(data, null, 2), `classification-${result.id}.json`)
    toast.success('Classification result downloaded!')
  }

  const handleExportAll = () => {
    if (results.length === 0) {
      toast.error('No results to export')
      return
    }

    const data = {
      results: results.map(result => ({
        text: result.text,
        predictions: result.predictions,
        timestamp: result.timestamp.toISOString()
      })),
      settings,
      exportedAt: new Date().toISOString()
    }

    downloadFile(JSON.stringify(data, null, 2), 'classification-results.json')
    toast.success('All results exported!')
  }

  const handleSettingChange = (key: keyof ClassificationSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleAddCustomLabel = () => {
    if (!newLabel.trim()) return

    const label = newLabel.trim().toLowerCase()
    if (settings.customLabels.includes(label)) {
      toast.error('Label already exists')
      return
    }

    setSettings(prev => ({
      ...prev,
      customLabels: [...prev.customLabels, label]
    }))
    setNewLabel('')
    toast.success('Label added')
  }

  const handleRemoveCustomLabel = (label: string) => {
    setSettings(prev => ({
      ...prev,
      customLabels: prev.customLabels.filter(l => l !== label)
    }))
    toast.success('Label removed')
  }

  const handleLoadPreset = () => {
    setSettings(prev => ({
      ...prev,
      customLabels: [...presetLabels[selectedPreset]]
    }))
    toast.success(`Loaded ${selectedPreset} labels`)
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
            <Tag className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Text Classification</h1>
            <p className="text-muted-foreground">Classify text into predefined categories using AI</p>
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
            disabled={results.length === 0}
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
              <p className="card-description">Enter text to classify</p>
            </div>
            <div className="card-content space-y-4">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter your text here..."
                className="textarea min-h-[120px] resize-none"
                disabled={isClassifying}
              />

              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={handleClassify}
                    disabled={isClassifying || !text.trim()}
                    className="btn-primary"
                  >
                    {isClassifying ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Classifying...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Classify Text
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleBatchClassify}
                    disabled={isClassifying}
                    className="btn-outline"
                  >
                    <Target className="h-4 w-4 mr-2" />
                    Batch Classify
                  </button>
                </div>

                <div className="text-sm text-muted-foreground">
                  {text.length} characters
                </div>
              </div>
            </div>
          </div>

          {/* Sample Texts */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Sample Texts</h3>
              <p className="card-description">Click to use these example texts</p>
            </div>
            <div className="card-content">
              <div className="grid gap-2">
                {sampleTexts.map((sampleText, index) => (
                  <button
                    key={index}
                    onClick={() => handleTextSelect(sampleText)}
                    disabled={isClassifying}
                    className="text-left p-3 rounded-md border hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm line-clamp-2">{sampleText}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div className="card">
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <h3 className="card-title">Classification Results</h3>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{results.length} results</span>
                  </div>
                </div>
              </div>
              <div className="card-content">
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {results.map((result) => (
                    <div
                      key={result.id}
                      className={cn(
                        "p-4 border rounded-lg cursor-pointer transition-colors",
                        selectedResult?.id === result.id
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      )}
                      onClick={() => setSelectedResult(result)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm line-clamp-2">{result.text}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {result.timestamp.toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCopy(JSON.stringify(result.predictions, null, 2))
                            }}
                            className="btn-ghost btn-sm"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDownload(result)
                            }}
                            className="btn-ghost btn-sm"
                          >
                            <Download className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {result.predictions.map((prediction, index) => (
                          <div
                            key={index}
                            className={cn(
                              "px-2 py-1 rounded-full text-xs font-medium",
                              prediction.color || "bg-gray-100 text-gray-800"
                            )}
                          >
                            {prediction.label} ({formatPercentage(prediction.confidence)})
                          </div>
                        ))}
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
                    <label className="text-sm font-medium">Confidence Threshold: {formatPercentage(settings.threshold)}</label>
                    <input
                      type="range"
                      value={settings.threshold}
                      onChange={(e) => handleSettingChange('threshold', parseFloat(e.target.value))}
                      className="w-full"
                      min="0"
                      max="1"
                      step="0.05"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Max Labels</label>
                    <input
                      type="number"
                      value={settings.maxLabels}
                      onChange={(e) => handleSettingChange('maxLabels', parseInt(e.target.value))}
                      className="input"
                      min="1"
                      max="20"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Multi-label Classification</label>
                    <button
                      onClick={() => handleSettingChange('multilabel', !settings.multilabel)}
                      className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                        settings.multilabel ? "bg-primary" : "bg-gray-200"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                          settings.multilabel ? "translate-x-6" : "translate-x-1"
                        )}
                      />
                    </button>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Classification Labels</h3>
                </div>
                <div className="card-content space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Use Custom Labels</label>
                    <button
                      onClick={() => handleSettingChange('useCustomLabels', !settings.useCustomLabels)}
                      className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                        settings.useCustomLabels ? "bg-primary" : "bg-gray-200"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                          settings.useCustomLabels ? "translate-x-6" : "translate-x-1"
                        )}
                      />
                    </button>
                  </div>

                  {!settings.useCustomLabels && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Preset Labels</label>
                      <div className="flex gap-2">
                        <select
                          value={selectedPreset}
                          onChange={(e) => setSelectedPreset(e.target.value as keyof typeof presetLabels)}
                          className="input flex-1"
                        >
                          {Object.keys(presetLabels).map(preset => (
                            <option key={preset} value={preset}>
                              {preset.charAt(0).toUpperCase() + preset.slice(1)}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={handleLoadPreset}
                          className="btn-outline btn-sm"
                        >
                          Load
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {presetLabels[selectedPreset].map((label, index) => (
                          <span
                            key={label}
                            className={cn(
                              "px-2 py-1 rounded-full text-xs",
                              labelColors[index % labelColors.length]
                            )}
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {settings.useCustomLabels && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Custom Labels</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newLabel}
                          onChange={(e) => setNewLabel(e.target.value)}
                          placeholder="Add label..."
                          className="input flex-1"
                          onKeyPress={(e) => e.key === 'Enter' && handleAddCustomLabel()}
                        />
                        <button
                          onClick={handleAddCustomLabel}
                          disabled={!newLabel.trim()}
                          className="btn-outline btn-sm"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {settings.customLabels.map((label, index) => (
                          <div
                            key={label}
                            className="flex items-center justify-between p-2 bg-muted/50 rounded"
                          >
                            <span
                              className={cn(
                                "px-2 py-1 rounded-full text-xs",
                                labelColors[index % labelColors.length]
                              )}
                            >
                              {label}
                            </span>
                            <button
                              onClick={() => handleRemoveCustomLabel(label)}
                              className="btn-ghost btn-sm text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Selected Result Details */}
          {selectedResult && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Classification Details</h3>
              </div>
              <div className="card-content space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Text</h4>
                  <div className="bg-muted/50 p-3 rounded-md text-sm max-h-24 overflow-y-auto">
                    {selectedResult.text}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Predictions</h4>
                  <div className="space-y-2">
                    {selectedResult.predictions.map((prediction, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span
                          className={cn(
                            "px-2 py-1 rounded-full text-xs font-medium",
                            prediction.color || "bg-gray-100 text-gray-800"
                          )}
                        >
                          {prediction.label}
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all"
                              style={{ width: `${prediction.confidence * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">
                            {formatPercentage(prediction.confidence)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Model:</span>
                    <div className="font-medium">{selectedResult.settings.model}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Labels:</span>
                    <div className="font-medium">{selectedResult.predictions.length}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Threshold:</span>
                    <div className="font-medium">{formatPercentage(selectedResult.settings.threshold)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Created:</span>
                    <div className="font-medium">{selectedResult.timestamp.toLocaleTimeString()}</div>
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
                <span>Total Classifications</span>
                <span className="font-medium">{results.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Available Labels</span>
                <span className="font-medium">
                  {settings.useCustomLabels ? settings.customLabels.length : presetLabels[selectedPreset].length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Confidence Threshold</span>
                <span className="font-medium">{formatPercentage(settings.threshold)}</span>
              </div>
              {results.length > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span>Avg. Labels per Text</span>
                    <span className="font-medium">
                      {(results.reduce((sum, r) => sum + r.predictions.length, 0) / results.length).toFixed(1)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Last Classification</span>
                    <span className="font-medium">
                      {results[0]?.timestamp.toLocaleTimeString()}
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

export default TextClassification