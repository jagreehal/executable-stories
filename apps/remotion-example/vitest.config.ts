import { createStoryReporter } from 'executable-stories-vitest/reporter';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['stories/**/*.story.test.ts'],
    reporters: [
      'default',
      createStoryReporter({
        formats: ['markdown'],
        outputDir: 'reports',
        rawRunPath: 'reports/raw-run.json',
      }),
    ],
  },
});
