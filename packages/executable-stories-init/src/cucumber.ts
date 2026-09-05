/**
 * Gherkin to Vitest story test.
 *
 * This transcribes a `.feature` file. It does not port step definitions: the
 * text of a step reaches its body through a regex or Cucumber expression, and
 * that body usually reads and writes a shared World, so there is no reliable
 * one-to-one mapping from a line of Gherkin to the lines that ran for it. A
 * smarter tool could infer some of them; it could not know when it was wrong,
 * and a silently mis-ported assertion is worse than an absent one. So this
 * carries every word across, puts a marker where each body belongs, and leaves
 * the scenario failing until a person fills it in.
 */

import { AstBuilder, GherkinClassicTokenMatcher, Parser } from '@cucumber/gherkin';
import { IdGenerator } from '@cucumber/messages';
import type {
  Background,
  Feature,
  Rule,
  Scenario,
  Step,
  TableRow,
  Tag,
} from '@cucumber/messages';

export type ConvertOptions = {
  /** Path of the `.feature` file, cited in the generated header. */
  sourcePath: string;
};

export type ConvertedFeature = {
  /** TypeScript source for the generated story test. */
  source: string;
  /** Scenarios in the output. An outline counts once per Examples row. */
  scenarioCount: number;
};

const INDENT = '  ';

export function convertFeature(
  gherkin: string,
  options: ConvertOptions,
): ConvertedFeature {
  const parser = new Parser(
    new AstBuilder(IdGenerator.incrementing()),
    new GherkinClassicTokenMatcher(),
  );
  const feature = parser.parse(gherkin).feature;
  if (!feature) {
    throw new Error(`No Feature found in ${options.sourcePath}`);
  }

  const out = new Writer();
  let scenarioCount = 0;

  out.line(`// Converted from ${options.sourcePath} by executable-stories-init.`);
  out.line('//');
  out.line('// Every story marker below holds the original Gherkin text. Under each one,');
  out.line('// replace the TODO with the code its step definition used to run, and turn');
  out.line('// what the old step read off the World into a local variable. Delete the');
  out.line("// unported() call at the end of a scenario once it asserts something real.");
  out.blank();
  out.line("import { describe, it } from 'vitest';");
  out.line("import { story } from 'executable-stories-vitest';");
  out.blank();

  writeDescription(out, feature.description, 0);
  out.line(`describe(${quote(featureName(feature, options.sourcePath))}, () => {`);
  out.push();

  const featureBackground = firstBackground(feature.children);
  if (featureBackground) {
    writeBackground(out, featureBackground, 'background');
  }
  const backgrounds = featureBackground ? ['background'] : [];
  const featureTags = tagNames(feature.tags);

  for (const child of feature.children) {
    if (child.scenario) {
      scenarioCount += writeScenario(out, child.scenario, backgrounds, featureTags);
    }
    if (child.rule) {
      scenarioCount += writeRule(out, child.rule, backgrounds, featureTags);
    }
  }

  out.pop();
  out.line('});');
  out.blank();
  out.line('/**');
  out.line(' * Thrown by every scenario this converter produced. A skipped test would drop');
  out.line(' * the scenario out of the report mid-migration, and a green one that asserts');
  out.line(' * nothing would claim behaviour nobody checked. Failing keeps the narrative');
  out.line(' * visible and the remaining count honest.');
  out.line(' */');
  out.line('function unported(scenario: string): never {');
  out.line('  throw new Error(');
  out.line('    `Scenario "${scenario}" was converted from Gherkin, but its step ` +');
  out.line("      'definitions have not been ported yet.',");
  out.line('  );');
  out.line('}');

  return { source: out.toString(), scenarioCount };
}

function writeRule(
  out: Writer,
  rule: Rule,
  inherited: string[],
  inheritedTags: string[],
): number {
  let count = 0;
  writeDescription(out, rule.description, out.depth);
  out.line(`describe(${quote(rule.name)}, () => {`);
  out.push();

  const ruleBackground = firstBackground(rule.children);
  if (ruleBackground) {
    writeBackground(out, ruleBackground, 'ruleBackground');
  }

  const backgrounds = ruleBackground ? [...inherited, 'ruleBackground'] : inherited;
  const tags = [...inheritedTags, ...tagNames(rule.tags)];
  for (const child of rule.children) {
    if (child.scenario) count += writeScenario(out, child.scenario, backgrounds, tags);
  }

  out.pop();
  out.line('});');
  out.blank();
  return count;
}

function writeBackground(out: Writer, background: Background, name: string): void {
  out.line('// Gherkin Background. Called on the first line of each scenario rather than');
  out.line('// from a hook, so a reader can see the setup without leaving the test.');
  out.line(`function ${name}() {`);
  out.push();
  writeSteps(out, background.steps, {});
  out.pop();
  out.line('}');
  out.blank();
}

function writeScenario(
  out: Writer,
  scenario: Scenario,
  backgrounds: string[],
  inheritedTags: string[],
): number {
  const tags = [...inheritedTags, ...tagNames(scenario.tags)];
  if (scenario.examples.length === 0) {
    writeTest(out, scenario.name, scenario, backgrounds, tags, {});
    return 1;
  }

  let count = 0;
  for (const examples of scenario.examples) {
    const header = examples.tableHeader?.cells.map((c) => c.value) ?? [];
    for (const row of examples.tableBody) {
      const substitutions = rowSubstitutions(header, row);
      writeTest(
        out,
        outlineTitle(scenario.name, substitutions),
        scenario,
        backgrounds,
        [...tags, ...tagNames(examples.tags)],
        substitutions,
      );
      count += 1;
    }
  }
  return count;
}

