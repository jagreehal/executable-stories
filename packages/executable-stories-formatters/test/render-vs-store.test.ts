/**
 * Two operations, kept apart.
 *
 *   a test run       → update the reports it owns, then render
 *   a shard directory → render, and touch nothing
 *
 * When rendering could also write, reading a directory restamped every scenario
 * with the newest run's time and invented a second store under whatever
 * --output-dir was passed. The freshness data the whole design exists to protect
 * was destroyed by looking at it.
 */
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { ReportGenerator, type GenerateDeps } from '../src/index';
import type { Logger } from '../src/types/options';
import { stubs } from './stubs';

function memFs(seed: Record<string, string> = {}) {
  const files = new Map<string, string>(Object.entries(seed));
  const deps: Partial<GenerateDeps> = {
    logger: { warn: vi.fn() } as unknown as Logger,
    writeFile: async (p: string, c: string) => {
      files.set(p, c);
    },
    removeFile: async (p: string) => {
      files.delete(p);
    },
    readFile: (p: string) => {
      const found = files.get(p);
      if (found === undefined) throw new Error(`ENOENT: ${p}`);
      return found;
    },
    listDir: (dir: string) => {
      const prefix = `${dir}/`;
      const names = [...files.keys()]
        .filter((k) => k.startsWith(prefix))
        .map((k) => k.slice(prefix.length))
        .filter((rest) => !rest.includes('/'));
      return names.length > 0 ? names.sort() : undefined;
    },
  };
  return { files, deps };
}

const OUT = 'reports';

function caseIn(
  sourceFile: string,
  scenario: string,
  id: string,
  lastRunAtMs?: number,
) {
  return stubs.testCaseResult({
    id,
    sourceFile,
    story: stubs.storyMeta({ scenario }),
    ...(lastRunAtMs ? { lastRunAtMs } : {}),
  });
}

describe('rendering without updating storage', () => {
  it('writes no reports of its own', async () => {
    const { files, deps } = memFs();
    await new ReportGenerator(
      { formats: ['markdown'], outputDir: OUT, outputName: 'index' },
      deps,
    ).generate(
      stubs.testRunResult({
        testCases: [caseIn('src/a.test.ts', 'a behaves', 'a-1')],
      }),
      { persist: false },
    );

    expect(
      [...files.keys()].filter((k) => k.includes('/by-file/')),
    ).toHaveLength(0);
    expect(files.get(path.posix.join(OUT, 'index.md'))).toContain('a behaves');
  });

  it("leaves every scenario's last-run stamp exactly as it found it", async () => {
    // The bug this exists to catch: an aggregate spans several runs, so
    // restamping from its own finishedAtMs makes the oldest results look new.
    const old = 1_000;
    const recent = 9_000_000_000;
    const { files, deps } = memFs();

    await new ReportGenerator(
      { formats: ['story-report-json'], outputDir: OUT, outputName: 'index' },
      deps,
    ).generate(
      stubs.testRunResult({
        testCases: [
          caseIn('src/a.test.ts', 'a behaves', 'a-1', old),
          caseIn('src/b.test.ts', 'b behaves', 'b-1', recent),
        ],
        startedAtMs: old,
        finishedAtMs: recent,
      }),
      { persist: false },
    );

    const report = JSON.parse(
      files.get(path.posix.join(OUT, 'index.story-report.json')) ?? '{}',
    ) as {
      features: { scenarios: { title: string; lastRunAtMs?: number }[] }[];
    };
    const scenarios = report.features.flatMap((f) => f.scenarios);

    expect(scenarios.find((s) => s.title === 'a behaves')?.lastRunAtMs).toBe(
      old,
    );
    expect(scenarios.find((s) => s.title === 'b behaves')?.lastRunAtMs).toBe(
      recent,
    );
  });
});

describe('execution formats report the run, not the suite', () => {
  it('keeps carried-over scenarios out of JUnit while documenting them in markdown', async () => {
    const { files, deps } = memFs();
    const options = {
      formats: ['junit' as const, 'markdown' as const],
      outputDir: OUT,
      outputName: 'index',
    };

    await new ReportGenerator(options, deps).generate(
      stubs.testRunResult({
        testCases: [
          caseIn('src/a.test.ts', 'a behaves', 'a-1'),
          caseIn('src/b.test.ts', 'b behaves', 'b-1'),
        ],
        runScope: 'full' as const,
      }),
    );

    // A later run of one file only.
    await new ReportGenerator(options, deps).generate(
      stubs.testRunResult({
        testCases: [caseIn('src/a.test.ts', 'a behaves', 'a-1')],
        runScope: 'full' as const,
      }),
    );

    // Docs describe the suite: both files.
    const markdown = files.get(path.posix.join(OUT, 'index.md')) ?? '';
    expect(markdown).toContain('a behaves');
    expect(markdown).toContain('b behaves');

    // JUnit is a record of what this build executed. Reporting a test that did
    // not run as though it just passed would lie to CI.
    const junit = files.get(path.posix.join(OUT, 'index.junit.xml')) ?? '';
    expect(junit).toContain('a behaves');
    expect(junit).not.toContain('b behaves');
  });

  it('keeps carried-over scenarios out of a release manifest', async () => {
    const { files, deps } = memFs();
    const options = {
      formats: ['release-manifest' as const, 'markdown' as const],
      outputDir: OUT,
      outputName: 'index',
    };

    await new ReportGenerator(options, deps).generate(
      stubs.testRunResult({
        testCases: [
          caseIn('src/a.test.ts', 'a behaves', 'a-1'),
          caseIn('src/b.test.ts', 'b behaves', 'b-1'),
        ],
        runScope: 'full' as const,
      }),
    );

    await new ReportGenerator(options, deps).generate(
      stubs.testRunResult({
        testCases: [caseIn('src/a.test.ts', 'a behaves', 'a-1')],
        runScope: 'full' as const,
      }),
    );

    expect(
      files.get(path.posix.join(OUT, 'index.release-manifest.md')),
    ).toContain('a behaves');
    expect(
      files.get(path.posix.join(OUT, 'index.release-manifest.md')),
    ).not.toContain('b behaves');
    expect(files.get(path.posix.join(OUT, 'index.md'))).toContain('b behaves');
  });
});
