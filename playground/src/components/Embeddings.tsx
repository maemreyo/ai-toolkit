import React, { useState, useRef } from 'react'
import {
  Brain,
  Search,
  Upload,
  Download,
  Copy,
  RefreshCw,
  Settings,
  Zap,
  FileText,
  BarChart3,
  Database,
  Target,
  Layers,
  Plus,
  Trash2,
  Eye
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAI } from '@matthew.ngo/ai-toolkit/react'
import { cn, copyToClipboard, downloadFile, formatNumber } from '../lib/utils'

interface EmbeddingSettings {
  model: string
  dimensions: number
  normalize: boolean
  batchSize: number
}

interface EmbeddingDocument {
  id: string
  text: string
  embedding: number[]
  metadata?: { [key: string]: any }
  timestamp: Date
}

interface SearchResult {
  document: EmbeddingDocument
  similarity: number
}

const models = [
  { id: 'text-embedding-3-small', name: 'OpenAI Ada v3 Small', provider: 'OpenAI', dimensions: 1536 },
  { id: 'text-embedding-3-large', name: 'OpenAI Ada v3 Large', provider: 'OpenAI', dimensions: 3072 },
  { id: 'text-embedding-ada-002', name: 'OpenAI Ada v2', provider: 'OpenAI', dimensions: 1536 },
  { id: 'sentence-transformers', name: 'Sentence Transformers', provider: 'HuggingFace', dimensions: 768 },
  { id: 'mock-model', name: 'Mock Model', provider: 'Demo', dimensions: 512 }
]

const sampleDocuments = [
  "Artificial intelligence is transforming various industries including healthcare, finance, and transportation.",
  "Machine learning algorithms can identify patterns in large datasets that humans might miss.",
  "Natural language processing enables computers to understand and generate human language.",
  "Computer vision technology allows machines to interpret and analyze visual information.",
  "Deep learning uses neural networks with multiple layers to learn complex representations.",
  "Data science combines statistics, programming, and domain expertise to extract insights from data.",
  "Cloud computing provides on-demand access to computing resources over the internet.",
  "Cybersecurity protects digital systems from threats and unauthorized access.",
  "Blockchain technology creates secure and transparent distributed ledgers.",
  "Internet of Things (IoT) connects everyday devices to the internet for smart automation."
]

