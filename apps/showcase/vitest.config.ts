import { defaultClientConditions, defaultServerConditions } from 'vite';
import { defineConfig } from 'vitest/config';

// "source" resolves workspace packages to their TypeScript, so tests need no build.
export default defineConfig({
  resolve: { conditions: ['source', ...defaultClientConditions] },
  // `module` is for bundlers: Node runs these tests, and cannot load every package's `module` build.
  ssr: { resolve: { conditions: ['source', ...defaultServerConditions.filter((c) => c !== 'module')] } },
  test: { include: ['tests/**/*.test.ts'] },
});
