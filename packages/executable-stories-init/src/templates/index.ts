import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// When bundled by tsup into dist/cli/index.js, import.meta.url resolves to dist/cli/.
// Templates are copied to dist/templates/ by tsup onSuccess, so we go up one level.
// In source (dev/test), __dirname is src/templates/ and templates are co-located there.
const _fileDir = dirname(fileURLToPath(import.meta.url));
const here = _fileDir.endsWith('/cli') ? join(_fileDir, '..', 'templates') : _fileDir;

const _NAMES = [
  'vitest-config.ts',
  'playwright-config.ts',
  'jest-config.mjs',
  'cypress-config.ts',
  'cypress-support-e2e.ts',
  'vitest-sample.story.test.ts',
  'playwright-sample.story.spec.ts',
  'jest-sample.story.test.ts',
  'cypress-sample.story.cy.ts',
  'tsconfig.json',
] as const;
export type TemplateName = (typeof _NAMES)[number];

export async function renderTemplate(name: TemplateName): Promise<string> {
  return readFile(join(here, `${name}.tmpl`), 'utf8');
}
