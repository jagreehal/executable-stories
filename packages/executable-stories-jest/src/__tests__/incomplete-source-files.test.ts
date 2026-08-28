/**
 * A half-broken file must not look like a file whose stories were deleted.
 *
 * One healthy story in a file does not vouch for a sibling suite that failed
 * before `story.init()` ran, so the reporter has to mark the file incomplete
 * and keep the missing scenarios out of retirement.
 */
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { runJest } from './helpers/command';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.resolve(__dirname, 'fixtures', 'incomplete');
const fixtureConfig = path.resolve(
  __dirname,
  'fixtures',
  'jest.incomplete.config.mjs',
);
const rawRunPath = path.join(fixtureDir, 'dist', 'raw-run.json');

describe('incompleteSourceFiles', () => {
  let scratchDir: string;
  let rawRun: {
    incompleteSourceFiles?: string[];
    testCases: Array<{ title: string }>;
  };

  beforeAll(async () => {
    scratchDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'es-jest-incomplete-'),
    );
    await fs.rm(path.join(fixtureDir, 'dist'), {
      recursive: true,
      force: true,
    });
    // The fixture is meant to fail; only the artifact it leaves behind matters.
    runJest(fixtureConfig, {
      GITHUB_ACTIONS: undefined,
      GITHUB_SHA: undefined,
      JEST_STORY_DOCS_DIR: scratchDir,
      // ts-jest emits ESM here, which Jest can only load with VM modules on.
      NODE_OPTIONS:
        `${process.env.NODE_OPTIONS ?? ''} --experimental-vm-modules`.trim(),
    });
    rawRun = JSON.parse(await fs.readFile(rawRunPath, 'utf-8'));
  }, 120_000);

  afterAll(async () => {
    await fs.rm(path.join(fixtureDir, 'dist'), {
      recursive: true,
      force: true,
    });
    if (scratchDir) await fs.rm(scratchDir, { recursive: true, force: true });
  });

  it('collects the story the healthy suite declared', () => {
    expect(rawRun.testCases.map((tc) => tc.title)).toEqual([
      'Healthy declares its story',
    ]);
  });

  it('marks the file incomplete because a sibling never declared its story', () => {
    expect(rawRun.incompleteSourceFiles).toContain(
      'src/__tests__/fixtures/incomplete/half-broken.story.test.ts',
    );
  });
});
