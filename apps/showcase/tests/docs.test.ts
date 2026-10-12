import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { guide } from '../../../packages/executable-stories-showcase-cli/src/skills.ts';

const SKILL = '../../packages/executable-stories-showcase-cli/skills/executable-stories-showcase';

/**
 * Pages show copies of the typechecked files in docs/examples (Markdown can't import a file),
 * and agents copy them verbatim, so every copy must match its file.
 */
const EXAMPLES = {
  'router.ts': ['README.md', `${SKILL}/references/setup.md`],
  'signed-in.ts': ['README.md', `${SKILL}/references/auth.md`],
  'handlers.ts': ['README.md', `${SKILL}/references/network.md`],
  'ignore.ts': ['README.md', `${SKILL}/references/network.md`],
  'steps.ts': ['README.md', `${SKILL}/references/media.md`],
} satisfies Record<string, string[]>;

/** Every fenced block's body, with the fence's indentation removed. */
const codeBlocks = (text: string) =>
  [...text.matchAll(/^( *)```[^\n]*\n([\s\S]*?)^\1```$/gm)].map(([, indent = '', body = '']) =>
    body.split('\n').map((line) => (line.startsWith(indent) ? line.slice(indent.length) : line)).join('\n')
      .trimEnd()
  );

describe('docs examples', () => {
  for (const [example, pages] of Object.entries(EXAMPLES)) {
    const code = readFileSync(`docs/examples/${example}`, 'utf8').trimEnd();

    for (const page of pages) {
      it(`${page} shows docs/examples/${example} as written`, () => {
        expect(codeBlocks(readFileSync(page, 'utf8'))).toContain(code);
      });
    }
  }
});

describe('the shipped skill', () => {
  it('lists every reference file as a topic, and guide prints each', () => {
    const files = readdirSync(`${SKILL}/references`).map((f) => f.replace(/\.md$/, ''));
    const overview = guide();

    for (const topic of files) {
      expect(overview).toContain(`[references/${topic}.md](references/${topic}.md)`);
      expect(guide(topic)).toBe(readFileSync(`${SKILL}/references/${topic}.md`, 'utf8'));
    }

    expect(() => guide('nope')).toThrow('Topics: ');
  });
});
