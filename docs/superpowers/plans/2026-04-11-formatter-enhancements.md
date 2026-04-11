# HTML Formatter Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add permalink anchors, keyboard navigation, copy-as-markdown, TOC sidebar, theme picker, and Storybook to the HTML formatter.

**Architecture:** Each enhancement adds to the existing fn(args, deps) renderer pipeline. Changes touch renderers (HTML output), `styles.ts` (CSS), and `template.ts` (client-side JS). No new runtime dependencies. Storybook is dev-only tooling.

**Tech Stack:** TypeScript, Vitest, vanilla JS (in generated HTML), Storybook 8 (@storybook/html)

**Spec:** `docs/superpowers/specs/2026-04-11-formatter-enhancements-design.md`

---

## File Structure

### PR 1: Anchors + Keyboard Nav + Copy-as-Markdown

| File | Action | Responsibility |
|------|--------|----------------|
| `src/formatters/html/renderers/feature.ts` | Modify | Add `id` attribute and permalink anchor icon |
| `src/formatters/html/renderers/scenario.ts` | Modify | Add permalink anchor icon and copy-as-markdown button |
| `src/formatters/html/renderers/steps.ts` | Modify | Add `data-keyword` and `data-text` attributes |
| `src/formatters/html/template.ts` | Modify | Add permalink JS, keyboard nav JS, copy-as-markdown JS, hash-scroll |
| `src/formatters/html/styles.ts` | Modify | Add CSS for anchors, toast, focus, shortcuts overlay, copy button |
| `test/formatters/html/renderers/feature.test.ts` | Create | Tests for feature `id` and anchor icon |
| `test/formatters/html/renderers/steps-data-attrs.test.ts` | Create | Tests for `data-keyword` and `data-text` attributes |

### PR 2: TOC Sidebar

| File | Action | Responsibility |
|------|--------|----------------|
| `src/formatters/html/renderers/toc.ts` | Create | `renderToc()` — builds sidebar HTML |
| `src/formatters/html/renderers/body.ts` | Modify | Inject TOC before main content |
| `src/formatters/html/renderers/index.ts` | Modify | Wire `renderToc` into deps, add `tocEnabled` option |
| `src/formatters/html/index.ts` | Modify | Add `tocEnabled` to `HtmlOptions` |
| `src/formatters/html/template.ts` | Modify | Add TOC toggle button, `initToc()` JS, grid layout wrapper |
| `src/formatters/html/styles.ts` | Modify | Add TOC sidebar CSS, responsive rules |
| `src/cli.ts` | Modify | Add `--html-no-toc` flag |
| `test/formatters/html/renderers/toc.test.ts` | Create | Tests for TOC renderer |

### PR 3: Theme Picker

| File | Action | Responsibility |
|------|--------|----------------|
| `src/formatters/html/themes/index.ts` | Modify | Add `getCssOnlyThemes()` |
| `src/formatters/html/renderers/index.ts` | Modify | Pass extra theme CSS when `themePickerEnabled` |
| `src/formatters/html/template.ts` | Modify | Embed multiple `<style>` blocks, add picker `<select>`, JS |
| `src/formatters/html/index.ts` | Modify | Add `themePickerEnabled` to `HtmlOptions` |
| `src/formatters/html/styles.ts` | Modify | Add `.theme-picker` styling |
| `src/cli.ts` | Modify | Add `--html-theme-picker` flag |
| `test/formatters/html/themes/css-only-themes.test.ts` | Create | Tests for `getCssOnlyThemes()` |
| `test/formatters/html/template-theme-picker.test.ts` | Create | Tests for theme picker HTML output |

### PR 4: Storybook (parallel)

| File | Action | Responsibility |
|------|--------|----------------|
| `.storybook/main.ts` | Create | Storybook config |
| `.storybook/preview.ts` | Create | Theme decorator, global types |
| `stories/fixtures.ts` | Create | Shared test data factories |
| `stories/doc-entries/*.stories.ts` | Create | Stories for each doc type |
| `stories/scenarios/*.stories.ts` | Create | Stories for scenario states |
| `stories/layout/*.stories.ts` | Create | Stories for layout components |
| `stories/themes/*.stories.ts` | Create | Theme showcase stories |

All paths below are relative to `packages/executable-stories-formatters/`.

---

## PR 1: Anchors + Keyboard Nav + Copy-as-Markdown

### Task 1: Permalink Anchors on Features

**Files:**
- Modify: `src/formatters/html/renderers/feature.ts`
- Create: `test/formatters/html/renderers/feature.test.ts`

- [ ] **Step 1: Write failing tests for feature id and anchor icon**

Create `test/formatters/html/renderers/feature.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { renderFeature } from "../../../../src/formatters/html/renderers/feature";
import { escapeHtml } from "../../../../src/formatters/html/template";
import { stubs } from "../../../stubs";

const baseDeps = {
  escapeHtml,
  startCollapsed: false,
  renderScenario: () => '<div class="scenario">mock</div>',
  scenarioDeps: {} as any,
};

describe("renderFeature", () => {
  beforeEach(() => {
    stubs.setFakerSeed(42);
  });

  it("renders feature with id from slugified file path", () => {
    const tc = stubs.testCaseResult({
      story: stubs.storyMeta({ scenario: "Test", tags: [] }),
      tags: [],
    });
    const result = renderFeature(
      { file: "src/calculator.story.test.ts", testCases: [tc] },
      baseDeps,
    );
    expect(result).toContain('id="feature-src-calculator-story-test-ts"');
  });

  it("renders permalink anchor icon in feature header", () => {
    const tc = stubs.testCaseResult({
      story: stubs.storyMeta({ scenario: "Test", tags: [] }),
      tags: [],
    });
    const result = renderFeature(
      { file: "src/calc.test.ts", testCases: [tc] },
      baseDeps,
    );
    expect(result).toContain('class="permalink-anchor"');
    expect(result).toContain("copyPermalink");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/executable-stories-formatters && npx vitest run test/formatters/html/renderers/feature.test.ts`
Expected: FAIL — no `id` attribute or `permalink-anchor` in feature output.

- [ ] **Step 3: Add slugify import and update renderFeature**

Modify `src/formatters/html/renderers/feature.ts`:

```ts
// Add import at top:
import { slugify } from "../../../converters/acl/ids.js";

// In renderFeature, before the return statement, add:
const featureSlug = `feature-${slugify(file)}`;

// Update the return template — change the opening div and add anchor to header:
return `
<div class="feature${collapsedClass}" id="${featureSlug}">
  <div class="feature-header" role="button" tabindex="0" aria-expanded="${ariaExpanded}">
    <button class="permalink-anchor" onclick="copyPermalink('${featureSlug}')" aria-label="Copy link to feature" title="Copy link">#</button>
    <div class="feature-info">
      <div class="feature-title">${deps.escapeHtml(featureName)}</div>
      <div class="feature-path">${deps.escapeHtml(file)}</div>
    </div>
    <div class="feature-stats">
      <span class="stat passed">✓ ${passed}</span>
      <span class="stat failed">✗ ${failed}</span>
      <span class="stat skipped">○ ${skipped}</span>
      <span class="chevron">▼</span>
    </div>
  </div>
  <div class="feature-content">
    ${scenarios}
  </div>
</div>`;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/executable-stories-formatters && npx vitest run test/formatters/html/renderers/feature.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/executable-stories-formatters/src/formatters/html/renderers/feature.ts packages/executable-stories-formatters/test/formatters/html/renderers/feature.test.ts
git commit -m "feat(html): add permalink anchor and id to feature sections"
```

---

### Task 2: Permalink Anchors on Scenarios

**Files:**
- Modify: `src/formatters/html/renderers/scenario.ts`
- Modify: `test/formatters/html/renderers/scenario.test.ts`

- [ ] **Step 1: Add test for permalink anchor on scenarios**

Add to `test/formatters/html/renderers/scenario.test.ts`:

```ts
it("renders permalink anchor icon in scenario header", () => {
  const tc = stubs.testCaseResult({
    id: "anchor-test-123",
    story: stubs.storyMeta({ scenario: "Anchor test", tags: [] }),
    tags: [],
  });

  const result = renderScenario({ tc }, baseDeps);

  expect(result).toContain('class="permalink-anchor"');
  expect(result).toContain("copyPermalink('scenario-anchor-test-123')");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/executable-stories-formatters && npx vitest run test/formatters/html/renderers/scenario.test.ts -t "renders permalink anchor"`
Expected: FAIL

- [ ] **Step 3: Add anchor icon to scenario header**

In `src/formatters/html/renderers/scenario.ts`, in the `renderScenario` function, update the scenario header template. Add the anchor button right before `<span class="scenario-duration">`:

Change:
```ts
    <span class="scenario-duration">${duration}</span>
```
To:
```ts
    <div class="scenario-actions">
      <button class="permalink-anchor" onclick="copyPermalink('scenario-${tc.id}')" aria-label="Copy link to scenario" title="Copy link">#</button>
      <span class="scenario-duration">${duration}</span>
    </div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/executable-stories-formatters && npx vitest run test/formatters/html/renderers/scenario.test.ts`
Expected: PASS (all existing tests must still pass too)

- [ ] **Step 5: Commit**

```bash
git add packages/executable-stories-formatters/src/formatters/html/renderers/scenario.ts packages/executable-stories-formatters/test/formatters/html/renderers/scenario.test.ts
git commit -m "feat(html): add permalink anchor icon to scenario headers"
```

---

### Task 3: Permalink JS and CSS

**Files:**
- Modify: `src/formatters/html/template.ts`
- Modify: `src/formatters/html/styles.ts`

- [ ] **Step 1: Add permalink JS functions to template.ts**

In `src/formatters/html/template.ts`, add the following to the end of `JS_CORE` (before the closing backtick of the `JS_CORE` template literal):

```js
// Permalink copy
function copyPermalink(anchorId) {
  var url = location.origin + location.pathname + location.search + '#' + anchorId;
  navigator.clipboard.writeText(url).then(function() {
    var el = document.getElementById(anchorId);
    if (el) showCopyToast(el);
  });
}

function showCopyToast(el) {
  var existing = el.querySelector('.copy-toast');
  if (existing) existing.remove();
  var toast = document.createElement('span');
  toast.className = 'copy-toast';
  toast.textContent = 'Copied!';
  var header = el.querySelector('.feature-header, .scenario-header');
  if (header) {
    header.style.position = 'relative';
    header.appendChild(toast);
  }
  setTimeout(function() { toast.remove(); }, 1500);
}
```

