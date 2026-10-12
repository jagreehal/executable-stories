import { preact } from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';
import { defaultClientConditions, defineConfig } from 'vite';

export default defineConfig({
  // The preset also aliases react to preact/compat, so @xstate/react and executable-stories-showcase-react work.
  plugins: [preact(), tailwindcss()],
  // "source" resolves workspace packages to their TypeScript: no build needed to develop.
  // dedupe: workspace packages (executable-stories-showcase-react) resolve the one Preact this app installs.
  resolve: { conditions: ['source', ...defaultClientConditions], dedupe: ['preact'] },
  build: { target: 'esnext' },
});
