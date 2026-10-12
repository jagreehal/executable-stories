import { expect, test } from 'vitest';

// Next.js renders client components on the server, so every entry an app imports must load without a DOM.
test.each([
  'executable-stories-showcase',
  'executable-stories-showcase/panel',
  'executable-stories-showcase/cookies',
  'executable-stories-showcase/tanstack-query',
  'executable-stories-showcase/zustand',
  'executable-stories-showcase/redux',
  'executable-stories-showcase/xstate',
])('%s loads without a DOM', async (entry) => {
  expect(globalThis.document).toBeUndefined();
  await expect(import(entry)).resolves.toBeDefined();
});
