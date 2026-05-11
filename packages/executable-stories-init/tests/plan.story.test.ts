import { describe, expect, it } from 'vitest';
import { story } from 'executable-stories-vitest';
import { resolvePlan } from '../src/plan';
import type { RepoFacts, ResolvedFlags } from '../src/types';

function fakeFacts(over: Partial<RepoFacts> = {}): RepoFacts {
  return {
    cwd: '/repo',
    packageManager: 'pnpm',
    isMonorepo: false,
    workspacePackages: [],
    candidates: [{ name: 'demo', path: '/repo' }],
    hasTypeScript: () => true,
    hasDependency: () => false,
    hasVitest: () => false,
    hasPlaywright: () => false,
    hasExistingVitestConfig: () => false,
    hasExistingPlaywrightConfig: () => false,
    ...over,
  };
}

describe('resolvePlan', () => {
  it('Plans Vitest install + config + sample for a single-package repo', async ({ task }) => {
    story.init(task);

    story.given('a single-package repo and Vitest selected');
    const flags: ResolvedFlags = {
      targets: ['/repo'],
      frameworks: ['vitest'],
      writeTsconfig: false,
      force: false,
    };

    story.when('we resolve the plan');
    const plan = await resolvePlan({ facts: fakeFacts(), flags }, {});

    story.then('plan has install, write config, write sample, patch package.json');
    const kinds = plan.ops.map((o) => o.kind);
    expect(kinds).toEqual(['install', 'write', 'write', 'patch-package-json']);

    story.then('install op contains vitest deps');
    const install = plan.ops.find((o) => o.kind === 'install');
    expect(install).toBeDefined();
    if (install?.kind === 'install') {
      expect(install.deps).toContain('vitest');
      expect(install.deps).toContain('executable-stories-vitest');
      expect(install.deps).toContain('executable-stories-formatters');
    }

    story.then('patch sets test script');
    const patch = plan.ops.find((o) => o.kind === 'patch-package-json');
    expect(patch).toBeDefined();
    if (patch?.kind === 'patch-package-json') {
      expect(patch.scripts.test).toBe('vitest run');
    }

    story.then('summary includes package manager');
    expect(plan.summary.packageManager).toBe('pnpm');
  });

  it('Plans Playwright only when selected', async ({ task }) => {
    story.init(task);

    story.given('Playwright selected as the only framework');
    const flags: ResolvedFlags = {
      targets: ['/repo'],
      frameworks: ['playwright'],
      writeTsconfig: false,
      force: false,
    };

    story.when('we resolve the plan');
    const plan = await resolvePlan({ facts: fakeFacts(), flags }, {});

    story.then('install op contains @playwright/test but not vitest');
    const install = plan.ops.find((o) => o.kind === 'install');
    expect(install).toBeDefined();
    if (install?.kind === 'install') {
      expect(install.deps).toContain('@playwright/test');
      expect(install.deps).not.toContain('vitest');
    }
  });

  it('Skips writing vitest.config.ts when one already exists and force is false', async ({ task }) => {
    story.init(task);

    story.given('a repo with an existing vitest.config.ts and force=false');
    const flags: ResolvedFlags = {
      targets: ['/repo'],
      frameworks: ['vitest'],
      writeTsconfig: false,
      force: false,
    };

    story.when('we resolve the plan against facts that report an existing config');
    const plan = await resolvePlan({
      facts: fakeFacts({ hasExistingVitestConfig: () => true }),
      flags,
    }, {});

    story.then('no write op targets vitest.config.ts');
    const writeOps = plan.ops.filter((o): o is Extract<typeof plan.ops[number], { kind: 'write' }> => o.kind === 'write');
    expect(writeOps.find((o) => o.path.endsWith('vitest.config.ts'))).toBeUndefined();
  });

  it('Skips install op when all vitest dependencies already exist', async ({ task }) => {
    story.init(task);

    story.given('a repo where all vitest bootstrap dependencies already exist');
    const flags: ResolvedFlags = {
      targets: ['/repo'],
      frameworks: ['vitest'],
      writeTsconfig: false,
      force: false,
    };

    story.when('we resolve the plan');
    const plan = await resolvePlan({
      facts: fakeFacts({ hasDependency: () => true }),
      flags,
    }, {});

    story.then('no install op is created');
    const installOps = plan.ops.filter((o) => o.kind === 'install');
    expect(installOps).toHaveLength(0);
  });
});
