import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { story } from 'executable-stories-vitest';
import { convertFeature } from '../src/cucumber';

/**
 * The converter carries a `.feature` file across to a Vitest story test. It
 * transcribes; it does not port step definitions, because a regex-dispatched
 * body reading a shared World gives no reliable one-to-one mapping back to the
 * line of Gherkin that triggered it. So the contract these tests hold it to is
 * narrow and checkable: keep every word of the Gherkin, and leave the suite red
 * until a person supplies the code that used to run underneath each step.
 */

function convert(feature: string): string {
  return convertFeature(feature, { sourcePath: 'features/cart.feature' }).source;
}

describe('convertFeature', () => {
  it('turns a Feature into a describe and a Scenario into a story test', ({ task }) => {
    story.init(task, { tags: ['cucumber-migration'] });

    story.given('a one-scenario feature file');
    const feature = [
      'Feature: Shopping Cart',
      '',
      '  Scenario: Add a single item',
      '    Given the cart is empty',
      '    When I add "Widget" to cart',
      '    Then the cart should have 1 item',
    ].join('\n');

    story.when('it is converted');
    const out = convert(feature);

    story.then('the feature name is the describe and the scenario name is the test');
    expect(out).toContain("describe('Shopping Cart', () => {");
    expect(out).toContain("it('Add a single item', ({ task }) => {");
    expect(out).toContain('story.init(task);');

    story.and('each step keeps its Gherkin text under the matching story marker');
    expect(out).toContain("story.given('the cart is empty');");
    expect(out).toContain('story.when(\'I add "Widget" to cart\');');
    expect(out).toContain("story.then('the cart should have 1 item');");

    story.and('it imports only what the generated file uses');
    expect(out).toContain("import { describe, it } from 'vitest';");
    expect(out).toContain("import { story } from 'executable-stories-vitest';");
    expect(out).not.toContain('expect');
  });

  it('leaves every converted scenario failing until someone ports its steps', ({ task }) => {
    story.init(task, { tags: ['cucumber-migration'] });
    story.section({
      title: 'Why red and not skipped',
      markdown:
        'A skipped test records no steps, so the scenario would vanish from the ' +
        'report during the migration. A green test that asserts nothing is worse: ' +
        'the report would claim behaviour nobody verified. Failing keeps the ' +
        'narrative visible and the count honest, and the failing count is the ' +
        'migration burndown.',
    });

    story.given('a feature with two scenarios');
    const feature = [
      'Feature: Cart',
      '  Scenario: One',
      '    Given a thing',
      '  Scenario: Two',
      '    Given another thing',
    ].join('\n');

    story.when('it is converted');
    const out = convert(feature);

    story.then('each scenario ends with an unported() call naming itself');
    expect(out).toContain("unported('One');");
    expect(out).toContain("unported('Two');");

    story.and('the file defines unported() as a throw, so the suite is red');
    expect(out).toContain('function unported(scenario: string): never {');
    expect(out).toContain('throw new Error(');

    story.and('a TODO marks the place each step definition body belongs');
    expect(out).toContain('// TODO: port the step definition for: a thing');
  });

  it('maps every Gherkin keyword, including * and conjunctions', ({ task }) => {
    story.init(task, { tags: ['cucumber-migration'] });

    story.given('a scenario using Given, When, Then, And, But and *');
    const feature = [
      'Feature: Keywords',
      '  Scenario: All of them',
      '    * a starred step',
      '    Given a given',
      '    And an and',
      '    When a when',
      '    But a but',
      '    Then a then',
    ].join('\n');

    story.when('it is converted');
    const out = convert(feature);

    story.then('each keyword reaches its story equivalent');
    story.table({
      label: 'Keyword mapping',
      columns: ['Gherkin', 'Story API'],
      rows: [
        ['Given', 'story.given'],
        ['When', 'story.when'],
        ['Then', 'story.then'],
        ['And', 'story.and'],
        ['But', 'story.but'],
        ['*', 'story.and'],
      ],
    });
    expect(out).toContain("story.given('a given');");
    expect(out).toContain("story.when('a when');");
    expect(out).toContain("story.then('a then');");
    expect(out).toContain("story.and('an and');");
    expect(out).toContain("story.but('a but');");

    story.and('a starred step becomes story.and, matching how Cucumber reads it');
    expect(out).toContain("story.and('a starred step');");
  });

  it('reads keywords in the feature file’s own language', ({ task }) => {
    story.init(task, { tags: ['cucumber-migration'] });
    story.note(
      'Gherkin ships 70+ dialects. Matching on the English words would silently ' +
        'drop every step in a French or Norwegian suite, so the converter uses the ' +
        'parser’s keywordType instead of the literal keyword.',
    );

    story.given('a French feature file');
    const feature = [
      '# language: fr',
      'Fonctionnalité: Panier',
      '  Scénario: Ajouter un article',
      '    Soit un panier vide',
      '    Quand j’ajoute un article',
      '    Alors le panier contient 1 article',
    ].join('\n');

    story.when('it is converted');
    const out = convert(feature);

    story.then('the French keywords land on the right story markers');
    expect(out).toContain("story.given('un panier vide');");
    expect(out).toContain('story.when(');
    expect(out).toContain("story.then('le panier contient 1 article');");
  });

  it('calls the Background from inside each scenario instead of a beforeEach hook', ({
    task,
  }) => {
    story.init(task, { tags: ['cucumber-migration'] });
    story.section({
      title: 'Why not beforeEach',
      markdown:
        'A Background in a hook is the shared-state problem the migration is ' +
        'meant to leave behind: the reader of a scenario cannot see what ran ' +
        'before it. A plain function called on the first line of each test says ' +
        'the same thing and stays visible.',
    });

    story.given('a feature with a Background and two scenarios');
    const feature = [
      'Feature: Cart',
      '  Background:',
      '    Given the store is open',
      '    And the cart is empty',
      '  Scenario: One',
      '    When I browse',
      '  Scenario: Two',
      '    When I search',
    ].join('\n');

    story.when('it is converted');
    const out = convert(feature);

    story.then('the Background becomes a named function, not a hook');
    expect(out).toContain('function background() {');
    expect(out).toContain("story.given('the store is open');");
    expect(out).not.toContain('beforeEach');

    story.and('both scenarios call it right after story.init');
    expect(out).toContain('story.init(task);\n    background();');
    expect(out.match(/ {4}background\(\);/g)).toHaveLength(2);
  });

  it('carries feature and scenario tags onto story.init', ({ task }) => {
    story.init(task, { tags: ['cucumber-migration'] });

    story.given('a tagged feature with a tagged scenario');
    const feature = [
      '@checkout',
      'Feature: Cart',
      '  @smoke @wip',
      '  Scenario: One',
      '    Given a thing',
    ].join('\n');

    story.when('it is converted');
    const out = convert(feature);

    story.then('feature tags and scenario tags merge, with the @ stripped');
    expect(out).toContain(
      "story.init(task, { tags: ['checkout', 'smoke', 'wip'] });",
    );
  });

  it('turns a DataTable into story.table and a DocString into story.code', ({ task }) => {
    story.init(task, { tags: ['cucumber-migration'] });

    story.given('a scenario with both step argument types');
    const feature = [
      'Feature: Cart',
      '  Scenario: Setup',
      '    Given the store has these products:',
      '      | name   | price |',
      '      | Widget | 25    |',
      '      | Gadget | 50    |',
      '    Then the response is:',
      '      """json',
      '      {"ok": true}',
      '      """',
    ].join('\n');

    story.when('it is converted');
    const out = convert(feature);

    story.then('the DataTable keeps its header as columns and its body as rows');
    expect(out).toContain("label: 'Data table',");
    expect(out).toContain("columns: ['name', 'price']");
    expect(out).toContain("['Widget', '25']");
    expect(out).toContain("['Gadget', '50']");

    story.and('the DocString keeps its media type as the code language');
    expect(out).toContain('story.code({');
    expect(out).toContain("label: 'Doc string',");
    expect(out).toContain("lang: 'json'");
    expect(out).toContain('{"ok": true}');
  });

  it('expands a Scenario Outline into one test per Examples row', ({ task }) => {
    story.init(task, { tags: ['cucumber-migration'] });
    story.note(
      'Cucumber compiles an outline into one pickle per row, so expanding is the ' +
        'faithful conversion. It also gives each row a title of its own in the report.',
    );

    story.given('an outline with two example rows');
    const feature = [
      'Feature: Eating',
      '  Scenario Outline: eating <start> cucumbers',
      '    Given there are <start> cucumbers',
      '    When I eat <eat> cucumbers',
      '    Then I should have <left> cucumbers',
      '    Examples:',
      '      | start | eat | left |',
      '      | 12    | 5   | 7    |',
      '      | 20    | 5   | 15   |',
    ].join('\n');

    story.when('it is converted');
    const out = convert(feature);

    story.then('each row becomes its own test with placeholders substituted');
    expect(out).toContain("it('eating 12 cucumbers', ({ task }) => {");
    expect(out).toContain("it('eating 20 cucumbers', ({ task }) => {");

    story.and('the step text carries the row’s values, not the placeholders');
    expect(out).toContain("story.given('there are 12 cucumbers');");
    expect(out).toContain("story.then('I should have 15 cucumbers');");
    expect(out).not.toContain('<start>');
  });

  it('keeps outline test titles unique when the name has no placeholder', ({ task }) => {
    story.init(task, { tags: ['cucumber-migration'] });
    story.note(
      'Two tests with the same title are legal in Vitest but indistinguishable in ' +
        'the report, which loses the row that failed.',
    );

    story.given('an outline whose name never mentions the example columns');
    const feature = [
      'Feature: Eating',
      '  Scenario Outline: eating cucumbers',
      '    Given there are <start> cucumbers',
      '    Examples:',
      '      | start |',
      '      | 12    |',
      '      | 20    |',
    ].join('\n');

    story.when('it is converted');
    const out = convert(feature);

    story.then('the row values are appended so each title stands alone');
    expect(out).toContain("it('eating cucumbers [start=12]', ({ task }) => {");
    expect(out).toContain("it('eating cucumbers [start=20]', ({ task }) => {");
  });

  it('nests a Rule inside the feature describe and runs both Backgrounds', ({ task }) => {
    story.init(task, { tags: ['cucumber-migration'] });

    story.given('a feature Background, a Rule with its own Background, and a scenario');
    const feature = [
      'Feature: Cart',
      '  Background:',
      '    Given the store is open',
      '  Rule: Discounts apply once',
      '    Background:',
      '      Given a coupon exists',
      '    Example: Applying twice fails',
      '      When I apply it twice',
    ].join('\n');

    story.when('it is converted');
    const out = convert(feature);

    story.then('the Rule is a nested describe');
    expect(out).toContain("describe('Discounts apply once', () => {");

    story.and('the scenario runs the feature Background before the Rule Background');
    expect(out).toContain('background();\n      ruleBackground();');
  });

  it('escapes quotes rather than producing a file that will not parse', ({ task }) => {
    story.init(task, { tags: ['cucumber-migration'] });

    story.given('step text containing both quote characters');
    const feature = [
      'Feature: Quoting',
      '  Scenario: Awkward text',
      '    Given the user\'s cart holds a "Widget"',
    ].join('\n');

    story.when('it is converted');
    const out = convert(feature);

    story.then('the apostrophe forces a double-quoted string with the quotes escaped');
    expect(out).toContain(
      'story.given("the user\'s cart holds a \\"Widget\\"");',
    );
  });

  it('reports how many scenarios it produced', ({ task }) => {
    story.init(task, { tags: ['cucumber-migration'] });
    story.note(
      'The count is what the CLI prints, and what tells someone whether the ' +
        'converter saw the whole file.',
    );

    story.given('a feature with one plain scenario and a two-row outline');
    const feature = [
      'Feature: Cart',
      '  Scenario: One',
      '    Given a thing',
      '  Scenario Outline: Many <n>',
      '    Given <n> things',
      '    Examples:',
      '      | n |',
      '      | 1 |',
      '      | 2 |',
    ].join('\n');

    story.when('it is converted');
    const result = convertFeature(feature, { sourcePath: 'features/cart.feature' });

    story.then('the outline counts once per row, as Cucumber would run it');
    expect(result.scenarioCount).toBe(3);
  });

  it('names the file it came from so the pair can be reconciled later', ({ task }) => {
    story.init(task, { tags: ['cucumber-migration'] });

    story.given('a feature converted from a known path');
    const feature = 'Feature: Cart\n  Scenario: One\n    Given a thing';

    story.when('it is converted');
    const out = convertFeature(feature, {
      sourcePath: 'src/features/cart.feature',
    }).source;

    story.then('the header cites the source path');
    expect(out).toContain('src/features/cart.feature');
  });

  it('falls back to the filename when the Feature has no name', ({ task }) => {
    story.init(task, { tags: ['cucumber-migration'] });

    story.given('a feature file with an empty Feature line');
    const feature = 'Feature:\n  Scenario: One\n    Given a thing';

    story.when('it is converted');
    const out = convertFeature(feature, { sourcePath: 'features/cart.feature' }).source;

    story.then('the describe is named after the file instead of being empty');
    expect(out).toContain("describe('cart', () => {");
  });

  it('rejects a file the Gherkin parser cannot read', ({ task }) => {
    story.init(task, { tags: ['cucumber-migration'] });
    story.note(
      'Writing a half-converted file over a broken feature would lose the original ' +
        'without producing anything runnable.',
    );

    story.given('a file that is not Gherkin');
    const notAFeature = 'this is not a feature file';

    story.when('conversion is attempted');
    story.then('it throws rather than emitting a partial file');
    expect(() =>
      convertFeature(notAFeature, { sourcePath: 'features/broken.feature' }),
    ).toThrow();
  });
});

