import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts', 'src/suggest.ts'],
  format: ['esm'],
  target: 'node22',
  sourcemap: true,
  clean: true,
});
