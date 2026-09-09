/**
 * `--attach-images` through the real CLI: the markdown keeps the local path,
 * and the command that makes that path resolve is printed beside it.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const testDir = dirname(fileURLToPath(import.meta.url));
const packageDir = resolve(testDir, '..');
const packagedCliPath = resolve(packageDir, 'dist/cli.js');

function ensurePackagedCliBuilt(): void {
  if (fs.existsSync(packagedCliPath)) return;
  execFileSync('pnpm', ['build'], { cwd: packageDir, stdio: 'pipe' });
}

const made: string[] = [];
afterEach(() => {
  for (const dir of made.splice(0))
    fs.rmSync(dir, { recursive: true, force: true });
});

function tmp(): string {
  const dir = fs.mkdtempSync(join(os.tmpdir(), 'es-cli-attach-'));
  made.push(dir);
  return dir;
}

const rawRun = {
  schemaVersion: 1,
  projectRoot: '/repo',
  startedAtMs: 1_700_000_000_000,
  finishedAtMs: 1_700_000_001_000,
  testCases: [
    {
      title: 'Checkout shows the receipt',
      sourceFile: 'src/checkout.test.ts',
      sourceLine: 1,
      status: 'pass',
      story: {
        scenario: 'Checkout shows the receipt',
        steps: [
          {
            keyword: 'then',
            text: 'the receipt is on screen',
            assertions: 1,
            docs: [
              {
                kind: 'screenshot',
                phase: 'runtime',
                path: '/tmp/run/receipt.png',
                alt: 'The receipt',
              },
            ],
          },
        ],
      },
    },
  ],
};

function format(dir: string, outputDir: string, extra: string[]) {
  return spawnSync(
    'node',
    [
      packagedCliPath,
      'format',
      join(dir, 'raw-run.json'),
      '--format',
      'markdown',
      '--output-dir',
      outputDir,
      '--output-name',
      'index',
      ...extra,
    ],
    { cwd: dir, encoding: 'utf8' },
  );
}

describe('executable-stories format --attach-images', () => {
  it('keeps the path in the markdown and prints the gh command that uploads it', () => {
    ensurePackagedCliBuilt();
    const dir = tmp();
    const outputDir = join(dir, 'reports');
    fs.writeFileSync(join(dir, 'raw-run.json'), JSON.stringify(rawRun));

    const result = format(dir, outputDir, ['--attach-images']);
    expect(result.status, result.stderr).toBe(0);

    const md = fs.readFileSync(join(outputDir, 'index.md'), 'utf8');
    expect(md).toContain('![The receipt](/tmp/run/receipt.png)');

    expect(result.stderr).toContain('gh pr comment');
    expect(result.stderr).toContain("--attach '/tmp/run/receipt.png'");
  });

  it('prints no command when no markdown was written to attach it to', () => {
    ensurePackagedCliBuilt();
    const dir = tmp();
    const outputDir = join(dir, 'reports');
    fs.writeFileSync(join(dir, 'raw-run.json'), JSON.stringify(rawRun));

    const result = spawnSync(
      'node',
      [
        packagedCliPath,
        'format',
        join(dir, 'raw-run.json'),
        '--format',
        'junit',
        '--output-dir',
        outputDir,
        '--output-name',
        'index',
        '--attach-images',
      ],
      { cwd: dir, encoding: 'utf8' },
    );

    expect(result.status, result.stderr).toBe(0);
    expect(result.stderr).not.toContain('gh pr comment');
  });

  it('leaves the default alone: no dead reference, no gh hint', () => {
    ensurePackagedCliBuilt();
    const dir = tmp();
    const outputDir = join(dir, 'reports');
    fs.writeFileSync(join(dir, 'raw-run.json'), JSON.stringify(rawRun));

    const result = format(dir, outputDir, []);
    expect(result.status, result.stderr).toBe(0);

    const md = fs.readFileSync(join(outputDir, 'index.md'), 'utf8');
    expect(md).toContain('Screenshot unavailable');
    expect(result.stderr).not.toContain('gh pr comment');
  });
});
