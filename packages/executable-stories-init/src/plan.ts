import { join } from 'node:path';
import { renderTemplate } from './templates';
import type { Op, Plan, RepoFacts, ResolvedFlags } from './types';

export async function resolvePlan(
  args: { facts: RepoFacts; flags: ResolvedFlags },
  _deps: unknown,
): Promise<Plan> {
  const { facts, flags } = args;
  const ops: Op[] = [];

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
    if (flags.frameworks.includes('vitest')) {
      const vitestDeps = ['vitest', 'executable-stories-vitest', 'executable-stories-formatters'];
      const missing = vitestDeps.filter((dep) => !facts.hasDependency(target, dep));
      if (missing.length > 0) {
        ops.push({
          kind: 'install',
          target,
          deps: missing,
          dev: true,
          packageManager: facts.packageManager,
        });
      }
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
        path: join(target, 'src/example.story.test.ts'),
        contents: await renderTemplate('vitest-sample.story.test.ts'),
      });
      ops.push({ kind: 'patch-package-json', target, scripts: { test: 'vitest run' } });
    }
    if (flags.frameworks.includes('playwright')) {
      const pwDeps = ['@playwright/test', 'executable-stories-playwright', 'executable-stories-formatters'];
      const missing = pwDeps.filter((dep) => !facts.hasDependency(target, dep));
      if (missing.length > 0) {
        ops.push({
          kind: 'install',
          target,
          deps: missing,
          dev: true,
          packageManager: facts.packageManager,
        });
      }
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
      ops.push({
        kind: 'patch-package-json',
        target,
        scripts: { 'test:e2e': 'playwright test' },
      });
    }
  }

  return {
    ops,
    summary: { targets: flags.targets, frameworks: flags.frameworks, packageManager: facts.packageManager },
  };
}
