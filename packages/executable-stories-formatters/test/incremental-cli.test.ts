/**
 * The whole path, through the real CLI: two focused test runs, one report that
 * covers both. This is the bug that started it — a filtered run overwriting the
 * report with only the file it ran.
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
  // Same rule as the other packaged-CLI test: trust turbo's dist, never
  // rebuild here, since tsup's clean races with parallel monorepo tasks.
  if (fs.existsSync(packagedCliPath)) return;
  execFileSync('pnpm', ['build'], { cwd: packageDir, stdio: 'pipe' });
}

const made: string[] = [];
afterEach(() => {
  for (const dir of made.splice(0))
    fs.rmSync(dir, { recursive: true, force: true });
});

function tmp(): string {
  const dir = fs.mkdtempSync(join(os.tmpdir(), 'es-cli-incremental-'));
  made.push(dir);
  return dir;
}

/** A raw run covering one source file, in the shape adapters write. */
function rawRun(
  sourceFile: string,
  scenario: string,
  finishedAtMs: number,
  status: 'pass' | 'fail' = 'pass',
  assertions?: number,
) {
  return {
    schemaVersion: 1,
    projectRoot: '/repo',
    startedAtMs: finishedAtMs - 1000,
    finishedAtMs,
    testCases: [
      {
        title: scenario,
        sourceFile,
        sourceLine: 1,
        status,
        story: {
          scenario,
          steps: [
            {
              keyword: assertions === undefined ? 'given' : 'then',
              text:
                assertions === undefined
                  ? 'a precondition'
                  : 'the outcome is checked',
              ...(assertions === undefined ? {} : { assertions }),
            },
          ],
        },
      },
    ],
  };
}

