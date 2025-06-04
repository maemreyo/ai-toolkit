// Simple and easy-to-use React hooks

import { useState, useCallback, useRef } from 'react';
import { useAIContext } from './provider';
import { TextOptions, EmbeddingOptions } from '../core/provider';

interface UseAIReturn {
  // Methods
  text: (prompt: string, options?: TextOptions) => Promise<string>;
  textStream: (prompt: string, options?: TextOptions) => AsyncGenerator<string>;
  embedding: (text: string, options?: EmbeddingOptions) => Promise<number[]>;

  // State
  loading: boolean;
  error: Error | null;

  // Utilities
  reset: () => void;
}

export function useAI(): UseAIReturn {
  const { client } = useAIContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setError(null);
    setLoading(false);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const text = useCallback(async (
    prompt: string,
    options?: TextOptions
  ): Promise<string> => {
    setLoading(true);
    setError(null);

    try {
      const response = await client.text(prompt, options);
      return response;
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [client]);

  const textStream = useCallback(async function* (
    prompt: string,
    options?: TextOptions
  ): AsyncGenerator<string> {
    setLoading(true);
    setError(null);

    try {
      yield* client.textStream(prompt, options);
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [client]);

  const embedding = useCallback(async (
    text: string,
    options?: EmbeddingOptions
  ): Promise<number[]> => {
    setLoading(true);
    setError(null);

    try {
      const response = await client.embedding(text, options);
      return response;
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [client]);

  return {
    text,
    textStream,
    embedding,
    loading,
    error,
    reset
  };
}

// Convenience hook for text generation
export function useText() {
  const { text, loading, error, reset } = useAI();
  const [result, setResult] = useState<string>('');

  const generate = useCallback(async (
    prompt: string,
    options?: TextOptions
  ): Promise<string> => {
    setResult('');
    try {
      const response = await text(prompt, options);
      setResult(response);
      return response;
    } catch (error) {
      // Error is already set by useAI
      throw error;
    }
  }, [text]);

  return {
    generate,
    result,
    loading,
    error,
    reset
  };
}

// Convenience hook for streaming
export function useTextStream() {
  const { textStream, loading, error, reset } = useAI();
  const [result, setResult] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);

  const stream = useCallback(async (
    prompt: string,
    options?: TextOptions
  ): Promise<string> => {
    setResult('');
    setIsStreaming(true);

    let fullText = '';

    try {
      for await (const chunk of textStream(prompt, options)) {
        fullText += chunk;
        setResult(fullText);
      }
      return fullText;
    } finally {
      setIsStreaming(false);
    }
  }, [textStream]);

  return {
    stream,
    result,
    loading,
    isStreaming,
    error,
    reset
  };
}

// Convenience hook for embeddings
export function useEmbedding() {
  const { embedding, loading, error, reset } = useAI();
  const [result, setResult] = useState<number[]>([]);

  const generate = useCallback(async (
    text: string,
    options?: EmbeddingOptions
  ): Promise<number[]> => {
    setResult([]);
    try {
      const response = await embedding(text, options);
      setResult(response);
      return response;
    } catch (error) {
      // Error is already set by useAI
      throw error;
    }
  }, [embedding]);

  return {
    generate,
    result,
    loading,
    error,
    reset
  };
}