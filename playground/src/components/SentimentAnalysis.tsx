import React, { useState } from 'react'
import {
  Heart,
  Play,
  Copy,
  Download,
  RefreshCw,
  Settings,
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
  Smile,
  Frown,
  Meh,
  BarChart3,
  Target,
  Eye,
  FileText
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAI } from '@matthew.ngo/ai-toolkit/react'
import { cn, copyToClipboard, downloadFile, formatPercentage } from '../lib/utils'

interface SentimentSettings {
  model: string
  granularity: 'document' | 'sentence' | 'aspect'
  includeEmotions: boolean
  includeEntities: boolean
  language: string
  threshold: number
}

interface SentimentScore {
  label: 'positive' | 'negative' | 'neutral'
  confidence: number
  score: number // -1 to 1
}

interface EmotionScore {
  emotion: string
  confidence: number
  intensity: number
}

interface SentimentResult {
  id: string
  text: string
  overall: SentimentScore
  emotions?: EmotionScore[]
  sentences?: Array<{
    text: string
    sentiment: SentimentScore
    start: number
    end: number
  }>
  aspects?: Array<{
    aspect: string
    sentiment: SentimentScore
    mentions: string[]
  }>
  entities?: Array<{
    text: string
    type: string
    sentiment: SentimentScore
  }>
  keywords: Array<{
    word: string
    sentiment: 'positive' | 'negative' | 'neutral'
    weight: number
  }>
  timestamp: Date
}

const models = [
  { id: 'vader', name: 'VADER', provider: 'NLTK' },
  { id: 'textblob', name: 'TextBlob', provider: 'TextBlob' },
  { id: 'bert-sentiment', name: 'BERT Sentiment', provider: 'HuggingFace' },
  { id: 'roberta-sentiment', name: 'RoBERTa Sentiment', provider: 'HuggingFace' },
  { id: 'openai-sentiment', name: 'GPT-4 Sentiment', provider: 'OpenAI' },
  { id: 'mock-model', name: 'Mock Model', provider: 'Demo' }
]

const languages = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' }
]

const sampleTexts = [
  "I absolutely love this new smartphone! The camera quality is incredible and the battery life is amazing. Best purchase I've made this year!",
  "The service at this restaurant was terrible. We waited over an hour for our food, and when it finally arrived, it was cold and tasteless. Very disappointing experience.",
  "The movie was okay. Some parts were interesting, but overall it was just average. Not bad, but not great either.",
  "I'm feeling a bit anxious about my upcoming presentation tomorrow. I've prepared well, but I still have some butterflies in my stomach.",
  "Congratulations on your promotion! You've worked so hard for this and you truly deserve it. I'm so happy for you!",
  "I'm disappointed with the quality of this product. It broke after just one week of use. Expected much better for the price.",
  "The weather today is perfect for a picnic. Sunny skies, gentle breeze, and comfortable temperature. Couldn't ask for better!",
  "I'm concerned about the recent changes in company policy. While I understand the reasoning, I worry about the impact on employee morale.",
  "This book is absolutely fascinating! The author's writing style is engaging and the plot keeps you on the edge of your seat.",
  "The customer support team was incredibly helpful and resolved my issue quickly. Great service and very professional staff."
]

const emotions = [
  { name: 'joy', color: 'bg-yellow-100 text-yellow-800', icon: '😊' },
  { name: 'sadness', color: 'bg-blue-100 text-blue-800', icon: '😢' },
  { name: 'anger', color: 'bg-red-100 text-red-800', icon: '😠' },
  { name: 'fear', color: 'bg-purple-100 text-purple-800', icon: '😨' },
  { name: 'surprise', color: 'bg-orange-100 text-orange-800', icon: '😲' },
  { name: 'disgust', color: 'bg-green-100 text-green-800', icon: '🤢' },
  { name: 'trust', color: 'bg-teal-100 text-teal-800', icon: '🤝' },
  { name: 'anticipation', color: 'bg-indigo-100 text-indigo-800', icon: '🤔' }
]

