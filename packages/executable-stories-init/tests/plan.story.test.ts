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
    hasJest: () => false,
    hasCypress: () => false,
    hasExistingVitestConfig: () => false,
    hasExistingPlaywrightConfig: () => false,
    hasExistingJestConfig: () => false,
    hasExistingCypressConfig: () => false,
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
    expect(kinds).toContain('install');
    expect(kinds).toContain('write');
    expect(kinds).toContain('patch-package-json');

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

  it('Plans Jest config + sample + script when selected', async ({ task }) => {
    story.init(task);

    const flags: ResolvedFlags = {
      targets: ['/repo'],
      frameworks: ['jest'],
      writeTsconfig: false,
      force: false,
    };

    const plan = await resolvePlan({ facts: fakeFacts(), flags }, {});
    const install = plan.ops.find((o) => o.kind === 'install');
    expect(install?.kind).toBe('install');
    if (install?.kind === 'install') {
      expect(install.deps).toContain('jest');
      expect(install.deps).toContain('ts-jest');
      expect(install.deps).toContain('executable-stories-jest');
    }
    expect(
      plan.ops.some((o) => o.kind === 'write' && o.path.endsWith('jest.config.mjs'))
    ).toBe(true);
    expect(
      plan.ops.some((o) => o.kind === 'write' && o.path.endsWith('src/example.story.test.ts'))
    ).toBe(true);
    const patch = plan.ops.find((o) => o.kind === 'patch-package-json');
    expect(patch?.kind).toBe('patch-package-json');
    if (patch?.kind === 'patch-package-json') {
      expect(patch.scripts.test).toBe('jest --config jest.config.mjs');
    }
  });

  it('Plans Cypress config + support + sample + script when selected', async ({ task }) => {
    story.init(task);

    const flags: ResolvedFlags = {
      targets: ['/repo'],
      frameworks: ['cypress'],
      writeTsconfig: false,
      force: false,
    };

    const plan = await resolvePlan({ facts: fakeFacts(), flags }, {});
    const install = plan.ops.find((o) => o.kind === 'install');
    expect(install?.kind).toBe('install');
    if (install?.kind === 'install') {
      expect(install.deps).toContain('cypress');
      expect(install.deps).toContain('executable-stories-cypress');
    }
    expect(
      plan.ops.some((o) => o.kind === 'write' && o.path.endsWith('cypress.config.ts'))
    ).toBe(true);
    expect(
      plan.ops.some((o) => o.kind === 'write' && o.path.endsWith('cypress/support/e2e.ts'))
    ).toBe(true);
    expect(
      plan.ops.some((o) => o.kind === 'write' && o.path.endsWith('cypress/e2e/example.story.cy.ts'))
    ).toBe(true);
    const patch = plan.ops.find((o) => o.kind === 'patch-package-json');
    expect(patch?.kind).toBe('patch-package-json');
    if (patch?.kind === 'patch-package-json') {
      expect(patch.scripts['test:e2e']).toBe('cypress run');
    }
  });

  it('Avoids script collisions when all frameworks are selected', async ({ task }) => {
    story.init(task);

    const flags: ResolvedFlags = {
      targets: ['/repo'],
      frameworks: ['vitest', 'playwright', 'jest', 'cypress'],
      writeTsconfig: false,
      force: false,
    };

    const plan = await resolvePlan({ facts: fakeFacts(), flags }, {});
    const patchOps = plan.ops.filter((o): o is Extract<typeof plan.ops[number], { kind: 'patch-package-json' }> => (
      o.kind === 'patch-package-json'
    ));
    const mergedScripts = patchOps.reduce<Record<string, string>>((acc, op) => {
      Object.assign(acc, op.scripts);
      return acc;
    }, {});

    expect(mergedScripts['test:stories:vitest']).toBe('vitest run');
    expect(mergedScripts['test:stories:jest']).toBe('jest --config jest.config.mjs');
    expect(mergedScripts['test:e2e:playwright']).toBe('playwright test');
    expect(mergedScripts['test:e2e:cypress']).toBe('cypress run');
    expect(mergedScripts.test).toBeUndefined();
    expect(mergedScripts['test:e2e']).toBeUndefined();

    const notes = plan.ops.filter((o): o is Extract<typeof plan.ops[number], { kind: 'note' }> => o.kind === 'note');
    expect(notes.some((n) => n.message.includes('Vitest and Jest'))).toBe(true);
    expect(notes.some((n) => n.message.includes('Playwright and Cypress'))).toBe(true);

    const writePaths = plan.ops
      .filter((o): o is Extract<typeof plan.ops[number], { kind: 'write' }> => o.kind === 'write')
      .map((o) => o.path);
    expect(writePaths).toContain('/repo/src/example.vitest.story.test.ts');
    expect(writePaths).toContain('/repo/src/example.jest.story.test.ts');
    expect(writePaths).not.toContain('/repo/src/example.story.test.ts');

    const installOps = plan.ops.filter((o): o is Extract<typeof plan.ops[number], { kind: 'install' }> => o.kind === 'install');
    expect(installOps).toHaveLength(1);
    expect(installOps[0]?.deps).toEqual(expect.arrayContaining([
      'vitest',
      '@playwright/test',
      'jest',
      'cypress',
      'executable-stories-formatters',
      'executable-stories-vitest',
      'executable-stories-playwright',
      'executable-stories-jest',
      'executable-stories-cypress',
    ]));
  });
});
