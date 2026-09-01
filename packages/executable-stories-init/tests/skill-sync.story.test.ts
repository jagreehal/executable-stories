import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
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

/**
 * Every adapter skill states the version it documents in its frontmatter, and an
 * agent reads that field to decide whether the guidance still applies. Nothing
 * updated it when a package was released, so the whole set drifted a minor behind
 * at once — silently, because a stale number looks exactly like a current one.
 */
const SKILLS_DIR = join(HERE, '../../../skills');
const PACKAGES_DIR = join(HERE, '../../../packages');

type SkillVersion = { skill: string; library: string; declared: string; actual: string };

async function declaredSkillVersions(): Promise<SkillVersion[]> {
  const entries = await readdir(SKILLS_DIR, { withFileTypes: true });
  const found: SkillVersion[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    let md: string;
    try {
      md = await readFile(join(SKILLS_DIR, entry.name, 'SKILL.md'), 'utf8');
    } catch {
      continue;
    }
    const library = /^ {2}library: (.+)$/m.exec(md)?.[1]?.trim();
    const declared = /^ {2}library_version: ['"]?([^'"\n]+)['"]?$/m.exec(md)?.[1]?.trim();
    if (!library || !declared) continue;
    // Only packages this repo publishes from package.json can be checked here;
    // the Ruby, Go, Rust, Python and .NET adapters carry versions elsewhere.
    const manifest = join(PACKAGES_DIR, library, 'package.json');
    if (!existsSync(manifest)) continue;
    const actual = JSON.parse(await readFile(manifest, 'utf8')).version as string;
    found.push({ skill: entry.name, library, declared, actual });
  }
  return found;
}

describe('SKILL.md ↔ package version parity', () => {
  it('states the version of the package it actually documents', async ({ task }) => {
    story.init(task, { tags: ['skills'], covers: ['skills/'] });

    story.given('every skill that names a package this repo publishes');
    const versions = await declaredSkillVersions();
    story.table({
      label: 'Declared vs published',
      columns: ['Skill', 'Library', 'Declared', 'Actual'],
      rows: versions.map((v) => [v.skill, v.library, v.declared, v.actual]),
    });
    expect(versions.length).toBeGreaterThan(0);

    story.when('each declared version is compared with that package.json');
    const stale = versions.filter((v) => v.declared !== v.actual);

    story.then('none of them is behind, so the frontmatter can be trusted');
    story.note(
      'This fails on the release that bumps a package without its skill. Fixing it is ' +
        'editing one line, which is the point: the alternative is guidance that quietly ' +
        'describes a version nobody is running.',
    );
    expect(stale.map((v) => `${v.skill}: says ${v.declared}, package is ${v.actual}`)).toEqual([]);
  });
});
