import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createCatalog } from 'executable-stories-showcase';
import { describe, expect, it } from 'vitest';
import {
  affectedScenarios,
  coverage,
  endpointStem,
  parseMap,
} from '../../../packages/executable-stories-showcase-cli/src/map.ts';
import { githubRepo, publishFiles } from '../../../packages/executable-stories-showcase-cli/src/publish.ts';

const catalog = createCatalog([
  { name: 'default', network: [{ path: '/api/orders', response: { body: [] } }] },
  { name: 'orders-empty', extends: 'default', path: '/orders' },
  { name: 'orders-error', extends: 'orders-empty' },
  {
    name: 'profile',
    path: '/profile/:id',
    network: [{ path: 'https://api.test/v2/users/:id', response: {} }],
  },
]);

const MAP = `# Shop

| Command | Does |
| ------- | ---- |
| dev     | runs |

| Feature | Route   | State   | Scenario       | Status     | Source                     |
| ------- | ------- | ------- | -------------- | ---------- | -------------------------- |
| Orders  | /orders | Empty   | \`orders-empty\` | covered    | \`src/orders/\`, src/x.ts |
| Orders  | /orders | Error   | orders-error   | Covered    |                            |
| Orders  | /orders | Offline | —              | missing    |                            |
| Orders  | /orders | Slow    | orders-slow    | covered    |                            |
| Orders  | /orders | SSR     |                | can't mock |                            |
`;

describe('parseMap', () => {
  it('reads tables with Scenario and Status columns and skips others', () => {
    const rows = parseMap(MAP, 'map.md');

    expect(rows).toHaveLength(5);
    expect(rows[0]).toMatchObject({
      feature: 'Orders',
      scenario: 'orders-empty',
      status: 'covered',
      source: ['src/orders/', 'src/x.ts'],
      at: 'map.md:9',
    });
    expect(rows.map((r) => r.status)).toEqual(['covered', 'covered', 'missing', 'covered', 'cant-mock']);
    expect(rows[2]?.scenario).toBe('');
  });
});

describe('coverage', () => {
  it('counts a covered row whose scenario is gone as missing, and lists unmapped states', () => {
    const result = coverage(parseMap(MAP, 'map.md'), catalog);

    expect(result).toMatchObject({ covered: 2, missing: 2, cantMock: 1, ratio: 0.5 });
    expect(result.stale.map((r) => r.scenario)).toEqual(['orders-slow']);
    // default and orders-empty are extended, so they're bases; profile is a state no row names.
    expect(result.unmapped).toEqual(['profile']);
  });
});

describe('endpointStem', () => {
  it('keeps the specific part of an MSW path', () => {
    expect(endpointStem('/api/orders')).toBe('/api/orders');
    expect(endpointStem('https://api.test/v2/users/:id')).toBe('/v2/users');
    expect(endpointStem('/api/:id')).toBeUndefined();
    expect(endpointStem('/api/v1/*')).toBeUndefined();
  });
});

describe('coverage with several scenarios in one row', () => {
  const row = (scenario: string) =>
    parseMap(`| Feature | Scenario | Status |\n| --- | --- | --- |\n| Orders | ${scenario} | covered |\n`, 'm.md');

  it('counts a row naming scenarios that all exist as covered', () => {
    const result = coverage(row('orders-empty,orders-error'), catalog);

    expect(result.stale).toEqual([]);
    expect(result.covered).toBe(1);
    expect(result.unmapped).not.toContain('orders-error');
  });

  it('reports the row as stale when any one of its scenarios is gone', () => {
    expect(coverage(row('orders-empty,orders-gone'), catalog).stale).toHaveLength(1);
  });
});

