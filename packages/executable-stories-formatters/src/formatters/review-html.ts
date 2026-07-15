/**
 * Review HTML formatter — the audience-segmented deep-dive artifact for an
 * Evidence Review. Standalone themed HTML (mirrors {@link RunDiffHtmlFormatter}):
 * a banded changed-files list (uncovered → weak → covered), then claim cards
 * grouped by audience with graded evidence, intent, inline screenshots, and a
 * filter toolbar. No CDN dependencies required.
 */

import type {
  ChangedFileReview,
  CodeDiffAnnotation,
  CodeDiffEvidence,
  CodeDiffScenarioRef,
  EvidenceStrength,
  ReviewClaim,
  ReviewResult,
} from "../types/review";
import type { DiffHunk, FileDiff } from "../types/diff";
import type { DocEntry, StoryStep } from "executable-stories-core/types/story";
import type { TestCaseResult } from "executable-stories-core/types/test-result";
import { REPORT_THEME_CSS } from "./report-theme-css";

export interface ReviewHtmlOptions {
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

const STRENGTH_LABEL: Record<EvidenceStrength, string> = {
  strong: "Strong",
  moderate: "Moderate",
  weak: "Weak",
  none: "None",
};

function statusIcon(status: ReviewClaim["status"]): string {
  switch (status) {
    case "passed":
      return "✅";
    case "failed":
      return "❌";
    case "skipped":
      return "⊘";
    default:
      return "•";
  }
}

function formatStep(step: StoryStep): string {
  return `<li><strong>${escapeHtml(step.keyword)}</strong> ${escapeHtml(step.text)}</li>`;
}

function inlineDoc(doc: DocEntry): string {
  switch (doc.kind) {
    case "note":
      return escapeHtml(doc.text);
    case "section":
      return `<strong>${escapeHtml(doc.title)}</strong>: ${escapeHtml(doc.markdown)}`;
    case "kv":
      return `${escapeHtml(doc.label)}: ${escapeHtml(String(doc.value))}`;
    case "code":
      return `${escapeHtml(doc.label)}: <code>${escapeHtml(doc.content)}</code>`;
    case "link":
      return `${escapeHtml(doc.label)}: ${escapeHtml(doc.url)}`;
    default:
      return escapeHtml(doc.kind);
  }
}

/** Inline screenshots: embed image attachments, list screenshot-doc paths. */
function renderEvidenceArtifacts(testCase: TestCaseResult): string {
  const parts: string[] = [];
  for (const att of testCase.attachments) {
    if (att.mediaType.startsWith("image/") && att.contentEncoding === "BASE64") {
      parts.push(
        `<img class="shot" alt="${escapeHtml(att.name)}" src="data:${escapeHtml(att.mediaType)};base64,${att.body}" />`
      );
    }
  }
  if ((testCase.story.otelSpans?.length ?? 0) > 0) {
    parts.push(
      `<p class="trace-note">📡 ${testCase.story.otelSpans!.length} OTEL span(s) captured</p>`
    );
  }
  return parts.length > 0 ? `<div class="artifacts">${parts.join("")}</div>` : "";
}

function renderTicketPills(claim: ReviewClaim): string {
  const tickets = claim.testCase.story.tickets ?? [];
  if (tickets.length === 0) return "";
  return `<div class="ticket-row">${tickets
    .map((ticket) => {
      const label = escapeHtml(ticket.id);
      if (ticket.url) {
        return `<a class="ticket-pill" href="${escapeHtml(ticket.url)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
      }
      return `<span class="ticket-pill">${label}</span>`;
    })
    .join("")}</div>`;
}

function renderClaimCard(claim: ReviewClaim): string {
  const ticketSearch = (claim.testCase.story.tickets ?? [])
    .map((ticket) => ticket.id)
    .join(" ");
  const search = escapeHtml(
    `${claim.scenario} ${claim.sourceFile} ${claim.changeType} ${claim.audience} ${claim.strength} ${ticketSearch}`
  ).toLowerCase();

  const steps =
    claim.testCase.story.steps.length > 0
      ? `<ul class="step-list">${claim.testCase.story.steps.map(formatStep).join("")}</ul>`
      : "";

  const reasons = `<ul class="reasons">${claim.strengthReasons
    .map((r) => `<li>${escapeHtml(r)}</li>`)
    .join("")}</ul>`;

  const intent =
    claim.intent !== undefined
      ? `<div class="intent"><span class="intent-label">Why</span> ${escapeHtml(claim.intent)}</div>`
      : "";

  const covers =
    claim.coversFiles.length > 0
      ? `<p class="covers">Covers ${claim.coversFiles
          .map((f) => `<code>${escapeHtml(f)}</code>`)
          .join(", ")}</p>`
      : "";

  const docs = (claim.testCase.story.docs ?? []).filter(
    (d) => d.kind === "section" || d.kind === "note"
  );
  const extraDocs =
    docs.length > 0 && claim.intent === undefined
      ? `<div class="intent">${docs.map(inlineDoc).join("<br>")}</div>`
      : "";

  return `
    <article class="claim-card" id="claim-${escapeHtml(claim.id)}" data-audience="${claim.audience}" data-strength="${claim.strength}" data-search="${search}">
      <header class="claim-header">
        <div>
          <span class="strength-badge strength-${claim.strength}">${STRENGTH_LABEL[claim.strength]}</span>
          ${claim.changeType !== "unknown" ? `<span class="change-pill">${escapeHtml(claim.changeType)}</span>` : ""}
          <h3>${statusIcon(claim.status)} ${escapeHtml(claim.scenario)}</h3>
          <p class="source">${escapeHtml(`${claim.sourceFile}:${claim.sourceLine}`)}</p>
          ${renderTicketPills(claim)}
        </div>
      </header>
      ${intent}${extraDocs}
      <div class="evidence-block">
        <span class="evidence-label">Evidence</span>
        ${reasons}
      </div>
      ${covers}
      ${renderEvidenceArtifacts(claim.testCase)}
      ${steps}
    </article>`;
}

function renderChangedFileRow(file: ChangedFileReview): string {
  const claims =
    file.claims.length > 0
      ? file.claims
          .map((c) => `${escapeHtml(c.scenario)} <em>(${c.strength})</em>`)
          .join(", ")
      : "—";
  return `<tr data-band="${file.band}">
    <td><span class="band-dot band-${file.band}"></span></td>
    <td><code>${escapeHtml(file.path)}</code></td>
    <td>${escapeHtml(file.changeKind)}</td>
    <td>${claims}</td>
  </tr>`;
}

/** Raw patches above this embed as a "too large" notice instead of inline text. */
const MAX_PATCH_EMBED_BYTES = 256 * 1024;

function renderScenarioRef(ref: CodeDiffScenarioRef): string {
  if (!ref.resolved) {
    return `<span class="scenario-ref unverified">⚠️ ${escapeHtml(ref.id)} (unverified reference)</span>`;
  }
  const icon = ref.status === "passed" ? "✅" : ref.status === "failed" ? "❌" : "⊘";
  return `<a class="scenario-ref" href="#claim-${escapeHtml(ref.id)}">${icon} ${escapeHtml(ref.scenario ?? ref.id)}</a>`;
}

/** One hunk as escaped table rows; the anchored changed run gets a highlight class. */
function renderDiffHunk(
  file: FileDiff,
  hunk: DiffHunk,
  anchoredStart?: number,
  anchoredCount?: number
): string {
  let oldLn = hunk.oldStart;
  let newLn = hunk.newStart;
  const rows = hunk.lines.map((line, i) => {
    const anchored =
      anchoredStart !== undefined &&
      anchoredCount !== undefined &&
      i >= anchoredStart &&
      i < anchoredStart + anchoredCount;
    const cls = `diff-${line.kind}${anchored ? " diff-anchored" : ""}`;
    const o = line.kind === "add" ? "" : String(oldLn++);
    const n = line.kind === "del" ? "" : String(newLn++);
    const sign = line.kind === "add" ? "+" : line.kind === "del" ? "-" : " ";
    return `<tr class="${cls}"><td class="diff-ln">${o}</td><td class="diff-ln">${n}</td><td class="diff-sign">${sign}</td><td class="diff-code">${escapeHtml(line.text)}</td></tr>`;
  });
  const path = file.newPath ?? file.oldPath ?? "";
  return `<div class="diff-hunk">
    <div class="diff-file-header"><code>${escapeHtml(path)}</code> <span class="subtle">@@ -${hunk.oldStart} +${hunk.newStart} @@ ${escapeHtml(hunk.header)}</span></div>
    <table class="diff-table"><tbody>${rows.join("")}</tbody></table>
  </div>`;
}

function renderAnnotation(
  evidence: CodeDiffEvidence,
  annotation: CodeDiffAnnotation,
  diffIndex: number,
  index: number
): string {
  const scenarios =
    annotation.scenarios.length > 0
      ? `<div class="scenario-row">${annotation.scenarios.map(renderScenarioRef).join("")}</div>`
      : `<p class="no-scenario">Not covered by a scenario — implementation claim without behavioural evidence.</p>`;

  const res = annotation.resolution;
  let body: string;
  if (res.state === "anchored" && res.fileIndex !== undefined && res.hunkIndex !== undefined) {
    const file = evidence.files[res.fileIndex];
    body = renderDiffHunk(file, file.hunks[res.hunkIndex], res.lineIndex, res.lineCount);
  } else if (res.state === "ambiguous") {
    body = `<p class="anchor-notice">⚠️ Ambiguous anchor — these lines appear in more than one place in the current patch, so the annotation is not attached to any of them.</p>`;
  } else {
    body = `<p class="anchor-notice">⚠️ Orphaned annotation — could not locate these lines in the current patch. The prose below may describe code that has since changed.</p>`;
  }

  return `<article class="annotation" id="code-diff-${diffIndex}-a${index}" data-anchor-state="${res.state}">
    <h4>${escapeHtml(annotation.label ?? `Annotation ${index + 1}`)}</h4>
    <p class="annotation-text">${escapeHtml(annotation.text)}</p>
    ${scenarios}
    ${body}
  </article>`;
}

/** Code Diff evidence: annotations in conceptual order, then the raw patch on demand. */
function renderCodeDiffSection(evidence: CodeDiffEvidence, diffIndex: number): string {
  const comparing =
    evidence.baseLabel || evidence.headLabel
      ? `<p class="subtle">Comparing ${escapeHtml(evidence.baseLabel ?? "base")} → ${escapeHtml(evidence.headLabel ?? "head")}</p>`
      : "";
  // Only https: renders as a link; anything else (javascript:, file:, ...) stays inert text.
  const audit =
    evidence.patchUrl === undefined
      ? ""
      : evidence.patchUrl.startsWith("https://")
        ? `<p class="subtle">Canonical patch: <a href="${escapeHtml(evidence.patchUrl)}" rel="noopener noreferrer">${escapeHtml(evidence.patchUrl)}</a></p>`
        : `<p class="subtle">Canonical patch: <code>${escapeHtml(evidence.patchUrl)}</code></p>`;
  const outline =
    evidence.annotations.length > 1
      ? `<ol class="diff-outline">${evidence.annotations
          .map(
            (a, i) =>
              `<li><a href="#code-diff-${diffIndex}-a${i}">${escapeHtml(a.label ?? `Annotation ${i + 1}`)}</a></li>`
          )
          .join("")}</ol>`
      : "";
  const rawPatch =
    Buffer.byteLength(evidence.patch, "utf8") <= MAX_PATCH_EMBED_BYTES
      ? `<details class="raw-patch"><summary>Raw patch (audit)</summary><pre><code>${escapeHtml(evidence.patch)}</code></pre></details>`
      : `<p class="anchor-notice">Patch too large to embed${evidence.patchUrl ? " — use the canonical patch link above" : ""}.</p>`;

  return `<section class="panel code-diff" id="code-diff-${diffIndex}">
    <h2>Code diff: ${escapeHtml(evidence.title)}</h2>
    ${comparing}
    ${audit}
    ${outline}
    ${evidence.annotations.map((a, i) => renderAnnotation(evidence, a, diffIndex, i)).join("\n")}
    ${rawPatch}
  </section>`;
}

function renderAudienceSection(title: string, claims: ReviewClaim[]): string {
  if (claims.length === 0) return "";
  return `<section class="audience-section">
    <h2>${escapeHtml(title)} <span class="count">${claims.length}</span></h2>
    <div class="claim-list">${claims.map(renderClaimCard).join("\n")}</div>
  </section>`;
}

const REVIEW_CSS = `
  * { box-sizing: border-box; }
  body { margin: 0; font-family: var(--font-sans, system-ui, sans-serif); background: var(--background); color: var(--foreground); }
  main { max-width: 1100px; margin: 0 auto; padding: 32px 20px 80px; }
  h1, h2, h3, p { margin: 0; }
  .review-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .subtle { color: var(--muted-foreground); margin-top: 6px; }
  .theme-toggle { background: var(--secondary); border: 1px solid var(--border); border-radius: 8px; padding: 8px 12px; cursor: pointer; font-size: 1.1rem; color: var(--foreground); }
  .card, .claim-card, .summary-card, .panel { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius, 16px); }
  .hero-card { padding: 24px; margin-bottom: 20px; }
  .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin-bottom: 20px; }
  .summary-card { padding: 14px 16px; }
  .summary-card strong { display: block; font-size: 1.8rem; }
  .priority-banner { padding: 18px 20px; margin-bottom: 20px; background: linear-gradient(135deg, color-mix(in srgb, var(--destructive) 10%, transparent), var(--card)); }
  .panel { padding: 18px; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--border); vertical-align: top; }
  th { color: var(--muted-foreground); font-weight: 600; }
  .band-dot { display: inline-block; width: 12px; height: 12px; border-radius: 50%; }
  .band-uncovered { background: var(--destructive); }
  .band-weak { background: var(--warning, #b58900); }
  .band-covered { background: var(--success, #2e7d32); }
  .toolbar { position: sticky; top: 12px; z-index: 2; display: flex; flex-wrap: wrap; gap: 10px; padding: 14px; margin-bottom: 20px; }
  .toolbar input { flex: 1 1 240px; border: 1px solid var(--border); border-radius: 999px; padding: 10px 14px; font: inherit; background: var(--background); color: var(--foreground); }
  .toolbar button { border: 1px solid var(--border); background: var(--secondary); border-radius: 999px; padding: 10px 14px; font: inherit; cursor: pointer; color: var(--foreground); }
  .toolbar button.active { background: var(--foreground); color: var(--background); }
  .audience-section { margin-bottom: 28px; }
  .audience-section h2 { margin-bottom: 12px; }
  .count { color: var(--muted-foreground); font-weight: 400; }
  .claim-list { display: grid; gap: 14px; }
  .claim-card { padding: 18px; }
  .claim-header h3 { margin-top: 8px; }
  .source { color: var(--muted-foreground); font-family: var(--font-mono, ui-monospace, monospace); font-size: 0.85rem; margin-top: 4px; }
  .ticket-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .ticket-pill { display: inline-flex; align-items: center; border: 1px solid var(--border); border-radius: 999px; padding: 3px 9px; color: var(--muted-foreground); background: var(--background); font-size: 0.78rem; text-decoration: none; }
  .ticket-pill:hover { color: var(--foreground); border-color: var(--muted-foreground); }
  .strength-badge, .change-pill { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 999px; font-size: 0.8rem; margin-right: 6px; }
  .change-pill { background: var(--secondary); }
  .strength-strong { background: color-mix(in srgb, var(--success, #2e7d32) 18%, transparent); color: var(--success, #2e7d32); }
  .strength-moderate { background: color-mix(in srgb, var(--warning, #b58900) 20%, transparent); color: var(--warning, #b58900); }
  .strength-weak { background: color-mix(in srgb, #d2691e 20%, transparent); color: #b5530a; }
  .strength-none { background: color-mix(in srgb, var(--destructive) 16%, transparent); color: var(--destructive); }
  .intent { margin: 12px 0; padding: 10px 12px; border-left: 3px solid var(--border); background: color-mix(in srgb, var(--card) 60%, var(--background)); border-radius: 6px; }
  .intent-label { font-weight: 700; margin-right: 6px; }
  .evidence-block { margin-top: 10px; }
  .evidence-label { font-weight: 600; color: var(--muted-foreground); }
  .reasons { margin: 6px 0 0; padding-left: 18px; }
  .covers { color: var(--muted-foreground); margin-top: 8px; font-size: 0.9rem; }
  .artifacts { margin-top: 12px; display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-start; }
  .shot { max-width: 280px; max-height: 200px; border: 1px solid var(--border); border-radius: 8px; }
  .trace-note { color: var(--muted-foreground); }
  .step-list { margin: 12px 0 0; padding-left: 18px; color: var(--muted-foreground); }
  .code-diff h2 { margin-bottom: 6px; }
  .code-diff a { color: var(--foreground); }
  .diff-outline { margin: 12px 0; padding-left: 20px; }
  .annotation { margin: 18px 0; padding: 14px 16px; border: 1px solid var(--border); border-radius: 10px; background: color-mix(in srgb, var(--card) 60%, var(--background)); }
  .annotation h4 { margin: 0 0 6px; }
  .annotation-text { margin: 0 0 10px; }
  .scenario-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
  .scenario-ref { display: inline-flex; align-items: center; gap: 4px; border: 1px solid var(--border); border-radius: 999px; padding: 3px 10px; font-size: 0.82rem; text-decoration: none; color: var(--foreground); background: var(--background); }
  .scenario-ref.unverified { color: var(--warning, #b58900); border-color: var(--warning, #b58900); }
  .no-scenario { color: var(--warning, #b58900); font-size: 0.9rem; margin: 0 0 10px; }
  .anchor-notice { color: var(--warning, #b58900); background: color-mix(in srgb, var(--warning, #b58900) 10%, transparent); border-radius: 6px; padding: 8px 10px; margin: 0; }
  .diff-hunk { border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
  .diff-file-header { padding: 6px 10px; background: var(--secondary); border-bottom: 1px solid var(--border); font-size: 0.85rem; }
  .diff-table { font-family: var(--font-mono, ui-monospace, monospace); font-size: 0.82rem; }
  .diff-table td { padding: 1px 8px; border-bottom: none; }
  .diff-code { white-space: pre-wrap; word-break: break-all; }
  .diff-ln { color: var(--muted-foreground); text-align: right; user-select: none; width: 1%; white-space: nowrap; }
  .diff-sign { user-select: none; width: 1%; }
  .diff-add { background: color-mix(in srgb, var(--success, #2e7d32) 12%, transparent); }
  .diff-del { background: color-mix(in srgb, var(--destructive) 10%, transparent); }
  .diff-anchored .diff-code { box-shadow: inset 3px 0 0 var(--primary, #2e7d32); }
  .raw-patch { margin-top: 16px; }
  .raw-patch pre { overflow-x: auto; background: var(--secondary); border-radius: 8px; padding: 12px; }
`;

const JS_THEME_TOGGLE = `
function getSystemTheme() { return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
function getEffectiveTheme() { var s = localStorage.getItem('review-theme'); return (s === 'dark' || s === 'light') ? s : getSystemTheme(); }
function toggleTheme() { var n = getEffectiveTheme() === 'dark' ? 'light' : 'dark'; localStorage.setItem('review-theme', n); applyTheme(n); }
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  var b = document.querySelector('.theme-toggle');
  if (b) { b.textContent = t === 'dark' ? '\\u2600\\ufe0f' : '\\ud83c\\udf19'; }
}
`;

export class ReviewHtmlFormatter {
  private title: string;
  private darkMode: boolean;

  constructor(options: ReviewHtmlOptions = {}) {
    this.title = options.title ?? "Evidence Review";
    this.darkMode = options.darkMode ?? true;
  }

  format(review: ReviewResult): string {
    const { summary, context } = review;

    const priority =
      summary.changedSourceFiles === 0
        ? "No changed source files supplied — showing claims and evidence only."
        : summary.uncovered > 0
          ? `${summary.uncovered} changed file(s) have no evidence. Review them first.`
          : summary.weaklyCovered > 0
            ? `No unaccounted-for changes. ${summary.weaklyCovered} file(s) are weakly covered.`
            : "Every changed source file is backed by at least moderate evidence.";

    const changedFilesPanel =
      summary.changedSourceFiles > 0
        ? `<section class="panel">
            <h2>Changed files</h2>
            <table>
              <thead><tr><th></th><th>File</th><th>Change</th><th>Evidence</th></tr></thead>
              <tbody>${review.changedFiles.map(renderChangedFileRow).join("")}</tbody>
            </table>
          </section>`
        : "";

    const themeToggleHtml = this.darkMode
      ? `<button type="button" class="theme-toggle" onclick="toggleTheme()" aria-label="Toggle theme"></button>`
      : "";
    const themeInitJs = this.darkMode
      ? `${JS_THEME_TOGGLE}\napplyTheme(getEffectiveTheme());`
      : "";
    const themeAttr = this.darkMode ? ' data-theme="light"' : "";

    const refsLine =
      context.baseRef || context.headRef
        ? `<p class="subtle">Comparing ${escapeHtml(context.baseRef ?? "base")} → ${escapeHtml(context.headRef ?? "head")}</p>`
        : "";

    return `<!doctype html>
<html lang="en"${themeAttr}>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(this.title)}</title>
    <style>
      ${REPORT_THEME_CSS}
      ${REVIEW_CSS}
    </style>
  </head>
  <body>
    <main>
      <div class="hero-card card">
        <div class="review-header">
          <h1>${escapeHtml(this.title)}</h1>
          ${themeToggleHtml}
        </div>
        ${refsLine}
      </div>
      <section class="summary-grid">
        <div class="summary-card"><strong>${summary.uncovered}</strong><span>🔴 Uncovered</span></div>
        <div class="summary-card"><strong>${summary.weaklyCovered}</strong><span>🟡 Weak</span></div>
        <div class="summary-card"><strong>${summary.covered}</strong><span>🟢 Covered</span></div>
        <div class="summary-card"><strong>${summary.totalClaims}</strong><span>Claims</span></div>
        <div class="summary-card"><strong>${summary.byStrength.strong}</strong><span>Strong</span></div>
        <div class="summary-card"><strong>${summary.byStrength.weak + summary.byStrength.none}</strong><span>Weak/None</span></div>
      </section>
      <section class="card priority-banner">
        <h2>Review priority</h2>
        <p class="subtle">${escapeHtml(priority)}</p>
      </section>
      ${changedFilesPanel}
      <div class="claims-region">
        <section class="toolbar">
          <input type="search" placeholder="Filter claims by scenario, file, change-type" aria-label="Filter claims" />
          <button type="button" class="active" data-filter="all">All</button>
          <button type="button" data-filter="stakeholder">Stakeholder</button>
          <button type="button" data-filter="engineer">Engineer</button>
          <button type="button" data-filter="weak">Weak/None</button>
        </section>
        ${renderAudienceSection("Stakeholder behaviour", review.claims.filter((c) => c.audience === "stakeholder"))}
        ${renderAudienceSection("Engineer changes", review.claims.filter((c) => c.audience === "engineer"))}
      </div>
      ${review.codeDiffs.map((d, i) => renderCodeDiffSection(d, i)).join("\n")}
    </main>
    <script>
      ${themeInitJs}
      const input = document.querySelector('input[type="search"]');
      const buttons = Array.from(document.querySelectorAll('[data-filter]'));
      const cards = Array.from(document.querySelectorAll('.claim-card'));
      let activeFilter = 'all';
      function applyFilters() {
        const query = (input.value || '').trim().toLowerCase();
        cards.forEach((card) => {
          const audience = card.getAttribute('data-audience');
          const strength = card.getAttribute('data-strength');
          const haystack = card.getAttribute('data-search') || '';
          let matchesFilter = activeFilter === 'all'
            || audience === activeFilter
            || (activeFilter === 'weak' && (strength === 'weak' || strength === 'none'));
          const matchesSearch = !query || haystack.includes(query);
          card.style.display = matchesFilter && matchesSearch ? '' : 'none';
        });
      }
      input.addEventListener('input', applyFilters);
      buttons.forEach((button) => {
        button.addEventListener('click', () => {
          activeFilter = button.getAttribute('data-filter');
          buttons.forEach((b) => b.classList.toggle('active', b === button));
          applyFilters();
        });
      });
      applyFilters();
    </script>
  </body>
</html>`;
  }
}
