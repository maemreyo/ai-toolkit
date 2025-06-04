import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import topLevelAwait from 'vite-plugin-top-level-await';
import wasm from 'vite-plugin-wasm';

export default defineConfig({
  plugins: [react(), wasm(), topLevelAwait()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Link to local ai-toolkit package
      '@matthew.ngo/ai-toolkit': path.resolve(__dirname, '../src'),
      '@matthew.ngo/ai-toolkit/react': path.resolve(__dirname, '../src/react'),
      '@matthew.ngo/ai-toolkit/providers': path.resolve(
        __dirname,
        '../src/providers'
      ),
      // Node.js polyfills
      buffer: 'buffer',
    },
  },
  define: {
    // Enable Node.js globals in browser
    global: 'globalThis',
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'lucide-react',
      'react-hot-toast',
      'react-syntax-highlighter',
      '@monaco-editor/react',
      'buffer',
    ],
    exclude: ['@matthew.ngo/ai-toolkit'],
  },
  server: {
    port: 3000,
    open: true,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          editor: ['@monaco-editor/react', 'monaco-editor'],
          ui: ['lucide-react', 'react-hot-toast'],
        },
      },
    },
  },
});
