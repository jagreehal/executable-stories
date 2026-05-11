import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { story } from 'executable-stories-vitest';
import { renderTemplate, type TemplateName } from '../src/templates';

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL_PATH = join(HERE, '../../../skills/executable-stories-init/SKILL.md');

function extractBlock(md: string, anchor: string): string {
  const idx = md.indexOf(anchor);
  if (idx === -1) throw new Error(`anchor not found in SKILL.md: ${JSON.stringify(anchor)}`);
  const fenceStart = md.indexOf('```', idx);
  if (fenceStart === -1) throw new Error(`no code fence after anchor: ${anchor}`);
  const langEnd = md.indexOf('\n', fenceStart);
  const fenceEnd = md.indexOf('```', langEnd);
  if (fenceEnd === -1) throw new Error(`unterminated code block after anchor: ${anchor}`);
  return md.slice(langEnd + 1, fenceEnd).trim();
}

// Anchors are substrings of headings/prose that immediately precede each
// canonical code block in SKILL.md. Update both the anchor and SKILL.md if
// the file's prose changes.
const PAIRS: { anchor: string; tmpl: TemplateName }[] = [
  { anchor: 'Write `vitest.config.ts`', tmpl: 'vitest-config.ts' },
  { anchor: 'Drop `src/example.story.test.ts`', tmpl: 'vitest-sample.story.test.ts' },
  { anchor: 'Write `playwright.config.ts`', tmpl: 'playwright-config.ts' },
  { anchor: 'Drop `tests/example.story.spec.ts`', tmpl: 'playwright-sample.story.spec.ts' },
];

describe('SKILL.md ↔ template parity', () => {
  for (const { anchor, tmpl } of PAIRS) {
    it(`SKILL.md "${anchor}" matches template ${tmpl}`, async ({ task }) => {
      story.init(task);

      story.given('the SKILL.md and the corresponding template');
      const md = await readFile(SKILL_PATH, 'utf8');

      story.when('we extract the code block following the anchor and render the template');
      const fromSkill = extractBlock(md, anchor);
      const fromTemplate = (await renderTemplate(tmpl)).trim();

      story.then('they are identical (template is canonical)');
      expect(fromSkill).toBe(fromTemplate);
    });
  }
});
