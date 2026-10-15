import { defineConfig } from '@playwright/test';

const port = 5398;

// A Playwright suite that records its tests: `executable-stories video` turns the recordings into
// the MP4s and manifests the Walkthrough composition plays. Its own reports folder, apart from
// the Vitest run's. Reporter paths are relative to where it runs: this app's folder.
export default defineConfig({
  testDir: '.',
  testMatch: '*.story.spec.ts',
  outputDir: '../test-results/walkthrough',
  use: {
    baseURL: `http://localhost:${port}`,
    viewport: { width: 1280, height: 720 },
    video: { mode: 'on', size: { width: 1280, height: 720 } },
  },
  webServer: {
    command: `pnpm exec vite --port ${port} --strictPort`,
    cwd: '../../showcase/examples/demo-react',
    url: `http://localhost:${port}`,
    reuseExistingServer: true,
  },
  reporter: [
    ['list'],
    [
      'executable-stories-playwright/reporter',
      { formats: ['markdown'], outputDir: 'reports/walkthrough', rawRunPath: 'reports/walkthrough/raw-run.json' },
    ],
  ],
});
