/**
 * `defaults` in executable-stories.config.* through the real CLI.
 *
 * These pin the two rules that make the file safe to rely on: the command line
 * still wins, and a typo is an error rather than a setting that quietly does
 * nothing. The JSON form matters most — it is how the non-JS adapters' users
 * configure the CLI, since they reach the prebuilt binary, not the library.
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
  const dir = fs.mkdtempSync(join(os.tmpdir(), 'es-cli-config-defaults-'));
  made.push(dir);
  return dir;
}

const RAW_RUN = {
  schemaVersion: 1,
  projectRoot: '/repo',
  startedAtMs: 1_700_000_000_000,
  finishedAtMs: 1_700_000_001_000,
  testCases: [
    {
      title: 'Guest checkout succeeds',
      sourceFile: 'src/checkout.test.ts',
      sourceLine: 12,
      status: 'pass',
      story: {
        scenario: 'Guest checkout succeeds',
        steps: [{ keyword: 'then', text: 'the order is placed', assertions: 1 }],
        tickets: [{ id: 'PAY-1042' }],
      },
    },
  ],
};

/** The same run plus a plain test with no story: what synthesis decides about. */
const RAW_RUN_WITH_PLAIN_TEST = {
  ...RAW_RUN,
  testCases: [
    ...RAW_RUN.testCases,
    {
      title: 'adds two numbers',
      sourceFile: 'src/math.test.ts',
      sourceLine: 3,
      status: 'pass',
    },
  ],
};

/** A project directory holding the run JSON and, optionally, a config file. */
function project(config?: unknown, rawRun: unknown = RAW_RUN): string {
  const dir = tmp();
  fs.writeFileSync(join(dir, 'raw-run.json'), JSON.stringify(rawRun));
  if (config !== undefined) {
    fs.writeFileSync(
      join(dir, 'executable-stories.config.json'),
      JSON.stringify(config, null, 2),
    );
  }
  return dir;
}

function run(dir: string, extra: string[] = []) {
  return spawnSync(
    'node',
    [packagedCliPath, 'format', 'raw-run.json', ...extra],
    { cwd: dir, encoding: 'utf8' },
  );
}

describe('config file defaults', () => {
  it('stands in for flags nobody typed', () => {
    ensurePackagedCliBuilt();
    const dir = project({
      defaults: {
        'output-dir': 'docs',
        'output-name': 'stories',
        'html-title': 'Checkout Stories',
        // A number for a string flag: what anyone writes in JSON.
        'html-stale-after-days': 14,
      },
    });

    const result = run(dir);
    expect(result.status, result.stderr).toBe(0);

    const html = fs.readFileSync(join(dir, 'docs/stories.html'), 'utf8');
    expect(html).toContain('<title>Checkout Stories</title>');
    expect(html).toContain('data-es-stale-days="14"');
  });

  it('lets the command line win over the file', () => {
    ensurePackagedCliBuilt();
    const dir = project({
      defaults: { 'output-dir': 'docs', 'html-title': 'From config' },
    });

    const result = run(dir, ['--html-title', 'From the command line']);
    expect(result.status, result.stderr).toBe(0);

    const html = fs.readFileSync(join(dir, 'docs/index.html'), 'utf8');
    expect(html).toContain('<title>From the command line</title>');
    // The flag the command line did NOT mention still comes from the file.
    expect(fs.existsSync(join(dir, 'docs/index.html'))).toBe(true);
  });

  it('carries a boolean flag, so an opt-in section can be a project setting', () => {
    ensurePackagedCliBuilt();
    const dir = project({ defaults: { 'html-architecture': true } });

    const result = run(dir);
    expect(result.status, result.stderr).toBe(0);

    const html = fs.readFileSync(join(dir, 'reports/index.html'), 'utf8');
    expect(html).toContain('data-es-architecture="true"');
  });

  it('names a key that is not a flag and refuses to run', () => {
    ensurePackagedCliBuilt();
    const dir = project({ defaults: { 'html-titel': 'Typo' } });

    const result = run(dir);
    expect(result.status).toBe(4); // EXIT_USAGE
    expect(result.stderr).toContain('html-titel');
    expect(result.stderr).toContain('is not a CLI option');
    expect(fs.existsSync(join(dir, 'reports/index.html'))).toBe(false);
  });

  it('names a value of the wrong type and refuses to run', () => {
    ensurePackagedCliBuilt();
    const dir = project({ defaults: { 'html-architecture': 'yes' } });

    const result = run(dir);
    expect(result.status).toBe(4);
    expect(result.stderr).toContain('expects true or false');
  });

  it('changes nothing when the project has no config file', () => {
    ensurePackagedCliBuilt();
    const dir = project();

    const result = run(dir);
    expect(result.status, result.stderr).toBe(0);
    expect(fs.existsSync(join(dir, 'reports/index.html'))).toBe(true);
  });
});