- [ ] **Step 2: Add hash-scroll-on-load to the DOMContentLoaded handler**

In `src/formatters/html/template.ts`, in the `generateScript` function, add `initHashScroll();` to the `initCalls` array (after `applyAllFilters();`):

```ts
initCalls.push('initHashScroll();');
```

And add this function to `JS_CORE`:

```js
// Hash scroll on load
function initHashScroll() {
  if (!location.hash) return;
  var target = document.querySelector(location.hash);
  if (!target) return;
  var feature = target.closest('.feature');
  if (feature && feature.classList.contains('collapsed')) {
    feature.classList.remove('collapsed');
    var fh = feature.querySelector('.feature-header');
    if (fh) fh.setAttribute('aria-expanded', 'true');
  }
  if (target.classList.contains('collapsed')) {
    target.classList.remove('collapsed');
    var sh = target.querySelector('.scenario-header');
    if (sh) sh.setAttribute('aria-expanded', 'true');
  }
  setTimeout(function() {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    target.classList.add('hash-highlight');
  }, 100);
}
```

- [ ] **Step 3: Add permalink CSS to styles.ts**

In `src/formatters/html/styles.ts`, before the closing template literal (`` `; `` on the last line), add:

```css
/* ============================================================================
   Permalink Anchors
   ============================================================================ */
.permalink-anchor {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border: none;
  background: none;
  color: var(--muted-foreground);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s ease;
  font-size: 0.875rem;
  font-weight: 600;
  padding: 0;
  flex-shrink: 0;
}

.feature-header:hover .permalink-anchor,
.scenario-header:hover .permalink-anchor,
.permalink-anchor:focus-visible {
  opacity: 1;
}

.permalink-anchor:hover {
  color: var(--primary);
}

.copy-toast {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  background: var(--foreground);
  color: var(--background);
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius);
  font-size: 0.75rem;
  font-weight: 500;
  pointer-events: none;
  animation: fadeOut 1.5s ease forwards;
  z-index: 10;
}

@keyframes fadeOut {
  0%, 70% { opacity: 1; }
  100% { opacity: 0; }
}

.hash-highlight {
  animation: hashPulse 2s ease;
}

@keyframes hashPulse {
  0%, 100% { background: transparent; }
  20% { background: color-mix(in srgb, var(--primary) 12%, transparent); }
}

.scenario-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
}
```

- [ ] **Step 4: Run the full test suite to verify nothing broke**

Run: `cd packages/executable-stories-formatters && npx vitest run`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/executable-stories-formatters/src/formatters/html/template.ts packages/executable-stories-formatters/src/formatters/html/styles.ts
git commit -m "feat(html): add permalink copy-to-clipboard JS and CSS"
```

---

### Task 4: Keyboard Navigation

**Files:**
- Modify: `src/formatters/html/template.ts`
- Modify: `src/formatters/html/styles.ts`

- [ ] **Step 1: Replace initKeyboardShortcuts in template.ts**

In `src/formatters/html/template.ts`, replace the existing `initKeyboardShortcuts` function in `JS_CORE` with:

```js
// Keyboard navigation
var focusedScenarioIndex = -1;

function getVisibleScenarios() {
  return Array.from(document.querySelectorAll('.scenario')).filter(function(s) {
    return s.style.display !== 'none' && s.closest('.feature').style.display !== 'none';
  });
}

function focusScenario(index) {
  var scenarios = getVisibleScenarios();
  if (scenarios.length === 0) return;

  // Remove previous focus
  var prev = document.querySelector('.scenario-focused');
  if (prev) prev.classList.remove('scenario-focused');

  // Wrap around
  if (index < 0) index = scenarios.length - 1;
  if (index >= scenarios.length) index = 0;
  focusedScenarioIndex = index;

  var scenario = scenarios[index];
  scenario.classList.add('scenario-focused');
  scenario.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function showShortcutsOverlay() {
  if (document.querySelector('.shortcuts-overlay')) return;
  var overlay = document.createElement('div');
  overlay.className = 'shortcuts-overlay';
  overlay.innerHTML = '<div class="shortcuts-modal">' +
    '<div class="shortcuts-title">Keyboard Shortcuts</div>' +
    '<div class="shortcuts-grid">' +
    '<kbd>j</kbd><span>Next scenario</span>' +
    '<kbd>k</kbd><span>Previous scenario</span>' +
    '<kbd>Enter</kbd><span>Expand/collapse scenario</span>' +
    '<kbd>Escape</kbd><span>Collapse scenario / close</span>' +
    '<kbd>/</kbd><span>Focus search</span>' +
    '<kbd>?</kbd><span>Toggle this help</span>' +
    '<kbd>e</kbd><span>Expand all</span>' +
    '<kbd>c</kbd><span>Collapse all</span>' +
    '<kbd>t</kbd><span>Toggle table of contents</span>' +
    '</div></div>';
  overlay.addEventListener('click', function(ev) {
    if (ev.target === overlay) hideShortcutsOverlay();
  });
  document.body.appendChild(overlay);
}

function hideShortcutsOverlay() {
  var overlay = document.querySelector('.shortcuts-overlay');
  if (overlay) overlay.remove();
}

function initKeyboardShortcuts() {
  document.addEventListener('keydown', function(e) {
    var tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') {
      if (e.key === 'Escape') {
        e.target.blur();
        if (e.target.classList.contains('search-input')) {
          e.target.value = '';
          applyAllFilters();
        }
      }
      return;
    }

    if (e.ctrlKey || e.metaKey || e.altKey) return;

    switch (e.key) {
      case 'j':
        e.preventDefault();
        focusScenario(focusedScenarioIndex + 1);
        break;
      case 'k':
        e.preventDefault();
        focusScenario(focusedScenarioIndex - 1);
        break;
      case 'Enter':
        e.preventDefault();
        var scenarios = getVisibleScenarios();
        if (focusedScenarioIndex >= 0 && focusedScenarioIndex < scenarios.length) {
          var s = scenarios[focusedScenarioIndex];
          var h = s.querySelector('.scenario-header');
          if (h) toggleCollapse(h, s);
        }
        break;
      case 'Escape':
        if (document.querySelector('.shortcuts-overlay')) {
          hideShortcutsOverlay();
        } else {
          var scenarios2 = getVisibleScenarios();
          if (focusedScenarioIndex >= 0 && focusedScenarioIndex < scenarios2.length) {
            var sc = scenarios2[focusedScenarioIndex];
            if (!sc.classList.contains('collapsed')) {
              sc.classList.add('collapsed');
              var sh = sc.querySelector('.scenario-header');
              if (sh) sh.setAttribute('aria-expanded', 'false');
            }
          }
        }
        break;
      case '/':
        e.preventDefault();
        var input = document.querySelector('.search-input');
        if (input) input.focus();
        break;
      case '?':
        e.preventDefault();
        if (document.querySelector('.shortcuts-overlay')) {
          hideShortcutsOverlay();
        } else {
          showShortcutsOverlay();
        }
        break;
      case 'e':
        e.preventDefault();
        expandAll();
        break;
      case 'c':
        e.preventDefault();
        collapseAll();
        break;
      case 't':
        e.preventDefault();
        if (typeof toggleToc === 'function') toggleToc();
        break;
    }
  });
}
```

- [ ] **Step 2: Add keyboard navigation CSS to styles.ts**

In `src/formatters/html/styles.ts`, before the closing template literal, add:

```css
/* ============================================================================
   Keyboard Navigation
   ============================================================================ */
.scenario-focused {
  border-left: 2px solid var(--primary);
}

.shortcuts-overlay {
  position: fixed;
  inset: 0;
  background: rgb(0 0 0 / 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.shortcuts-modal {
  background: var(--card);
  color: var(--card-foreground);
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) * 2);
  padding: 1.5rem 2rem;
  max-width: 400px;
  width: 90vw;
  box-shadow: var(--shadow-md, 0 4px 12px rgb(0 0 0 / 0.15));
}

.shortcuts-title {
  font-weight: 600;
  font-size: 1.125rem;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border);
}

.shortcuts-grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.5rem 1rem;
  align-items: center;
}

.shortcuts-grid kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.75rem;
  padding: 0.125rem 0.375rem;
  background: var(--muted);
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) * 0.5);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--muted-foreground);
}

.shortcuts-grid span {
  font-size: 0.875rem;
  color: var(--foreground);
}
```

- [ ] **Step 3: Run the full test suite**

Run: `cd packages/executable-stories-formatters && npx vitest run`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add packages/executable-stories-formatters/src/formatters/html/template.ts packages/executable-stories-formatters/src/formatters/html/styles.ts
git commit -m "feat(html): add keyboard navigation with vim-style j/k and shortcuts overlay"
```

---

### Task 5: Step Data Attributes for Copy-as-Markdown

**Files:**
- Modify: `src/formatters/html/renderers/steps.ts`
- Create: `test/formatters/html/renderers/steps-data-attrs.test.ts`

- [ ] **Step 1: Write failing test for data-keyword and data-text**

Create `test/formatters/html/renderers/steps-data-attrs.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { renderStep } from "../../../../src/formatters/html/renderers/steps";

const deps = {
  escapeHtml: (s: string) => s,
  getStatusIcon: (status: string) => (status === "passed" ? "✓" : "○"),
  renderDocs: () => "",
};

