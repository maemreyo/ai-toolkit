import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: {
      index: 'src/index.ts',
      'react/index': 'src/react/index.ts',
      'providers/index': 'src/providers/index.ts',
    },
    format: ['cjs', 'esm'],
    dts: true,
    splitting: true,
    clean: true,
    treeshake: true,
    minify: true,
    sourcemap: true,
    external: ['react'],
    esbuildOptions(options) {
      options.banner = {
        js: '"use client"',
      }
    },
  },
])