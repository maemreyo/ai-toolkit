import OpenAI from 'openai'
import { BaseProvider, ProviderConfig } from './base-provider'
import {
  GenerateOptions,
  SummarizeOptions,
  Classification,
  ImageGenerationOptions,
  ImageResult,
  TranscriptionOptions,
  TranscriptionResult,
  SpeechOptions,
  TokenUsage
} from '../types'

export class OpenAIProvider extends BaseProvider {
  private client: OpenAI

  constructor(config: ProviderConfig) {
    super(config)
    this.validateApiKey()
    
    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries || 2
    })
  }

  protected getDefaultModel(): string {
    return 'gpt-3.5-turbo'
  }

  /**
   * Generate text completion
   */
  async generateText(prompt: string, options?: GenerateOptions): Promise<string> {
    const model = this.getModel(options)
    
    const completion = await this.client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: options?.systemPrompt || 'You are a helpful assistant.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: options?.maxTokens,
      temperature: options?.temperature,
      top_p: options?.topP,
      frequency_penalty: options?.frequencyPenalty,
      presence_penalty: options?.presencePenalty,
      stop: options?.stopSequences,
      seed: options?.seed,
      response_format: options?.responseFormat,
      functions: options?.functions as any,
      stream: false
    })

    return completion.choices[0].message.content || ''
  }

  /**
   * Generate streaming text completion
   */
  async *generateStream(prompt: string, options?: GenerateOptions): AsyncGenerator<string> {
    const model = this.getModel(options)
    
    const stream = await this.client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: options?.systemPrompt || 'You are a helpful assistant.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: options?.maxTokens,
      temperature: options?.temperature,
      top_p: options?.topP,
      frequency_penalty: options?.frequencyPenalty,
      presence_penalty: options?.presencePenalty,
      stop: options?.stopSequences,
      seed: options?.seed,
      stream: true
    })

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content
      if (content) {
        yield content
      }
    }
  }

  /**
   * Generate embeddings
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text
    })

    return response.data[0].embedding
  }

  /**
   * Classify text (using completion)
   */
  async classifyText(text: string, labels: string[]): Promise<Classification> {
    const prompt = `Classify the following text into one of these categories: ${labels.join(', ')}.

Text: "${text}"

Respond with a JSON object containing:
- label: the chosen category
- confidence: a number between 0 and 1
- scores: an object with confidence scores for each category

Response:`

    const response = await this.generateText(prompt, {
      temperature: 0,
      maxTokens: 200,
      responseFormat: { type: 'json_object' }
    })

    try {
      return JSON.parse(response)
    } catch {
      // Fallback if JSON parsing fails
      const label = labels[0]
      return {
        label,
        confidence: 0.5,
        scores: labels.reduce((acc, l) => ({
          ...acc,
          [l]: l === label ? 0.5 : 0.5 / (labels.length - 1)
        }), {})
      }
    }
  }

  /**
   * Summarize text
   */
  async summarize(text: string, options?: SummarizeOptions): Promise<string> {
    const stylePrompts = {
      bullet: 'Create a bullet-point summary with key points.',
      paragraph: 'Write a concise paragraph summary.',
      tldr: 'Write a one-sentence TL;DR summary.',
      'key-points': 'Extract and list the most important key points.',
      executive: 'Write an executive summary suitable for business leaders.'
    }

    const prompt = `${stylePrompts[options?.style || 'paragraph']}

Text to summarize:
"${text}"

Summary:`

    return this.generateText(prompt, {
      maxTokens: options?.maxLength || 200,
      temperature: 0.3
    })
  }

  /**
   * Generate images
   */
  async generateImage(prompt: string, options?: ImageGenerationOptions): Promise<ImageResult> {
    const response = await this.client.images.generate({
      model: 'dall-e-3',
      prompt,
      n: options?.n || 1,
      size: options?.size || '1024x1024',
      quality: options?.quality || 'standard',
      style: options?.style === 'realistic' ? 'natural' : 'vivid',
      response_format: 'url'
    })

    const image = response.data[0]
    
    return {
      url: image.url,
      revisedPrompt: image.revised_prompt,
      metadata: {
        model: 'dall-e-3',
        size: options?.size || '1024x1024',
        quality: options?.quality || 'standard'
      }
    }
  }

  /**
   * Transcribe audio
   */
  async transcribeAudio(audio: Blob, options?: TranscriptionOptions): Promise<TranscriptionResult> {
    // Convert Blob to File
    const file = new File([audio], 'audio.webm', { type: audio.type })
    
    const transcription = await this.client.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: options?.language,
      response_format: options?.format === 'json' ? 'verbose_json' : 'text',
      timestamp_granularities: options?.timestamps ? ['word'] : undefined
    })

    if (typeof transcription === 'string') {
      return {
        text: transcription,
        language: options?.language
      }
    }

    return {
      text: transcription.text,
      language: transcription.language,
      duration: transcription.duration,
      words: transcription.words?.map(w => ({
        word: w.word,
        start: w.start,
        end: w.end
      }))
    }
  }

  /**
   * Generate speech
   */
  async generateSpeech(text: string, options?: SpeechOptions): Promise<Blob> {
    const response = await this.client.audio.speech.create({
      model: 'tts-1',
      input: text,
      voice: (options?.voice || 'alloy') as any,
      speed: options?.speed || 1.0,
      response_format: options?.format || 'mp3'
    })

    // Convert response to Blob
    const arrayBuffer = await response.arrayBuffer()
    return new Blob([arrayBuffer], { type: `audio/${options?.format || 'mp3'}` })
  }

  /**
   * Generate code
   */
  async generateCode(prompt: string, options?: CodeGenerationOptions): Promise<CodeResult> {
    const systemPrompt = `You are an expert programmer. Generate clean, efficient, and well-documented code.
${options?.includeComments ? 'Include helpful comments.' : 'Minimize comments.'}
${options?.includeTests ? 'Include unit tests.' : ''}
Style: ${options?.style || 'concise'}`

    const fullPrompt = `Language: ${options?.language || 'auto-detect'}
Framework: ${options?.framework || 'none'}

Task: ${prompt}

Respond with a JSON object containing:
- code: the generated code
- language: the programming language used
- explanation: brief explanation of the code
${options?.includeTests ? '- tests: unit test code' : ''}
- dependencies: array of required dependencies`

    const response = await this.generateText(fullPrompt, {
      systemPrompt,
      temperature: 0.2,
      maxTokens: 2000,
      responseFormat: { type: 'json_object' }
    })

    try {
      return JSON.parse(response)
    } catch {
      // Fallback
      return {
        code: response,
        language: options?.language || 'unknown',
        explanation: 'Generated code'
      }
    }
  }

  /**
   * Explain code
   */
  async explainCode(code: string, language?: string): Promise<string> {
    const prompt = `Explain the following ${language || 'code'} in detail:

\`\`\`${language || ''}
${code}
\`\`\`

Provide a clear explanation of:
1. What the code does
2. How it works
3. Any important concepts or patterns used
4. Potential improvements or issues`

    return this.generateText(prompt, {
      temperature: 0.3,
      maxTokens: 1000
    })
  }

  /**
   * Calculate token usage from OpenAI response
   */
  private extractTokenUsage(usage: any): TokenUsage {
    return {
      promptTokens: usage?.prompt_tokens || 0,
      completionTokens: usage?.completion_tokens || 0,
      totalTokens: usage?.total_tokens || 0
    }
  }
}