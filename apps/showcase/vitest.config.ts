import { defaultClientConditions, defaultServerConditions } from 'vite';
import { defineConfig } from 'vitest/config';

// "source" resolves workspace packages to their TypeScript, so tests need no build.
export default defineConfig({
  resolve: { conditions: ['source', ...defaultClientConditions] },
  ssr: { resolve: { conditions: ['source', ...defaultServerConditions] } },
  test: { include: ['tests/**/*.test.ts'] },
});