describe("renderStep data attributes", () => {
  it("includes data-keyword attribute with trimmed keyword", () => {
    const html = renderStep(
      { keyword: "Given", text: "a user exists" },
      { index: 0, status: "passed", durationMs: 10 },
      0,
      deps,
    );
    expect(html).toContain('data-keyword="Given"');
  });

  it("includes data-text attribute with step text", () => {
    const html = renderStep(
      { keyword: "When", text: "the user logs in" },
      { index: 0, status: "passed", durationMs: 10 },
      0,
      deps,
    );
    expect(html).toContain('data-text="the user logs in"');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/executable-stories-formatters && npx vitest run test/formatters/html/renderers/steps-data-attrs.test.ts`
Expected: FAIL — no `data-keyword` or `data-text` in output.

- [ ] **Step 3: Add data attributes to step rendering**

In `src/formatters/html/renderers/steps.ts`, update the `renderStep` function's return template. Change:

```ts
  return `<div class="${stepClass}">
  <span class="step-status ${statusClass}">${statusIcon}</span>
  <span class="step-keyword">${deps.escapeHtml(step.keyword)}</span>
  <span class="step-text">${textHtml}</span>
  <span class="step-duration">${duration}</span>
</div>${stepDocs}`;
```

To:

```ts
  return `<div class="${stepClass}" data-keyword="${deps.escapeHtml(keywordTrimmed)}" data-text="${deps.escapeHtml(step.text)}">
  <span class="step-status ${statusClass}">${statusIcon}</span>
  <span class="step-keyword">${deps.escapeHtml(step.keyword)}</span>
  <span class="step-text">${textHtml}</span>
  <span class="step-duration">${duration}</span>
</div>${stepDocs}`;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/executable-stories-formatters && npx vitest run test/formatters/html/renderers/steps-data-attrs.test.ts`
Expected: PASS

- [ ] **Step 5: Run the full test suite**

Run: `cd packages/executable-stories-formatters && npx vitest run`
Expected: All tests pass (some snapshot tests may need updating if they contain step HTML).

- [ ] **Step 6: Commit**

```bash
git add packages/executable-stories-formatters/src/formatters/html/renderers/steps.ts packages/executable-stories-formatters/test/formatters/html/renderers/steps-data-attrs.test.ts
git commit -m "feat(html): add data-keyword and data-text attributes to steps"
```

---

### Task 6: Copy Scenario as Markdown

**Files:**
- Modify: `src/formatters/html/renderers/scenario.ts`
- Modify: `src/formatters/html/template.ts`
- Modify: `src/formatters/html/styles.ts`
- Modify: `test/formatters/html/renderers/scenario.test.ts`

- [ ] **Step 1: Add test for copy-as-markdown button**

Add to `test/formatters/html/renderers/scenario.test.ts`:

```ts
it("renders copy-as-markdown button in scenario header", () => {
  const tc = stubs.testCaseResult({
    id: "copy-md-test",
    story: stubs.storyMeta({ scenario: "Copy test", tags: [] }),
    tags: [],
  });

  const result = renderScenario({ tc }, baseDeps);

  expect(result).toContain('class="copy-scenario-btn"');
  expect(result).toContain("copyScenarioAsMarkdown('scenario-copy-md-test')");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/executable-stories-formatters && npx vitest run test/formatters/html/renderers/scenario.test.ts -t "copy-as-markdown"`
Expected: FAIL

- [ ] **Step 3: Add copy button to scenario header**

In `src/formatters/html/renderers/scenario.ts`, in the scenario-actions div (added in Task 2), add a copy button before the permalink anchor:

Change:
```ts
    <div class="scenario-actions">
      <button class="permalink-anchor" onclick="copyPermalink('scenario-${tc.id}')" aria-label="Copy link to scenario" title="Copy link">#</button>
      <span class="scenario-duration">${duration}</span>
    </div>
```

To:
```ts
    <div class="scenario-actions">
      <button class="copy-scenario-btn" onclick="copyScenarioAsMarkdown('scenario-${tc.id}')" aria-label="Copy scenario as markdown" title="Copy as Markdown">&#x2398;</button>
      <button class="permalink-anchor" onclick="copyPermalink('scenario-${tc.id}')" aria-label="Copy link to scenario" title="Copy link">#</button>
      <span class="scenario-duration">${duration}</span>
    </div>
```

- [ ] **Step 4: Add copyScenarioAsMarkdown JS to template.ts**

In `src/formatters/html/template.ts`, add to `JS_CORE` (after the `showCopyToast` function):

```js
// Copy scenario as markdown
function copyScenarioAsMarkdown(scenarioId) {
  var scenario = document.getElementById(scenarioId);
  if (!scenario) return;

  var title = (scenario.querySelector('.scenario-name') || {}).textContent || '';
  var steps = scenario.querySelectorAll('.step, .step.continuation');
  var lines = ['### Scenario: ' + title.trim(), ''];

  steps.forEach(function(step) {
    var keyword = step.getAttribute('data-keyword') || '';
    var text = step.getAttribute('data-text') || '';
    lines.push('- **' + keyword + '** ' + text);
  });

  var errorBox = scenario.querySelector('.error-message');
  if (errorBox) {
    var errorText = errorBox.textContent || '';
    lines.push('');
    lines.push('> **Error:** ' + errorText.trim());
  }

  var md = lines.join('\n');
  navigator.clipboard.writeText(md).then(function() {
    showCopyToast(scenario);
  });
}
```

- [ ] **Step 5: Add copy button CSS to styles.ts**

In `src/formatters/html/styles.ts`, add after the `.scenario-actions` rules:

```css
.copy-scenario-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border: none;
  background: none;
  color: var(--muted-foreground);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s ease;
  font-size: 0.875rem;
  padding: 0;
  flex-shrink: 0;
}

.scenario-header:hover .copy-scenario-btn,
.copy-scenario-btn:focus-visible {
  opacity: 1;
}

.copy-scenario-btn:hover {
  color: var(--primary);
}
```

- [ ] **Step 6: Run full test suite**

Run: `cd packages/executable-stories-formatters && npx vitest run`
Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add packages/executable-stories-formatters/src/formatters/html/renderers/scenario.ts packages/executable-stories-formatters/src/formatters/html/template.ts packages/executable-stories-formatters/src/formatters/html/styles.ts packages/executable-stories-formatters/test/formatters/html/renderers/scenario.test.ts
git commit -m "feat(html): add copy scenario as markdown button"
```

---

### Task 7: Run full quality gate for PR 1

- [ ] **Step 1: Run pnpm quality from repo root**

Run: `cd /Users/jreehal/dev/js/executable-stories && pnpm quality`
Expected: All builds, linting, type-checking, and tests pass.

- [ ] **Step 2: Fix any issues found**

Address any type errors, lint warnings, or broken snapshot tests. Update snapshots if needed:
Run: `cd packages/executable-stories-formatters && npx vitest run -u` (only if snapshot tests fail due to expected HTML output changes)

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: address quality gate issues for PR 1"
```

---

## PR 2: Table of Contents Sidebar

### Task 8: TOC Renderer

**Files:**
- Create: `src/formatters/html/renderers/toc.ts`
- Create: `test/formatters/html/renderers/toc.test.ts`

- [ ] **Step 1: Write failing tests for renderToc**

Create `test/formatters/html/renderers/toc.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { renderToc } from "../../../../src/formatters/html/renderers/toc";
import { escapeHtml } from "../../../../src/formatters/html/template";
import { stubs } from "../../../stubs";

const baseDeps = {
  escapeHtml,
  getStatusIcon: (status: string) =>
    status === "passed" ? "✓" : status === "failed" ? "✗" : "○",
};

describe("renderToc", () => {
  beforeEach(() => {
    stubs.setFakerSeed(42);
  });

  it("renders toc-sidebar nav element", () => {
    const run = stubs.testRunResult();
    const result = renderToc({ run }, baseDeps);
    expect(result).toContain('<nav class="toc-sidebar"');
    expect(result).toContain('aria-label="Table of contents"');
  });

  it("groups scenarios by source file", () => {
    const tc1 = stubs.testCaseResult({
      id: "tc1",
      sourceFile: "src/auth.test.ts",
      story: stubs.storyMeta({ scenario: "Login works", suitePath: ["Auth"] }),
    });
    const tc2 = stubs.testCaseResult({
      id: "tc2",
      sourceFile: "src/auth.test.ts",
      story: stubs.storyMeta({ scenario: "Logout works", suitePath: ["Auth"] }),
    });
    const tc3 = stubs.testCaseResult({
      id: "tc3",
      sourceFile: "src/cart.test.ts",
      story: stubs.storyMeta({ scenario: "Add to cart", suitePath: ["Cart"] }),
    });
    const run = stubs.testRunResult({ testCases: [tc1, tc2, tc3] });
    const result = renderToc({ run }, baseDeps);

    expect(result).toContain("Auth");
    expect(result).toContain("Cart");
    expect(result).toContain('href="#scenario-tc1"');
    expect(result).toContain('href="#scenario-tc2"');
    expect(result).toContain('href="#scenario-tc3"');
  });

  it("marks failed scenarios with toc-failed class", () => {
    const tc = stubs.testCaseResult({
      id: "fail1",
      status: "failed",
      story: stubs.storyMeta({ scenario: "Broken test" }),
    });
    const run = stubs.testRunResult({ testCases: [tc] });
    const result = renderToc({ run }, baseDeps);
    expect(result).toContain("toc-failed");
  });

  it("returns empty string when no test cases", () => {
    const run = stubs.testRunResult({ testCases: [] });
    const result = renderToc({ run }, baseDeps);
    expect(result).toBe("");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/executable-stories-formatters && npx vitest run test/formatters/html/renderers/toc.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement renderToc**

Create `src/formatters/html/renderers/toc.ts`:

```ts
/**
 * Render table of contents sidebar (fn(args, deps)).
 */

import type { TestRunResult, TestStatus } from "../../../types/test-result";
import { slugify } from "../../../converters/acl/ids.js";

export interface RenderTocArgs {
  run: TestRunResult;
}

export interface RenderTocDeps {
  escapeHtml: (str: string) => string;
  getStatusIcon: (status: TestStatus) => string;
}

function groupBy<T, K>(items: T[], keyFn: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const existing = map.get(key);
    if (existing) {
      existing.push(item);
    } else {
      map.set(key, [item]);
    }
  }
  return map;
}

export function renderToc(args: RenderTocArgs, deps: RenderTocDeps): string {
  const { run } = args;
  if (run.testCases.length === 0) return "";

  const byFile = groupBy(run.testCases, (tc) => tc.sourceFile);
  const features: string[] = [];

  for (const [file, testCases] of byFile) {
    const suitePaths = testCases
      .map((tc) => tc.titlePath)
      .filter((p) => p.length > 0);
    const featureName =
      suitePaths.length > 0 && suitePaths[0].length > 0
        ? suitePaths[0][0]
        : file.split("/").pop()?.replace(/\.[^.]+$/, "") ?? file;

    const featureSlug = `feature-${slugify(file)}`;

    const scenarios = testCases
      .map((tc) => {
        const statusIcon = deps.getStatusIcon(tc.status);
        const statusClass = `status-${tc.status}`;
        const failedClass = tc.status === "failed" ? " toc-failed" : "";
        return `<a class="toc-scenario${failedClass}" href="#scenario-${tc.id}">
          <span class="toc-status ${statusClass}">${statusIcon}</span>
          ${deps.escapeHtml(tc.story.scenario)}
        </a>`;
      })
      .join("\n");

    features.push(`<div class="toc-feature">
      <button class="toc-feature-toggle" aria-expanded="true" onclick="this.setAttribute('aria-expanded', this.getAttribute('aria-expanded') === 'true' ? 'false' : 'true'); this.nextElementSibling.style.display = this.getAttribute('aria-expanded') === 'true' ? '' : 'none'">
        <a href="#${featureSlug}" onclick="event.stopPropagation()">${deps.escapeHtml(featureName)}</a>
      </button>
      <div class="toc-scenarios">
        ${scenarios}
      </div>
    </div>`);
  }

  return `<nav class="toc-sidebar" aria-label="Table of contents">
  <div class="toc-header">
    <span class="toc-title">Contents</span>
  </div>
  <div class="toc-body">
    ${features.join("\n")}
  </div>
</nav>`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/executable-stories-formatters && npx vitest run test/formatters/html/renderers/toc.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/executable-stories-formatters/src/formatters/html/renderers/toc.ts packages/executable-stories-formatters/test/formatters/html/renderers/toc.test.ts
git commit -m "feat(html): add TOC renderer"
```

---

### Task 9: Wire TOC into Body and Options

**Files:**
- Modify: `src/formatters/html/renderers/body.ts`
- Modify: `src/formatters/html/renderers/index.ts`
- Modify: `src/formatters/html/index.ts`

- [ ] **Step 1: Add tocEnabled to HtmlOptions**

In `src/formatters/html/index.ts`, add to the `HtmlOptions` interface (after `ticketUrlTemplate`):

```ts
  /** Show table of contents sidebar. Default: true */
  tocEnabled?: boolean;
```

Add the re-export for `renderToc` in the export section at the bottom:

```ts
export { renderToc } from "./renderers/toc";
```

- [ ] **Step 2: Add tocEnabled to HtmlFormatterOptions and normalizeOptions**

In `src/formatters/html/renderers/index.ts`, add to `HtmlFormatterOptions` interface:

```ts
  /** Show table of contents sidebar. Default: true */
  tocEnabled?: boolean;
```

In the `normalizeOptions` function, add:

```ts
    tocEnabled: options.tocEnabled ?? true,
```

- [ ] **Step 3: Wire renderToc into createHtmlFormatter**

In `src/formatters/html/renderers/index.ts`:

Add import:
```ts
import { renderToc } from "./toc";
```

In `createHtmlFormatter`, after `const tagBarDeps = { escapeHtml };`, add:

```ts
  const tocDeps = {
    escapeHtml,
    getStatusIcon,
  };
```

Update `bodyDeps` to include the TOC:

```ts
  const bodyDeps = {
    renderMetaInfo,
    renderSummary,
    renderTagBar,
    renderFeature,
    renderFailureSummary,
    renderToc: opts.tocEnabled ? renderToc : undefined,
    metaDeps: { escapeHtml },
    summaryDeps: {},
    tagBarDeps,
    featureDeps,
    failureSummaryDeps: { escapeHtml },
    tocDeps,
  };
```

Add to exports at bottom of file:

```ts
export { renderToc } from "./toc";
export type { RenderTocArgs, RenderTocDeps } from "./toc";
```

- [ ] **Step 4: Update BuildBodyDeps and buildBody to render TOC**

In `src/formatters/html/renderers/body.ts`:

Add import:
```ts
import type { RenderTocArgs, RenderTocDeps } from "./toc.js";
```

Add to `BuildBodyDeps` interface:

```ts
  renderToc?: (args: RenderTocArgs, deps: RenderTocDeps) => string;
  tocDeps?: RenderTocDeps;
```

In the `buildBody` function, add the TOC rendering right at the beginning (before meta info), so it appears as the first element:

```ts
  if (deps.renderToc) {
    parts.push(deps.renderToc({ run }, deps.tocDeps));
  }
```

- [ ] **Step 5: Run the full test suite**

Run: `cd packages/executable-stories-formatters && npx vitest run`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/executable-stories-formatters/src/formatters/html/renderers/body.ts packages/executable-stories-formatters/src/formatters/html/renderers/index.ts packages/executable-stories-formatters/src/formatters/html/index.ts
git commit -m "feat(html): wire TOC renderer into body and options"
```

---

### Task 10: TOC JavaScript and CSS

**Files:**
- Modify: `src/formatters/html/template.ts`
- Modify: `src/formatters/html/styles.ts`

- [ ] **Step 1: Add TOC JS to template.ts**

In `src/formatters/html/template.ts`, add to `JS_CORE`:

```js
// Table of contents
function toggleToc() {
  var sidebar = document.querySelector('.toc-sidebar');
  var wrapper = document.querySelector('.report-layout');
  if (!sidebar || !wrapper) return;
  var visible = sidebar.style.display !== 'none';
  sidebar.style.display = visible ? 'none' : '';
  wrapper.classList.toggle('toc-hidden', visible);
  localStorage.setItem('toc-visible', String(!visible));
}

function initToc() {
  var sidebar = document.querySelector('.toc-sidebar');
  if (!sidebar) return;

  var saved = localStorage.getItem('toc-visible');
  var wrapper = document.querySelector('.report-layout');
  if (saved === 'false' && wrapper) {
    sidebar.style.display = 'none';
    wrapper.classList.add('toc-hidden');
  }

  // Active tracking via IntersectionObserver
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        var id = entry.target.id;
        if (!id) return;
        document.querySelectorAll('.toc-scenario, .toc-feature-toggle').forEach(function(el) {
          el.classList.remove('toc-active');
        });
        var tocLink = sidebar.querySelector('a[href="#' + id + '"]');
        if (tocLink) tocLink.classList.add('toc-active');
      }
    });
  }, { rootMargin: '-10% 0px -80% 0px' });

  document.querySelectorAll('.feature, .scenario').forEach(function(el) {
    if (el.id) observer.observe(el);
  });

  // Click navigation: expand collapsed parents
  sidebar.querySelectorAll('.toc-scenario').forEach(function(link) {
    link.addEventListener('click', function(e) {
      var hash = link.getAttribute('href');
      if (!hash) return;
      var target = document.querySelector(hash);
      if (!target) return;
      var feature = target.closest('.feature');
      if (feature && feature.classList.contains('collapsed')) {
        feature.classList.remove('collapsed');
        var fh = feature.querySelector('.feature-header');
        if (fh) fh.setAttribute('aria-expanded', 'true');
      }
      if (target.classList.contains('collapsed')) {
        target.classList.remove('collapsed');
        var sh = target.querySelector('.scenario-header');
        if (sh) sh.setAttribute('aria-expanded', 'true');
      }
    });
  });
}
```

Add `initToc();` to the `initCalls` array in the `generateScript` function (after `initHashScroll();`).

- [ ] **Step 2: Add TOC toggle button to header in template**

In `src/formatters/html/template.ts`, in the `generateHtmlTemplate` function, add a TOC toggle button in the header-actions div (before the search input):

Change:
```ts
        ${includeSearch ? '<input type="text" class="search-input" placeholder="Search scenarios..." aria-label="Search scenarios">' : ''}
```
To:
```ts
        <button type="button" class="toc-toggle" onclick="toggleToc()" aria-label="Toggle table of contents" title="Toggle contents">&#x2630;</button>
        ${includeSearch ? '<input type="text" class="search-input" placeholder="Search scenarios..." aria-label="Search scenarios">' : ''}
```

- [ ] **Step 3: Wrap container in grid layout**

In `src/formatters/html/template.ts`, in `generateHtmlTemplate`, wrap the `<div class="container">` in a layout div. Change:

```ts
  <div class="container">
```
To:
```ts
  <div class="report-layout">
  <div class="container">
```

And add a closing `</div>` after the container's closing `</div>`:

```ts
  </div>
  </div>
```

Note: The TOC HTML is rendered by `buildBody` and included inside `${body}`. The layout wrapper goes around the whole thing. The TOC `<nav>` will be the first child inside `.container`, followed by the rest of the body content. The CSS grid on `.report-layout` will position the sidebar and main content.

Actually, let me reconsider — the TOC needs to be a sibling of `.container`, not inside it, so the grid layout works properly. Instead:

In `generateHtmlTemplate`, change the body section:

```ts
  <div class="report-layout">
    ${body}
  </div>
```

And in `buildBody`, the TOC is already the first `parts.push()`. The CSS grid on `.report-layout` with `grid-template-columns: 260px 1fr` will position the TOC sidebar alongside the main content div.

Wait — the TOC is inside `parts` alongside meta/summary/features. We need to restructure so the main content is wrapped. Let me adjust.

Better approach: In `body.ts`, wrap the non-TOC content in a `<div class="main-content">`:

```ts
export function buildBody(args: BuildBodyArgs, deps: BuildBodyDeps): string {
  const { run } = args;
  const tocHtml = deps.renderToc ? deps.renderToc({ run }, deps.tocDeps) : "";
  const parts: string[] = [];

  // ... existing parts.push() calls for meta, summary, tagbar, failureSummary, features ...

  return `${tocHtml}<div class="main-content">${parts.join("\n")}</div>`;
}
```

Update `body.ts` accordingly in Step 4 below.

- [ ] **Step 4: Update body.ts to wrap main content**

In `src/formatters/html/renderers/body.ts`, restructure `buildBody`:

```ts
export function buildBody(args: BuildBodyArgs, deps: BuildBodyDeps): string {
  const { run } = args;

  const tocHtml = deps.renderToc && deps.tocDeps ? deps.renderToc({ run }, deps.tocDeps) : "";

  const parts: string[] = [];

  parts.push(
    deps.renderMetaInfo(
      {
        startedAtMs: run.startedAtMs,
        durationMs: run.durationMs,
        packageVersion: run.packageVersion,
        gitSha: run.gitSha,
        ciName: run.ci?.name,
        ciBranch: run.ci?.branch,
        ciUrl: run.ci?.url,
        ciCommitSha: run.ci?.commitSha,
        ciBuildNumber: run.ci?.buildNumber,
      },
      deps.metaDeps,
    ),
  );

  const total = run.testCases.length;
  const passed = run.testCases.filter((tc) => tc.status === "passed").length;
  const failed = run.testCases.filter((tc) => tc.status === "failed").length;
  const skipped = run.testCases.filter(
    (tc) => tc.status === "skipped" || tc.status === "pending",
  ).length;
  parts.push(
    deps.renderSummary(
      { total, passed, failed, skipped },
      deps.summaryDeps,
    ),
  );

  const allTags = [
    ...new Set(run.testCases.flatMap((tc) => tc.tags)),
  ].sort();
  parts.push(
    deps.renderTagBar(
      { tags: allTags, totalScenarios: total },
      deps.tagBarDeps,
    ),
  );

  const failedCases = run.testCases.filter((tc) => tc.status === "failed");
  if (failedCases.length > 0) {
    parts.push(
      deps.renderFailureSummary(
        { failedCases },
        deps.failureSummaryDeps,
      ),
    );
  }

  const byFile = groupBy(run.testCases, (tc) => tc.sourceFile);
  for (const [file, testCases] of byFile) {
    parts.push(
      deps.renderFeature(
        { file, testCases, metricsMap: args.metricsMap },
        deps.featureDeps,
      ),
    );
  }

  return `${tocHtml}<div class="main-content">${parts.join("\n")}</div>`;
}
```

- [ ] **Step 5: Add TOC CSS to styles.ts**

In `src/formatters/html/styles.ts`, before the closing template literal, add:

```css
/* ============================================================================
   Table of Contents Sidebar
   ============================================================================ */
.report-layout {
  display: flex;
  min-height: 100vh;
}

.report-layout.toc-hidden .toc-sidebar {
  display: none;
}

.main-content {
  flex: 1;
  min-width: 0;
}

.toc-sidebar {
  width: 260px;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  border-right: 1px solid var(--border);
  background: var(--card);
  padding: 1rem 0;
  font-size: 0.8125rem;
}

.toc-header {
  padding: 0 1rem 0.75rem;
  border-bottom: 1px solid var(--border);
  margin-bottom: 0.5rem;
}

.toc-title {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--foreground);
}

.toc-feature {
  margin-bottom: 0.25rem;
}

.toc-feature-toggle {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0.375rem 1rem;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--foreground);
  font-family: var(--font-sans);
}

.toc-feature-toggle:hover {
  background: var(--accent);
}

.toc-feature-toggle a {
  color: inherit;
  text-decoration: none;
}

.toc-feature-toggle[aria-expanded="false"] + .toc-scenarios {
  display: none;
}

.toc-scenarios {
  display: flex;
  flex-direction: column;
}

.toc-scenario {
  display: flex;
  align-items: baseline;
  gap: 0.375rem;
  padding: 0.25rem 1rem 0.25rem 1.5rem;
  color: var(--muted-foreground);
  text-decoration: none;
  font-size: 0.8125rem;
  line-height: 1.4;
  border-left: 2px solid transparent;
  transition: all 0.1s ease;
}

.toc-scenario:hover {
  color: var(--foreground);
  background: var(--accent);
}

.toc-scenario.toc-active {
  color: var(--foreground);
  border-left-color: var(--primary);
  font-weight: 500;
}

.toc-scenario.toc-failed {
  border-left-color: var(--error, var(--destructive));
}

.toc-status {
  flex-shrink: 0;
  font-size: 0.75rem;
}

.toc-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--background);
  cursor: pointer;
  color: var(--foreground);
  font-size: 1rem;
  transition: all 0.15s ease;
}

