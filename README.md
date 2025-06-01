# AI Toolkit

A comprehensive, production-ready AI toolkit for JavaScript/TypeScript applications with multi-provider support, intelligent caching, rate limiting, and advanced features.

## Features

- 🤖 **Multi-Provider Support**: OpenAI, Anthropic, Google AI, and more
- 🚀 **Production Ready**: Rate limiting, retry logic, error handling
- 💾 **Smart Caching**: Reduce costs with intelligent response caching
- 📊 **Analytics & Monitoring**: Track usage, costs, and performance
- ⚛️ **React Hooks**: Easy integration for React applications
- 🔐 **Secure**: API key encryption and secure token management
- 🎯 **Type Safe**: Full TypeScript support with comprehensive types
- 🧪 **Testing Support**: Mock provider for development and testing

## Installation

```bash
npm install @matthew.ngo/ai-toolkit
# or
pnpm add @matthew.ngo/ai-toolkit
# or
yarn add @matthew.ngo/ai-toolkit
```

## Quick Start

### Basic Usage

```typescript
import { createAI } from '@matthew.ngo/ai-toolkit'

// Create AI instance with your API key
const ai = await createAI({
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY
})

// Generate text
const response = await ai.generateText('Write a haiku about coding')
console.log(response)

// Stream responses
for await (const chunk of ai.generateStream('Tell me a story')) {
  process.stdout.write(chunk)
}
```

### React Integration

```tsx
import { useAI } from '@matthew.ngo/ai-toolkit/react'

function MyComponent() {
  const { generateText, loading, error } = useAI({
    config: {
      provider: 'openai',
      apiKey: process.env.REACT_APP_OPENAI_API_KEY
    }
  })

  const handleGenerate = async () => {
    const result = await generateText('Hello, AI!')
    console.log(result)
  }

  return (
    <button onClick={handleGenerate} disabled={loading}>
      {loading ? 'Generating...' : 'Generate'}
    </button>
  )
}
```

## Providers

### OpenAI

```typescript
const ai = await createAI({
  provider: 'openai',
  apiKey: 'your-api-key',
  model: 'gpt-4', // or 'gpt-3.5-turbo'
  // Optional configurations
  baseUrl: 'https://api.openai.com/v1',
  maxRetries: 3,
  timeout: 30000
})
```

### Anthropic

```typescript
const ai = await createAI({
  provider: 'anthropic',
  apiKey: 'your-api-key',
  model: 'claude-3-opus-20240229'
})
```

### Google AI

```typescript
const ai = await createAI({
  provider: 'google',
  apiKey: 'your-api-key',
  model: 'gemini-pro'
})
```

### Mock Provider (for testing)

```typescript
const ai = await createAI({
  provider: 'mock',
  // Configure mock behavior
  delay: 100,
  responses: new Map([
    ['test prompt', 'mock response']
  ])
})
```

## Advanced Features

### Caching

```typescript
const ai = await createAI({
  provider: 'openai',
  apiKey: 'your-api-key',
  cache: {
    enabled: true,
    ttl: 3600000, // 1 hour
    maxSize: 100, // MB
    strategy: 'lru' // or 'lfu', 'fifo'
  }
})
```

### Rate Limiting

```typescript
const ai = await createAI({
  provider: 'openai',
  apiKey: 'your-api-key',
  rateLimit: {
    requestsPerMinute: 60,
    tokensPerMinute: 90000,
    concurrent: 5,
    strategy: 'sliding-window' // or 'fixed-window', 'token-bucket'
  }
})
```

### Retry Logic

```typescript
const ai = await createAI({
  provider: 'openai',
  apiKey: 'your-api-key',
  retry: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoff: 'exponential' // or 'linear', 'fixed'
  }
})
```

### Fallback Providers

```typescript
const ai = await createAI({
  provider: 'openai',
  apiKey: 'your-openai-key',
  fallbackProviders: ['anthropic', 'google'],
  apiKeys: {
    anthropic: 'your-anthropic-key',
    google: 'your-google-key'
  }
})
```

## API Reference

### Text Generation

```typescript
// Generate text
const text = await ai.generateText(prompt, {
  maxTokens: 1000,
  temperature: 0.7,
  systemPrompt: 'You are a helpful assistant'
})

// Stream text
for await (const chunk of ai.generateStream(prompt)) {
  console.log(chunk)
}

// Summarize
const summary = await ai.summarize(longText, {
  style: 'bullet', // or 'paragraph', 'tldr'
  maxLength: 200
})

// Classify
const result = await ai.classifyText(text, ['positive', 'negative', 'neutral'])
```

### Embeddings

```typescript
// Generate embedding
const embedding = await ai.generateEmbedding('Hello world')

// Find similar items
const similar = await findSimilar(query, items, topK)
```

### Images