const Embeddings: React.FC = () => {
  const [newDocText, setNewDocText] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [documents, setDocuments] = useState<EmbeddingDocument[]>([])
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [selectedDocument, setSelectedDocument] = useState<EmbeddingDocument | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [settings, setSettings] = useState<EmbeddingSettings>({
    model: 'mock-model',
    dimensions: 512,
    normalize: true,
    batchSize: 100
  })

  const { generateEmbedding, searchSimilar, loading, error } = useAI({
    config: JSON.parse(localStorage.getItem('ai-toolkit-config') || '{}'),
    onError: (err) => {
      toast.error(`Embedding operation failed: ${err.message}`)
      setIsGenerating(false)
      setIsSearching(false)
    }
  })

  // Mock embedding generation for demo
  const generateMockEmbedding = (text: string): number[] => {
    const embedding: number[] = []
    const hash = text.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0)

    for (let i = 0; i < settings.dimensions; i++) {
      const seed = (hash + i) * 0.1
      embedding.push(Math.sin(seed) * Math.cos(seed * 0.7) + Math.random() * 0.1 - 0.05)
    }

    if (settings.normalize) {
      const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
      return embedding.map(val => val / magnitude)
    }

    return embedding
  }

  // Calculate cosine similarity
  const cosineSimilarity = (a: number[], b: number[]): number => {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0)
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))
    return dotProduct / (magnitudeA * magnitudeB)
  }

  const handleAddDocument = async () => {
    if (!newDocText.trim()) {
      toast.error('Please enter document text')
      return
    }

    setIsGenerating(true)

    try {
      // For demo purposes, generate mock embedding
      await new Promise(resolve => setTimeout(resolve, 1000))

      const embedding = generateMockEmbedding(newDocText)

      const document: EmbeddingDocument = {
        id: `doc_${Date.now()}`,
        text: newDocText,
        embedding,
        metadata: {
          length: newDocText.length,
          words: newDocText.split(/\s+/).length
        },
        timestamp: new Date()
      }

      setDocuments(prev => [document, ...prev])
      setNewDocText('')
      toast.success('Document embedded and added!')
    } catch (err) {
      // Error handled by hook
    } finally {
      setIsGenerating(false)
    }
  }

  const handleBulkAdd = async () => {
    setIsGenerating(true)

    try {
      const newDocs: EmbeddingDocument[] = []

      for (const text of sampleDocuments) {
        await new Promise(resolve => setTimeout(resolve, 100)) // Small delay for demo

        const embedding = generateMockEmbedding(text)
        const document: EmbeddingDocument = {
          id: `doc_${Date.now()}_${Math.random()}`,
          text,
          embedding,
          metadata: {
            length: text.length,
            words: text.split(/\s+/).length,
            source: 'sample'
          },
          timestamp: new Date()
        }
        newDocs.push(document)
      }

      setDocuments(prev => [...newDocs, ...prev])
      toast.success(`Added ${newDocs.length} sample documents!`)
    } catch (err) {
      // Error handled by hook
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search query')
      return
    }

    if (documents.length === 0) {
      toast.error('No documents to search')
      return
    }

    setIsSearching(true)

    try {
      await new Promise(resolve => setTimeout(resolve, 500))

      const queryEmbedding = generateMockEmbedding(searchQuery)

      const results: SearchResult[] = documents
        .map(doc => ({
          document: doc,
          similarity: cosineSimilarity(queryEmbedding, doc.embedding)
        }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 10) // Top 10 results

      setSearchResults(results)
      toast.success(`Found ${results.length} similar documents`)
    } catch (err) {
      // Error handled by hook
    } finally {
      setIsSearching(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('text/')) {
      toast.error('Please select a text file')
      return
    }

    setIsGenerating(true)

    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim().length > 0)

      const newDocs: EmbeddingDocument[] = []

      for (const line of lines.slice(0, settings.batchSize)) {
        const embedding = generateMockEmbedding(line)
        const document: EmbeddingDocument = {
          id: `doc_${Date.now()}_${Math.random()}`,
          text: line,
          embedding,
          metadata: {
            length: line.length,
            words: line.split(/\s+/).length,
            source: file.name
          },
          timestamp: new Date()
        }
        newDocs.push(document)

        await new Promise(resolve => setTimeout(resolve, 50))
      }

      setDocuments(prev => [...newDocs, ...prev])
      toast.success(`Processed ${newDocs.length} documents from ${file.name}`)
    } catch (err) {
      toast.error('Failed to process file')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDeleteDocument = (id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id))
    setSearchResults(prev => prev.filter(result => result.document.id !== id))
    if (selectedDocument?.id === id) {
      setSelectedDocument(null)
    }
    toast.success('Document deleted')
  }

  const handleCopyEmbedding = async (embedding: number[]) => {
    try {
      await copyToClipboard(JSON.stringify(embedding))
      toast.success('Embedding vector copied to clipboard!')
    } catch (err) {
      toast.error('Failed to copy embedding')
    }
  }

  const handleExportDocuments = () => {
    if (documents.length === 0) {
      toast.error('No documents to export')
      return
    }

    const data = {
      documents: documents.map(doc => ({
        id: doc.id,
        text: doc.text,
        embedding: doc.embedding,
        metadata: doc.metadata,
        timestamp: doc.timestamp.toISOString()
      })),
      settings,
      exportedAt: new Date().toISOString()
    }

    downloadFile(JSON.stringify(data, null, 2), 'embeddings-export.json', 'application/json')
    toast.success('Documents exported!')
  }

  const handleSettingChange = (key: keyof EmbeddingSettings, value: any) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value }

      // Update dimensions when model changes
      if (key === 'model') {
        const model = models.find(m => m.id === value)
        if (model) {
          newSettings.dimensions = model.dimensions
        }
      }

      return newSettings
    })
  }

  const formatSimilarity = (similarity: number) => {
    return (similarity * 100).toFixed(1) + '%'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Brain className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Embeddings & Vector Search</h1>
            <p className="text-muted-foreground">Generate embeddings and perform semantic search</p>
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
            onClick={handleExportDocuments}
            disabled={documents.length === 0}
            className="btn-outline"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Add Documents */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Add Documents</h3>
              <p className="card-description">Add text documents to the embedding database</p>
            </div>
            <div className="card-content space-y-4">
              <textarea
                value={newDocText}
                onChange={(e) => setNewDocText(e.target.value)}
                placeholder="Enter document text to embed..."
                className="textarea min-h-[100px] resize-none"
                disabled={isGenerating}
              />

              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={handleAddDocument}
                    disabled={isGenerating || !newDocText.trim()}
                    className="btn-primary"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Embedding...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Document
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleBulkAdd}
                    disabled={isGenerating}
                    className="btn-outline"
                  >
                    <Database className="h-4 w-4 mr-2" />
                    Add Samples
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isGenerating}
                    className="btn-outline"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload File
                  </button>
                </div>

                <div className="text-sm text-muted-foreground">
                  {newDocText.length} characters
                </div>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Semantic Search</h3>
              <p className="card-description">Search for similar documents using natural language</p>
            </div>
            <div className="card-content space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter search query..."
                  className="input flex-1"
                  disabled={isSearching}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button
                  onClick={handleSearch}
                  disabled={isSearching || !searchQuery.trim() || documents.length === 0}
                  className="btn-primary"
                >
                  {isSearching ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Search Results</h4>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {searchResults.map((result, index) => (
                      <div
                        key={result.document.id}
                        className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => setSelectedDocument(result.document)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">#{index + 1}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-green-600">
                              {formatSimilarity(result.similarity)}
                            </span>
                            <div
                              className="w-16 h-2 bg-muted rounded-full overflow-hidden"
                            >
                              <div
                                className="h-full bg-green-500 transition-all"
                                style={{ width: `${result.similarity * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                        <p className="text-sm line-clamp-2">{result.document.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Documents List */}
          {documents.length > 0 && (
            <div className="card">
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <h3 className="card-title">Document Database</h3>
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{documents.length} documents</span>
                  </div>
                </div>
              </div>
              <div className="card-content">
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className={cn(
                        "flex items-center justify-between p-3 border rounded-lg transition-colors cursor-pointer",
                        selectedDocument?.id === doc.id
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      )}
                      onClick={() => setSelectedDocument(doc)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{doc.text}</p>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                          <span>{doc.metadata?.words} words</span>
                          <span>{doc.timestamp.toLocaleTimeString()}</span>
                          {doc.metadata?.source && <span>Source: {doc.metadata.source}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedDocument(doc)
                          }}
                          className="btn-ghost btn-sm"
                        >
                          <Eye className="h-3 w-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteDocument(doc.id)
                          }}
                          className="btn-ghost btn-sm text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Settings & Details Panel */}
        <div className="space-y-4">
          {showSettings && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Embedding Settings</h3>
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
                  <label className="text-sm font-medium">Dimensions</label>
                  <input
                    type="number"
                    value={settings.dimensions}
                    onChange={(e) => handleSettingChange('dimensions', parseInt(e.target.value))}
                    className="input"
                    min="128"
                    max="4096"
                    step="64"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Batch Size</label>
                  <input
                    type="number"
                    value={settings.batchSize}
                    onChange={(e) => handleSettingChange('batchSize', parseInt(e.target.value))}
                    className="input"
                    min="1"
                    max="1000"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Normalize Vectors</label>
                  <button
                    onClick={() => handleSettingChange('normalize', !settings.normalize)}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                      settings.normalize ? "bg-primary" : "bg-gray-200"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                        settings.normalize ? "translate-x-6" : "translate-x-1"
                      )}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Document Details */}
          {selectedDocument && (
            <div className="card">
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <h3 className="card-title">Document Details</h3>
                  <button
                    onClick={() => handleCopyEmbedding(selectedDocument.embedding)}
                    className="btn-outline btn-sm"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="card-content space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Text</h4>
                  <div className="bg-muted/50 p-3 rounded-md text-sm max-h-32 overflow-y-auto">
                    {selectedDocument.text}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Embedding Vector</h4>
                  <div className="bg-muted/50 p-3 rounded-md">
                    <div className="text-xs text-muted-foreground mb-2">
                      {selectedDocument.embedding.length} dimensions
                    </div>
                    <div className="grid grid-cols-8 gap-1 max-h-24 overflow-y-auto">
                      {selectedDocument.embedding.slice(0, 64).map((val, i) => (
                        <div
                          key={i}
                          className="w-2 h-2 rounded-full"
                          style={{
                            backgroundColor: `hsl(${(val + 1) * 180}, 70%, 50%)`,
                            opacity: Math.abs(val)
                          }}
                          title={`[${i}]: ${val.toFixed(4)}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Length:</span>
                    <div className="font-medium">{selectedDocument.metadata?.length} chars</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Words:</span>
                    <div className="font-medium">{selectedDocument.metadata?.words}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Created:</span>
                    <div className="font-medium">{selectedDocument.timestamp.toLocaleTimeString()}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Vector Norm:</span>
                    <div className="font-medium">
                      {Math.sqrt(selectedDocument.embedding.reduce((sum, val) => sum + val * val, 0)).toFixed(4)}
                    </div>
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
                <span>Total Documents</span>
                <span className="font-medium">{formatNumber(documents.length)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Vector Dimensions</span>
                <span className="font-medium">{settings.dimensions}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Current Model</span>
                <span className="font-medium">
                  {models.find(m => m.id === settings.model)?.name}
                </span>
              </div>
              {documents.length > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span>Storage Size</span>
                    <span className="font-medium">
                      ~{((documents.length * settings.dimensions * 4) / 1024 / 1024).toFixed(1)} MB
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Last Search</span>
                    <span className="font-medium">
                      {searchResults.length > 0 ? `${searchResults.length} results` : 'None'}
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

export default Embeddings