import { defineConfig } from '@playwright/test';
import { E2E_SAVE_DIR } from './e2e/save-dir';

export default defineConfig({
  testDir: 'e2e',
  use: { baseURL: 'http://localhost:5179' },
  webServer: [
    {
      command: 'pnpm --filter demo-react exec vite --port 5179 --strictPort',
      url: 'http://localhost:5179',
      env: { EXECUTABLE_STORIES_SHOWCASE_SAVE_DIR: E2E_SAVE_DIR },
      reuseExistingServer: true,
    },
    {
      // The Preact + XState example.
      command: 'pnpm --filter who-speaks-what-preact exec vite --port 5180 --strictPort',
      url: 'http://localhost:5180',
      reuseExistingServer: true,
    },
    {
      command: 'pnpm --filter next-app exec next dev --port 5181',
      url: 'http://localhost:5181',
      env: { EXECUTABLE_STORIES_SHOWCASE_SAVE_DIR: E2E_SAVE_DIR },
      reuseExistingServer: true,
    },
    {
      // Sign-in flows, with a stand-in backend to record.
      command: 'pnpm --filter auth-flows exec vite --port 5182 --strictPort',
      url: 'http://localhost:5182',
      reuseExistingServer: true,
    },
  ],
});
