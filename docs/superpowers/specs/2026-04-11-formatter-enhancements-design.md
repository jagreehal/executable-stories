# HTML Formatter Enhancements

Six high-value DX improvements to the HTML report output from `executable-stories-formatters`. Each enhancement targets a specific gap in the current report experience that users encounter daily.

## Context

The HTML formatter already provides dark/light mode, search, tag/status filtering, collapsible sections, 6 built-in themes, syntax highlighting, Mermaid diagrams, Markdown rendering, OTel trace views, URL state sync, and history metric badges. It is mature.

These enhancements focus on navigation, shareability, keyboard-driven workflows, and developer tooling for iterating on the report itself.

## Enhancement 1: Permalink Anchors with Copy-to-Clipboard

### Problem

The report generates `id="scenario-{tc.id}"` on each scenario div and links to them from the failure summary. But users cannot copy a deep link to a specific feature or scenario. When sharing reports in Slack or PR comments, they link to the whole page.

### Design

Add a visible `#` anchor icon to every feature header and scenario header. The icon appears on hover. Clicking it copies the full URL (including fragment) to the clipboard and shows a brief "Copied!" toast.

**Feature anchors:** Add `id="feature-{slug}"` to feature divs. The slug is derived from the file path: replace `/`, `.`, and spaces with hyphens, lowercase, strip leading/trailing hyphens (e.g., `src/calculator.story.test.ts` becomes `feature-src-calculator-story-test-ts`). Feature divs currently lack an `id`.

**Scenario anchors:** Already have `id="scenario-{tc.id}"`. Just add the visible icon.

**Smooth scroll on load:** If `location.hash` matches a feature or scenario anchor, scroll to it smoothly and briefly highlight it with a pulse animation.

### Files changed

| File | Change |
|------|--------|
| `renderers/feature.ts` | Add `id` attribute to feature div. Add anchor icon in feature header. |
| `renderers/scenario.ts` | Add anchor icon in scenario header (next to duration). |
| `template.ts` (`JS_CORE`) | Add `copyPermalink(anchorId)` and `showCopyToast(el)` functions. Add hash-scroll on `DOMContentLoaded`. |
| `styles.ts` | Add `.permalink-anchor` (hidden by default, visible on hover), `.copy-toast` (fade animation), `.hash-highlight` (pulse). |

### New CSS classes

- `.permalink-anchor` — positioned inline in header, `opacity: 0` by default, `opacity: 1` on parent `:hover`
- `.copy-toast` — absolute-positioned inline tooltip, `fadeOut` animation after 1.5s
- `.hash-highlight` — subtle background pulse on the target element when navigated via hash

### New JS

```js
function copyPermalink(anchorId) {
  const url = location.origin + location.pathname + location.search + '#' + anchorId;
  navigator.clipboard.writeText(url).then(() => {
    const el = document.getElementById(anchorId);
    showCopyToast(el);
  });
}

function showCopyToast(el) {
  // Create toast, position near element, auto-remove after 1.5s
}
```

### Scroll-on-load

```js
// In DOMContentLoaded handler
if (location.hash) {
  const target = document.querySelector(location.hash);
  if (target) {
    // Expand parent feature if collapsed
    const feature = target.closest('.feature');
    if (feature?.classList.contains('collapsed')) {
      feature.classList.remove('collapsed');
    }
    // Expand scenario if collapsed
    if (target.classList.contains('collapsed')) {
      target.classList.remove('collapsed');
    }
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    target.classList.add('hash-highlight');
  }
}
```

---

## Enhancement 2: Table of Contents Sidebar

### Problem

Reports with more than ~10 scenarios lack spatial navigation. Search helps find a known scenario, but users cannot scan the full structure at a glance. They scroll and expand features manually.

### Design

A collapsible left sidebar containing a nested tree of features and scenarios. Each scenario shows its status icon. Failed scenarios have a red left border for visibility. The active section highlights on scroll.

### Layout

```
+------------------+--------------------------------------------+
| TOC Sidebar      | Main Content                               |
| (260px, fixed)   | (.container, scrollable)                   |
|                  |                                            |
| > Feature A      |  Header + Search + Actions                 |
|   ✓ Scenario 1   |  Meta Info                                 |
|   ✗ Scenario 2   |  Summary Cards                             |
|   ✓ Scenario 3   |  Tag Bar                                   |
| > Feature B      |  Failure Summary                           |
|   ✓ Scenario 4   |  Features + Scenarios                      |
|   ○ Scenario 5   |                                            |
+------------------+--------------------------------------------+
```