function writeTest(
  out: Writer,
  title: string,
  scenario: Scenario,
  backgrounds: string[],
  tags: string[],
  substitutions: Record<string, string>,
): void {
  writeDescription(out, scenario.description, out.depth);
  out.line(`it(${quote(title)}, ({ task }) => {`);
  out.push();

  out.line(
    tags.length > 0
      ? `story.init(task, { tags: [${tags.map(quote).join(', ')}] });`
      : 'story.init(task);',
  );
  for (const background of backgrounds) out.line(`${background}();`);
  out.blank();

  writeSteps(out, scenario.steps, substitutions);
  out.line(`unported(${quote(title)});`);

  out.pop();
  out.line('});');
  out.blank();
}

function writeSteps(
  out: Writer,
  steps: readonly Step[],
  substitutions: Record<string, string>,
): void {
  steps.forEach((step, index) => {
    if (index > 0) out.blank();
    const text = substitute(step.text, substitutions);
    out.line(`story.${storyMethod(step)}(${quote(text)});`);

    if (step.dataTable) writeDataTable(out, step.dataTable.rows, substitutions);
    if (step.docString) {
      out.line('story.code({');
      out.push();
      out.line("label: 'Doc string',");
      out.line(`content: ${quote(substitute(step.docString.content, substitutions))},`);
      if (step.docString.mediaType) {
        out.line(`lang: ${quote(step.docString.mediaType)},`);
      }
      out.pop();
      out.line('});');
    }

    out.line(`// TODO: port the step definition for: ${text}`);
  });
  out.blank();
}

function writeDataTable(
  out: Writer,
  rows: readonly TableRow[],
  substitutions: Record<string, string>,
): void {
  const [header, ...body] = rows;
  if (!header) return;
  const cells = (row: TableRow) =>
    row.cells.map((c) => quote(substitute(c.value, substitutions))).join(', ');

  // The step marker directly above already carries the Gherkin text, so
  // repeating it as the caption reads as a stutter in the report.
  out.line('story.table({');
  out.push();
  out.line("label: 'Data table',");
  out.line(`columns: [${cells(header)}],`);
  out.line('rows: [');
  out.push();
  for (const row of body) out.line(`[${cells(row)}],`);
  out.pop();
  out.line('],');
  out.pop();
  out.line('});');
}

/**
 * `keywordType` rather than the literal keyword: Gherkin ships 70+ dialects, and
 * matching on the English words would drop every step in a French suite. `*` and
 * anything the parser cannot classify read as a continuation, which is how
 * Cucumber treats them.
 */
function storyMethod(step: Step): 'given' | 'when' | 'then' | 'and' | 'but' {
  switch (step.keywordType) {
    case 'Context':
      return 'given';
    case 'Action':
      return 'when';
    case 'Outcome':
      return 'then';
    case 'Conjunction':
      return step.keyword.trim().toLowerCase() === 'but' ? 'but' : 'and';
    default:
      return 'and';
  }
}

function tagNames(tags: readonly Tag[]): string[] {
  return tags.map((tag) => tag.name.replace(/^@/, ''));
}

function firstBackground(
  children: readonly { background?: Background }[],
): Background | undefined {
  return children.find((child) => child.background)?.background;
}

function featureName(feature: Feature, sourcePath: string): string {
  if (feature.name.trim()) return feature.name.trim();
  return sourcePath.split('/').pop()?.replace(/\.feature$/, '') ?? 'Feature';
}

function writeDescription(out: Writer, description: string, _depth: number): void {
  const lines = description
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return;
  out.line('/**');
  for (const line of lines) out.line(` * ${line}`);
  out.line(' */');
}

function rowSubstitutions(header: string[], row: TableRow): Record<string, string> {
  const values: Record<string, string> = {};
  header.forEach((name, index) => {
    values[name] = row.cells[index]?.value ?? '';
  });
  return values;
}

function substitute(text: string, substitutions: Record<string, string>): string {
  return Object.entries(substitutions).reduce(
    (acc, [name, value]) => acc.split(`<${name}>`).join(value),
    text,
  );
}

/**
 * Cucumber names a pickle by substituting the outline's placeholders into its
 * name. An outline whose name mentions no column gives every row the same name,
 * so append the row's values: two identically titled tests are legal in Vitest
 * and indistinguishable in the report.
 */
function outlineTitle(name: string, substitutions: Record<string, string>): string {
  const substituted = substitute(name, substitutions);
  if (substituted !== name) return substituted;
  const pairs = Object.entries(substitutions)
    .map(([key, value]) => `${key}=${value}`)
    .join(', ');
  return pairs ? `${name} [${pairs}]` : name;
}

/** Single quotes unless the text contains one, in which case JSON's escaping. */
function quote(text: string): string {
  return /['\\\n]/.test(text) ? JSON.stringify(text) : `'${text}'`;
}

class Writer {
  private readonly lines: string[] = [];
  depth = 0;

  push(): void {
    this.depth += 1;
  }

  pop(): void {
    // A blank line right before a closing brace is noise in the output.
    if (this.lines.at(-1) === '') this.lines.pop();
    this.depth -= 1;
  }

  line(text: string): void {
    this.lines.push(INDENT.repeat(this.depth) + text);
  }

  blank(): void {
    if (this.lines.at(-1) !== '') this.lines.push('');
  }

  toString(): string {
    return this.lines.join('\n').replace(/\n+$/, '') + '\n';
  }
}
