import { useCallback, useRef, useState, useEffect } from 'react'
import { AIEngine } from '../../core/ai-engine'
import {
  GenerateOptions,
  SummarizeOptions,
  Classification,
  ImageGenerationOptions,
  ImageResult,
  TranscriptionOptions,
  TranscriptionResult,
  SpeechOptions,
  CodeGenerationOptions,
  CodeResult,
  AIConfig
} from '../../types'

interface UseAIOptions {
  config?: Partial<AIConfig>
  onError?: (error: Error) => void
  debug?: boolean
}

interface UseAIReturn {
  // Text operations
  generateText: (prompt: string, options?: GenerateOptions) => Promise<string>
  generateStream: (prompt: string, options?: GenerateOptions) => AsyncGenerator<string>
  summarize: (text: string, options?: SummarizeOptions) => Promise<string>
  classifyText: (text: string, labels: string[]) => Promise<Classification>
  
  // Embeddings
  generateEmbedding: (text: string) => Promise<number[]>
  
  // Images
  generateImage: (prompt: string, options?: ImageGenerationOptions) => Promise<ImageResult>
  
  // Audio
  transcribeAudio: (audio: Blob, options?: TranscriptionOptions) => Promise<TranscriptionResult>
  generateSpeech: (text: string, options?: SpeechOptions) => Promise<Blob>
  
  // Code
  generateCode: (prompt: string, options?: CodeGenerationOptions) => Promise<CodeResult>
  
  // State
  loading: boolean
  error: Error | null
  
  // Stats
  stats: any
  
  // Control
  updateConfig: (config: Partial<AIConfig>) => Promise<void>
  reset: () => Promise<void>
}

// Global AI engine instance
let globalEngine: AIEngine | null = null

export function useAI(options?: UseAIOptions): UseAIReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [stats, setStats] = useState<any>(null)
  const engineRef = useRef<AIEngine>()
  
  // Initialize engine
  useEffect(() => {
    if (!engineRef.current) {
      if (!globalEngine) {
        globalEngine = new AIEngine({
          provider: 'openai',
          ...options?.config,
          debug: options?.debug
        })
      }
      engineRef.current = globalEngine
    }
    
    // Update stats periodically
    const interval = setInterval(() => {
      if (engineRef.current) {
        setStats(engineRef.current.getStats())
      }
    }, 5000)
    
    return () => clearInterval(interval)
  }, [options?.config, options?.debug])
  
  // Error handler
  const handleError = useCallback((err: Error) => {
    setError(err)
    options?.onError?.(err)
  }, [options])
  
  // Wrap async operations
  const wrapAsync = useCallback(async <T,>(
    operation: () => Promise<T>
  ): Promise<T> => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await operation()
      return result
    } catch (err) {
      const error = err as Error
      handleError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [handleError])
  
  // Text generation
  const generateText = useCallback(async (
    prompt: string,
    genOptions?: GenerateOptions
  ): Promise<string> => {
    return wrapAsync(() => engineRef.current!.generateText(prompt, genOptions))
  }, [wrapAsync])
  
  // Stream generation
  const generateStream = useCallback(async function* (
    prompt: string,
    genOptions?: GenerateOptions
  ): AsyncGenerator<string> {
    setLoading(true)
    setError(null)
    
    try {
      yield* engineRef.current!.generateStream(prompt, genOptions)
    } catch (err) {
      handleError(err as Error)
      throw err
    } finally {
      setLoading(false)
    }
  }, [handleError])
  
  // Summarization
  const summarize = useCallback(async (
    text: string,
    sumOptions?: SummarizeOptions
  ): Promise<string> => {
    return wrapAsync(() => engineRef.current!.summarize(text, sumOptions))
  }, [wrapAsync])
  
  // Classification
  const classifyText = useCallback(async (
    text: string,
    labels: string[]
  ): Promise<Classification> => {
    return wrapAsync(() => engineRef.current!.classifyText(text, labels))
  }, [wrapAsync])
  
  // Embeddings
  const generateEmbedding = useCallback(async (
    text: string
  ): Promise<number[]> => {
    return wrapAsync(() => engineRef.current!.generateEmbedding(text))
  }, [wrapAsync])
  
  // Image generation
  const generateImage = useCallback(async (
    prompt: string,
    imgOptions?: ImageGenerationOptions
  ): Promise<ImageResult> => {
    return wrapAsync(() => engineRef.current!.generateImage(prompt, imgOptions))
  }, [wrapAsync])
  
  // Audio transcription
  const transcribeAudio = useCallback(async (
    audio: Blob,
    transcriptionOptions?: TranscriptionOptions
  ): Promise<TranscriptionResult> => {
    return wrapAsync(() => engineRef.current!.transcribeAudio(audio, transcriptionOptions))
  }, [wrapAsync])
  
  // Speech generation
  const generateSpeech = useCallback(async (
    text: string,
    speechOptions?: SpeechOptions
  ): Promise<Blob> => {
    return wrapAsync(() => engineRef.current!.generateSpeech(text, speechOptions))
  }, [wrapAsync])
  
  // Code generation
  const generateCode = useCallback(async (
    prompt: string,
    codeOptions?: CodeGenerationOptions
  ): Promise<CodeResult> => {
    return wrapAsync(() => engineRef.current!.generateCode(prompt, codeOptions))
  }, [wrapAsync])
  
  // Configuration update
  const updateConfig = useCallback(async (
    config: Partial<AIConfig>
  ): Promise<void> => {
    return wrapAsync(() => engineRef.current!.updateConfig(config))
  }, [wrapAsync])
  
  // Reset
  const reset = useCallback(async (): Promise<void> => {
    return wrapAsync(() => engineRef.current!.reset())
  }, [wrapAsync])
  
  return {
    generateText,
    generateStream,
    summarize,
    classifyText,
    generateEmbedding,
    generateImage,
    transcribeAudio,
    generateSpeech,
    generateCode,
    loading,
    error,
    stats,
    updateConfig,
    reset
  }
}

