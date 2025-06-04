# AI Toolkit Refactor Plan

## Current Issues

1. **Complex Integration**: AIEngine constructor has too many dependencies and
   responsibilities
2. **Difficult API**: Methods are hard to use and understand
3. **Hook Problems**: `useAI` hook fails to load providers properly
4. **Global State**: Using global engine instance causes confusion
5. **Poor Separation of Concerns**: Everything is tightly coupled

## Proposed Architecture

### 1. Core Principles

- **Simple by Default**: Basic usage should require minimal configuration
- **Progressive Enhancement**: Advanced features available when needed
- **Clear Separation**: Each module has single responsibility
- **Type Safety**: Full TypeScript support with good inference

### 2. New Structure

```
src/
├── core/
│   ├── provider.ts          # Base provider interface
│   ├── registry.ts          # Provider registry
│   └── client.ts            # Simple AI client
├── providers/
│   ├── factory.ts           # Provider factory
│   ├── openai/
│   ├── anthropic/
│   └── mock/
├── features/
│   ├── cache/
│   ├── rate-limit/
│   └── retry/
├── react/
│   ├── provider.tsx         # React context provider
│   ├── hooks.ts             # Simplified hooks
│   └── index.ts
└── index.ts                 # Simple exports
```

### 3. Usage Examples

#### Basic Usage

```typescript
import { createAI } from '@matthew.ngo/ai-toolkit';

const ai = createAI('openai', { apiKey: 'sk-...' });
const response = await ai.text('Hello, AI!');
```

#### React Usage

```tsx
import { AIProvider, useAI } from '@matthew.ngo/ai-toolkit/react';

// App.tsx
function App() {
  return (
    <AIProvider provider="openai" apiKey={process.env.OPENAI_KEY}>
      <MyComponent />
    </AIProvider>
  );
}

// MyComponent.tsx
function MyComponent() {
  const { text, loading, error } = useAI();

  const handleClick = async () => {
    const response = await text('Hello!');
    console.log(response);
  };
}
```

#### Advanced Usage

```typescript
import { createAI } from '@matthew.ngo/ai-toolkit';

const ai = createAI('openai', {
  apiKey: 'sk-...',
  features: {
    cache: { enabled: true, ttl: 600000 },
    rateLimit: { rpm: 60 },
    retry: { maxAttempts: 3 },
  },
});
```

## Implementation Plan

### Phase 1: Core Refactor

1. Create simple provider interface
2. Implement provider registry
3. Build minimal AI client
4. Factory pattern for providers

### Phase 2: React Integration

1. React Context for configuration
2. Simplified hooks
3. Error boundaries
4. Loading states

### Phase 3: Features as Plugins

1. Cache as optional feature
2. Rate limiting as middleware
3. Retry logic as wrapper
4. Analytics as observer

### Phase 4: Migration

1. Backward compatibility layer
2. Migration guide
3. Updated examples
4. Performance optimization

## Benefits

1. **Easy to Start**: `createAI('openai', { apiKey })` is all you need
2. **Clear Mental Model**: Provider → Client → Response
3. **Better Testing**: Mock provider works out of the box
4. **Flexible Architecture**: Add features without complexity
5. **Production Ready**: Clean, maintainable code

## Next Steps

1. Start with core provider interface
2. Implement simple client
3. Create React integration
4. Add features progressively
5. Update documentation
