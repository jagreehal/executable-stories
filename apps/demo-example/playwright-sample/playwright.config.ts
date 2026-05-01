import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    ['list'],
    ['executable-stories-playwright/reporter', {
      rawRunPath: 'fixtures/raw-run.json',
      formats: ['astro'],
      outputDir: 'src/content/docs/stories',
      outputName: 'index',
      output: { mode: 'colocated', colocatedStyle: 'mirrored' },
      assetMode: 'copy',
      astro: {
        assetsDir: 'public/demo-assets',
        assetsBaseUrl: '/demo-assets'
      }
    }]
  ]
});
