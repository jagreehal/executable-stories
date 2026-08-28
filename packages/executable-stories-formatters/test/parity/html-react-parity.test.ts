/**
 * Content gate for the React SSR report renderer (executable-stories-react) —
 * the single HTML report renderer.
 *
 * Originally this compared the React output against the legacy string renderer
 * (react ⊇ string). That renderer is now deleted, so the gate stands on its own:
 * the React output must surface every human-visible content token in the
 * canonical report (titles, step text, tags, tickets, doc labels/values), and a
 * structural snapshot catches drift. This is the evidence the report renders the
 * full canonical run, not just a valid-looking shell.
 */

import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalizeRun } from 'executable-stories-core/converters/acl/canonicalize';
import { toStoryReport } from 'executable-stories-core/converters/story-report';
import type { StoryReport } from 'executable-stories-core/types/story-report';
import { renderReportToHtml } from 'executable-stories-react/ssr';
import { describe, expect, it } from 'vitest';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.resolve(here, '../../schemas/examples/full.json');

const raw = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const run = canonicalizeRun(raw);
const report = toStoryReport(run);

const reactCss = fs.readFileSync(
  createRequire(import.meta.url).resolve(
    'executable-stories-react/tailwind.css',
  ),
  'utf8',
);

const reactHtml = renderReportToHtml(report, {
  title: 'Parity',
  css: reactCss,
});

/** Strip tags + decode the handful of entities both renderers emit, to text. */
function toText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/\s+/g, ' ');
}

/** Every human-visible content token the report should surface. */
function contentTokens(r: StoryReport): string[] {
  const tokens: string[] = [];
  for (const feature of r.features) {
    for (const scenario of feature.scenarios) {
      tokens.push(scenario.title);
      for (const tag of scenario.tags ?? []) tokens.push(tag);
      for (const ticket of scenario.tickets ?? []) tokens.push(ticket.id);
      for (const doc of scenario.docEntries ?? [])
        collectDocText(doc as Record<string, unknown>, tokens);
      for (const step of scenario.steps ?? []) {
        tokens.push(step.text);
        for (const doc of step.docEntries ?? [])
          collectDocText(doc as Record<string, unknown>, tokens);
      }
    }
  }
  // Non-empty, non-trivial tokens only (avoid matching ubiquitous words).
  return [...new Set(tokens)].filter((t) => t && t.trim().length >= 4);
}

function collectDocText(doc: Record<string, unknown>, out: string[]): void {
  if (typeof doc.label === 'string') out.push(doc.label);
  if (typeof doc.title === 'string') out.push(doc.title);
  if (typeof doc.text === 'string') out.push(doc.text);
  if (typeof doc.value === 'string') out.push(doc.value);
}

describe('html-react content gate', () => {
  it('produces a valid self-contained document', () => {
    expect(reactHtml.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(reactHtml).toContain('</html>');
    expect(reactHtml).toContain('es-report-island');
    expect(reactHtml).toContain('<style>');
  });

  it('React output surfaces every content token in the canonical report (react ⊇ report)', () => {
    // Whitespace-insensitive containment: step-param highlighting wraps quoted
    // strings/numbers in <span>s, so tag-stripping inserts spaces inside a step's
    // text (e.g. "$59.98" -> "$ 59.98"). Collapsing all whitespace on both sides
    // makes the presence check robust to that markup without weakening it.
    const stripWs = (s: string) => s.replace(/\s+/g, '');
    const reactText = stripWs(toText(reactHtml));
    const tokens = contentTokens(report);

    expect(tokens.length).toBeGreaterThan(0);

    const missingFromReact = tokens.filter(
      (t) => !reactText.includes(stripWs(t)),
    );

    expect(
      missingFromReact,
      `React dropped content present in the canonical report:\n${missingFromReact.join('\n')}`,
    ).toEqual([]);
  });

  it('renders the same scenario count as the canonical run', () => {
    const scenarioCount = report.features.reduce(
      (n, f) => n + f.scenarios.length,
      0,
    );
    // Each scenario title appears in the React output.
    for (const feature of report.features) {
      for (const scenario of feature.scenarios) {
        expect(toText(reactHtml)).toContain(scenario.title);
      }
    }
    expect(scenarioCount).toBeGreaterThan(0);
  });

  it('marks an observed assertion-free claim in HTML', () => {
    const assertionReport = structuredClone(report);
    const scenario = assertionReport.features[0]!.scenarios[0]!;
    scenario.steps = [
      {
        id: 'given',
        index: 0,
        keyword: 'Given',
        text: 'some setup',
        status: 'passed',
        durationMs: 0,
        assertions: 0,
        docEntries: [],
      },
      {
        id: 'then',
        index: 1,
        keyword: 'Then',
        text: 'the outcome holds',
        status: 'passed',
        durationMs: 0,
        assertions: 0,
        docEntries: [],
      },
    ];

    expect(
      renderReportToHtml(assertionReport, {
        syntaxHighlighting: false,
        mermaid: false,
      }),
    ).toContain('No assertion');
  });

  it('renders section markdown through the typography prose pipeline', () => {
    // DocSection markdown gets @tailwindcss/typography treatment: the prose
    // classes on the wrapper, the generated .prose utilities in the CSS, and
    // the theme-token mapping so prose follows light/dark.
    expect(reactHtml).toContain('es-doc-prose prose prose-sm max-w-none');
    expect(reactCss).toContain('.es-doc-prose');
    expect(reactCss).toContain('--tw-prose-body');
    expect(reactCss).toContain('.prose');
  });

  it('structural snapshot of the React report (catches drift across phases)', () => {
    const structure = report.features.map((f) => ({
      feature: f.title,
      scenarios: f.scenarios.map((s) => ({
        title: s.title,
        status: s.status,
        tags: s.tags ?? [],
        steps: (s.steps ?? []).map((st) => `${st.keyword} ${st.text}`),
        docKinds: (s.docEntries ?? []).map((d) => (d as { kind: string }).kind),
      })),
    }));
    expect(structure).toMatchSnapshot();
  });
});
