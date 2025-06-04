// Browser compatibility tests using Playwright

import { test, expect } from '@playwright/test';

test.describe('AI Toolkit Browser Compatibility', () => {
  test.beforeEach(async ({ page }) => {
    // Create a test HTML page
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>AI Toolkit Browser Test</title>
        </head>
        <body>
          <h1>AI Toolkit Browser Compatibility Test</h1>
          <div id="results"></div>
          <script type="module">
            window.testResults = {};
          </script>
        </body>
      </html>
    `);
  });

  test('should load and initialize AI Toolkit in browser', async ({ page }) => {
    const result = await page.evaluate(async () => {
      try {
        // Import the library (this assumes the built files are served)
        const { createAI, checkBrowserCompatibility } = await import('/dist/index.mjs');

        // Check browser compatibility
        const compatibility = checkBrowserCompatibility();
        window.testResults.compatibility = compatibility;

        // Create AI instance
        const ai = await createAI({ provider: 'mock' });
        window.testResults.aiCreated = true;

        return {
          success: true,
          compatibility,
          aiCreated: true
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          stack: error.stack
        };
      }
    });

    expect(result.success).toBe(true);
    expect(result.compatibility.compatible).toBe(true);
    expect(result.aiCreated).toBe(true);
  });

  test('should perform token counting in browser', async ({ page }) => {
    const result = await page.evaluate(async () => {
      try {
        const { TokenManager } = await import('/dist/index.mjs');

        const tokenManager = new TokenManager();
        const text = 'Hello, this is a test message for token counting!';
        const tokenCount = await tokenManager.countTokens(text, 'gpt-3.5-turbo');

        return {
          success: true,
          tokenCount,
          textLength: text.length
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });

    expect(result.success).toBe(true);
    expect(result.tokenCount).toBeGreaterThan(0);
    expect(result.tokenCount).toBeLessThan(result.textLength); // Tokens should be less than characters
  });

  test('should use Web Crypto API for cache key generation', async ({ page }) => {
    const result = await page.evaluate(async () => {
      try {
        const { CacheManager } = await import('/dist/index.mjs');

        const cache = new CacheManager({
          enabled: true,
          ttl: 600000,
          maxSize: 100,
          strategy: 'lru'
        });

        const key = await cache.generateKey('test', ['param1', 'param2']);

        return {
          success: true,
          keyGenerated: true,
          keyLength: key.length,
          hasNamespace: key.includes('ai-toolkit')
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });

    expect(result.success).toBe(true);
    expect(result.keyGenerated).toBe(true);
    expect(result.keyLength).toBeGreaterThan(0);
    expect(result.hasNamespace).toBe(true);
  });

  test('should handle errors properly in browser', async ({ page }) => {
    const result = await page.evaluate(async () => {
      try {
        const { EnhancedError, ErrorHandler } = await import('/dist/index.mjs');

        // Create an enhanced error
        const error = new EnhancedError('Test error', {
          code: 'TEST_ERROR',
          category: 'test',
          isRetryable: true
        });

        // Use error handler
        const errorHandler = new ErrorHandler();
        const handled = errorHandler.handleError(
          new Error('API Error'),
          { provider: 'test', operation: 'test' }
        );

        return {
          success: true,
          errorCreated: error.message === 'Test error',
          errorHandled: handled.message.includes('API Error'),
          hasUserMessage: !!handled.userMessage
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });

    expect(result.success).toBe(true);
    expect(result.errorCreated).toBe(true);
    expect(result.errorHandled).toBe(true);
    expect(result.hasUserMessage).toBe(true);
  });

  test('should work with mock provider in browser', async ({ page }) => {
    const result = await page.evaluate(async () => {
      try {
        const { createAI } = await import('/dist/index.mjs');

        const ai = await createAI({
          provider: 'mock',
          cache: {
            enabled: true,
            ttl: 300000,
            maxSize: 50,
            strategy: 'lru'
          }
        });

        // Test text generation
        const text = await ai.generateText('Hello, AI!');

        // Test embeddings
        const embedding = await ai.generateEmbedding('Test text');

        return {
          success: true,
          textGenerated: text.includes('Mock response'),
          embeddingLength: embedding.length
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          stack: error.stack
        };
      }
    });

    expect(result.success).toBe(true);
    expect(result.textGenerated).toBe(true);
    expect(result.embeddingLength).toBe(1536); // Mock provider returns 1536-dimensional embeddings
  });

  test('should measure bundle size impact', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const start = performance.now();

      try {
        // Measure import time
        const importStart = performance.now();
        const toolkit = await import('/dist/index.mjs');
        const importEnd = performance.now();

        // Measure initialization time
        const initStart = performance.now();
        const ai = await toolkit.createAI({ provider: 'mock' });
        const initEnd = performance.now();

        return {
          success: true,
          importTime: importEnd - importStart,
          initTime: initEnd - initStart,
          totalTime: performance.now() - start,
          exportedFunctions: Object.keys(toolkit).length
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });

    expect(result.success).toBe(true);
    expect(result.importTime).toBeLessThan(1000); // Should import in less than 1 second
    expect(result.initTime).toBeLessThan(100); // Should initialize quickly
    expect(result.exportedFunctions).toBeGreaterThan(10); // Should export multiple functions
  });

  test('should handle localStorage cache operations', async ({ page }) => {
    const result = await page.evaluate(async () => {
      try {
        const { CacheManager } = await import('/dist/index.mjs');

        const cache = new CacheManager({
          enabled: true,
          ttl: 600000,
          maxSize: 10,
          strategy: 'lru'
        });

        // Set some cache values
        await cache.set('test-key-1', { data: 'test-value-1' });
        await cache.set('test-key-2', { data: 'test-value-2' });

        // Save to localStorage
        await cache.saveToLocalStorage('ai-toolkit-test-cache');

        // Create new cache instance and load from localStorage
        const cache2 = new CacheManager({
          enabled: true,
          ttl: 600000,
          maxSize: 10,
          strategy: 'lru'
        });

        await cache2.loadFromLocalStorage('ai-toolkit-test-cache');

        // Check if data was restored
        const value1 = await cache2.get('test-key-1');
        const value2 = await cache2.get('test-key-2');

        // Clean up
        localStorage.removeItem('ai-toolkit-test-cache');

        return {
          success: true,
          value1Restored: value1?.data === 'test-value-1',
          value2Restored: value2?.data === 'test-value-2'
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });

    expect(result.success).toBe(true);
    expect(result.value1Restored).toBe(true);
    expect(result.value2Restored).toBe(true);
  });
});