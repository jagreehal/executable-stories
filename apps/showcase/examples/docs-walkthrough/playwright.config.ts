import { defineConfig } from '@playwright/test';

// Product-docs walkthroughs: executable-stories-showcase opens each state, executable-stories
// records the steps and screenshots. See `pnpm walkthrough` for the docs build.
export default defineConfig({
  testDir: '.',
  testMatch: '*.story.spec.ts',
  workers: 1,
  reporter: [
    ['list'],
    [
      'executable-stories-playwright/reporter',
      // The raw run only. `pnpm walkthrough` builds the docs with `executable-stories format`.
      { formats: [], rawRunPath: 'reports/raw-run.json' },
    ],
  ],
  use: {
    baseURL: 'http://localhost:5179',
    // Same size, scale and theme in every shot, so docs images line up.
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    colorScheme: 'light',
    video: { mode: 'on', size: { width: 1280, height: 720 } },
  },
  webServer: {
    command: 'pnpm -C ../.. --filter demo-react exec vite --port 5179 --strictPort',
    url: 'http://localhost:5179',
    reuseExistingServer: true,
  },
});