### Behavior

- **Toggle:** Button in header (hamburger icon) shows/hides the sidebar. State persisted to localStorage.
- **Active tracking:** `IntersectionObserver` watches feature and scenario elements. The TOC highlights whichever is currently in view.
- **Click navigation:** Clicking a TOC entry scrolls to the target, expanding its parent feature if collapsed.
- **Collapsible subtrees:** Feature entries in the TOC can be expanded/collapsed independently.
- **Filtering sync:** When search or tag/status filters hide scenarios, the TOC hides them too. The TOC reflects the filtered view.
- **Mobile (<768px):** Hidden by default. Opens as a slide-in overlay from the left edge. Tap outside to close.
- **Desktop:** Persistent sidebar. Main content uses CSS grid: `grid-template-columns: 260px 1fr` when visible, `1fr` when hidden.

### Files changed

| File | Change |
|------|--------|
| `renderers/toc.ts` (new) | `renderToc(run)` builds the sidebar HTML from `TestRunResult`. |
| `renderers/body.ts` | Call `renderToc()` before other content. |
| `renderers/index.ts` | Wire `renderToc` into dependency graph. |
| `template.ts` | Add TOC toggle button in header. Add `initToc()` in JS_CORE (IntersectionObserver, click handlers, localStorage). Wrap container in grid layout div. |
| `styles.ts` | Add `.toc-sidebar`, `.toc-feature`, `.toc-scenario`, `.toc-active`, responsive rules, overlay for mobile. |
| `index.ts` | Add `tocEnabled` option. |

### New option

```ts
interface HtmlFormatterOptions {
  // ... existing
  /** Show table of contents sidebar. Default: true */
  tocEnabled?: boolean;
}
```

CLI flag: `--html-no-toc`

### TOC HTML structure

```html
<nav class="toc-sidebar" aria-label="Table of contents">
  <div class="toc-header">
    <span class="toc-title">Contents</span>
  </div>
  <div class="toc-body">
    <div class="toc-feature">
      <button class="toc-feature-toggle" aria-expanded="true">
        Feature Name
      </button>
      <div class="toc-scenarios">
        <a class="toc-scenario" href="#scenario-abc">
          <span class="toc-status status-passed">✓</span>
          Scenario name
        </a>
        <a class="toc-scenario toc-failed" href="#scenario-def">
          <span class="toc-status status-failed">✗</span>
          Failed scenario
        </a>
      </div>
    </div>
  </div>
</nav>
```

---

## Enhancement 3: Keyboard Navigation

### Problem

Power users reviewing reports daily cannot navigate without a mouse. The only keyboard shortcut is `/` to focus search.

### Design

Add vim-style navigation and a shortcuts overlay.

### Keybindings

| Key | Action |
|-----|--------|
| `j` | Focus next visible scenario |
| `k` | Focus previous visible scenario |
| `Enter` | Expand/collapse focused scenario |
| `Escape` | Collapse focused scenario, or clear search if search is focused |
| `?` | Toggle keyboard shortcuts overlay |
| `/` | Focus search (already exists) |
| `e` | Expand all visible |
| `c` | Collapse all visible |
| `t` | Toggle TOC sidebar |

### Focus tracking

Track `focusedScenarioIndex` as an integer index into the list of currently visible (not `display: none`) `.scenario` elements. The focused scenario gets a `.scenario-focused` CSS class that adds a 2px accent-colored left border.

`j` increments the index; `k` decrements. Both wrap around. After updating the index, call `scrollIntoView({ block: 'nearest', behavior: 'smooth' })` on the target.

All shortcuts are suppressed when an `<input>`, `<select>`, or `<textarea>` has focus.

### Shortcuts overlay

A modal overlay triggered by `?`. Lists all keybindings in a two-column grid. Dismissed by `Escape` or clicking outside. Rendered as a `<div class="shortcuts-overlay">` appended to body, with `position: fixed; inset: 0` backdrop.

### Files changed

| File | Change |
|------|--------|
| `template.ts` (`JS_CORE`) | Replace `initKeyboardShortcuts()` with expanded version. Add `focusScenario(index)`, `showShortcutsOverlay()`, `hideShortcutsOverlay()`. |
| `styles.ts` | Add `.scenario-focused`, `.shortcuts-overlay`, `.shortcuts-grid`. |

---

## Enhancement 4: Copy Scenario as Markdown

### Problem

When a test fails and a developer files a ticket or comments on a PR, they manually retype the scenario steps. The report already displays the data; it should let users grab it.

### Design

