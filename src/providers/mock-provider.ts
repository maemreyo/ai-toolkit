import { BaseProvider, ProviderConfig } from './base-provider'
import {
  GenerateOptions,
  SummarizeOptions,
  Classification,
  SentimentAnalysis,
  ImageGenerationOptions,
  ImageResult,
  CodeGenerationOptions,
  CodeResult
} from '../types'

interface MockProviderOptions extends ProviderConfig {
  delay?: number
  shouldFail?: boolean
  failureRate?: number
  responses?: Map<string, string>
}

export class MockProvider extends BaseProvider {
  private delay: number
  private shouldFail: boolean
  private failureRate: number
  private responses: Map<string, string>
  private requestCount = 0

  constructor(config: MockProviderOptions) {
    super(config)
    this.delay = config.delay || 100
    this.shouldFail = config.shouldFail || false
    this.failureRate = config.failureRate || 0
    this.responses = config.responses || new Map()
  }

  protected getDefaultModel(): string {
    return 'mock-model-v1'
  }

  /**
   * Simulate delay
   */
  private async simulateDelay(customDelay?: number): Promise<void> {
    const delayTime = customDelay || this.delay
    if (delayTime > 0) {
      await new Promise(resolve => setTimeout(resolve, delayTime))
    }
  }

  /**
   * Check if request should fail
   */
  private shouldFailRequest(): boolean {
    this.requestCount++
    
    if (this.shouldFail) return true
    
    if (this.failureRate > 0) {
      return Math.random() < this.failureRate
    }
    
    return false
  }

  /**
   * Generate text completion
   */
  async generateText(prompt: string, options?: GenerateOptions): Promise<string> {
    await this.simulateDelay()
    
    if (this.shouldFailRequest()) {
      throw new Error('Mock provider error: Simulated failure')
    }

    // Check for predefined response
    const predefinedResponse = this.responses.get(prompt)
    if (predefinedResponse) {
      return predefinedResponse
    }

    // Generate mock response
    const temperature = options?.temperature || 0.7
    const variation = temperature > 0.5 ? ' (creative mode)' : ' (precise mode)'
    
    return `Mock response to: "${prompt.substring(0, 50)}..."${variation}
Model: ${this.getModel(options)}
Max tokens: ${options?.maxTokens || 'default'}
System: ${options?.systemPrompt || 'none'}
Generated at: ${new Date().toISOString()}`
  }

  /**
   * Generate streaming text completion
   */
  async *generateStream(prompt: string, options?: GenerateOptions): AsyncGenerator<string> {
    const response = await this.generateText(prompt, options)
    const words = response.split(' ')
    
    for (const word of words) {
      await this.simulateDelay(20)
      yield word + ' '
    }
  }

  /**
   * Generate embeddings
   */
  async generateEmbedding(text: string): Promise<number[]> {
    await this.simulateDelay()
    
    if (this.shouldFailRequest()) {
      throw new Error('Mock provider error: Embedding generation failed')
    }

    // Generate deterministic mock embedding based on text
    const hash = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const embedding = new Array(1536).fill(0).map((_, i) => {
      return Math.sin(hash + i) * 0.1 + Math.cos(hash - i) * 0.05
    })
    
    return embedding
  }

  /**
   * Classify text
   */
  async classifyText(text: string, labels: string[]): Promise<Classification> {
    await this.simulateDelay()
    
    if (this.shouldFailRequest()) {
      throw new Error('Mock provider error: Classification failed')
    }

    // Mock classification based on text length and content
    const textLength = text.length
    const hasPositiveWords = /good|great|excellent|happy|love/i.test(text)
    const hasNegativeWords = /bad|terrible|hate|awful|poor/i.test(text)
    
    let selectedIndex = textLength % labels.length
    if (hasPositiveWords && labels.includes('positive')) {
      selectedIndex = labels.indexOf('positive')
    } else if (hasNegativeWords && labels.includes('negative')) {
      selectedIndex = labels.indexOf('negative')
    }
    
    const scores = labels.reduce((acc, label, i) => {
      acc[label] = i === selectedIndex ? 0.8 + Math.random() * 0.15 : Math.random() * 0.2
      return acc
    }, {} as Record<string, number>)
    
    // Normalize scores
    const total = Object.values(scores).reduce((sum, score) => sum + score, 0)
    Object.keys(scores).forEach(key => {
      scores[key] = scores[key] / total
    })
    
    return {
      label: labels[selectedIndex],
      confidence: scores[labels[selectedIndex]],
      scores
    }
  }

  /**
   * Summarize text
   */
  async summarize(text: string, options?: SummarizeOptions): Promise<string> {
    await this.simulateDelay()
    
    if (this.shouldFailRequest()) {
      throw new Error('Mock provider error: Summarization failed')
    }

    const words = text.split(' ')
    const style = options?.style || 'paragraph'
    
    switch (style) {
      case 'bullet':
        return `• First point about "${words.slice(0, 5).join(' ')}..."
• Key insight from the middle section
• Final conclusion regarding "${words.slice(-5).join(' ')}"`
      
      case 'tldr':
        return `TL;DR: ${words.slice(0, 10).join(' ')}... (${words.length} words total)`
      
      case 'key-points':
        return `Key Points:
1. Main topic: ${words[0]}
2. Important detail: ${words[Math.floor(words.length / 2)]}
3. Conclusion: ${words[words.length - 1]}`
      
      case 'executive':
        return `Executive Summary: This document discusses ${words.slice(0, 5).join(' ')}. 
The analysis reveals important insights about the subject matter. 
Strategic recommendations include further investigation of key areas.`
      
      default:
        return `Summary: ${words.slice(0, 20).join(' ')}... 
The text contains ${words.length} words and covers various topics.`
    }
  }