describe('affectedScenarios', () => {
  const run = (changed: { path: string; content?: string; }[]) =>
    affectedScenarios({ changed, dir: 'src/scenarios', catalog, rows: parseMap(MAP, 'map.md') });

  it('includes what extends a scenario the map matched, not only one whose file changed', () => {
    // src/x.ts reaches orders-empty through its map row only; orders-error extends orders-empty.
    const { scenarios } = run([{ path: 'src/x.ts', content: 'export const x = 1;' }]);

    expect(scenarios.map((s) => [s.name, s.reasons[0]?.kind])).toEqual([
      ['orders-empty', 'map'],
      ['orders-error', 'extends'],
    ]);
  });

  it('follows a changed scenario file to everything that extends it', () => {
    const { scenarios } = run([{ path: 'src/scenarios/default.json', content: '{"name":"default"}' }]);

    expect(scenarios.map((s) => [s.name, s.reasons[0]?.kind])).toEqual([
      ['default', 'scenario'],
      ['orders-empty', 'extends'],
      ['orders-error', 'extends'],
    ]);
  });

  it('matches map sources, endpoints and routes, and lists the rest as unmatched', () => {
    const { scenarios, unmatched } = run([
      { path: 'src/orders/List.tsx', content: 'export const List = () => null;' },
      { path: 'src/api.ts', content: `fetch('/api/orders'); fetch('/api/orders-history');` },
      { path: 'src/pages/profile/index.tsx', content: '' },
      { path: 'src/theme.css', content: 'body {}' },
      { path: 'src/gone.tsx' }, // deleted
    ]);

    const reasons = Object.fromEntries(scenarios.map((s) => [s.name, s.reasons.map((r) => r.kind)]));

    // It also extends default, which the endpoint matched.
    expect(reasons['orders-empty']).toEqual(['map', 'endpoint', 'route', 'extends']);
    expect(reasons.default).toEqual(['endpoint']);
    expect(reasons.profile).toEqual(['route']);
    expect(unmatched).toEqual(['src/theme.css', 'src/gone.tsx']);
  });
});

describe('publish', () => {
  it('reads owner/repo from GitHub remotes only', () => {
    expect(githubRepo('git@github.com:acme/shop.git')).toBe('acme/shop');
    expect(githubRepo('https://github.com/acme/shop')).toBe('acme/shop');
    expect(githubRepo('https://gitlab.com/acme/shop.git')).toBeUndefined();
  });

  it('commits to the branch without touching the checkout, replacing only its folder', () => {
    const root = mkdtempSync(join(tmpdir(), 'ss-publish-'));
    const remote = mkdtempSync(join(tmpdir(), 'ss-publish-remote-'));
    const git = (...args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();

    execFileSync('git', ['init', '-q', '--bare', remote]);
    git('init', '-q', '-b', 'main');
    git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', 'init');
    git('remote', 'add', 'origin', remote);
    writeFileSync(join(root, 'a.png'), 'a');
    writeFileSync(join(root, 'b.png'), 'b');

    const cwd = process.cwd();
    process.chdir(root);

    try {
      publishFiles({ files: ['a.png', 'b.png'], folder: 'pr-1' });
      publishFiles({ files: ['a.png'], folder: 'pr-2/run' });
      const [link] = publishFiles({ files: ['b.png'], folder: 'pr-1' });

      expect(link?.url).toMatch(/^scenario-shots@[0-9a-f]{12}:pr-1\/b\.png$/);
    } finally {
      process.chdir(cwd);
    }

    const files = git('--git-dir', remote, 'ls-tree', '-r', '--name-only', 'scenario-shots');
    expect(files.split('\n')).toEqual(['pr-1/b.png', 'pr-2/run/a.png']);
    expect(git('status', '--short')).toBe('?? a.png\n?? b.png');
    expect(git('log', '--format=%s', 'main')).toBe('init');
    expect(() => publishFiles({ files: ['a.png'], folder: '../x' })).toThrow('--folder');
  }, 30_000); // a dozen git subprocesses; slow when the whole monorepo tests at once

  it('refuses file names that would add entries of their own to the tree', () => {
    // Screenshot names can come from a pull request's code; mktree reads one entry per line.
    for (const name of ['a\n100644 blob 0000000000000000000000000000000000000000\tx.png', 'a\tb.png', '..']) {
      expect(() => publishFiles({ files: [`/tmp/${name}`], folder: 'pr-1' })).toThrow('file names');
    }
  });
});