A copy button on each scenario header (next to the duration). Clicking it extracts the scenario title, steps (keyword + text), and error message (if failed), formats them as Markdown, and copies to the clipboard.

### Output format

```markdown
### Scenario: Login with valid credentials

- **Given** a registered user
- **When** the user submits valid credentials
- **Then** the user should see the dashboard
```

If the scenario failed:

```markdown
### Scenario: Login with invalid password

- **Given** a registered user
- **When** the user submits an invalid password
- **Then** the user should see an error message

> **Error:** Expected "Welcome" to include "Invalid credentials"
```

### Data extraction

Add `data-keyword` and `data-text` attributes to step elements in `renderers/steps.ts`. The JS reads these attributes rather than parsing rendered HTML with regex.

### Files changed

| File | Change |
|------|--------|
| `renderers/scenario.ts` | Add copy button in scenario header. |
| `renderers/steps.ts` | Add `data-keyword` and `data-text` attributes to step divs. |
| `template.ts` (`JS_CORE`) | Add `copyScenarioAsMarkdown(scenarioId)` function. |
| `styles.ts` | Add `.copy-scenario-btn` (hidden by default, visible on scenario header hover). Reuses `.copy-toast` from Enhancement 1. |

---

## Enhancement 5: Storybook

### Problem

Iterating on HTML report styling requires generating a full report from test data, opening the file, and visually inspecting it. There is no way to view individual components in isolation, compare themes side by side, or test edge cases (empty states, long names, many tags).

### Design

Add Storybook using `@storybook/html` to the formatters package. Each renderer function becomes a story. Storybook is dev-only tooling, not shipped in the npm package.

### Structure

```
packages/executable-stories-formatters/
  .storybook/
    main.ts              # Framework: @storybook/html, autodocs
    preview.ts           # Global decorators: inject theme CSS, wrap in container
  stories/
    fixtures.ts          # Shared realistic TestRunResult data using faker
    themes/
      ThemeShowcase.stories.ts     # Each theme rendered with same data
      ThemeComparison.stories.ts   # Side-by-side grid of all themes
    doc-entries/
      Code.stories.ts              # Code blocks: JS, SQL, JSON, Python, no lang
      Table.stories.ts             # Small, large, empty tables
      Mermaid.stories.ts           # Flowchart, sequence, class diagrams
      Section.stories.ts           # Markdown with headings, lists, code
      Screenshot.stories.ts        # Embedded and linked screenshots
      KV.stories.ts                # Key-value pairs
      Note.stories.ts              # Plain text notes
      Link.stories.ts              # External links
      Custom.stories.ts            # Custom doc entries
    scenarios/
      Passed.stories.ts            # Passed scenarios with various doc types
      Failed.stories.ts            # Failed with error box and stack trace
      Skipped.stories.ts           # Skipped and pending states
      WithTraces.stories.ts        # OTel trace waterfall
      WithMetrics.stories.ts       # Stability grades, flakiness badges
    layout/
      Summary.stories.ts           # Summary cards: all passed, mixed, all failed
      TagBar.stories.ts            # Few tags, many tags, long tag names
      FeatureGroup.stories.ts      # Collapsed, expanded, mixed statuses
      FailureSummary.stories.ts    # Failure quick links
      TOC.stories.ts               # Table of contents sidebar
    interactions/
      Search.stories.ts            # Search filtering behavior
      KeyboardNav.stories.ts       # Keyboard navigation
      Anchors.stories.ts           # Permalink anchors and copy
      CopyMarkdown.stories.ts      # Copy scenario as markdown
```

### Story pattern

Each story calls the renderer function directly and returns the HTML string:

```ts
import { renderDocCode } from '../src/formatters/html/renderers/doc-entries';
import { escapeHtml } from '../src/formatters/html/template';
import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Doc Entries/Code',
};
export default meta;

export const JavaScript: StoryObj = {
  render: () => renderDocCode(
    { kind: 'code', label: 'Example', content: 'const x = 1;', lang: 'javascript' },
    { escapeHtml, syntaxHighlighting: true, markdownEnabled: false, mermaidEnabled: false }
  ),
};
```

### Theme switching

A Storybook toolbar addon (via `globalTypes` in `preview.ts`) lets the viewer select any of the 6 themes. The decorator injects the selected theme's CSS into a `<style>` tag wrapping the story.

A second toolbar control toggles light/dark mode by setting `data-theme` on the story's root element.

### Package.json changes

```json
{
  "scripts": {
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build"
  },
  "devDependencies": {
    "@storybook/html": "^8.x",
    "@storybook/addon-essentials": "^8.x",
    "storybook": "^8.x"
  }
}
```

