import { join } from 'node:path';
import { renderTemplate } from './templates';
import type { Op, Plan, RepoFacts, ResolvedFlags } from './types';

export async function resolvePlan(
  args: { facts: RepoFacts; flags: ResolvedFlags },
  _deps: unknown,
): Promise<Plan> {
  const { facts, flags } = args;
  const ops: Op[] = [];
  const hasVitest = flags.frameworks.includes('vitest');
  const hasPlaywright = flags.frameworks.includes('playwright');
  const hasJest = flags.frameworks.includes('jest');
  const hasCypress = flags.frameworks.includes('cypress');
  const unitScriptConflicts = hasVitest && hasJest;
  const e2eScriptConflicts = hasPlaywright && hasCypress;
  const unitSampleConflicts = hasVitest && hasJest;

  if (flags.writeTsconfig) {
    for (const target of flags.targets) {
      if (!facts.hasTypeScript(target)) {
        ops.push({
          kind: 'write',
          target,
          path: join(target, 'tsconfig.json'),
          contents: await renderTemplate('tsconfig.json'),
        });
      }
    }
  }

  for (const target of flags.targets) {
    const installDeps = new Set<string>();

    if (hasVitest) {
      const vitestDeps = ['vitest', 'executable-stories-vitest', 'executable-stories-formatters'];
      const missing = vitestDeps.filter((dep) => !facts.hasDependency(target, dep));
      missing.forEach((dep) => installDeps.add(dep));
      if (!facts.hasExistingVitestConfig(target) || flags.force) {
        ops.push({
          kind: 'write',
          target,
          path: join(target, 'vitest.config.ts'),
          contents: await renderTemplate('vitest-config.ts'),
        });
      }
      ops.push({
        kind: 'write',
        target,
        path: join(target, unitSampleConflicts ? 'src/example.vitest.story.test.ts' : 'src/example.story.test.ts'),
        contents: await renderTemplate('vitest-sample.story.test.ts'),
      });
      const scriptName = unitScriptConflicts ? 'test:stories:vitest' : 'test';
      ops.push({ kind: 'patch-package-json', target, scripts: { [scriptName]: 'vitest run' } });
    }
    if (hasPlaywright) {
      const pwDeps = ['@playwright/test', 'executable-stories-playwright', 'executable-stories-formatters'];
      const missing = pwDeps.filter((dep) => !facts.hasDependency(target, dep));
      missing.forEach((dep) => installDeps.add(dep));
      if (!facts.hasExistingPlaywrightConfig(target) || flags.force) {
        ops.push({
          kind: 'write',
          target,
          path: join(target, 'playwright.config.ts'),
          contents: await renderTemplate('playwright-config.ts'),
        });
      }
      ops.push({
        kind: 'write',
        target,
        path: join(target, 'tests/example.story.spec.ts'),
        contents: await renderTemplate('playwright-sample.story.spec.ts'),
      });
      const scriptName = e2eScriptConflicts ? 'test:e2e:playwright' : 'test:e2e';
      ops.push({ kind: 'patch-package-json', target, scripts: { [scriptName]: 'playwright test' } });
    }
    if (hasJest) {
      const jestDeps = ['jest', '@jest/globals', 'ts-jest', 'executable-stories-jest', 'executable-stories-formatters'];
      const missing = jestDeps.filter((dep) => !facts.hasDependency(target, dep));
      missing.forEach((dep) => installDeps.add(dep));
      if (!facts.hasExistingJestConfig(target) || flags.force) {
        ops.push({
          kind: 'write',
          target,
          path: join(target, 'jest.config.mjs'),
          contents: await renderTemplate('jest-config.mjs'),
        });
      }
      ops.push({
        kind: 'write',
        target,
        path: join(target, unitSampleConflicts ? 'src/example.jest.story.test.ts' : 'src/example.story.test.ts'),
        contents: await renderTemplate('jest-sample.story.test.ts'),
      });
      const scriptName = unitScriptConflicts ? 'test:stories:jest' : 'test';
      ops.push({ kind: 'patch-package-json', target, scripts: { [scriptName]: 'jest --config jest.config.mjs' } });
    }
    if (hasCypress) {
      const cypressDeps = ['cypress', 'executable-stories-cypress', 'executable-stories-formatters'];
      const missing = cypressDeps.filter((dep) => !facts.hasDependency(target, dep));
      missing.forEach((dep) => installDeps.add(dep));
      if (!facts.hasExistingCypressConfig(target) || flags.force) {
        ops.push({
          kind: 'write',
          target,
          path: join(target, 'cypress.config.ts'),
          contents: await renderTemplate('cypress-config.ts'),
        });
      }
      ops.push({
        kind: 'write',
        target,
        path: join(target, 'cypress/support/e2e.ts'),
        contents: await renderTemplate('cypress-support-e2e.ts'),
      });
      ops.push({
        kind: 'write',
        target,
        path: join(target, 'cypress/e2e/example.story.cy.ts'),
        contents: await renderTemplate('cypress-sample.story.cy.ts'),
      });
      const scriptName = e2eScriptConflicts ? 'test:e2e:cypress' : 'test:e2e';
      ops.push({ kind: 'patch-package-json', target, scripts: { [scriptName]: 'cypress run' } });
    }

    if (unitScriptConflicts) {
      ops.push({
        kind: 'note',
        level: 'info',
        message: `Both Vitest and Jest selected in ${target}; writing test:stories:* scripts to avoid test script collisions.`,
      });
    }
    if (e2eScriptConflicts) {
      ops.push({
        kind: 'note',
        level: 'info',
        message: `Both Playwright and Cypress selected in ${target}; writing test:e2e:* scripts to avoid test:e2e collisions.`,
      });
    }
    if (unitSampleConflicts) {
      ops.push({
        kind: 'note',
        level: 'info',
        message: `Both Vitest and Jest selected in ${target}; writing framework-specific sample story filenames to avoid file collisions.`,
      });
    }

    if (installDeps.size > 0) {
      ops.push({
        kind: 'install',
        target,
        deps: [...installDeps],
        dev: true,
        packageManager: facts.packageManager,
      });
    }
  }

  return {
    ops,
    summary: { targets: flags.targets, frameworks: flags.frameworks, packageManager: facts.packageManager },
  };
}