const SentimentAnalysis: React.FC = () => {
  const [text, setText] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [results, setResults] = useState<SentimentResult[]>([])
  const [selectedResult, setSelectedResult] = useState<SentimentResult | null>(null)

  const [settings, setSettings] = useState<SentimentSettings>({
    model: 'mock-model',
    granularity: 'document',
    includeEmotions: true,
    includeEntities: false,
    language: 'en',
    threshold: 0.1
  })

  const { analyzeSentiment, loading, error } = useAI({
    config: JSON.parse(localStorage.getItem('ai-toolkit-config') || '{}'),
    onError: (err) => {
      toast.error(`Sentiment analysis failed: ${err.message}`)
      setIsAnalyzing(false)
    }
  })

  const generateMockSentiment = (text: string): SentimentResult => {
    const textLower = text.toLowerCase()

    // Analyze overall sentiment
    let sentimentScore = 0
    const positiveWords = ['love', 'amazing', 'great', 'excellent', 'wonderful', 'fantastic', 'incredible', 'perfect', 'happy', 'congratulations']
    const negativeWords = ['hate', 'terrible', 'awful', 'bad', 'disappointing', 'concerned', 'worried', 'anxious', 'disappointed', 'cold']

    positiveWords.forEach(word => {
      if (textLower.includes(word)) sentimentScore += 0.3
    })

    negativeWords.forEach(word => {
      if (textLower.includes(word)) sentimentScore -= 0.3
    })

    // Clamp score between -1 and 1
    sentimentScore = Math.max(-1, Math.min(1, sentimentScore + (Math.random() - 0.5) * 0.2))

    let label: 'positive' | 'negative' | 'neutral' = 'neutral'
    if (sentimentScore > 0.1) label = 'positive'
    else if (sentimentScore < -0.1) label = 'negative'

    const overall: SentimentScore = {
      label,
      confidence: Math.abs(sentimentScore) * 0.8 + 0.2,
      score: sentimentScore
    }

    // Generate emotions if enabled
    let emotionScores: EmotionScore[] | undefined
    if (settings.includeEmotions) {
      emotionScores = emotions.map(emotion => {
        let intensity = Math.random() * 0.5

        // Add some logic based on text content
        if (emotion.name === 'joy' && sentimentScore > 0.3) intensity += 0.4
        if (emotion.name === 'sadness' && sentimentScore < -0.3) intensity += 0.4
        if (emotion.name === 'anger' && textLower.includes('terrible') || textLower.includes('awful')) intensity += 0.3
        if (emotion.name === 'fear' && textLower.includes('anxious') || textLower.includes('worried')) intensity += 0.3

        return {
          emotion: emotion.name,
          confidence: Math.min(intensity + 0.2, 0.95),
          intensity: Math.min(intensity, 1)
        }
      }).filter(e => e.intensity >= settings.threshold).sort((a, b) => b.intensity - a.intensity)
    }

    // Generate sentences if granularity is sentence
    let sentences: SentimentResult['sentences']
    if (settings.granularity === 'sentence') {
      const sentenceTexts = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
      sentences = sentenceTexts.map((sentence, index) => {
        const sentScore = sentimentScore + (Math.random() - 0.5) * 0.4
        let sentLabel: 'positive' | 'negative' | 'neutral' = 'neutral'
        if (sentScore > 0.1) sentLabel = 'positive'
        else if (sentScore < -0.1) sentLabel = 'negative'

        return {
          text: sentence.trim(),
          sentiment: {
            label: sentLabel,
            confidence: Math.abs(sentScore) * 0.7 + 0.3,
            score: sentScore
          },
          start: index * 50, // Mock positions
          end: (index + 1) * 50
        }
      })
    }

    // Generate keywords
    const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 3)
    const keywords = words.slice(0, 10).map(word => {
      let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral'
      let weight = 0.1 + Math.random() * 0.4

      if (positiveWords.some(pw => word.includes(pw))) {
        sentiment = 'positive'
        weight += 0.3
      } else if (negativeWords.some(nw => word.includes(nw))) {
        sentiment = 'negative'
        weight += 0.3
      }

      return { word, sentiment, weight }
    }).sort((a, b) => b.weight - a.weight)

    return {
      id: `sentiment_${Date.now()}`,
      text,
      overall,
      emotions: emotionScores,
      sentences,
      keywords,
      timestamp: new Date()
    }
  }

  const handleAnalyze = async () => {
    if (!text.trim()) {
      toast.error('Please enter text to analyze')
      return
    }

    setIsAnalyzing(true)

    try {
      // For demo purposes, generate mock sentiment analysis
      await new Promise(resolve => setTimeout(resolve, 1500))

      const result = generateMockSentiment(text)
      setResults(prev => [result, ...prev])
      setSelectedResult(result)
      toast.success('Sentiment analysis completed!')
    } catch (err) {
      // Error handled by hook
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleBatchAnalyze = async () => {
    setIsAnalyzing(true)

    try {
      const newResults: SentimentResult[] = []

      for (const sampleText of sampleTexts) {
        await new Promise(resolve => setTimeout(resolve, 300))
        const result = generateMockSentiment(sampleText)
        newResults.push(result)
      }

      setResults(prev => [...newResults, ...prev])
      toast.success(`Analyzed ${newResults.length} sample texts`)
    } catch (err) {
      // Error handled by hook
    } finally {
      setIsAnalyzing(false)
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

  const handleDownload = (result: SentimentResult) => {
    const data = {
      text: result.text,
      sentiment: result.overall,
      emotions: result.emotions,
      sentences: result.sentences,
      keywords: result.keywords,
      timestamp: result.timestamp.toISOString()
    }

    downloadFile(JSON.stringify(data, null, 2), `sentiment-${result.id}.json`)
    toast.success('Analysis result downloaded!')
  }

  const handleExportAll = () => {
    if (results.length === 0) {
      toast.error('No results to export')
      return
    }

    const data = {
      results: results.map(result => ({
        text: result.text,
        sentiment: result.overall,
        emotions: result.emotions,
        timestamp: result.timestamp.toISOString()
      })),
      settings,
      exportedAt: new Date().toISOString()
    }

    downloadFile(JSON.stringify(data, null, 2), 'sentiment-analysis-results.json')
    toast.success('All results exported!')
  }

  const handleSettingChange = (key: keyof SentimentSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleTextSelect = (selectedText: string) => {
    setText(selectedText)
  }

  const getSentimentIcon = (sentiment: SentimentScore) => {
    switch (sentiment.label) {
      case 'positive':
        return <Smile className="h-4 w-4 text-green-600" />
      case 'negative':
        return <Frown className="h-4 w-4 text-red-600" />
      default:
        return <Meh className="h-4 w-4 text-gray-600" />
    }
  }

  const getSentimentColor = (sentiment: SentimentScore) => {
    switch (sentiment.label) {
      case 'positive':
        return 'bg-green-100 text-green-800'
      case 'negative':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Heart className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Sentiment Analysis</h1>
            <p className="text-muted-foreground">Analyze the emotional tone and sentiment of text</p>
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
              <p className="card-description">Enter text to analyze sentiment and emotions</p>
            </div>
            <div className="card-content space-y-4">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter your text here..."
                className="textarea min-h-[120px] resize-none"
                disabled={isAnalyzing}
              />

              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || !text.trim()}
                    className="btn-primary"
                  >
                    {isAnalyzing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Analyze Sentiment
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleBatchAnalyze}
                    disabled={isAnalyzing}
                    className="btn-outline"
                  >
                    <Target className="h-4 w-4 mr-2" />
                    Batch Analyze
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
              <p className="card-description">Click to analyze these example texts</p>
            </div>
            <div className="card-content">
              <div className="grid gap-2">
                {sampleTexts.map((sampleText, index) => (
                  <button
                    key={index}
                    onClick={() => handleTextSelect(sampleText)}
                    disabled={isAnalyzing}
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
                  <h3 className="card-title">Analysis Results</h3>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{results.length} analyses</span>
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
                          <div className="flex items-center gap-2 mb-2">
                            {getSentimentIcon(result.overall)}
                            <span className={cn(
                              "text-xs px-2 py-1 rounded-full font-medium",
                              getSentimentColor(result.overall)
                            )}>
                              {result.overall.label} ({formatPercentage(result.overall.confidence)})
                            </span>
                            <div className="flex-1 bg-muted rounded-full h-2">
                              <div
                                className={cn(
                                  "h-2 rounded-full transition-all",
                                  result.overall.label === 'positive' ? 'bg-green-500' :
                                  result.overall.label === 'negative' ? 'bg-red-500' : 'bg-gray-500'
                                )}
                                style={{ width: `${Math.abs(result.overall.score) * 100}%` }}
                              />
                            </div>
                          </div>
                          <p className="text-sm line-clamp-2">{result.text}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {result.timestamp.toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCopy(JSON.stringify(result.overall, null, 2))
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

                      {/* Emotions Preview */}
                      {result.emotions && result.emotions.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {result.emotions.slice(0, 3).map((emotion) => {
                            const emotionConfig = emotions.find(e => e.name === emotion.emotion)
                            return (
                              <span
                                key={emotion.emotion}
                                className={cn(
                                  "text-xs px-2 py-1 rounded-full",
                                  emotionConfig?.color || "bg-gray-100 text-gray-800"
                                )}
                              >
                                {emotionConfig?.icon} {emotion.emotion} ({formatPercentage(emotion.intensity)})
                              </span>
                            )
                          })}
                          {result.emotions.length > 3 && (
                            <span className="text-xs text-muted-foreground">
                              +{result.emotions.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
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
                    <label className="text-sm font-medium">Language</label>
                    <select
                      value={settings.language}
                      onChange={(e) => handleSettingChange('language', e.target.value)}
                      className="input"
                    >
                      {languages.map(lang => (
                        <option key={lang.code} value={lang.code}>
                          {lang.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Granularity</label>
                    <select
                      value={settings.granularity}
                      onChange={(e) => handleSettingChange('granularity', e.target.value)}
                      className="input"
                    >
                      <option value="document">Document Level</option>
                      <option value="sentence">Sentence Level</option>
                      <option value="aspect">Aspect Based</option>
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

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Include Emotions</label>
                      <button
                        onClick={() => handleSettingChange('includeEmotions', !settings.includeEmotions)}
                        className={cn(
                          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                          settings.includeEmotions ? "bg-primary" : "bg-gray-200"
                        )}
                      >
                        <span
                          className={cn(
                            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                            settings.includeEmotions ? "translate-x-6" : "translate-x-1"
                          )}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Include Entities</label>
                      <button
                        onClick={() => handleSettingChange('includeEntities', !settings.includeEntities)}
                        className={cn(
                          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                          settings.includeEntities ? "bg-primary" : "bg-gray-200"
                        )}
                      >
                        <span
                          className={cn(
                            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                            settings.includeEntities ? "translate-x-6" : "translate-x-1"
                          )}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Selected Result Details */}
          {selectedResult && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Analysis Details</h3>
              </div>
              <div className="card-content space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Overall Sentiment</h4>
                  <div className="flex items-center gap-3">
                    {getSentimentIcon(selectedResult.overall)}
                    <span className={cn(
                      "text-sm px-2 py-1 rounded-full font-medium",
                      getSentimentColor(selectedResult.overall)
                    )}>
                      {selectedResult.overall.label}
                    </span>
                    <div className="flex-1 bg-muted rounded-full h-3">
                      <div
                        className={cn(
                          "h-3 rounded-full transition-all",
                          selectedResult.overall.label === 'positive' ? 'bg-green-500' :
                          selectedResult.overall.label === 'negative' ? 'bg-red-500' : 'bg-gray-500'
                        )}
                        style={{ width: `${Math.abs(selectedResult.overall.score) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">
                      {formatPercentage(selectedResult.overall.confidence)}
                    </span>
                  </div>
                </div>

                {selectedResult.emotions && selectedResult.emotions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Emotions</h4>
                    <div className="space-y-2">
                      {selectedResult.emotions.slice(0, 5).map((emotion) => {
                        const emotionConfig = emotions.find(e => e.name === emotion.emotion)
                        return (
                          <div key={emotion.emotion} className="flex items-center justify-between">
                            <span className={cn(
                              "text-sm px-2 py-1 rounded-full",
                              emotionConfig?.color || "bg-gray-100 text-gray-800"
                            )}>
                              {emotionConfig?.icon} {emotion.emotion}
                            </span>
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary transition-all"
                                  style={{ width: `${emotion.intensity * 100}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium">
                                {formatPercentage(emotion.intensity)}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {selectedResult.keywords && selectedResult.keywords.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Key Words</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedResult.keywords.slice(0, 8).map((keyword, index) => (
                        <span
                          key={index}
                          className={cn(
                            "text-xs px-2 py-1 rounded-full",
                            keyword.sentiment === 'positive' ? 'bg-green-100 text-green-800' :
                            keyword.sentiment === 'negative' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                          )}
                        >
                          {keyword.word}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Sentiment Score:</span>
                    <div className="font-medium">{selectedResult.overall.score.toFixed(3)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Confidence:</span>
                    <div className="font-medium">{formatPercentage(selectedResult.overall.confidence)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Emotions:</span>
                    <div className="font-medium">{selectedResult.emotions?.length || 0}</div>
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
                <span>Total Analyses</span>
                <span className="font-medium">{results.length}</span>
              </div>
              {results.length > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span>Positive</span>
                    <span className="font-medium text-green-600">
                      {results.filter(r => r.overall.label === 'positive').length}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Negative</span>
                    <span className="font-medium text-red-600">
                      {results.filter(r => r.overall.label === 'negative').length}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Neutral</span>
                    <span className="font-medium text-gray-600">
                      {results.filter(r => r.overall.label === 'neutral').length}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Avg. Confidence</span>
                    <span className="font-medium">
                      {formatPercentage(results.reduce((sum, r) => sum + r.overall.confidence, 0) / results.length)}
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

export default SentimentAnalysis