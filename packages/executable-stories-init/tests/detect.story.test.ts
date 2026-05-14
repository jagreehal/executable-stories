import { story } from 'executable-stories-vitest';
import { describe, expect, it } from 'vitest';
import { detectRepo } from '../src/detect';
import { makeFixture } from './_fixtures';

describe('detectRepo', () => {
  it('Detects npm with no test framework', async ({ task }) => {
    story.init(task);

    story.given('a repo with package.json but no test framework');
    const fx = await makeFixture({
      'package.json': JSON.stringify({ name: 'demo' }),
    });
    const { dir, cleanup } = fx;

    story.when('we run detectRepo');
    const facts = await detectRepo({ cwd: dir }, {});

    story.then('packageManager is npm and no frameworks present');
    expect(facts.packageManager).toBe('npm');
    expect(facts.isMonorepo).toBe(false);
    expect(facts.hasVitest(dir)).toBe(false);
    expect(facts.hasPlaywright(dir)).toBe(false);
    expect(facts.candidates).toEqual([{ name: 'demo', path: dir }]);

    await cleanup();
  });

  it('Detects pnpm, TypeScript, Vitest and existing vitest config', async ({ task }) => {
    story.init(task);

    story.given('a repo with pnpm packageManager, vitest devDep, tsconfig.json, and vitest.config.ts');
    const fx = await makeFixture({
      'package.json': JSON.stringify({
        name: 'my-app',
        packageManager: 'pnpm@10.0.0',
        devDependencies: { vitest: '^4.0.0' },
      }),
      'tsconfig.json': '{}',
      'vitest.config.ts': 'export default {}',
    });
    const { dir, cleanup } = fx;

    story.when('we run detectRepo');
    const facts = await detectRepo({ cwd: dir }, {});

    story.then('packageManager is pnpm, TypeScript and Vitest config detected, Playwright absent');
    expect(facts.packageManager).toBe('pnpm');
    expect(facts.hasTypeScript(facts.cwd)).toBe(true);
    expect(facts.hasVitest(facts.cwd)).toBe(true);
    expect(facts.hasExistingVitestConfig(facts.cwd)).toBe(true);
    expect(facts.hasPlaywright(facts.cwd)).toBe(false);

    await cleanup();
  });

  it('Detects pnpm monorepo with workspace packages', async ({ task }) => {
    story.init(task);

    story.given('a pnpm monorepo with pnpm-workspace.yaml and two workspace packages under apps/*');
    const fx = await makeFixture({
      'package.json': JSON.stringify({ name: 'root', packageManager: 'pnpm@10.0.0' }),
      'pnpm-workspace.yaml': 'packages:\n  - "apps/*"\n',
      'apps/a/package.json': JSON.stringify({ name: 'a' }),
      'apps/b/package.json': JSON.stringify({ name: 'b' }),
    });
    const { dir, cleanup } = fx;

    story.when('we run detectRepo');
    const facts = await detectRepo({ cwd: dir }, {});

    story.then('isMonorepo is true, workspace package names are a and b, candidates has 3 entries');
    expect(facts.isMonorepo).toBe(true);
    expect(facts.workspacePackages.map((p) => p.name).sort()).toEqual(['a', 'b']);
    expect(facts.candidates.length).toBe(3);

    await cleanup();
  });

  it('Detects Jest and Cypress dependencies plus existing configs', async ({ task }) => {
    story.init(task);

    story.given('a repo with jest and cypress dependencies plus existing config files');
    const fx = await makeFixture({
      'package.json': JSON.stringify({
        name: 'test-app',
        devDependencies: {
          jest: '^30.0.0',
          cypress: '^15.0.0',
        },
      }),
      'jest.config.mjs': 'export default {}',
      'cypress.config.ts': 'export default {}',
    });
    const { dir, cleanup } = fx;

    story.when('we run detectRepo');
    const facts = await detectRepo({ cwd: dir }, {});

    story.then('Jest and Cypress are detected with existing config flags');
    expect(facts.hasJest(dir)).toBe(true);
    expect(facts.hasCypress(dir)).toBe(true);
    expect(facts.hasExistingJestConfig(dir)).toBe(true);
    expect(facts.hasExistingCypressConfig(dir)).toBe(true);

    await cleanup();
  });
});