  /**
   * Analyze sentiment
   */
  async analyzeSentiment(text: string): Promise<SentimentAnalysis> {
    await this.simulateDelay()
    
    if (this.shouldFailRequest()) {
      throw new Error('Mock provider error: Sentiment analysis failed')
    }

    const positiveWords = (text.match(/good|great|excellent|happy|love|wonderful/gi) || []).length
    const negativeWords = (text.match(/bad|terrible|hate|awful|poor|horrible/gi) || []).length
    const totalWords = text.split(' ').length
    
    let sentiment: 'positive' | 'negative' | 'neutral' | 'mixed'
    let score: number
    
    if (positiveWords > negativeWords * 2) {
      sentiment = 'positive'
      score = 0.7 + Math.random() * 0.25
    } else if (negativeWords > positiveWords * 2) {
      sentiment = 'negative'
      score = 0.2 + Math.random() * 0.2
    } else if (positiveWords > 0 && negativeWords > 0) {
      sentiment = 'mixed'
      score = 0.4 + Math.random() * 0.2
    } else {
      sentiment = 'neutral'
      score = 0.45 + Math.random() * 0.1
    }
    
    return {
      sentiment,
      score,
      aspects: [
        {
          aspect: 'tone',
          sentiment: sentiment,
          score: score
        }
      ]
    }
  }

  /**
   * Generate image
   */
  async generateImage(prompt: string, options?: ImageGenerationOptions): Promise<ImageResult> {
    await this.simulateDelay(500) // Longer delay for image generation
    
    if (this.shouldFailRequest()) {
      throw new Error('Mock provider error: Image generation failed')
    }

    const size = options?.size || '1024x1024'
    const style = options?.style || 'realistic'
    
    return {
      url: `https://picsum.photos/${size.split('x')[0]}/${size.split('x')[1]}?random=${Date.now()}`,
      base64: undefined,
      revisedPrompt: `Enhanced prompt: ${prompt} in ${style} style`,
      metadata: {
        model: 'mock-dalle',
        size,
        style,
        seed: options?.seed || Math.floor(Math.random() * 1000000)
      }
    }
  }

  /**
   * Generate code
   */
  async generateCode(prompt: string, options?: CodeGenerationOptions): Promise<CodeResult> {
    await this.simulateDelay()
    
    if (this.shouldFailRequest()) {
      throw new Error('Mock provider error: Code generation failed')
    }

    const language = options?.language || 'javascript'
    const includeComments = options?.includeComments ?? true
    
    const code = `${includeComments ? '// Mock generated code\n' : ''}
function mockFunction() {
  ${includeComments ? '// Implementation for: ' + prompt.substring(0, 50) + '\n  ' : ''}
  console.log("This is mock generated code");
  return {
    prompt: "${prompt.substring(0, 30)}...",
    language: "${language}",
    timestamp: new Date().toISOString()
  };
}`

    const tests = options?.includeTests ? `
describe('mockFunction', () => {
  it('should return expected output', () => {
    const result = mockFunction();
    expect(result).toBeDefined();
    expect(result.language).toBe('${language}');
  });
});` : undefined

    return {
      code,
      language,
      explanation: `This is a mock implementation for: ${prompt}`,
      tests,
      dependencies: language === 'javascript' ? [] : ['mock-dependency']
    }
  }

  /**
   * Explain code
   */
  async explainCode(code: string, language?: string): Promise<string> {
    await this.simulateDelay()
    
    if (this.shouldFailRequest()) {
      throw new Error('Mock provider error: Code explanation failed')
    }

    const lines = code.split('\n').length
    const hasFunction = /function|=>|def|fn/.test(code)
    const hasClass = /class|struct|interface/.test(code)
    
    return `Mock Code Explanation:

This ${language || 'code'} snippet contains ${lines} lines.

Key observations:
${hasFunction ? '- Contains function definitions\n' : ''}${hasClass ? '- Defines class or structural types\n' : ''}- Uses ${language || 'modern programming'} syntax
- Implements mock functionality for testing

The code structure suggests it's designed for demonstration purposes.
In a real implementation, this would ${hasFunction ? 'execute the defined functions' : 'define the specified behavior'}.

Mock analysis completed at: ${new Date().toISOString()}`
  }

  /**
   * Configure mock behavior
   */
  configure(options: Partial<MockProviderOptions>): void {
    if (options.delay !== undefined) this.delay = options.delay
    if (options.shouldFail !== undefined) this.shouldFail = options.shouldFail
    if (options.failureRate !== undefined) this.failureRate = options.failureRate
    if (options.responses) {
      options.responses.forEach((value, key) => {
        this.responses.set(key, value)
      })
    }
  }

  /**
   * Get request statistics
   */
  getStats() {
    return {
      totalRequests: this.requestCount,
      failureRate: this.failureRate,
      shouldFail: this.shouldFail,
      averageDelay: this.delay,
      predefinedResponses: this.responses.size
    }
  }

  /**
   * Reset mock provider
   */
  reset(): void {
    this.requestCount = 0
    this.responses.clear()
    this.shouldFail = false
    this.failureRate = 0
  }
}