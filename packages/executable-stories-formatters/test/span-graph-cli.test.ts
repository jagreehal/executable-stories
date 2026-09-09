/**
 * `--format span-graph` through the real CLI.
 *
 * The load-bearing behaviour is the silence: a suite with no OTel spans must
 * produce no file, so adding the format to a preset or a CI command costs
 * nothing until someone instruments something.
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
  const dir = fs.mkdtempSync(join(os.tmpdir(), 'es-cli-span-graph-'));
  made.push(dir);
  return dir;
}

function rawRun(withSpans: boolean) {
  return {
    schemaVersion: 1,
    projectRoot: '/repo',
    startedAtMs: 1_700_000_000_000,
    finishedAtMs: 1_700_000_001_000,
    testCases: [
      {
        title: 'Guest checkout succeeds',
        sourceFile: 'src/checkout.test.ts',
        sourceLine: 1,
        status: 'pass',
        story: {
          scenario: 'Guest checkout succeeds',
          steps: [
            { keyword: 'then', text: 'the order is placed', assertions: 1 },
          ],
          ...(withSpans
            ? {
                otelSpans: [
                  {
                    spanId: 'a1',
                    name: 'POST /checkout',
                    status: 'ok',
                    attributes: {
                      'service.name': 'storefront',
                      'http.route': '/checkout',
                    },
                  },
                  {
                    spanId: 'a2',
                    parentSpanId: 'a1',
                    name: 'checkout.submit',
                    status: 'ok',
                    attributes: { 'peer.service': 'checkout-api' },
                  },
                  {
                    spanId: 'a3',
                    parentSpanId: 'a2',
                    name: 'SELECT orders',
                    status: 'ok',
                    attributes: {
                      'db.system': 'postgres',
                      'db.namespace': 'orders',
                    },
                  },
                ],
              }
            : {}),
        },
      },
    ],
  };
}

function format(dir: string, outputDir: string) {
  return spawnSync(
    'node',
    [
      packagedCliPath,
      'format',
      join(dir, 'raw-run.json'),
      '--format',
      'span-graph',
      '--output-dir',
      outputDir,
      '--output-name',
      'index',
    ],
    { cwd: dir, encoding: 'utf8' },
  );
}

describe('executable-stories format --format span-graph', () => {
  it('writes the exercised architecture when the run carries spans', () => {
    ensurePackagedCliBuilt();
    const dir = tmp();
    const outputDir = join(dir, 'reports');
    fs.writeFileSync(join(dir, 'raw-run.json'), JSON.stringify(rawRun(true)));

    const result = format(dir, outputDir);
    expect(result.status, result.stderr).toBe(0);

    const written = join(outputDir, 'index.span-graph.md');
    expect(fs.existsSync(written)).toBe(true);

    const content = fs.readFileSync(written, 'utf8');
    expect(content).toContain('```mermaid');
    expect(content).toContain('storefront');
    expect(content).toContain('checkout-api');
    expect(content).toContain('postgres:orders');
    expect(content).toContain('Guest checkout succeeds');
  });

  it('colours the components a --baseline says the change is about', () => {
    ensurePackagedCliBuilt();
    const dir = tmp();
    const outputDir = join(dir, 'reports');

    // Baseline: the same suite without the inventory scenario.
    const before = rawRun(true);
    fs.writeFileSync(join(dir, 'baseline.json'), JSON.stringify(before));

    // Current: one extra scenario reaching a component nothing else touches.
    const after = rawRun(true);
    after.testCases.push({
      title: 'Stock is reserved',
      sourceFile: 'src/inventory.test.ts',
      sourceLine: 1,
      status: 'pass',
      story: {
        scenario: 'Stock is reserved',
        steps: [{ keyword: 'then', text: 'stock drops', assertions: 1 }],
        otelSpans: [
          {
            spanId: 'c1',
            name: 'inventory.reserve',
            status: 'ok',
            attributes: { 'peer.service': 'inventory' },
          },
        ],
      },
    } as (typeof after)['testCases'][number]);
    fs.writeFileSync(join(dir, 'raw-run.json'), JSON.stringify(after));

    const result = spawnSync(
      'node',
      [
        packagedCliPath,
        'format',
        join(dir, 'raw-run.json'),
        '--format',
        'span-graph',
        '--output-dir',
        outputDir,
        '--output-name',
        'index',
        '--baseline',
        join(dir, 'baseline.json'),
      ],
      { cwd: dir, encoding: 'utf8' },
    );
    expect(result.status, result.stderr).toBe(0);

    const content = fs.readFileSync(join(outputDir, 'index.span-graph.md'), 'utf8');
    // `inventory` is reached only by the new scenario, so it is new to the system.
    expect(content).toContain('class inventory esAdded');
    expect(content).toContain('classDef esAdded');
    // Nothing else moved, so nothing else is coloured.
    expect(content).not.toContain('class checkout_api');
  });

  it('mentions the graph when a run carries spans and nobody asked for it', () => {
    ensurePackagedCliBuilt();
    const dir = tmp();
    const outputDir = join(dir, 'reports');
    fs.writeFileSync(join(dir, 'raw-run.json'), JSON.stringify(rawRun(true)));

    const result = spawnSync(
      'node',
      [
        packagedCliPath, 'format', join(dir, 'raw-run.json'),
        '--format', 'markdown', '--output-dir', outputDir, '--output-name', 'index',
      ],
      { cwd: dir, encoding: 'utf8' },
    );

    expect(result.status, result.stderr).toBe(0);
    expect(result.stderr).toContain('--format span-graph');
  });

  it('stays quiet about the graph when the run has no spans to draw', () => {
    ensurePackagedCliBuilt();
    const dir = tmp();
    const outputDir = join(dir, 'reports');
    fs.writeFileSync(join(dir, 'raw-run.json'), JSON.stringify(rawRun(false)));

    const result = spawnSync(
      'node',
      [
        packagedCliPath, 'format', join(dir, 'raw-run.json'),
        '--format', 'markdown', '--output-dir', outputDir, '--output-name', 'index',
      ],
      { cwd: dir, encoding: 'utf8' },
    );

    expect(result.stderr).not.toContain('carries OTel spans');
  });

  it('does not nag when span-graph was already asked for', () => {
    ensurePackagedCliBuilt();
    const dir = tmp();
    const outputDir = join(dir, 'reports');
    fs.writeFileSync(join(dir, 'raw-run.json'), JSON.stringify(rawRun(true)));

    const result = format(dir, outputDir);
    expect(result.stderr).not.toContain('carries OTel spans');
  });

  it('puts the architecture section in the HTML report a person opens', () => {
    // The .span-graph.md file is for a pipeline; the HTML report is what people
    // actually open, and the section is worth nothing if it only lives beside
    // the report rather than in it.
    ensurePackagedCliBuilt();
    const dir = tmp();
    const outputDir = join(dir, 'reports');
    fs.writeFileSync(join(dir, 'raw-run.json'), JSON.stringify(rawRun(true)));

    const result = spawnSync(
      'node',
      [
        packagedCliPath, 'format', join(dir, 'raw-run.json'),
        '--format', 'html', '--output-dir', outputDir, '--output-name', 'index',
      ],
      { cwd: dir, encoding: 'utf8' },
    );
    expect(result.status, result.stderr).toBe(0);

    const html = fs.readFileSync(join(outputDir, 'index.html'), 'utf8');
    expect(html).toContain('Architecture, as it ran');
    expect(html).toContain('checkout-api');
    expect(html).toContain('postgres:orders');
    // The mermaid source ships server-rendered, so the diagram is readable
    // without JavaScript and by an agent reading the HTML.
    expect(html).toContain('flowchart LR');
  });

  it('leaves the HTML report untouched when the run carries no spans', () => {
    ensurePackagedCliBuilt();
    const dir = tmp();
    const outputDir = join(dir, 'reports');
    fs.writeFileSync(join(dir, 'raw-run.json'), JSON.stringify(rawRun(false)));

    const result = spawnSync(
      'node',
      [
        packagedCliPath, 'format', join(dir, 'raw-run.json'),
        '--format', 'html', '--output-dir', outputDir, '--output-name', 'index',
      ],
      { cwd: dir, encoding: 'utf8' },
    );
    expect(result.status, result.stderr).toBe(0);

    const html = fs.readFileSync(join(outputDir, 'index.html'), 'utf8');
    // Only derived data proves anything here. The report inlines the interactive
    // island's JS, so every literal in the component and the derivation ("
    // Architecture, as it ran", "flowchart LR") is in that bundle whether or not
    // the section rendered. A component id is built from this run's spans, so it
    // cannot appear unless the graph was actually drawn.
    expect(html).not.toContain('postgres:orders');
    expect(html).not.toContain('checkout-api');
  });

  it('writes no file when the run carries no spans', () => {
    ensurePackagedCliBuilt();
    const dir = tmp();
    const outputDir = join(dir, 'reports');
    fs.writeFileSync(join(dir, 'raw-run.json'), JSON.stringify(rawRun(false)));

    const result = format(dir, outputDir);
    expect(result.status, result.stderr).toBe(0);
    expect(fs.existsSync(join(outputDir, 'index.span-graph.md'))).toBe(false);
  });
});
