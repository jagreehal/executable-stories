import { defineConfig } from 'tsup';
import { cp } from 'node:fs/promises';

export default defineConfig({
  entry: { 'cli/index': 'src/index.ts' },
  format: ['esm'],
  target: 'node22',
  outDir: 'dist',
  clean: true,
  splitting: false,
  sourcemap: false,
  shims: true,
  dts: false,
  banner: { js: '#!/usr/bin/env node' },
  async onSuccess() {
    await cp('src/templates', 'dist/templates', { recursive: true });
  },
});