.toc-toggle:hover {
  background: var(--accent);
}

/* Mobile: overlay sidebar */
@media (max-width: 767px) {
  .toc-sidebar {
    position: fixed;
    left: 0;
    top: 0;
    z-index: 50;
    box-shadow: var(--shadow-sm, 0 1px 3px rgb(0 0 0 / 0.1));
    display: none;
  }

  .report-layout .toc-sidebar {
    display: none;
  }
}
```

- [ ] **Step 6: Update the template layout**

In `src/formatters/html/template.ts`, in `generateHtmlTemplate`, change:

```ts
  <div class="container">
    <header class="header">
```
To:
```ts
  <div class="report-layout">
  <div class="container">
    <header class="header">
```

And change the closing:
```ts
  </div>
  <script>${script}</script>
```
To:
```ts
  </div>
  </div>
  <script>${script}</script>
```

- [ ] **Step 7: Run full test suite**

Run: `cd packages/executable-stories-formatters && npx vitest run`
Expected: All tests pass.

- [ ] **Step 8: Commit**

```bash
git add packages/executable-stories-formatters/src/formatters/html/template.ts packages/executable-stories-formatters/src/formatters/html/styles.ts packages/executable-stories-formatters/src/formatters/html/renderers/body.ts
git commit -m "feat(html): add TOC sidebar JS, CSS, and layout wrapper"
```

---

### Task 11: TOC CLI Flag

**Files:**
- Modify: `src/cli.ts`

- [ ] **Step 1: Add --html-no-toc to HELP_TEXT**

In `src/cli.ts`, after the `--html-ticket-url-template` line (~line 94), add:

```
  --html-no-toc                 Disable table of contents sidebar in HTML (enabled by default)
