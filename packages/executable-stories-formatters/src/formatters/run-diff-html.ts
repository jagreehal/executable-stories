import type { RunDiffResult, ScenarioDiff } from "../types/compare";
import type { DocEntry, StoryStep } from "executable-stories-core/types/story";
import { isLocalFsPath, safeImageUrl } from "executable-stories-core";
import { REPORT_THEME_CSS } from "./report-theme-css";

export interface RunDiffHtmlOptions {
  title?: string;
  /** Enable dark mode toggle. Default: true */
  darkMode?: boolean;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function statusLabel(kind: ScenarioDiff["kind"]): string {
  switch (kind) {
    case "regressed":
      return "Regressed";
    case "fixed":
      return "Fixed";
    case "added":
      return "Added";
    case "removed":
      return "Removed";
    case "renamed":
      return "Renamed";
    case "moved":
      return "Moved";
    case "changed":
      return "Changed";
    default:
      return "Unchanged";
  }
}

function formatStep(step: StoryStep): string {
  let content = `<strong>${escapeHtml(step.keyword)}</strong> ${escapeHtml(step.text)}`;
  if (step.mode && step.mode !== "normal") {
    content += ` <span class="field-pill">${escapeHtml(step.mode)}</span>`;
  }
  if (step.docs && step.docs.length > 0) {
    content += `<ul class="doc-list">${step.docs.map((d) => `<li>${formatDocEntry(d)}</li>`).join("")}</ul>`;
  }
  return `<li>${content}</li>`;
}

function formatSteps(steps: StoryStep[]): string {
  if (steps.length === 0) return "&nbsp;";
  return `<ul class="step-list">${steps.map(formatStep).join("")}</ul>`;
}

function formatDocEntry(doc: DocEntry): string {
  switch (doc.kind) {
    case "note":
      return escapeHtml(doc.text);
    case "tag":
      return escapeHtml(doc.names.join(", "));
    case "kv":
      return `${escapeHtml(doc.label)}: ${escapeHtml(typeof doc.value === "object" && doc.value !== null ? JSON.stringify(doc.value) : String(doc.value))}`;
    case "code":
      return `${escapeHtml(doc.label)}${doc.lang ? ` (${escapeHtml(doc.lang)})` : ""}: <code>${escapeHtml(doc.content)}</code>`;
    case "table": {
      const header = `<tr>${doc.columns.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}</tr>`;
      const rows = doc.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("");
      return `${escapeHtml(doc.label)}<table>${header}${rows}</table>`;
    }
    case "link":
      return `${escapeHtml(doc.label)}: ${escapeHtml(doc.url)}`;
    case "section":
      return `${escapeHtml(doc.title)}: ${escapeHtml(doc.markdown)}`;
    case "mermaid":
      return `${escapeHtml(doc.title ?? "mermaid diagram")}: <code>${escapeHtml(doc.code)}</code>`;
    case "screenshot":
      return `${doc.alt ? `${escapeHtml(doc.alt)}: ` : ""}${escapeHtml(doc.path)}`;
    case "video":
      return `${doc.caption ? `${escapeHtml(doc.caption)}: ` : ""}${escapeHtml(doc.path)}`;
    case "html":
      return `${doc.title ? `${escapeHtml(doc.title)}: ` : ""}${escapeHtml(doc.url ?? doc.path ?? "(inline html)")}`;
    case "custom":
      return `${escapeHtml(doc.type)}: ${escapeHtml(JSON.stringify(doc.data))}`;
    case "state":
      return `${escapeHtml(doc.label ?? "State")}: <code>${escapeHtml(JSON.stringify(doc.value) ?? "null")}</code>`;
  }
}

function formatDocs(docs: DocEntry[]): string {
  if (docs.length === 0) return "&nbsp;";
  return `<ul class="doc-list">${docs.map((d) => `<li>${formatDocEntry(d)}</li>`).join("")}</ul>`;
}

/** Depth-first search for the first screenshot doc on a step (covers grouped docs). */
function firstScreenshot(docs: DocEntry[]): { path: string; alt?: string } | undefined {
  for (const doc of docs) {
    if (doc.kind === "screenshot") return doc;
    if (doc.children) {
      const nested = firstScreenshot(doc.children);
      if (nested) return nested;
    }
  }
  return undefined;
}

/**
 * Regression storyboard: for scenarios whose status flipped (regressed/fixed),
 * render the current run's step screenshots as a filmstrip so triage starts
 * from what the product looked like, not a stack trace. Frames come from the
 * same step-attached screenshots the report filmstrip uses; steps without a
 * browser-renderable screenshot contribute no frame.
 */
function renderStoryboardStrip(scenario: ScenarioDiff): string {
  if (scenario.kind !== "regressed" && scenario.kind !== "fixed") return "";
  const steps = (scenario.current ?? scenario.baseline)?.steps ?? [];
  const frames: string[] = [];
  for (const step of steps) {
    const shot = firstScreenshot(step.docs ?? []);
    if (!shot || isLocalFsPath(shot.path)) continue;
    const src = safeImageUrl(shot.path);
    if (!src) continue;
    frames.push(
      `<figure class="storyboard-frame"><img src="${escapeHtml(src)}" alt="${escapeHtml(shot.alt ?? step.text)}" loading="lazy" /><figcaption><strong>${escapeHtml(step.keyword)}</strong> ${escapeHtml(step.text)}</figcaption></figure>`,
    );
  }
  if (frames.length === 0) return "";
  return `<div class="storyboard" aria-label="Storyboard">${frames.join("")}</div>`;
}

function renderScenarioCard(scenario: ScenarioDiff): string {
  const before = scenario.baseline;
  const after = scenario.current;
  const durationDelta = scenario.durationDeltaMs
    ? `${scenario.durationDeltaMs > 0 ? "+" : ""}${scenario.durationDeltaMs}ms`
    : "";

  return `
    <article class="scenario-card" data-kind="${scenario.kind}" data-search="${escapeHtml(
      `${scenario.scenario} ${scenario.sourceFile} ${scenario.changedFields.join(" ")}`
    ).toLowerCase()}">
      <header class="scenario-header">
        <div>
          <span class="kind-badge kind-${scenario.kind}">${statusLabel(scenario.kind)}</span>
          <h3>${escapeHtml(scenario.scenario)}</h3>
          <p class="source">${escapeHtml(`${scenario.sourceFile}:${scenario.sourceLine}`)}</p>
        </div>
        <div class="meta">
          ${
            before && after
              ? `<div class="status-pair"><span>${escapeHtml(before.status)}</span><span>&rarr;</span><span>${escapeHtml(after.status)}</span></div>`
              : before
                ? `<div class="status-pair"><span>${escapeHtml(before.status)}</span><span>&rarr;</span><span>removed</span></div>`
                : `<div class="status-pair"><span>new</span><span>&rarr;</span><span>${escapeHtml(after?.status ?? "")}</span></div>`
          }
          ${durationDelta ? `<div class="duration-delta">${escapeHtml(durationDelta)}</div>` : ""}
        </div>
      </header>
      ${renderStoryboardStrip(scenario)}
      ${
        scenario.changedFields.length > 0
          ? `<div class="field-list">${scenario.changedFields
              .map((field) => `<span class="field-pill">${escapeHtml(field)}</span>`)
              .join("")}</div>`
          : ""
      }
      ${
        before && after
          ? `<div class="comparison-grid">
              <section>
                <h4>Baseline</h4>
                <dl>
                  <dt>Tags</dt>
                  <dd>${escapeHtml(before.tags.join(", ")) || "&nbsp;"}</dd>
                  <dt>Suite</dt>
                  <dd>${escapeHtml(before.titlePath.join(" > ")) || "&nbsp;"}</dd>
                  <dt>Error</dt>
                  <dd>${escapeHtml(before.errorMessage ?? "") || "&nbsp;"}</dd>
                  ${scenario.flags.steps ? `<dt>Steps</dt><dd>${formatSteps(before.steps)}</dd>` : ""}
                  ${scenario.flags.docs ? `<dt>Docs</dt><dd>${formatDocs(before.docs)}</dd>` : ""}
                  ${scenario.flags.tickets ? `<dt>Tickets</dt><dd>${escapeHtml(before.tickets.map(t => t.id).join(", ")) || "&nbsp;"}</dd>` : ""}
                </dl>
              </section>
              <section>
                <h4>Current</h4>
                <dl>
                  <dt>Tags</dt>
                  <dd>${escapeHtml(after.tags.join(", ")) || "&nbsp;"}</dd>
                  <dt>Suite</dt>
                  <dd>${escapeHtml(after.titlePath.join(" > ")) || "&nbsp;"}</dd>
                  <dt>Error</dt>
                  <dd>${escapeHtml(after.errorMessage ?? "") || "&nbsp;"}</dd>
                  ${scenario.flags.steps ? `<dt>Steps</dt><dd>${formatSteps(after.steps)}</dd>` : ""}
                  ${scenario.flags.docs ? `<dt>Docs</dt><dd>${formatDocs(after.docs)}</dd>` : ""}
                  ${scenario.flags.tickets ? `<dt>Tickets</dt><dd>${escapeHtml(after.tickets.map(t => t.id).join(", ")) || "&nbsp;"}</dd>` : ""}
                </dl>
              </section>
            </div>`
          : (() => {
              const snapshot = after ?? before;
              if (!snapshot) return "";
              const hasTags = snapshot.tags.length > 0;
              const hasTickets = snapshot.tickets.length > 0;
              const hasSteps = snapshot.steps.length > 0;
              const hasDocs = snapshot.docs.length > 0;
              if (!hasTags && !hasTickets && !hasSteps && !hasDocs) return "";
              return `<div class="snapshot-detail">
                <dl>
                  ${hasTags ? `<dt>Tags</dt><dd>${escapeHtml(snapshot.tags.join(", "))}</dd>` : ""}
                  ${hasTickets ? `<dt>Tickets</dt><dd>${escapeHtml(snapshot.tickets.map(t => t.id).join(", "))}</dd>` : ""}
                  ${hasSteps ? `<dt>Steps</dt><dd>${formatSteps(snapshot.steps)}</dd>` : ""}
                  ${hasDocs ? `<dt>Docs</dt><dd>${formatDocs(snapshot.docs)}</dd>` : ""}
                </dl>
              </div>`;
            })()
      }
    </article>
  `;
}

/** Diff-specific CSS that references theme custom properties */
const DIFF_CSS = `
      /* Diff layout — uses theme custom properties */
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: var(--font-sans, Georgia, "Iowan Old Style", serif);
        background: var(--background);
        color: var(--foreground);
      }
      main { max-width: 1200px; margin: 0 auto; padding: 32px 20px 80px; }
      .diff-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
      }
      .diff-header-actions {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      .theme-toggle {
        background: var(--secondary);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 8px 12px;
        cursor: pointer;
        font-size: 1.1rem;
        color: var(--foreground);
      }
      .theme-toggle:hover { background: var(--accent); }
      .hero { display: grid; gap: 16px; margin-bottom: 24px; }
      .hero-card, .summary-card, .toolbar, .scenario-card {
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: var(--radius, 18px);
        box-shadow: 0 1px 3px color-mix(in srgb, var(--foreground) 6%, transparent);
      }
      .hero-card { padding: 24px; }
      h1, h2, h3, h4, p { margin: 0; }
      .subtle { color: var(--muted-foreground); margin-top: 8px; }
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 12px;
        margin: 20px 0 24px;
      }
      .priority-banner {
        padding: 18px 20px;
        margin-bottom: 20px;
        background: linear-gradient(135deg, color-mix(in srgb, var(--destructive) 9%, transparent), var(--card));
      }
      .summary-card { padding: 16px; }
      .summary-card strong { display: block; font-size: 1.8rem; }
      .toolbar {
        position: sticky;
        top: 12px;
        z-index: 2;
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        padding: 14px;
        margin-bottom: 20px;
      }
      .toolbar input {
        flex: 1 1 260px;
        border: 1px solid var(--border);
        border-radius: 999px;
        padding: 10px 14px;
        font: inherit;
        background: var(--background);
        color: var(--foreground);
      }
      .toolbar button {
        border: 1px solid var(--border);
        background: var(--secondary);
        border-radius: 999px;
        padding: 10px 14px;
        font: inherit;
        cursor: pointer;
        color: var(--foreground);
      }
      .toolbar button.active { background: var(--foreground); color: var(--background); }
      .scenario-list { display: grid; gap: 14px; }
      .scenario-card { padding: 18px; }
      .scenario-header {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: flex-start;
      }
      .kind-badge, .field-pill {
        display: inline-flex;
        align-items: center;
        padding: 4px 10px;
        border-radius: 999px;
        font-size: 0.85rem;
        margin-right: 8px;
        margin-bottom: 8px;
        background: var(--secondary);
      }
      .kind-regressed { background: color-mix(in srgb, var(--destructive) 15%, transparent); color: var(--destructive); }
      .kind-fixed { background: color-mix(in srgb, var(--success) 15%, transparent); color: var(--success); }
      .kind-added { background: color-mix(in srgb, var(--primary) 15%, transparent); color: var(--primary); }
      .kind-removed { background: color-mix(in srgb, var(--warning) 18%, transparent); color: var(--warning); }
      .kind-changed { background: color-mix(in srgb, var(--ring, var(--primary)) 15%, transparent); color: var(--ring, var(--primary)); }
      .source, .meta, dd { color: var(--muted-foreground); }
      .status-pair { display: flex; gap: 8px; justify-content: flex-end; font-family: var(--font-mono, ui-monospace, monospace); }
      .duration-delta { margin-top: 8px; text-align: right; color: var(--muted-foreground); }
      .field-list { margin-top: 10px; }
      .storyboard {
        display: flex;
        gap: 10px;
        overflow-x: auto;
        margin-top: 14px;
        padding-bottom: 6px;
      }
      .storyboard-frame {
        flex: 0 0 auto;
        width: 220px;
        margin: 0;
        border: 1px solid var(--border);
        border-radius: var(--radius, 10px);
        overflow: hidden;
        background: color-mix(in srgb, var(--card) 60%, var(--background));
      }
      .storyboard-frame img { width: 100%; height: 130px; object-fit: cover; object-position: top; display: block; }
      .storyboard-frame figcaption {
        padding: 6px 10px;
        font-size: 0.8rem;
        color: var(--muted-foreground);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .comparison-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 12px;
        margin-top: 16px;
      }
      .comparison-grid section {
        background: color-mix(in srgb, var(--card) 60%, var(--background));
        border: 1px solid var(--border);
        border-radius: var(--radius, 14px);
        padding: 12px;
      }
      dl {
        margin: 10px 0 0;
        display: grid;
        grid-template-columns: minmax(70px, 90px) 1fr;
        gap: 8px 12px;
      }
      @media (max-width: 720px) {
        .scenario-header { flex-direction: column; }
        .status-pair, .duration-delta { text-align: left; justify-content: flex-start; }
      }
`;

/** Theme toggle JavaScript */
const JS_THEME_TOGGLE = `
function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
function getEffectiveTheme() {
  var saved = localStorage.getItem('diff-theme');
  if (saved === 'dark' || saved === 'light') return saved;
  return getSystemTheme();
}
function toggleTheme() {
  var current = getEffectiveTheme();
  var next = current === 'dark' ? 'light' : 'dark';
  localStorage.setItem('diff-theme', next);
  applyTheme(next);
}
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  var btn = document.querySelector('.theme-toggle');
  if (btn) {
    btn.textContent = theme === 'dark' ? '\\u2600\\ufe0f' : '\\ud83c\\udf19';
    btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }
}
`;

export class RunDiffHtmlFormatter {
  private title: string;
  private darkMode: boolean;

