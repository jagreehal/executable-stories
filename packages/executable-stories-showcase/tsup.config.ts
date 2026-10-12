import { defineConfig } from 'tsup';

// Declarations come from `tsc` in the build script, one .d.ts per entry.
export default defineConfig({
  entry: [
    'src/index.ts',
    'src/panel.ts',
    'src/playwright.ts',
    'src/vite.ts',
    'src/next.ts',
    'src/adapters/tanstack-query.ts',
    'src/adapters/zustand.ts',
    'src/adapters/redux.ts',
    'src/adapters/xstate.ts',
    'src/adapters/cookies.ts',
    'src/no-msw-browser.ts',
  ],
  // Resolved by the app's bundler through package.json "imports", so SSR builds get the stub.
  external: ['#msw-browser'],
  format: ['esm'],
  target: 'es2022',
  sourcemap: true,
  clean: true,
});