/**
 * Everything above asserts on substrings, which cannot tell a well-formed file
 * from one with an unbalanced brace or a broken string literal. This parses the
 * output for real, over a feature that uses every construct at once.
 */
describe('generated source is valid TypeScript', () => {
  it('parses without a syntax error', ({ task }) => {
    story.init(task, { tags: ['cucumber-migration'] });

    story.given('a feature using tags, Background, Rule, tables, doc strings and an outline');
    const feature = [
      '@checkout',
      'Feature: Everything',
      '  The whole surface, in one file.',
      '',
      '  Background:',
      "    Given the user's store is open",
      '',
      '  @smoke',
      '  Scenario: Quotes and arguments',
      '    Given the store has these products:',
      '      | name    | price |',
      "      | Widget  | 25    |",
      '    When the response is:',
      '      """json',
      '      {"ok": true}',
      '      """',
      '    Then it holds a "Widget"',
      '',
      '  Rule: Discounts apply once',
      '    Background:',
      '      Given a coupon exists',
      '    Scenario Outline: eating <start>',
      '      Given there are <start> cucumbers',
      '      Examples:',
      '        | start |',
      '        | 12    |',
      '        | 20    |',
    ].join('\n');

    story.when('the output is handed to the TypeScript parser');
    const { source } = convertFeature(feature, { sourcePath: 'features/all.feature' });
    const parsed = ts.createSourceFile(
      'generated.story.test.ts',
      source,
      ts.ScriptTarget.ES2022,
      true,
    );

    story.then('the parser reports no syntax errors');
    const errors = (parsed as unknown as { parseDiagnostics: { messageText: unknown }[] })
      .parseDiagnostics;
    expect(errors.map((d) => String(d.messageText))).toEqual([]);
  });
});