  constructor(options: RunDiffHtmlOptions = {}) {
    this.title = options.title ?? "Run Comparison";
    this.darkMode = options.darkMode ?? true;
  }

  format(diff: RunDiffResult): string {
    const defaultFilter: "all" | "regressed" | "fixed" | "added" | "removed" | "changed" =
      diff.summary.regressed > 0
        ? "regressed"
        : diff.summary.fixed > 0
          ? "fixed"
          : "all";
    const scenarios = diff.scenarios
      .filter((scenario) => scenario.kind !== "unchanged")
      .map((scenario) => renderScenarioCard(scenario))
      .join("\n");

    const themeToggleHtml = this.darkMode
      ? `<div class="diff-header-actions"><button type="button" class="theme-toggle" onclick="toggleTheme()" aria-label="Toggle theme"></button></div>`
      : "";

    const themeInitJs = this.darkMode
      ? `${JS_THEME_TOGGLE}\napplyTheme(getEffectiveTheme());\nwindow.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function() { if (!localStorage.getItem('diff-theme')) applyTheme(getSystemTheme()); });`
      : "";

    const themeAttr = this.darkMode ? ' data-theme="light"' : '';

    return `<!doctype html>
<html lang="en"${themeAttr}>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(this.title)}</title>
    <style>
      ${REPORT_THEME_CSS}
      ${DIFF_CSS}
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <div class="hero-card">
          <div class="diff-header">
            <h1>${escapeHtml(this.title)}</h1>
            ${themeToggleHtml}
          </div>
          <p class="subtle">Baseline ${escapeHtml(new Date(diff.baseline.startedAtMs).toISOString())} against current ${escapeHtml(new Date(diff.current.startedAtMs).toISOString())}</p>
        </div>
      </section>
      <section class="summary-grid">
        <div class="summary-card"><strong>${diff.summary.regressed}</strong><span>Regressed</span></div>
        <div class="summary-card"><strong>${diff.summary.fixed}</strong><span>Fixed</span></div>
        <div class="summary-card"><strong>${diff.summary.added}</strong><span>Added</span></div>
        <div class="summary-card"><strong>${diff.summary.removed}</strong><span>Removed</span></div>
        <div class="summary-card"><strong>${diff.summary.renamed}</strong><span>Renamed</span></div>
        <div class="summary-card"><strong>${diff.summary.moved}</strong><span>Moved</span></div>
        <div class="summary-card"><strong>${diff.summary.changed}</strong><span>Changed</span></div>
        <div class="summary-card"><strong>${diff.summary.unchanged}</strong><span>Unchanged</span></div>
        ${diff.summary.notRun > 0 ? `<div class="summary-card"><strong>${diff.summary.notRun}</strong><span>Not run</span></div>` : ""}
      </section>
      <section class="hero-card priority-banner">
        <h2>Priority Review</h2>
        <p class="subtle">${
          diff.summary.regressed > 0
            ? `${diff.summary.regressed} regression(s) detected. The view is pre-filtered to regressions.`
            : diff.summary.fixed > 0
              ? `No regressions detected. The view is pre-filtered to fixed scenarios.`
              : "No regressions or fixes detected. Review neutral changes as needed."
        }</p>
      </section>
      <section class="toolbar">
        <input type="search" placeholder="Filter by scenario, file, or changed field" aria-label="Filter scenarios" />
        <button type="button" class="${defaultFilter === "all" ? "active" : ""}" data-filter="all">All</button>
        <button type="button" class="${defaultFilter === "regressed" ? "active" : ""}" data-filter="regressed">Regressed</button>
        <button type="button" class="${defaultFilter === "fixed" ? "active" : ""}" data-filter="fixed">Fixed</button>
        <button type="button" data-filter="added">Added</button>
        <button type="button" data-filter="removed">Removed</button>
        <button type="button" data-filter="changed">Changed</button>
      </section>
      <section class="scenario-list">${scenarios || "<div class=\"hero-card\"><p>No scenario changes detected.</p></div>"}</section>
    </main>
    <script>
      ${themeInitJs}
      const input = document.querySelector('input[type="search"]');
      const buttons = Array.from(document.querySelectorAll('[data-filter]'));
      const cards = Array.from(document.querySelectorAll('.scenario-card'));
      let activeFilter = '${defaultFilter}';
      function applyFilters() {
        const query = (input.value || '').trim().toLowerCase();
        cards.forEach((card) => {
          const kind = card.getAttribute('data-kind');
          const haystack = card.getAttribute('data-search') || '';
          const matchesFilter = activeFilter === 'all' || kind === activeFilter;
          const matchesSearch = !query || haystack.includes(query);
          card.style.display = matchesFilter && matchesSearch ? '' : 'none';
        });
      }
      // Filter state lives in the URL fragment so a refresh keeps the view and
      // the link can be shared. The fragment, not the query string: this file is
      // usually opened from disk, where Chrome blocks History API URL changes.
      function writeUrl() {
        const params = new URLSearchParams();
        if (input.value) params.set('q', input.value);
        if (activeFilter !== 'all') params.set('kind', activeFilter);
        const next = params.toString() ? '#?' + params.toString() : '';
        if (next === location.hash) return;
        try {
          history.replaceState(history.state, '', next || location.href.split('#')[0]);
        } catch {
          location.hash = next.slice(1);
        }
      }
      function readUrl() {
        const raw = location.hash.replace(/^#\\??/, '');
        if (!raw) return;
        const params = new URLSearchParams(raw);
        input.value = params.get('q') || '';
        const kind = params.get('kind');
        if (kind && buttons.some((b) => b.getAttribute('data-filter') === kind)) {
          activeFilter = kind;
          buttons.forEach((b) => b.classList.toggle('active', b.getAttribute('data-filter') === kind));
        }
      }
      let writeTimer;
      input.addEventListener('input', () => {
        applyFilters();
        clearTimeout(writeTimer);
        writeTimer = setTimeout(writeUrl, 250);
      });
      buttons.forEach((button) => {
        button.addEventListener('click', () => {
          activeFilter = button.getAttribute('data-filter');
          buttons.forEach((candidate) => candidate.classList.toggle('active', candidate === button));
          applyFilters();
          writeUrl();
        });
      });
      readUrl();
      applyFilters();
    </script>
  </body>
</html>`;
  }
}