// Hook for chat functionality
export function useAIChat(systemPrompt?: string) {
  const [messages, setMessages] = useState<Array<{
    id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    timestamp: Date
  }>>([])
  
  const { generateText, loading, error } = useAI()
  
  const sendMessage = useCallback(async (content: string) => {
    // Add user message
    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content,
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, userMessage])
    
    // Build conversation context
    const conversation = messages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n')
    
    const prompt = `${conversation}\nuser: ${content}\nassistant:`
    
    try {
      const response = await generateText(prompt, {
        systemPrompt: systemPrompt || 'You are a helpful AI assistant.',
        maxTokens: 1000
      })
      
      // Add assistant message
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: response,
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, assistantMessage])
      
      return response
    } catch (error) {
      // Error is already handled by useAI
      throw error
    }
  }, [messages, generateText, systemPrompt])
  
  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])
  
  return {
    messages,
    sendMessage,
    clearMessages,
    loading,
    error
  }
}

// Hook for embeddings and similarity search
export function useAIEmbeddings() {
  const { generateEmbedding } = useAI()
  
  const findSimilar = useCallback(async (
    query: string,
    items: Array<{ id: string; text: string }>,
    topK: number = 5
  ) => {
    // Generate embeddings for query
    const queryEmbedding = await generateEmbedding(query)
    
    // Generate embeddings for all items
    const itemEmbeddings = await Promise.all(
      items.map(item => generateEmbedding(item.text))
    )
    
    // Calculate similarities
    const similarities = items.map((item, i) => ({
      ...item,
      similarity: cosineSimilarity(queryEmbedding, itemEmbeddings[i])
    }))
    
    // Sort by similarity
    similarities.sort((a, b) => b.similarity - a.similarity)
    
    return similarities.slice(0, topK)
  }, [generateEmbedding])
  
  return {
    generateEmbedding,
    findSimilar
  }
}

// Utility function for cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0
  let normA = 0
  let normB = 0
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}