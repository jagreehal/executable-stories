---
title: Embedding skill & agent HTML output
description: Pull self-contained HTML artifacts from Claude skills and AI agents into your story reports with story.html()
---

Many Claude skills and AI agents produce one **self-contained HTML artifact** as their primary output:

- [`improve-codebase-architecture`](https://github.com/anthropics/skills) writes an architecture review (Tailwind for layout, Mermaid for before/after diagrams) to a temp file and opens it in your browser.
- [`teach`](https://github.com/anthropics/skills) writes cross-linked lesson pages to `./lessons/*.html`.
- Coverage tools, dashboards, and custom agents emit standalone HTML reports.

`story.html()` pulls that artifact **into the story report**, so your BDD steps and the generated HTML evidence sit on one surface, versioned with the tests that produced them.

```ts
story.html({ content: generatedReportHtml, title: 'Architecture Review', height: 800 });
```

Pass exactly one of `path`, `url`, or `content`.

## Choosing a source

| Your artifact | Pass | Why |
| --- | --- | --- |
| **Generated / ephemeral**: a skill that writes to `$TMPDIR` | `content` | The HTML string is captured at registration time, so it survives temp-dir cleanup. |
| **Stable on disk**: `teach`'s `./lessons/0001-*.html` | `path` | The formatter inlines the file at format time. The report stays self-contained and links to the canonical file. |
| **Hosted**: a live dashboard URL | `url` | Renders via iframe `src`. The ↗ button opens it. |

```ts
// Generated HTML. The skill just produced this string.
story.html({ content: reviewHtml, title: 'Architecture Review', height: 800 });

// Stable on-disk artifact. The formatter inlines it for you.
story.html({ path: './lessons/0001-deep-modules.html', title: 'Lesson 1' });

// Hosted document.
story.html({ url: 'https://dash.example.com/run/42', height: 600 });
```

## The sandbox-safe contract

Embedded HTML always renders inside a sandboxed iframe:

```html
<iframe sandbox="allow-scripts" ...>
```

You get **no `allow-same-origin`** and no trusted opt-out. The iframe runs at an opaque origin. That opaque origin is the security boundary: a compromised CDN script inside the embed cannot reach the report DOM, your cookies, or your storage. It also limits what your skill-authored HTML can do.

**Works:**

- ✅ CDN scripts. Tailwind Play CDN, Mermaid, and Chart.js load and run.
- ✅ Inline `<script>` that drives the embed's own DOM.
- ✅ Inline `<style>`, SVG, canvas.

**Does not work:**

- ❌ `localStorage`, `sessionStorage`, cookies, and `indexedDB` throw `SecurityError` at an opaque origin. An unguarded access also aborts the rest of that `<script>` block. Guard it with `try/catch` or drop it.
- ❌ `window.top` and `window.parent` access.
- ❌ Forms or links that open popups. The sandbox withholds `allow-popups`.

When you author HTML for embedding, lean on CDN libraries and inline DOM scripts, and treat storage as unavailable.

```html
<!-- Guard storage access, or it kills the rest of the block. -->
<script>
  let theme = 'dark';
  try { theme = localStorage.getItem('theme') ?? 'dark'; } catch { /* sandboxed */ }
  // rest of the script still runs
</script>
```

## Full-page artifacts

Architecture reviews and lessons are full-page documents. The default 400px iframe crops them, so:

- Set a generous `height` (`800` to `1000`) to show meaningful content inline. `height` takes a pixel number or a CSS string such as `'90vh'`. Width fills the container.
- Every embed's chrome bar carries a ↗ **open-in-new-tab** button that shows the artifact full size. For `content` embeds the report builds a blob URL on demand, so it stays self-contained.

## End-to-end: a skill writes, a story embeds

```ts
import { story } from 'executable-stories-vitest';

it('records the architecture review as evidence', ({ task }) => {
  story.init(task);

  story.given('the architecture skill analysed the codebase');
  const reviewHtml = runArchitectureReviewSkill(); // returns a self-contained HTML string

  story.when('the skill produces its HTML review');
  story.html({ content: reviewHtml, title: 'Architecture Review', height: 800 });

  story.then('the review is embedded alongside the behaviour it describes');
});
```

The same call works across every adapter. Vitest, Jest, Playwright, Cypress, and the Go, Ruby, Rust, pytest, JUnit 5, and xUnit packages accept `path` / `url` / `content` and enforce the exactly-one rule. See the [Vitest story API reference](/reference/vitest-story-api/) for the full signature.
