import { defineConfig } from 'vitest/config';

export default defineConfig({
  // One test spawns the formatters CLI twice; CI runs it beside every other package.
  test: { include: ['tests/**/*.test.ts'], testTimeout: 20_000 },
});
