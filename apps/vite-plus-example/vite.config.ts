import { defineConfig } from 'vite-plus';
import { createStoryReporter } from 'executable-stories-vitest/reporter';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    reporters: [
      'default',
      createStoryReporter({
        formats: ['markdown', 'html'],
        outputDir: 'reports',
        outputName: 'executable-stories',
      }),
    ],
  },
});