```

- [ ] **Step 2: Add to parseArgs options**

After `"html-ticket-url-template"` (~line 229), add:

```ts
      "html-no-toc": { type: "boolean", default: false },
```

- [ ] **Step 3: Add to CliArgs interface**

After `htmlTicketUrlTemplate` (~line 168), add:

```ts
  htmlNoToc: boolean;
```

- [ ] **Step 4: Add to return object**

After `htmlTicketUrlTemplate` (~line 434), add:

```ts
    htmlNoToc: values["html-no-toc"] as boolean,
```

- [ ] **Step 5: Pass to ReportGenerator html config**

In the `html: {` config object (~line 1078), add:

```ts
      tocEnabled: !args.htmlNoToc,
```

- [ ] **Step 6: Run full test suite**

Run: `cd packages/executable-stories-formatters && npx vitest run`
Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add packages/executable-stories-formatters/src/cli.ts
git commit -m "feat(cli): add --html-no-toc flag"
```

---

### Task 12: TOC Filter Sync

**Files:**
- Modify: `src/formatters/html/template.ts`

- [ ] **Step 1: Add TOC sync to applyAllFilters**

In `src/formatters/html/template.ts`, add a call to `syncTocVisibility()` at the end of the `applyAllFilters()` function (before `writeUrlState();`):

```js
syncTocVisibility();
```

And add the `syncTocVisibility` function to `JS_CORE`:

```js
// Sync TOC visibility with filters
function syncTocVisibility() {
  var sidebar = document.querySelector('.toc-sidebar');
  if (!sidebar) return;

  sidebar.querySelectorAll('.toc-scenario').forEach(function(link) {
    var href = link.getAttribute('href');
    if (!href) return;
    var target = document.querySelector(href);
    link.style.display = (target && target.style.display !== 'none') ? '' : 'none';
  });

  sidebar.querySelectorAll('.toc-feature').forEach(function(feature) {
    var visibleScenarios = feature.querySelectorAll('.toc-scenario');
    var anyVisible = Array.from(visibleScenarios).some(function(s) {
      return s.style.display !== 'none';
    });
    feature.style.display = anyVisible ? '' : 'none';
  });
}
```

- [ ] **Step 2: Run full test suite**

Run: `cd packages/executable-stories-formatters && npx vitest run`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add packages/executable-stories-formatters/src/formatters/html/template.ts
git commit -m "feat(html): sync TOC visibility with search and filter state"
```

---

### Task 13: Quality gate for PR 2

- [ ] **Step 1: Run pnpm quality**

Run: `cd /Users/jreehal/dev/js/executable-stories && pnpm quality`
Expected: All pass.

- [ ] **Step 2: Fix any issues and commit**

---

## PR 3: Theme Picker

### Task 14: getCssOnlyThemes Helper

**Files:**
- Modify: `src/formatters/html/themes/index.ts`
- Create: `test/formatters/html/themes/css-only-themes.test.ts`

- [ ] **Step 1: Write failing test**

Create `test/formatters/html/themes/css-only-themes.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { getCssOnlyThemes, getAvailableThemes, resolveTheme } from "../../../../src/formatters/html/themes/index";

describe("getCssOnlyThemes", () => {
  it("returns only themes without buildBody or generateTemplate overrides", () => {
    const themes = getCssOnlyThemes();
    for (const theme of themes) {
      expect(theme.buildBody).toBeUndefined();
      expect(theme.generateTemplate).toBeUndefined();
    }
  });

  it("returns at least the default theme", () => {
    const themes = getCssOnlyThemes();
    const names = themes.map((t) => t.name);
    expect(names).toContain("default");
  });

  it("returns fewer or equal themes than getAvailableThemes", () => {
    const all = getAvailableThemes();
    const cssOnly = getCssOnlyThemes();
    expect(cssOnly.length).toBeLessThanOrEqual(all.length);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/executable-stories-formatters && npx vitest run test/formatters/html/themes/css-only-themes.test.ts`
Expected: FAIL — `getCssOnlyThemes` not exported.

- [ ] **Step 3: Implement getCssOnlyThemes**

In `src/formatters/html/themes/index.ts`, add:

```ts
/** Get all themes that only use CSS (no custom body/template overrides). */
export function getCssOnlyThemes(): HtmlTheme[] {
  return [...THEME_REGISTRY.values()].filter(
    (theme) => !theme.buildBody && !theme.generateTemplate,
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/executable-stories-formatters && npx vitest run test/formatters/html/themes/css-only-themes.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/executable-stories-formatters/src/formatters/html/themes/index.ts packages/executable-stories-formatters/test/formatters/html/themes/css-only-themes.test.ts
git commit -m "feat(html): add getCssOnlyThemes helper"
```

---

### Task 15: Theme Picker in Template

**Files:**
- Modify: `src/formatters/html/template.ts`
- Modify: `src/formatters/html/renderers/index.ts`
- Modify: `src/formatters/html/index.ts`
- Modify: `src/formatters/html/styles.ts`
- Create: `test/formatters/html/template-theme-picker.test.ts`

- [ ] **Step 1: Write failing test**

Create `test/formatters/html/template-theme-picker.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { generateHtmlTemplate } from "../../../src/formatters/html/template";

describe("theme picker in template", () => {
  it("renders theme picker select when themePickerHtml is provided", () => {
    const themePickerHtml = '<select class="theme-picker"><option value="default">Default</option></select>';
    const result = generateHtmlTemplate(
      "Test",
      "body {}",
      "<p>body</p>",
      { themePickerHtml },
    );
    expect(result).toContain('class="theme-picker"');
  });

  it("does not render theme picker when themePickerHtml is absent", () => {
    const result = generateHtmlTemplate("Test", "body {}", "<p>body</p>", {});
    expect(result).not.toContain("theme-picker");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/executable-stories-formatters && npx vitest run test/formatters/html/template-theme-picker.test.ts`
Expected: FAIL — `themePickerHtml` not a valid option.

- [ ] **Step 3: Add themePickerHtml to HtmlTemplateOptions**

In `src/formatters/html/template.ts`, add to `HtmlTemplateOptions`:

```ts
  /** Pre-rendered theme picker HTML (select element). */
  themePickerHtml?: string;
  /** Additional theme CSS blocks to embed (for theme picker). */
  additionalThemeCss?: Array<{ name: string; label: string; css: string }>;
```

- [ ] **Step 4: Render theme picker in template**

In `src/formatters/html/template.ts`, in `generateHtmlTemplate`:

Add the theme picker in the header actions (between detail-toggle and theme-toggle):

```ts
        ${options.themePickerHtml ?? ''}
```

Embed additional theme CSS blocks as disabled style elements (before the main `<style>` tag):

```ts
  const additionalThemeStyles = (options.additionalThemeCss ?? [])
    .map(t => `<style data-theme-name="${escapeHtml(t.name)}" disabled>${t.css}</style>`)
    .join('\n  ');
```

Update the template's `<style>` tag to include `data-theme-name` for the active theme:

Change:
```ts
  <style>${styles}</style>
```
To:
```ts
  <style${options.additionalThemeCss ? ` data-theme-name="${escapeHtml(options.activeThemeName ?? 'default')}"` : ''}>${styles}</style>
  ${additionalThemeStyles}
```

Add `activeThemeName` to `HtmlTemplateOptions`:

```ts
  /** Name of the currently active theme (for data-theme-name attribute). */
  activeThemeName?: string;
```

- [ ] **Step 5: Add theme picker JS**

In `src/formatters/html/template.ts`, add to `JS_CORE`:

```js
// Theme picker
function initThemePicker() {
  var picker = document.querySelector('.theme-picker');
  if (!picker) return;

  var saved = localStorage.getItem('report-theme');
  if (saved) {
    picker.value = saved;
    switchReportTheme(saved);
  }

  picker.addEventListener('change', function(e) {
    switchReportTheme(e.target.value);
    localStorage.setItem('report-theme', e.target.value);
  });
}

function switchReportTheme(name) {
  document.querySelectorAll('style[data-theme-name]').forEach(function(s) {
    s.disabled = s.dataset.themeName !== name;
  });
}
```

Add `initThemePicker();` to `initCalls` in `generateScript`.

- [ ] **Step 6: Add themePickerEnabled to options and wire in createHtmlFormatter**

In `src/formatters/html/index.ts`, add to `HtmlOptions`:

```ts
  /** Include theme picker with all CSS-only themes embedded. Default: false */
  themePickerEnabled?: boolean;
```

In `src/formatters/html/renderers/index.ts`, add to `HtmlFormatterOptions`:

```ts
  /** Include theme picker. Default: false */
  themePickerEnabled?: boolean;
```

In `normalizeOptions`, add:

```ts
    themePickerEnabled: options.themePickerEnabled ?? false,
```

Add import:
```ts
import { getCssOnlyThemes } from "../themes/index.js";
```

In `createHtmlFormatter`, in the `format(run)` method, build the theme picker HTML and additional CSS when enabled:

```ts
    format(run: TestRunResult): string {
      const bodyFn = theme.buildBody ?? buildBody;
      const body = bodyFn({ run }, bodyDeps);
      const templateFn = theme.generateTemplate ?? generateHtmlTemplate;

      let themePickerHtml: string | undefined;
      let additionalThemeCss: Array<{ name: string; label: string; css: string }> | undefined;

      if (opts.themePickerEnabled) {
        const cssOnlyThemes = getCssOnlyThemes();
        const options = cssOnlyThemes
          .map(t => `<option value="${t.name}"${t.name === theme.name ? ' selected' : ''}>${t.label}</option>`)
          .join('');
        themePickerHtml = `<select class="theme-picker" aria-label="Select theme">${options}</select>`;
        additionalThemeCss = cssOnlyThemes
          .filter(t => t.name !== theme.name)
          .map(t => ({ name: t.name, label: t.label, css: t.css }));
      }

      return templateFn(
        opts.title,
        theme.css,
        body,
        {
          includeSearch: opts.searchable,
          includeDarkMode: opts.darkMode,
          syntaxHighlighting: opts.syntaxHighlighting,
          mermaidEnabled: opts.mermaidEnabled,
          markdownEnabled: opts.markdownEnabled,
          additionalJs: theme.additionalJs,
          additionalImports: theme.additionalImports,
          themePickerHtml,
          additionalThemeCss,
          activeThemeName: theme.name,
        },
      );
    },
```

- [ ] **Step 7: Add theme picker CSS to styles.ts**

In `src/formatters/html/styles.ts`, add:

```css
/* ============================================================================
   Theme Picker
   ============================================================================ */
.theme-picker {
  height: 2.25rem;
  padding: 0 0.5rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--background);
  color: var(--foreground);
  font-size: 0.8125rem;
  font-family: var(--font-sans);
  cursor: pointer;
  transition: all 0.15s ease;
}

.theme-picker:hover {
  background: var(--accent);
}

.theme-picker:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}
```

- [ ] **Step 8: Run tests**

Run: `cd packages/executable-stories-formatters && npx vitest run`
Expected: All tests pass.

- [ ] **Step 9: Commit**

```bash
git add packages/executable-stories-formatters/src/formatters/html/template.ts packages/executable-stories-formatters/src/formatters/html/renderers/index.ts packages/executable-stories-formatters/src/formatters/html/index.ts packages/executable-stories-formatters/src/formatters/html/styles.ts packages/executable-stories-formatters/test/formatters/html/template-theme-picker.test.ts
git commit -m "feat(html): add in-report theme picker with CSS-only theme embedding"
```

---

### Task 16: Theme Picker CLI Flag

**Files:**
- Modify: `src/cli.ts`

- [ ] **Step 1: Add --html-theme-picker flag**

Follow the same pattern as Task 11. In `src/cli.ts`:

1. HELP_TEXT (after `--html-no-toc`):
```
  --html-theme-picker           Include theme picker in HTML report (embeds all CSS-only themes)
```

2. parseArgs options (after `"html-no-toc"`):
```ts
      "html-theme-picker": { type: "boolean", default: false },
```

3. CliArgs interface (after `htmlNoToc`):
```ts
  htmlThemePicker: boolean;
```

4. Return object (after `htmlNoToc`):
```ts
    htmlThemePicker: values["html-theme-picker"] as boolean,
```

5. ReportGenerator html config (after `tocEnabled`):
```ts
      themePickerEnabled: args.htmlThemePicker,
```

- [ ] **Step 2: Run full test suite**

Run: `cd packages/executable-stories-formatters && npx vitest run`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add packages/executable-stories-formatters/src/cli.ts
git commit -m "feat(cli): add --html-theme-picker flag"
```

---

### Task 17: Quality gate for PR 3

- [ ] **Step 1: Run pnpm quality**

Run: `cd /Users/jreehal/dev/js/executable-stories && pnpm quality`
Expected: All pass.

- [ ] **Step 2: Fix any issues and commit**

---

## PR 4: Storybook (parallel)

### Task 18: Storybook Setup

**Files:**
- Create: `.storybook/main.ts`
- Create: `.storybook/preview.ts`
- Modify: `package.json`

All paths relative to `packages/executable-stories-formatters/`.

- [ ] **Step 1: Install Storybook dependencies**

Run:
```bash
cd packages/executable-stories-formatters && pnpm add -D storybook @storybook/html @storybook/addon-essentials @storybook/html-vite
```

- [ ] **Step 2: Create .storybook/main.ts**

```ts
import type { StorybookConfig } from "@storybook/html-vite";

const config: StorybookConfig = {
  stories: ["../stories/**/*.stories.ts"],
  addons: ["@storybook/addon-essentials"],
  framework: "@storybook/html-vite",
};

export default config;
```

- [ ] **Step 3: Create .storybook/preview.ts**

```ts
import type { Preview } from "@storybook/html";
import { CSS_STYLES } from "../src/formatters/html/styles";
import { resolveTheme, getAvailableThemes } from "../src/formatters/html/themes/index";

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "Report theme",
      toolbar: {
        title: "Theme",
        items: getAvailableThemes().map((name) => ({
          value: name,
          title: resolveTheme(name).label,
        })),
        dynamicTitle: true,
      },
    },
    colorMode: {
      description: "Color mode",
      toolbar: {
        title: "Mode",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: "default",
    colorMode: "light",
  },
  decorators: [
    (story, context) => {
      const themeName = context.globals.theme || "default";
      const colorMode = context.globals.colorMode || "light";
      const theme = resolveTheme(themeName);

      const wrapper = document.createElement("div");
      wrapper.setAttribute("data-theme", colorMode);
      wrapper.setAttribute("data-detail-level", "full");

      const style = document.createElement("style");
      style.textContent = theme.css;
      wrapper.appendChild(style);

      const container = document.createElement("div");
      container.className = "container";
      container.style.padding = "1rem";

      const content = story();
      if (typeof content === "string") {
        container.innerHTML = content;
      } else if (content instanceof HTMLElement) {
        container.appendChild(content);
      }

      wrapper.appendChild(container);
      return wrapper;
    },
  ],
};

export default preview;
```

- [ ] **Step 4: Add scripts to package.json**

In `packages/executable-stories-formatters/package.json`, add to scripts:

```json
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build"
```

- [ ] **Step 5: Commit**

```bash
git add packages/executable-stories-formatters/.storybook packages/executable-stories-formatters/package.json
git commit -m "feat: add Storybook setup with theme and color mode switching"
```

---

### Task 19: Story Fixtures

**Files:**
- Create: `stories/fixtures.ts`

- [ ] **Step 1: Create shared fixture data**

Create `packages/executable-stories-formatters/stories/fixtures.ts`:

```ts
import type { TestCaseResult, TestRunResult, StepResult } from "../src/types/test-result";
import type { StoryMeta, StoryStep, DocEntry } from "../src/types/story";

function step(keyword: string, text: string): StoryStep {
  return { keyword: keyword as StoryStep["keyword"], text };
}

function stepResult(index: number, status: "passed" | "failed" | "skipped" = "passed", durationMs = 10): StepResult {
  return { index, status, durationMs };
}

export function passedScenario(overrides: Partial<TestCaseResult> = {}): TestCaseResult {
  const story: StoryMeta = {
    scenario: "User logs in with valid credentials",
    steps: [
      step("Given", "a registered user with email \"alice@example.com\""),
      step("When", "the user submits valid credentials"),
      step("Then", "the user should see the dashboard"),
    ],
    tags: ["auth", "smoke"],
    suitePath: ["Authentication"],
    sourceOrder: 1,
  };
  return {
    id: "passed-001",
    story,
    sourceFile: "src/auth/login.test.ts",
    sourceLine: 15,
    status: "passed",
    durationMs: 142,
    attachments: [],
    stepResults: [stepResult(0), stepResult(1), stepResult(2)],
    titlePath: ["Authentication"],
    retry: 0,
    retries: 0,
    tags: ["auth", "smoke"],
    ...overrides,
  };
}

export function failedScenario(overrides: Partial<TestCaseResult> = {}): TestCaseResult {
  const story: StoryMeta = {
    scenario: "User sees error for invalid password",
    steps: [
      step("Given", "a registered user"),
      step("When", "the user submits an invalid password"),
      step("Then", "the user should see an error message"),
    ],
    tags: ["auth"],
    suitePath: ["Authentication"],
    sourceOrder: 2,
  };
  return {
    id: "failed-001",
    story,
    sourceFile: "src/auth/login.test.ts",
    sourceLine: 35,
    status: "failed",
    durationMs: 87,
    errorMessage: 'Expected "Welcome back" to include "Invalid credentials"',
    errorStack: 'AssertionError: Expected "Welcome back" to include "Invalid credentials"\n    at src/auth/login.test.ts:42:5',
    attachments: [],
    stepResults: [stepResult(0), stepResult(1), stepResult(2, "failed")],
    titlePath: ["Authentication"],
    retry: 0,
    retries: 0,
    tags: ["auth"],
    ...overrides,
  };
}

export function skippedScenario(overrides: Partial<TestCaseResult> = {}): TestCaseResult {
  const story: StoryMeta = {
    scenario: "User resets password via email",
    steps: [
      step("Given", "a registered user"),
      step("When", "the user requests a password reset"),
      step("Then", "a reset email should be sent"),
    ],
    tags: ["auth", "wip"],
    suitePath: ["Authentication"],
    sourceOrder: 3,
  };
  return {
    id: "skipped-001",
    story,
    sourceFile: "src/auth/password.test.ts",
    sourceLine: 10,
    status: "skipped",
    durationMs: 0,
    attachments: [],
    stepResults: [],
    titlePath: ["Authentication"],
    retry: 0,
    retries: 0,
    tags: ["auth", "wip"],
    ...overrides,
  };
}

export function scenarioWithDocs(overrides: Partial<TestCaseResult> = {}): TestCaseResult {
  const docs: DocEntry[] = [
    { kind: "note", phase: "static", text: "This test verifies the calculator API" },
    { kind: "code", phase: "runtime", lang: "typescript", content: "const result = add(2, 3);\nexpect(result).toBe(5);", label: "Implementation" },
    { kind: "kv", phase: "runtime", label: "Environment", value: "production" },
    { kind: "table", phase: "static", label: "Test Matrix", columns: ["Input A", "Input B", "Expected"], rows: [["1", "2", "3"], ["10", "20", "30"], ["-1", "1", "0"]] },
    { kind: "link", phase: "static", label: "API Docs", url: "https://example.com/docs/calculator" },
    { kind: "json", phase: "runtime", label: "Response", value: { status: 200, body: { result: 5 } } },
  ];
  const story: StoryMeta = {
    scenario: "Calculator adds two numbers",
    steps: [
      step("Given", "the calculator is initialized"),
      step("When", 'the user enters "2 + 3"'),
      step("Then", "the result should be 5"),
    ],
    tags: ["calculator", "math"],
    docs,
    suitePath: ["Calculator"],
    sourceOrder: 1,
  };
  return {
    id: "docs-001",
    story,
    sourceFile: "src/calc/add.test.ts",
    sourceLine: 8,
    status: "passed",
    durationMs: 23,
    attachments: [],
    stepResults: [stepResult(0), stepResult(1), stepResult(2)],
    titlePath: ["Calculator"],
    retry: 0,
    retries: 0,
    tags: ["calculator", "math"],
    ...overrides,
  };
}

export function createFixtureRun(testCases?: TestCaseResult[]): TestRunResult {
  const cases = testCases ?? [passedScenario(), failedScenario(), skippedScenario(), scenarioWithDocs()];
  const now = Date.now();
  return {
    testCases: cases,
    startedAtMs: now - 5000,
    finishedAtMs: now,
    durationMs: 5000,
    projectRoot: "/project",
    runId: "fixture-run-001",
    packageVersion: "0.7.4",
    gitSha: "abc123def456",
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/executable-stories-formatters/stories/fixtures.ts
git commit -m "feat(storybook): add shared fixture data for stories"
```

---

### Task 20: Doc Entry Stories

**Files:**
- Create: `stories/doc-entries/Code.stories.ts`
- Create: `stories/doc-entries/Table.stories.ts`
- Create: `stories/doc-entries/Note.stories.ts`

- [ ] **Step 1: Create Code.stories.ts**

Create `packages/executable-stories-formatters/stories/doc-entries/Code.stories.ts`:

```ts
import { renderDocCode } from "../../src/formatters/html/renderers/doc-entries";
import { escapeHtml } from "../../src/formatters/html/template";
import type { Meta, StoryObj } from "@storybook/html";

const deps = {
  escapeHtml,
  syntaxHighlighting: true,
  markdownEnabled: false,
  mermaidEnabled: false,
};

const meta: Meta = {
  title: "Doc Entries/Code",
};
export default meta;

export const TypeScript: StoryObj = {
  render: () =>
    renderDocCode(
      { kind: "code", phase: "runtime", lang: "typescript", content: 'const greeting = "hello";\nconsole.log(greeting);', label: "TypeScript Example" },
      deps,
    ),
};

export const SQL: StoryObj = {
  render: () =>
    renderDocCode(
      { kind: "code", phase: "runtime", lang: "sql", content: "SELECT u.name, u.email\nFROM users u\nWHERE u.active = true\nORDER BY u.created_at DESC\nLIMIT 10;", label: "Active Users Query" },
      deps,
    ),
};

export const JSON: StoryObj = {
  name: "JSON",
  render: () =>
    renderDocCode(
      { kind: "code", phase: "runtime", lang: "json", content: '{\n  "name": "executable-stories",\n  "version": "0.7.4",\n  "type": "module"\n}', label: "Package Config" },
      deps,
    ),
};

export const NoLanguage: StoryObj = {
  render: () =>
    renderDocCode(
      { kind: "code", phase: "runtime", content: "some plain text output\nwith multiple lines" },
      deps,
    ),
};
```

- [ ] **Step 2: Create Table.stories.ts**

Create `packages/executable-stories-formatters/stories/doc-entries/Table.stories.ts`:

```ts
import { renderDocTable } from "../../src/formatters/html/renderers/doc-entries";
import { escapeHtml } from "../../src/formatters/html/template";
import type { Meta, StoryObj } from "@storybook/html";

const deps = {
  escapeHtml,
  syntaxHighlighting: false,
  markdownEnabled: false,
  mermaidEnabled: false,
};

const meta: Meta = {
  title: "Doc Entries/Table",
};
export default meta;

export const SmallTable: StoryObj = {
  render: () =>
    renderDocTable(
      { kind: "table", phase: "static", label: "Test Matrix", columns: ["Input", "Expected"], rows: [["1 + 2", "3"], ["10 + 20", "30"]] },
      deps,
    ),
};

export const LargeTable: StoryObj = {
  render: () =>
    renderDocTable(
      {
        kind: "table",
        phase: "static",
        label: "User Permissions",
        columns: ["Role", "Read", "Write", "Delete", "Admin"],
        rows: [
          ["Viewer", "Yes", "No", "No", "No"],
          ["Editor", "Yes", "Yes", "No", "No"],
          ["Moderator", "Yes", "Yes", "Yes", "No"],
          ["Admin", "Yes", "Yes", "Yes", "Yes"],
        ],
      },
      deps,
    ),
};
```

- [ ] **Step 3: Create Note.stories.ts**

Create `packages/executable-stories-formatters/stories/doc-entries/Note.stories.ts`:

```ts
import { renderDocNote } from "../../src/formatters/html/renderers/doc-entries";
import { escapeHtml } from "../../src/formatters/html/template";
import type { Meta, StoryObj } from "@storybook/html";

const deps = {
  escapeHtml,
  syntaxHighlighting: false,
  markdownEnabled: false,
  mermaidEnabled: false,
};

const meta: Meta = {
  title: "Doc Entries/Note",
};
export default meta;

export const ShortNote: StoryObj = {
  render: () =>
    renderDocNote({ kind: "note", phase: "static", text: "This test verifies login functionality." }, deps),
};

export const LongNote: StoryObj = {
  render: () =>
    renderDocNote(
      { kind: "note", phase: "static", text: "This is a longer note that explains the business context behind this test scenario. The authentication system was redesigned in Q3 to support multi-factor authentication, and these tests validate the backward compatibility of the original email/password flow." },
      deps,
    ),
};
```

- [ ] **Step 4: Commit**

```bash
git add packages/executable-stories-formatters/stories/doc-entries/
git commit -m "feat(storybook): add doc entry stories for Code, Table, and Note"
```

---

### Task 21: Scenario Stories

**Files:**
- Create: `stories/scenarios/Passed.stories.ts`
- Create: `stories/scenarios/Failed.stories.ts`

- [ ] **Step 1: Create Passed.stories.ts**

Create `packages/executable-stories-formatters/stories/scenarios/Passed.stories.ts`:

```ts
import { renderScenario } from "../../src/formatters/html/renderers/scenario";
import { escapeHtml } from "../../src/formatters/html/template";
import { getStatusIcon } from "../../src/formatters/html/renderers/status";
import { renderSteps, renderStep } from "../../src/formatters/html/renderers/steps";
import { renderDocEntry } from "../../src/formatters/html/renderers/doc-entries";
import { renderErrorBox } from "../../src/formatters/html/renderers/error-box";
import { renderAttachments } from "../../src/formatters/html/renderers/attachments";
import { renderTraceView } from "../../src/formatters/html/renderers/trace-view";
import { highlightStepParams } from "../../src/formatters/html/renderers/step-params";
import { passedScenario, scenarioWithDocs } from "../fixtures";
import type { Meta, StoryObj } from "@storybook/html";
import type { DocEntry } from "../../src/types/story";

const docEntryDeps = {
  escapeHtml,
  syntaxHighlighting: false,
  markdownEnabled: false,
  mermaidEnabled: false,
};

const renderDocs = (docs: DocEntry[] | undefined, containerClass: string): string => {
  if (!docs || docs.length === 0) return "";
  return `<div class="${containerClass}">${docs.map((e) => renderDocEntry(e, docEntryDeps)).join("")}</div>`;
};

const stepsDeps = {
  escapeHtml,
  getStatusIcon,
  renderDocs,
  highlightStepParams: (text: string) => highlightStepParams(text, { escapeHtml }),
};

const deps = {
  escapeHtml,
  getStatusIcon,
  startCollapsed: false,
  renderSteps: (args: any) => renderSteps(args, stepsDeps),
  renderDocs,
  renderErrorBox: (args: any, d: any) => renderErrorBox(args, d),
  renderAttachments: (args: any, d: any) => renderAttachments(args, d),
  renderTraceView: (args: any, d: any) => renderTraceView(args, d),
  embedScreenshots: true,
};

const meta: Meta = {
  title: "Scenarios/Passed",
};
export default meta;

export const Simple: StoryObj = {
  render: () => renderScenario({ tc: passedScenario() }, deps),
};

export const WithDocumentation: StoryObj = {
  render: () => renderScenario({ tc: scenarioWithDocs() }, deps),
};

export const Collapsed: StoryObj = {
  render: () => renderScenario({ tc: passedScenario() }, { ...deps, startCollapsed: true }),
};
```

- [ ] **Step 2: Create Failed.stories.ts**

Create `packages/executable-stories-formatters/stories/scenarios/Failed.stories.ts`:

```ts
import { renderScenario } from "../../src/formatters/html/renderers/scenario";
import { escapeHtml } from "../../src/formatters/html/template";
import { getStatusIcon } from "../../src/formatters/html/renderers/status";
import { renderSteps } from "../../src/formatters/html/renderers/steps";
import { renderDocEntry } from "../../src/formatters/html/renderers/doc-entries";
import { renderErrorBox } from "../../src/formatters/html/renderers/error-box";
import { renderAttachments } from "../../src/formatters/html/renderers/attachments";
import { renderTraceView } from "../../src/formatters/html/renderers/trace-view";
import { highlightStepParams } from "../../src/formatters/html/renderers/step-params";
import { failedScenario } from "../fixtures";
import type { Meta, StoryObj } from "@storybook/html";
import type { DocEntry } from "../../src/types/story";

const docEntryDeps = {
  escapeHtml,
  syntaxHighlighting: false,
  markdownEnabled: false,
  mermaidEnabled: false,
};

const renderDocs = (docs: DocEntry[] | undefined, containerClass: string): string => {
  if (!docs || docs.length === 0) return "";
  return `<div class="${containerClass}">${docs.map((e) => renderDocEntry(e, docEntryDeps)).join("")}</div>`;
};

const stepsDeps = {
  escapeHtml,
  getStatusIcon,
  renderDocs,
  highlightStepParams: (text: string) => highlightStepParams(text, { escapeHtml }),
};

const deps = {
  escapeHtml,
  getStatusIcon,
  startCollapsed: false,
  renderSteps: (args: any) => renderSteps(args, stepsDeps),
  renderDocs,
  renderErrorBox: (args: any, d: any) => renderErrorBox(args, d),
  renderAttachments: (args: any, d: any) => renderAttachments(args, d),
  renderTraceView: (args: any, d: any) => renderTraceView(args, d),
  embedScreenshots: true,
};

const meta: Meta = {
  title: "Scenarios/Failed",
};
export default meta;

export const WithError: StoryObj = {
  render: () => renderScenario({ tc: failedScenario() }, deps),
};
```

- [ ] **Step 3: Commit**

```bash
git add packages/executable-stories-formatters/stories/scenarios/
git commit -m "feat(storybook): add scenario stories for passed and failed states"
```

---

### Task 22: Layout and Theme Stories

**Files:**
- Create: `stories/layout/Summary.stories.ts`
- Create: `stories/themes/ThemeShowcase.stories.ts`

- [ ] **Step 1: Create Summary.stories.ts**

Create `packages/executable-stories-formatters/stories/layout/Summary.stories.ts`:

```ts
import { renderSummary } from "../../src/formatters/html/renderers/summary";
import type { Meta, StoryObj } from "@storybook/html";

const meta: Meta = {
  title: "Layout/Summary",
};
export default meta;

export const AllPassed: StoryObj = {
  render: () => renderSummary({ total: 25, passed: 25, failed: 0, skipped: 0 }, {}),
};

export const Mixed: StoryObj = {
  render: () => renderSummary({ total: 25, passed: 18, failed: 4, skipped: 3 }, {}),
};

export const AllFailed: StoryObj = {
  render: () => renderSummary({ total: 10, passed: 0, failed: 10, skipped: 0 }, {}),
};
```

- [ ] **Step 2: Create ThemeShowcase.stories.ts**

Create `packages/executable-stories-formatters/stories/themes/ThemeShowcase.stories.ts`:

```ts
import { createHtmlFormatter } from "../../src/formatters/html/renderers/index";
import { getAvailableThemes } from "../../src/formatters/html/themes/index";
import { createFixtureRun } from "../fixtures";
import type { Meta, StoryObj } from "@storybook/html";

const meta: Meta = {
  title: "Themes/Showcase",
};
export default meta;

function renderFullReport(theme: string): string {
  const formatter = createHtmlFormatter({ theme, title: `${theme} Theme` });
  const run = createFixtureRun();
  return formatter.format(run);
}

// Generate a story for each theme
const themes = getAvailableThemes();

export const Default: StoryObj = {
  render: () => {
    const iframe = document.createElement("iframe");
    iframe.srcdoc = renderFullReport("default");
    iframe.style.cssText = "width: 100%; height: 800px; border: 1px solid #e5e7eb; border-radius: 8px;";
    return iframe;
  },
};

export const Corporate: StoryObj = {
  render: () => {
    const iframe = document.createElement("iframe");
    iframe.srcdoc = renderFullReport("corporate");
    iframe.style.cssText = "width: 100%; height: 800px; border: 1px solid #e5e7eb; border-radius: 8px;";
    return iframe;
  },
};

export const Terminal: StoryObj = {
  render: () => {
    const iframe = document.createElement("iframe");
    iframe.srcdoc = renderFullReport("terminal");
    iframe.style.cssText = "width: 100%; height: 800px; border: 1px solid #e5e7eb; border-radius: 8px;";
    return iframe;
  },
};

export const Minimal: StoryObj = {
  render: () => {
    const iframe = document.createElement("iframe");
    iframe.srcdoc = renderFullReport("minimal");
    iframe.style.cssText = "width: 100%; height: 800px; border: 1px solid #e5e7eb; border-radius: 8px;";
    return iframe;
  },
};

export const Playful: StoryObj = {
  render: () => {
    const iframe = document.createElement("iframe");
    iframe.srcdoc = renderFullReport("playful");
    iframe.style.cssText = "width: 100%; height: 800px; border: 1px solid #e5e7eb; border-radius: 8px;";
    return iframe;
  },
};

export const Dashboard: StoryObj = {
  render: () => {
    const iframe = document.createElement("iframe");
    iframe.srcdoc = renderFullReport("dashboard");
    iframe.style.cssText = "width: 100%; height: 800px; border: 1px solid #e5e7eb; border-radius: 8px;";
    return iframe;
  },
};
```

- [ ] **Step 3: Commit**

```bash
git add packages/executable-stories-formatters/stories/layout/ packages/executable-stories-formatters/stories/themes/
git commit -m "feat(storybook): add layout and theme showcase stories"
```

---

### Task 23: Verify Storybook Runs

- [ ] **Step 1: Install dependencies**

Run: `cd /Users/jreehal/dev/js/executable-stories && pnpm install`

- [ ] **Step 2: Build the package first**

Run: `cd packages/executable-stories-formatters && pnpm build`

- [ ] **Step 3: Start Storybook and verify it loads**

Run: `cd packages/executable-stories-formatters && npx storybook dev -p 6006 --no-open`
Expected: Storybook starts on port 6006 without errors.

- [ ] **Step 4: Open in browser and verify stories render**

Open `http://localhost:6006` and check:
- Doc entry stories render with correct CSS
- Scenario stories show steps and error boxes
- Theme showcase shows each theme in iframes
- Theme toolbar control switches CSS between themes
- Color mode toolbar control switches light/dark

- [ ] **Step 5: Stop Storybook and commit any fixes**

```bash
git add -A
git commit -m "fix(storybook): address any rendering issues"
```

---

### Task 24: Quality gate for PR 4

- [ ] **Step 1: Run pnpm quality**

Run: `cd /Users/jreehal/dev/js/executable-stories && pnpm quality`
Expected: All pass. Storybook files are dev-only and won't affect the build.

- [ ] **Step 2: Fix any issues and commit**
