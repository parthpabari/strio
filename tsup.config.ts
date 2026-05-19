import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: {
      index: 'src/index.ts',
      zod: 'src/zod.ts',
    },
    format: ['esm', 'cjs'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    minify: false,
    treeshake: true,
    target: 'es2020',
    platform: 'neutral',
  },
  {
    entry: {
      'bin/strio': 'bin/strio.ts',
    },
    format: ['esm'],
    dts: false,
    splitting: false,
    sourcemap: false,
    clean: false,
    minify: false,
    target: 'es2020',
    platform: 'node',
    banner: {
      js: '#!/usr/bin/env node',
    },
  },
]);
