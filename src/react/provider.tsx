// React Context Provider for AI Toolkit

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { AIClient, AIClientConfig, createAI } from '../core/client';
import { ProviderType } from '../core/provider';

interface AIContextValue {
  client: AIClient;
  config: AIClientConfig;
}

const AIContext = createContext<AIContextValue | null>(null);

export interface AIProviderProps {
  children: ReactNode;
  provider?: ProviderType;
  apiKey?: string;
  config?: AIClientConfig;
}

export function AIProvider({
  children,
  provider = 'openai',
  apiKey,
  config
}: AIProviderProps) {
  const value = useMemo(() => {
    const finalConfig: AIClientConfig = {
      provider,
      apiKey,
      ...config
    };

    const client = createAI(finalConfig);

    return {
      client,
      config: finalConfig
    };
  }, [provider, apiKey, config]);

  return (
    <AIContext.Provider value={value}>
      {children}
    </AIContext.Provider>
  );
}

export function useAIContext(): AIContextValue {
  const context = useContext(AIContext);

  if (!context) {
    throw new Error(
      'useAIContext must be used within an AIProvider. ' +
      'Wrap your app with <AIProvider> or use createAI() directly.'
    );
  }

  return context;
}