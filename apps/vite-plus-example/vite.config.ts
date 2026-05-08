import { defineConfig } from 'vite-plus';
import { StoryReporter } from 'executable-stories-vitest/reporter';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    reporters: [
      'default',
      new StoryReporter({
        formats: ['markdown', 'html'],
        outputDir: 'reports',
        outputName: 'executable-stories',
      }) as never,
    ],
  },
});
