import react from '@vitejs/plugin-react';
import { msw } from 'msw/vite';
import { executableStoriesShowcase } from 'executable-stories-showcase/vite';
import { defaultClientConditions, defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    react(),
    msw({ mode: 'worker-only' }),
    // e2e points saves outside the scenarios glob, so saving doesn't reload pages under test.
    executableStoriesShowcase({ dir: process.env.EXECUTABLE_STORIES_SHOWCASE_SAVE_DIR ?? 'scenarios' }),
  ],
  // "source" resolves workspace packages to their TypeScript: no build needed to develop.
  resolve: { conditions: ['source', ...defaultClientConditions] },
  build: { target: 'esnext' },
});