describe('link templates', () => {
  /** The server-rendered markup, without the inlined island bundle. */
  const serverMarkup = (html: string): string =>
    html.slice(0, html.indexOf('<script type="application/json"'));

  it('links ticket ids in the HTML report, the markdown and the JSON contract', () => {
    ensurePackagedCliBuilt();
    const dir = project();

    const result = run(dir, [
      '--format',
      'html,markdown,story-report-json',
      '--ticket-url-template',
      'https://jira.example.com/browse/{ticket}',
    ]);
    expect(result.status, result.stderr).toBe(0);

    const url = 'https://jira.example.com/browse/PAY-1042';
    expect(serverMarkup(fs.readFileSync(join(dir, 'reports/index.html'), 'utf8'))).toContain(
      `href="${url}"`,
    );
    expect(fs.readFileSync(join(dir, 'reports/index.md'), 'utf8')).toContain(
      `[PAY-1042](${url})`,
    );
    // The contract an agent reads carries the same URL as the page a person
    // opens, rather than the id alone.
    const report = JSON.parse(
      fs.readFileSync(join(dir, 'reports/index.story-report.json'), 'utf8'),
    );
    expect(report.features[0].scenarios[0].tickets).toEqual([{ id: 'PAY-1042', url }]);
  });

  it('leaves a ticket as plain text when no template is given', () => {
    ensurePackagedCliBuilt();
    const dir = project();

    const result = run(dir, ['--format', 'story-report-json']);
    expect(result.status, result.stderr).toBe(0);

    const report = JSON.parse(
      fs.readFileSync(join(dir, 'reports/index.story-report.json'), 'utf8'),
    );
    expect(report.features[0].scenarios[0].tickets).toEqual([{ id: 'PAY-1042' }]);
  });

  it('links the source file from --permalink-base-url', () => {
    ensurePackagedCliBuilt();
    const dir = project();

    const result = run(dir, [
      '--format',
      'markdown',
      '--permalink-base-url',
      'https://github.com/org/repo/blob/main',
    ]);
    expect(result.status, result.stderr).toBe(0);

    expect(fs.readFileSync(join(dir, 'reports/index.md'), 'utf8')).toContain(
      'https://github.com/org/repo/blob/main/src/checkout.test.ts#L12',
    );
  });

  it('takes the templates from the config file like any other flag', () => {
    ensurePackagedCliBuilt();
    const dir = project({
      defaults: { 'ticket-url-template': 'https://linear.app/team/issue/{ticket}' },
    });

    const result = run(dir, ['--format', 'story-report-json']);
    expect(result.status, result.stderr).toBe(0);

    const report = JSON.parse(
      fs.readFileSync(join(dir, 'reports/index.story-report.json'), 'utf8'),
    );
    expect(report.features[0].scenarios[0].tickets[0].url).toBe(
      'https://linear.app/team/issue/PAY-1042',
    );
  });
});

describe('story synthesis, however it is spelled', () => {
  /** Scenarios in the generated contract: 2 with the plain test, 1 without. */
  function scenarioCount(dir: string): number {
    const report = JSON.parse(
      fs.readFileSync(join(dir, 'reports/index.story-report.json'), 'utf8'),
    );
    return report.summary.total;
  }

  const JSON_FORMAT = ['--format', 'story-report-json'];

  const withPlainTest = (config?: unknown) =>
    project(config, RAW_RUN_WITH_PLAIN_TEST);

  it('includes a plain test by default', () => {
    ensurePackagedCliBuilt();
    const dir = withPlainTest();
    expect(run(dir, JSON_FORMAT).status).toBe(0);
    expect(scenarioCount(dir)).toBe(2);
  });

  it('takes the setting from the config file under the positive spelling', () => {
    ensurePackagedCliBuilt();
    const dir = withPlainTest({ defaults: { 'synthesize-stories': false } });
    expect(run(dir, JSON_FORMAT).status).toBe(0);
    expect(scenarioCount(dir)).toBe(1);
  });

  it('takes the setting from the config file under the negative spelling', () => {
    ensurePackagedCliBuilt();
    const dir = withPlainTest({ defaults: { 'no-synthesize-stories': true } });
    expect(run(dir, JSON_FORMAT).status).toBe(0);
    expect(scenarioCount(dir)).toBe(1);
  });

  it('lets an explicit --synthesize-stories beat the config file', () => {
    ensurePackagedCliBuilt();
    const dir = withPlainTest({ defaults: { 'no-synthesize-stories': true } });
    expect(run(dir, [...JSON_FORMAT, '--synthesize-stories']).status).toBe(0);
    expect(scenarioCount(dir)).toBe(2);
  });

  it('lets an explicit --no-synthesize-stories beat the config file', () => {
    ensurePackagedCliBuilt();
    const dir = withPlainTest({ defaults: { 'synthesize-stories': true } });
    expect(run(dir, [...JSON_FORMAT, '--no-synthesize-stories']).status).toBe(0);
    expect(scenarioCount(dir)).toBe(1);
  });

  it('gives the last spelling on the command line the final word', () => {
    ensurePackagedCliBuilt();
    const dir = withPlainTest();
    expect(
      run(dir, [...JSON_FORMAT, '--no-synthesize-stories', '--synthesize-stories']).status,
    ).toBe(0);
    expect(scenarioCount(dir)).toBe(2);
  });

  it('refuses a config that sets both spellings against each other', () => {
    ensurePackagedCliBuilt();
    const dir = withPlainTest({
      defaults: { 'synthesize-stories': true, 'no-synthesize-stories': true },
    });
    const result = run(dir, JSON_FORMAT);
    expect(result.status).toBe(4);
    expect(result.stderr).toContain('contradict each other');
  });
});