```typescript
// Generate image
const image = await ai.generateImage('A sunset over mountains', {
  size: '1024x1024',
  style: 'realistic'
})

// Analyze image (Google only)
const analysis = await ai.analyzeImage(imageBlob, {
  features: ['objects', 'text', 'faces']
})
```

### Audio

```typescript
// Transcribe audio
const transcription = await ai.transcribeAudio(audioBlob, {
  language: 'en',
  format: 'text'
})

// Generate speech
const audio = await ai.generateSpeech('Hello world', {
  voice: 'alloy',
  format: 'mp3'
})
```

### Code

```typescript
// Generate code
const code = await ai.generateCode('Create a React component', {
  language: 'typescript',
  framework: 'react',
  includeTests: true
})

// Explain code
const explanation = await ai.explainCode(codeSnippet, 'javascript')
```

## React Hooks

### useAI

```tsx
const {
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
  stats
} = useAI(options)
```

### useAIChat

```tsx
const { messages, sendMessage, clearMessages, loading, error } = useAIChat(systemPrompt)

// Send a message
await sendMessage('Hello!')

// Messages array contains conversation history
messages.forEach(msg => {
  console.log(`${msg.role}: ${msg.content}`)
})
```

### useAIEmbeddings

```tsx
const { generateEmbedding, findSimilar } = useAIEmbeddings()

// Find similar items
const results = await findSimilar('search query', items, 5)
```

## Configuration Presets

```typescript
import { AIPresets } from '@matthew.ngo/ai-toolkit'

// Development setup with mock provider
const devAI = await createAI(AIPresets.development)

// Production setup with sensible defaults
const prodAI = await createAI({
  ...AIPresets.production,
  apiKey: 'your-api-key'
})

// High performance setup
const fastAI = await createAI({
  ...AIPresets.highPerformance,
  apiKey: 'your-api-key'
})

// Cost-optimized setup
const cheapAI = await createAI({
  ...AIPresets.costOptimized,
  apiKey: 'your-api-key'
})
```

## Analytics & Monitoring

```typescript
// Get usage statistics
const stats = ai.getStats()
console.log({
  totalRequests: stats.usage.requestsCount,
  totalTokens: stats.usage.tokensUsed,
  totalCost: stats.usage.costEstimate,
  cacheHitRate: stats.cache.hitRate,
  averageLatency: stats.performance.averageLatency
})

// Monitor performance
const health = stats.health
if (health.status === 'degraded') {
  console.warn('AI service degraded:', health.issues)
}
```

## Error Handling

```typescript
try {
  await ai.generateText(prompt)
} catch (error) {
  if (error.isRetryable) {
    // Error can be retried
  }
  
  console.error({
    message: error.userMessage, // User-friendly message
    category: error.category, // 'rate-limit', 'auth', etc.
    recommendations: error.recommendations // How to fix
  })
}
```

## Token Management

```typescript
import { TokenManager } from '@matthew.ngo/ai-toolkit'

const tokenManager = new TokenManager()

// Count tokens
const count = await tokenManager.countTokens(text, 'gpt-4')

// Validate limits
const { valid, availableTokens } = await tokenManager.validateTokenLimits(
  text,
  'gpt-4',
  maxTokens
)

// Truncate to fit
const truncated = await tokenManager.truncateToTokenLimit(
  longText,
  'gpt-4',
  4000
)

// Split into chunks
const chunks = await tokenManager.splitIntoChunks(
  longText,
  'gpt-4',
  2000,
  200 // overlap
)
```

## Testing

```typescript
import { createAI } from '@matthew.ngo/ai-toolkit'

describe('My AI Feature', () => {
  let ai

  beforeEach(() => {
    ai = await createAI({
      provider: 'mock',
      responses: new Map([
        ['test prompt', 'expected response']
      ])
    })
  })

  it('should generate text', async () => {
    const result = await ai.generateText('test prompt')
    expect(result).toBe('expected response')
  })
})
```

## Environment Variables

```bash
# .env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=...

# Optional
AI_CACHE_ENABLED=true
AI_RATE_LIMIT_RPM=60
AI_MAX_RETRIES=3
```

## TypeScript Support

The toolkit is written in TypeScript and provides comprehensive type definitions:

```typescript
import type {
  AIConfig,
  GenerateOptions,
  AIResponse,
  TokenUsage,
  Classification,
  ImageResult
} from '@matthew.ngo/ai-toolkit'
```

## Best Practices

1. **Always use environment variables for API keys**
2. **Enable caching to reduce costs**
3. **Set up rate limiting to avoid hitting API limits**
4. **Use fallback providers for high availability**
5. **Monitor usage and costs with analytics**
6. **Handle errors gracefully with proper error messages**
7. **Use the mock provider for development and testing**

## License

MIT

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## Support

- [Documentation](https://docs.matthew.ngo.com/ai-toolkit)
- [GitHub Issues](https://github.com/matthew.ngo/ai-toolkit/issues)
- [Discord Community](https://discord.gg/matthew.ngo)