describe('executable-stories format, run after run', () => {
  it('reports both files after two runs that each covered one', () => {
    ensurePackagedCliBuilt();
    const dir = tmp();
    const outputDir = join(dir, 'reports');

    const format = (runFile: string) => {
      const result = spawnSync(
        'node',
        [
          packagedCliPath,
          'format',
          runFile,
          '--format',
          'markdown',
          '--output-dir',
          outputDir,
          '--output-name',
          'index',
        ],
        { cwd: dir, encoding: 'utf8' },
      );
      expect(result.status, result.stderr).toBe(0);
    };

    const alphaRun = join(dir, 'alpha-run.json');
    const betaRun = join(dir, 'beta-run.json');
    fs.writeFileSync(
      alphaRun,
      JSON.stringify(
        rawRun('src/alpha.test.ts', 'alpha behaves', 1_700_000_000_000),
      ),
    );
    fs.writeFileSync(
      betaRun,
      JSON.stringify(
        rawRun('src/beta.test.ts', 'beta behaves', 1_700_000_100_000),
      ),
    );

    format(alphaRun);
    format(betaRun);

    const report = fs.readFileSync(join(outputDir, 'index.md'), 'utf8');
    expect(report).toContain('beta behaves');
    // The run that rendered this report never mentioned alpha. It survives
    // because previous runs accumulate rather than being overwritten.
    expect(report).toContain('alpha behaves');
  }, 30000);

  it('discloses that nothing in the report came from this run when filters excluded it', () => {
    ensurePackagedCliBuilt();
    const dir = tmp();
    const outputDir = join(dir, 'reports');

    const alphaRun = join(dir, 'alpha-run.json');
    const betaRun = join(dir, 'beta-run.json');
    fs.writeFileSync(
      alphaRun,
      JSON.stringify(
        rawRun('src/alpha.test.ts', 'alpha behaves', 1_700_000_000_000),
      ),
    );
    fs.writeFileSync(
      betaRun,
      JSON.stringify(
        rawRun('src/beta.test.ts', 'beta behaves', 1_700_000_100_000),
      ),
    );

    const format = (runFile: string, extra: string[] = []) =>
      spawnSync(
        'node',
        [
          packagedCliPath,
          'format',
          runFile,
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

    format(alphaRun);
    // This run produced only beta, and beta is excluded from the report. The
    // report therefore shows one scenario, none of which this run verified.
    const result = format(betaRun, ['--exclude', 'src/beta.test.ts']);

    expect(result.status, result.stderr).toBe(0);
    expect(result.stderr).toContain('carried over');
    expect(result.stderr).toContain('0 from this run');
  }, 30000);

  it('reports documentation and execution status separately for mixed formats', () => {
    ensurePackagedCliBuilt();
    const dir = tmp();
    const outputDir = join(dir, 'reports');
    const oldRun = join(dir, 'old-run.json');
    const currentRun = join(dir, 'current-run.json');
    fs.writeFileSync(
      oldRun,
      JSON.stringify(
        rawRun('src/old.test.ts', 'old failure', 1_700_000_000_000, 'fail'),
      ),
    );
    fs.writeFileSync(
      currentRun,
      JSON.stringify(
        rawRun(
          'src/current.test.ts',
          'current pass',
          1_700_000_100_000,
          'pass',
          0,
        ),
      ),
    );

    spawnSync(
      'node',
      [
        packagedCliPath,
        'format',
        oldRun,
        '--format',
        'markdown',
        '--output-dir',
        outputDir,
        '--output-name',
        'index',
      ],
      { cwd: dir, encoding: 'utf8' },
    );
    const mixedArgs = [
      packagedCliPath,
      'format',
      currentRun,
      '--format',
      'markdown,junit',
      '--output-dir',
      outputDir,
      '--output-name',
      'index',
    ];
    const humanResult = spawnSync('node', mixedArgs, {
      cwd: dir,
      encoding: 'utf8',
    });
    expect(humanResult.status, humanResult.stderr).toBe(0);
    expect(humanResult.stderr).toContain('Documentation: ✖');
    expect(humanResult.stderr).toContain('Execution: ✔');
    expect(
      humanResult.stderr.match(/1 scenario asserted nothing/g),
    ).toHaveLength(2);

    const result = spawnSync('node', [...mixedArgs, '--json-summary'], {
      cwd: dir,
      encoding: 'utf8',
    });

    expect(result.status, result.stderr).toBe(0);
    const summary = JSON.parse(result.stdout) as {
      documented: {
        files: string[];
        counts: { passed: number; failed: number };
        unasserted: number;
      };
      executed: {
        files: string[];
        counts: { passed: number; failed: number };
        unasserted: number;
      };
    };
    expect(summary.documented.files).toEqual([join(outputDir, 'index.md')]);
    expect(summary.executed.files).toEqual([
      join(outputDir, 'index.junit.xml'),
    ]);
    expect(summary.documented.counts).toMatchObject({ passed: 1, failed: 1 });
    expect(summary.executed.counts).toMatchObject({ passed: 1, failed: 0 });
    expect(summary.documented.unasserted).toBe(1);
    expect(summary.executed.unasserted).toBe(1);
  }, 30000);

  it('lets agent commands read the accumulated per-file directory', () => {
    ensurePackagedCliBuilt();
    const dir = tmp();
    const outputDir = join(dir, 'reports');

    for (const [name, run] of [
      [
        'alpha',
        rawRun('src/alpha.test.ts', 'alpha behaves', 1_700_000_000_000),
      ],
      ['beta', rawRun('src/beta.test.ts', 'beta behaves', 1_700_000_100_000)],
    ] as const) {
      const runFile = join(dir, `${name}-run.json`);
      fs.writeFileSync(runFile, JSON.stringify(run));
      const formatted = spawnSync(
        'node',
        [
          packagedCliPath,
          'format',
          runFile,
          '--format',
          'markdown',
          '--output-dir',
          outputDir,
        ],
        { cwd: dir, encoding: 'utf8' },
      );
      expect(formatted.status, formatted.stderr).toBe(0);
    }

    const result = spawnSync(
      'node',
      [
        packagedCliPath,
        'check',
        join(outputDir, 'by-file'),
        '--check-format',
        'json',
      ],
      { cwd: dir, encoding: 'utf8' },
    );

    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      summary: { total: 2, passed: 2, failed: 0 },
    });
  }, 30000);
});
