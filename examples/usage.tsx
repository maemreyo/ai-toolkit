// Example usage of the refactored AI Toolkit

import React from 'react';
import { createAI } from '@matthew.ngo/ai-toolkit';
import { AIProvider, useText, useTextStream } from '@matthew.ngo/ai-toolkit/react';

// Example 1: Direct usage (no React)
async function basicExample() {
  // Simple creation
  const ai = createAI('openai', { apiKey: process.env.OPENAI_API_KEY });

  // Generate text
  const response = await ai.text('Hello, AI!');
  console.log(response);

  // Stream text
  for await (const chunk of ai.textStream('Tell me a story')) {
    process.stdout.write(chunk);
  }

  // Generate embeddings
  const embeddings = await ai.embedding('Hello world');
  console.log('Embedding dimensions:', embeddings.length);
}

// Example 2: React with Provider
function App() {
  return (
    <AIProvider
      provider="openai"
      apiKey={process.env.REACT_APP_OPENAI_API_KEY}
    >
      <TextGenerator />
      <StreamingText />
    </AIProvider>
  );
}

// Example 3: Simple text generation component
function TextGenerator() {
  const { generate, result, loading, error } = useText();

  const handleClick = async () => {
    try {
      await generate('Write a haiku about coding');
    } catch (err) {
      console.error('Generation failed:', err);
    }
  };

  return (
    <div>
      <button onClick={handleClick} disabled={loading}>
        {loading ? 'Generating...' : 'Generate Haiku'}
      </button>

      {error && <p style={{ color: 'red' }}>Error: {error.message}</p>}

      {result && (
        <div>
          <h3>Result:</h3>
          <p>{result}</p>
        </div>
      )}
    </div>
  );
}

// Example 4: Streaming text component
function StreamingText() {
  const { stream, result, isStreaming, error } = useTextStream();
  const [prompt, setPrompt] = React.useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    try {
      await stream(prompt, {
        temperature: 0.7,
        maxTokens: 500
      });
    } catch (err) {
      console.error('Streaming failed:', err);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your prompt..."
          disabled={isStreaming}
        />
        <button type="submit" disabled={isStreaming}>
          {isStreaming ? 'Streaming...' : 'Generate'}
        </button>
      </form>

      {error && <p style={{ color: 'red' }}>Error: {error.message}</p>}

      {result && (
        <div>
          <h3>Response:</h3>
          <p>{result}</p>
          {isStreaming && <span>▋</span>}
        </div>
      )}
    </div>
  );
}

// Example 5: Using with mock provider for testing
function TestComponent() {
  return (
    <AIProvider provider="mock">
      <TextGenerator />
    </AIProvider>
  );
}

// Example 6: Advanced configuration
function AdvancedApp() {
  return (
    <AIProvider
      provider="openai"
      apiKey={process.env.REACT_APP_OPENAI_API_KEY}
      config={{
        model: 'gpt-4',
        features: {
          cache: { ttl: 600000 },
          rateLimit: { rpm: 60 },
          retry: { maxAttempts: 3 }
        }
      }}
    >
      <TextGenerator />
    </AIProvider>
  );
}

export { App, TestComponent, AdvancedApp };