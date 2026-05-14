import { describe, expect, it } from 'vitest';
import { story } from 'executable-stories-vitest';
import { resolveTargets } from '../src/targets';
import type { RepoFacts } from '../src/types';

function fakeFacts(over: Partial<RepoFacts> = {}): RepoFacts {
  return {
    cwd: '/repo',
    packageManager: 'pnpm',
    isMonorepo: true,
    workspacePackages: [
      { name: '@scope/api', path: '/repo/packages/api' },
      { name: '@scope/web', path: 'C:\\repo\\apps\\web' },
    ],
    candidates: [],
    hasTypeScript: () => true,
    hasDependency: () => false,
    hasVitest: () => false,
    hasPlaywright: () => false,
    hasJest: () => false,
    hasCypress: () => false,
    hasExistingVitestConfig: () => false,
    hasExistingPlaywrightConfig: () => false,
    hasExistingJestConfig: () => false,
    hasExistingCypressConfig: () => false,
    ...over,
  };
}

describe('resolveTargets', () => {
  it('Resolves by workspace leaf folder name across separators', async ({ task }) => {
    story.init(task);

    story.given('mixed POSIX and Windows workspace paths');
    const facts = fakeFacts();

    story.when('target leaves are provided');
    const targets = await resolveTargets(
      ['api', 'web'],
      facts,
      { json: false, interactive: false },
    );

    story.then('both targets resolve correctly');
    expect(targets).toEqual(['/repo/packages/api', 'C:\\repo\\apps\\web']);
  });

  it('Unknown target includes valid names and root tip', async ({ task }) => {
    story.init(task);

    story.given('a monorepo with known workspace names');
    const facts = fakeFacts();

    story.when('an unknown target is requested');
    const err = await resolveTargets(
      ['missing'],
      facts,
      { json: false, interactive: false },
    ).catch((e) => e as Error);

    story.then('error message is user-friendly');
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toContain('unknown target: missing');
    expect(err.message).toContain('valid targets: root, @scope/api, @scope/web, api, web');
    expect(err.message).toContain('use --target root');
  });

  it('Ambiguous leaf target asks for full package name', async ({ task }) => {
    story.init(task);

    story.given('multiple workspaces sharing the same leaf folder');
    const facts = fakeFacts({
      workspacePackages: [
        { name: '@scope/web-app', path: '/repo/apps/web' },
        { name: '@scope/web-pkg', path: '/repo/packages/web' },
      ],
    });

    story.when('the shared leaf name is used as --target');
    const err = await resolveTargets(
      ['web'],
      facts,
      { json: false, interactive: false },
    ).catch((e) => e as Error);

    story.then('an ambiguity error is returned with match details');
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toContain('ambiguous target: web');
    expect(err.message).toContain('@scope/web-app (/repo/apps/web)');
    expect(err.message).toContain('@scope/web-pkg (/repo/packages/web)');
    expect(err.message).toContain('use the full workspace package name');
  });

  it('Deduplicates repeated targets from aliases and duplicates', async ({ task }) => {
    story.init(task);

    story.given('targets passed with duplicates and alias overlap');
    const facts = fakeFacts();

    story.when('resolving targets');
    const targets = await resolveTargets(
      ['root', 'root', '@scope/api', 'api'],
      facts,
      { json: false, interactive: false },
    );

    story.then('only unique resolved paths are returned');
    expect(targets).toEqual(['/repo', '/repo/packages/api']);
  });
});
