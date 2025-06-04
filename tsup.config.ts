import { defineConfig } from 'tsup';

const baseConfig = {
  format: ['cjs', 'esm'] as const,
  dts: true,
  splitting: true,
  clean: true,
  treeshake: true,
  minify: true,
  sourcemap: true,
  external: ['react'],
};

export default defineConfig([
  // Main entry and providers (no "use client")
  {
    ...baseConfig,
    entry: {
      index: 'src/index.ts',
      'providers/index': 'src/providers/index.ts',
    },
  },
  // React components (with "use client")
  {
    ...baseConfig,
    entry: {
      'react/index': 'src/react/index.ts',
    },
    esbuildOptions(options) {
      options.banner = {
        js: '"use client"',
      };
    },
  },
]);