### Not shipped

Add to `.npmignore` or exclude from `files` in `package.json` (already handled -- `files` only includes `dist`, `skills`, `schemas`, `bin`).

---

## Enhancement 6: In-Report Theme Picker

### Problem

The theme is baked into the HTML at generation time. To compare themes, users must regenerate the report with `--theme corporate`, open it, then regenerate with `--theme terminal`, open that. Internal teams who share reports cannot let readers pick their preferred theme.

### Design

An optional dropdown in the header that lets users switch themes client-side. All theme CSS blocks are embedded in the HTML, with only the active one enabled.

### How CSS swapping works

Each theme's CSS is embedded as a separate `<style>` block:

```html
<style data-theme-name="default">/* default CSS */</style>
<style data-theme-name="corporate" disabled>/* corporate CSS */</style>
<style data-theme-name="terminal" disabled>/* terminal CSS */</style>
<!-- etc -->
```

On theme change:
1. Disable all `<style data-theme-name>` elements
2. Enable the selected one
3. Persist selection to localStorage

### Scope limitation

Themes that override `buildBody` or `generateTemplate` (like `dashboard` with its custom layout) cannot be swapped client-side because the HTML structure differs. The theme picker only includes CSS-only themes.

At generation time, the formatter checks which themes are CSS-only (no `buildBody` or `generateTemplate` overrides) and embeds only those. The picker dropdown lists only swappable themes.

### UI

A `<select class="theme-picker">` in `.header-actions`, between the detail toggle and the dark/light toggle. Styled to match the existing button aesthetic. Hidden when `themePickerEnabled` is false.

### New option

```ts
interface HtmlFormatterOptions {
  // ... existing
  /** Include theme picker with all CSS-only themes embedded. Default: false.
   *  Increases file size by ~30-50KB. */
  themePickerEnabled?: boolean;
}
```

CLI flag: `--html-theme-picker`

Default is `false` because it increases file size. Users opt in when they want it.

### Files changed

| File | Change |
|------|--------|
| `renderers/index.ts` | When `themePickerEnabled`, resolve all CSS-only themes and pass to template. |
| `template.ts` | Embed multiple `<style>` blocks. Add theme picker `<select>` in header. Add `initThemePicker()` JS. |
| `styles.ts` | Add `.theme-picker` select styling. |
| `index.ts` | Add `themePickerEnabled` option. |
| `themes/index.ts` | Add `getCssOnlyThemes()` helper that filters out themes with body/template overrides. |

### JS

```js
function initThemePicker() {
  const picker = document.querySelector('.theme-picker');
  if (!picker) return;

  const saved = localStorage.getItem('report-theme');
  if (saved) {
    picker.value = saved;
    switchTheme(saved);
  }

  picker.addEventListener('change', (e) => {
    switchTheme(e.target.value);
    localStorage.setItem('report-theme', e.target.value);
  });
}

function switchTheme(name) {
  document.querySelectorAll('style[data-theme-name]').forEach(s => {
    s.disabled = s.dataset.themeName !== name;
  });
}
```

---

## Implementation order

1. **Permalink anchors** — smallest change, highest shareability impact
2. **Keyboard navigation** — JS-only, no renderer changes
3. **Copy scenario as Markdown** — small addition to scenario renderer + JS
4. **Table of Contents sidebar** — larger change, new renderer + layout shift
5. **In-report theme picker** — requires embedding multiple theme CSS blocks
6. **Storybook** — independent workstream, no report changes

Items 1-3 can ship together as one PR. Item 4 is its own PR. Item 5 is its own PR. Item 6 is independent and can proceed in parallel with any of the above.

## Test strategy

- **Unit tests** for each new renderer function (`renderToc`, `renderPermalinkAnchor`) following existing patterns in `packages/executable-stories-formatters/tests/`
- **Snapshot tests** for HTML output of new elements
- **Integration test** for the theme picker: generate a report with `themePickerEnabled: true`, verify all CSS-only theme `<style>` blocks are present
- **Manual verification** via Storybook stories for each enhancement
- **Existing tests** must continue to pass (260+ tests in formatters package)

## Options summary

| Option | Default | CLI flag |
|--------|---------|----------|
| `tocEnabled` | `true` | `--html-no-toc` |
| `themePickerEnabled` | `false` | `--html-theme-picker` |

All other enhancements (anchors, keyboard nav, copy-as-markdown) are always on. They add minimal weight and have no reason to be optional.
