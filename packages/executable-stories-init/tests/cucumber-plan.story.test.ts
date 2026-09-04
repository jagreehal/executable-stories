import { describe, expect, it } from 'vitest';
import { story } from 'executable-stories-vitest';
import { planCucumberMigration } from '../src/cucumber-plan';
import { buildDeps } from '../src/factory';
import { makeFixture } from './_fixtures';

const deps = buildDeps({ json: true, interactive: false });

describe('planCucumberMigration', () => {
  it('writes one story test beside each feature file it finds', async ({ task }) => {
    story.init(task, { tags: ['cucumber-migration'] });
    story.note(
      'Beside the .feature rather than in a new directory: Vitest already collects ' +
        '*.test.ts anywhere, and the pair sitting together makes the old file easy ' +
        'to delete once its scenarios are ported.',
    );

    story.given('a repo with two feature files in different directories');
    const fx = await makeFixture({
      'package.json': JSON.stringify({ name: 'demo' }),
      'features/cart.feature': 'Feature: Cart\n  Scenario: One\n    Given a thing\n',
      'e2e/features/checkout.feature':
        'Feature: Checkout\n  Scenario: Two\n    Given another thing\n',
    });

    story.when('the migration is planned');
    const ops = await planCucumberMigration({ targets: [fx.dir] }, deps);

    story.then('each feature has a write op next to it, named .story.test.ts');
    const paths = ops.filter((op) => op.kind === 'write').map((op) => op.path);
    expect(paths).toContain(`${fx.dir}/features/cart.story.test.ts`);
    expect(paths).toContain(`${fx.dir}/e2e/features/checkout.story.test.ts`);

    story.and('the generated source is the converted feature');
    const cart = ops.find((op) => op.kind === 'write' && op.path.endsWith('cart.story.test.ts'));
    expect(cart?.kind === 'write' && cart.contents).toContain("describe('Cart', () => {");

    await fx.cleanup();
  });

  it('reports the scenario count so you can tell it read the whole suite', async ({
    task,
  }) => {
    story.init(task, { tags: ['cucumber-migration'] });

    story.given('a feature holding a plain scenario and a two-row outline');
    const fx = await makeFixture({
      'package.json': JSON.stringify({ name: 'demo' }),
      'features/cart.feature': [
        'Feature: Cart',
        '  Scenario: One',
        '    Given a thing',
        '  Scenario Outline: Many <n>',
        '    Given <n> things',
        '    Examples:',
        '      | n |',
        '      | 1 |',
        '      | 2 |',
        '',
      ].join('\n'),
    });

    story.when('the migration is planned');
    const ops = await planCucumberMigration({ targets: [fx.dir] }, deps);

    story.then('a note states the file, the scenario count and the next step');
    const note = ops.find((op) => op.kind === 'note');
    expect(note?.kind === 'note' && note.message).toContain('3 scenarios');
    expect(note?.kind === 'note' && note.message).toContain('features/cart.feature');

    await fx.cleanup();
  });

  it('skips node_modules so a dependency’s fixtures are not converted', async ({ task }) => {
    story.init(task, { tags: ['cucumber-migration'] });
    story.note(
      'Cucumber ships .feature files in its own test fixtures, and several ' +
        'published packages do too. Converting those would bury the real ones.',
    );

    story.given('a repo whose node_modules contains a feature file');
    const fx = await makeFixture({
      'package.json': JSON.stringify({ name: 'demo' }),
      'features/mine.feature': 'Feature: Mine\n  Scenario: One\n    Given a thing\n',
      'node_modules/pkg/features/theirs.feature':
        'Feature: Theirs\n  Scenario: One\n    Given a thing\n',
    });

    story.when('the migration is planned');
    const ops = await planCucumberMigration({ targets: [fx.dir] }, deps);

    story.then('only the repo’s own feature is converted');
    const paths = ops.filter((op) => op.kind === 'write').map((op) => op.path);
    expect(paths).toHaveLength(1);
    expect(paths[0]).toContain('mine.story.test.ts');

    await fx.cleanup();
  });

  it('warns instead of throwing when one feature file will not parse', async ({ task }) => {
    story.init(task, { tags: ['cucumber-migration'] });
    story.note(
      'One unparseable file in a suite of two hundred should cost you that file, ' +
        'not the run.',
    );

    story.given('a repo with one valid feature and one broken one');
    const fx = await makeFixture({
      'package.json': JSON.stringify({ name: 'demo' }),
      'features/good.feature': 'Feature: Good\n  Scenario: One\n    Given a thing\n',
      'features/broken.feature': 'Scenario: orphaned, with no Feature above it\n',
    });

    story.when('the migration is planned');
    const ops = await planCucumberMigration({ targets: [fx.dir] }, deps);

    story.then('the valid feature is still converted');
    const paths = ops.filter((op) => op.kind === 'write').map((op) => op.path);
    expect(paths).toHaveLength(1);
    expect(paths[0]).toContain('good.story.test.ts');

    story.and('the broken one is reported as a warning naming the file');
    const warning = ops.find((op) => op.kind === 'note' && op.level === 'warn');
    expect(warning?.kind === 'note' && warning.message).toContain('broken.feature');

    await fx.cleanup();
  });

  it('says so plainly when the repo has no feature files', async ({ task }) => {
    story.init(task, { tags: ['cucumber-migration'] });

    story.given('a repo with no Gherkin in it');
    const fx = await makeFixture({ 'package.json': JSON.stringify({ name: 'demo' }) });

    story.when('the migration is planned');
    const ops = await planCucumberMigration({ targets: [fx.dir] }, deps);

    story.then('there is nothing to write, and a note explains why');
    expect(ops.filter((op) => op.kind === 'write')).toHaveLength(0);
    const note = ops.find((op) => op.kind === 'note');
    expect(note?.kind === 'note' && note.message).toContain('No .feature files');

    await fx.cleanup();
  });
});
