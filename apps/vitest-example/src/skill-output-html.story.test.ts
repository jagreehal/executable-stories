/**
 * Worked example: embedding skill/agent HTML output with story.html().
 *
 * Many Claude skills produce a single self-contained HTML artifact as their
 * primary output. `improve-codebase-architecture` writes an architecture review
 * (Tailwind + Mermaid) to a temp file, and `teach` writes lesson pages to
 * ./lessons/*.html. story.html() pulls that artifact into the story report so
 * the BDD steps and the generated HTML evidence sit on one surface.
 *
 * story.html({ path | url | content, title?, height? }); pass exactly one source.
 *
 * Source guidance:
 *   • Generated / ephemeral HTML (a skill that writes to $TMPDIR) → pass `content`
 *     (the HTML string, captured here and now, survives temp-dir cleanup).
 *   • Stable on-disk artifact (teach's ./lessons/0001-*.html) → pass `path`
 *     (the formatter inlines it at format time; the report stays self-contained).
 *
 * Sandbox-safe contract: embedded HTML renders inside an always-sandboxed
 * <iframe sandbox="allow-scripts"> (opaque origin, no allow-same-origin):
 *   ✅ CDN scripts (Tailwind Play CDN, Mermaid, charting libs) and inline DOM scripts.
 *   ❌ localStorage / sessionStorage / cookies / indexedDB throw SecurityError,
 *      and an UNGUARDED access aborts the rest of that <script> block. Guard with
 *      try/catch or avoid.
 *   ❌ parent / window.top access; forms needing popups (allow-popups not granted).
 *
 * Full-page artifacts: set a generous `height` (800 to 1000) for review/lesson
 * docs, and use the report's ↗ "open in new tab" button to view them full-size.
 */
import { story } from 'executable-stories-vitest';
import { describe, expect, it } from 'vitest';

/**
 * Stand-in for a skill that generates a self-contained HTML report. The real
 * `improve-codebase-architecture` skill emits markup just like this (Tailwind
 * via CDN for layout, Mermaid via CDN for before/after diagrams) to a temp file.
 * Here we return the string so the test can embed it via `content`.
 */
function generateArchitectureReview(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <script src="https://cdn.tailwindcss.com"></script>
  <script type="module">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
    mermaid.initialize({ startOnLoad: true, theme: 'dark' });
  </script>
</head>
<body class="bg-slate-900 text-slate-100 p-8 font-sans">
  <h1 class="text-2xl font-bold text-emerald-400">Architecture Review</h1>
  <span class="inline-block mt-2 px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 text-xs">Strong</span>
  <p class="mt-4 text-slate-300">Deepen the Order intake module. Two adapters make the seam real.</p>
  <div class="mermaid mt-6">graph LR; Caller-->Shallow[Shallow wrapper]-->Impl; Caller-.deepen.->Deep[Order intake];</div>
</body>
</html>`;
}

describe('Embedding skill HTML output', () => {
  it('embeds a generated architecture review via content', ({ task }) => {
    story.init(task);

    story.given('the architecture skill has analysed the codebase');
    const reviewHtml = generateArchitectureReview();

    story.when('the skill produces a self-contained HTML review');
    // Generated artifact → pass `content`. Tall height + ↗ for a full-page doc.
    const entry = story.html({
      content: reviewHtml,
      title: 'Architecture Review',
      height: 800,
    });

    story.then('the review is embedded as evidence in the report');
    // DocEntry is a union; narrow on `kind` to read html-specific fields.
    expect(entry.kind).toBe('html');
    if (entry.kind !== 'html') throw new Error('expected an html doc entry');
    expect(entry.content).toContain('Architecture Review');
    expect(entry.title).toBe('Architecture Review');
    expect(entry.height).toBe(800);
    // Exactly-one-of: no path/url when content is the chosen source.
    expect(entry.path).toBeUndefined();
    expect(entry.url).toBeUndefined();
  });

  it('embeds a stable on-disk lesson via path', ({ task }) => {
    story.init(task);

    story.given('a teach lesson was saved to ./lessons');
    story.when('the story references the lesson by path');
    // Stable on-disk artifact → pass `path`; the formatter inlines it at format time.
    const entry = story.html({
      path: './lessons/0001-deep-modules.html',
      title: 'Lesson 1: Deep Modules',
    });

    story.then('the formatter will inline the file into the report');
    expect(entry.kind).toBe('html');
    if (entry.kind !== 'html') throw new Error('expected an html doc entry');
    expect(entry.path).toBe('./lessons/0001-deep-modules.html');
    expect(entry.content).toBeUndefined();
  });

  it('rejects ambiguous or missing sources', ({ task }) => {
    story.init(task);
    story.given('a caller misuses the API');
    story.then('story.html requires exactly one of path/url/content');

    expect(() => story.html({})).toThrow(/exactly one/);
    expect(() =>
      story.html({ path: 'a.html', content: '<p>x</p>' }),
    ).toThrow(/exactly one/);
  });
});
