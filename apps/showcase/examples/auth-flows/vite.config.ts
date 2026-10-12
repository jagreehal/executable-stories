import react from '@vitejs/plugin-react';
import { msw } from 'msw/vite';
import { defaultClientConditions, defineConfig } from 'vite';
import { backend } from './backend';

export default defineConfig({
  plugins: [react(), msw({ mode: 'worker-only' }), backend()],
  // "source" resolves workspace packages to their TypeScript: no build needed to develop.
  resolve: { conditions: ['source', ...defaultClientConditions] },
  build: { target: 'esnext' },
});
