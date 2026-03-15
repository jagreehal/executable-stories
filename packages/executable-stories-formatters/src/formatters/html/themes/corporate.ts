/**
 * Corporate theme — editorial/magazine feel with serif typography and navy palette.
 * Two-pane layout: fixed sidebar with TOC navigation + main content area.
 */

import type { HtmlTheme } from "./types.js";
import type { BuildBodyArgs, BuildBodyDeps } from "../renderers/body.js";

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

function corporateBuildBody(args: BuildBodyArgs, deps: BuildBodyDeps): string {
  const { run } = args;

  // --- Build sidebar content ---
  const total = run.testCases.length;
  const passed = run.testCases.filter((tc) => tc.status === "passed").length;
  const failed = run.testCases.filter((tc) => tc.status === "failed").length;
  const skipped = run.testCases.filter(
    (tc) => tc.status === "skipped" || tc.status === "pending",
  ).length;

  const byFile = groupBy(run.testCases, (tc) => tc.sourceFile);

  const tocItems: string[] = [];
  let featureIndex = 0;
  for (const [file, testCases] of byFile) {
    const suitePaths = testCases
      .map((tc) => tc.titlePath)
      .filter((p) => p.length > 0);
    const featureName =
      suitePaths.length > 0 && suitePaths[0].length > 0
        ? suitePaths[0][0]
        : file.split("/").pop()?.replace(/\.[^.]+$/, "") ?? file;

    const fPassed = testCases.filter((tc) => tc.status === "passed").length;
    const fFailed = testCases.filter((tc) => tc.status === "failed").length;
    const statusDot = fFailed > 0 ? "dot-failed" : "dot-passed";

    tocItems.push(
      `<a class="toc-item" href="#corporate-feature-${featureIndex}" data-feature-index="${featureIndex}">` +
        `<span class="toc-dot ${statusDot}"></span>` +
        `<span class="toc-label">${escapeForAttr(featureName)}</span>` +
        `<span class="toc-count">${fPassed}/${testCases.length}</span>` +
        `</a>`,
    );
    featureIndex++;
  }

  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

  const sidebar = `
<nav class="toc">
  <div class="toc-header">
    <div class="toc-title">Test Report</div>
    <div class="toc-stats">
      <div class="toc-stat-row">
        <span class="toc-stat-label">Total</span>
        <span class="toc-stat-value">${total}</span>
      </div>
      <div class="toc-stat-row">
        <span class="toc-stat-label">Passed</span>
        <span class="toc-stat-value toc-stat-passed">${passed}</span>
      </div>
      <div class="toc-stat-row">
        <span class="toc-stat-label">Failed</span>
        <span class="toc-stat-value toc-stat-failed">${failed}</span>
      </div>
      <div class="toc-stat-row">
        <span class="toc-stat-label">Skipped</span>
        <span class="toc-stat-value toc-stat-skipped">${skipped}</span>
      </div>
      <div class="toc-progress">
        <div class="toc-progress-bar" style="width: ${passRate}%"></div>
      </div>
      <div class="toc-pass-rate">${passRate}% pass rate</div>
    </div>
  </div>
  <div class="toc-nav">
    <div class="toc-nav-label">Features</div>
    ${tocItems.join("\n    ")}
  </div>
</nav>`;

  // --- Build main content ---
  const mainParts: string[] = [];

  mainParts.push(
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

  mainParts.push(
    deps.renderSummary(
      { total, passed, failed, skipped },
      deps.summaryDeps,
    ),
  );

  const allTags = [
    ...new Set(run.testCases.flatMap((tc) => tc.tags)),
  ].sort();
  mainParts.push(
    deps.renderTagBar(
      { tags: allTags, totalScenarios: total },
      deps.tagBarDeps,
    ),
  );

  const failedCases = run.testCases.filter((tc) => tc.status === "failed");
  if (failedCases.length > 0) {
    mainParts.push(
      deps.renderFailureSummary(
        { failedCases },
        deps.failureSummaryDeps,
      ),
    );
  }

  featureIndex = 0;
  for (const [file, testCases] of byFile) {
    const featureHtml = deps.renderFeature(
      { file, testCases, metricsMap: args.metricsMap },
      deps.featureDeps,
    );
    // Wrap each feature with an ID anchor for sidebar navigation
    mainParts.push(
      `<div id="corporate-feature-${featureIndex}">${featureHtml}</div>`,
    );
    featureIndex++;
  }

  return `<div class="corporate-layout">${sidebar}<main class="corporate-main">${mainParts.join("\n")}</main></div>`;
}

/** Minimal HTML-safe escaping for attribute values in sidebar */
function escapeForAttr(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const CORPORATE_CSS = `
/* ============================================================================
   Google Fonts Import — Playfair Display, Source Serif 4, DM Sans
   ============================================================================ */
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@400;500;600;700&family=Source+Serif+4:wght@400;500;600&display=swap');

/* ============================================================================
   CSS Custom Properties — Light Mode (Default)
   Navy palette with editorial serif typography
   ============================================================================ */
:root {
  /* Typography */
  --font-heading: "Playfair Display", Georgia, "Times New Roman", serif;
  --font-body: "Source Serif 4", Georgia, "Times New Roman", serif;
  --font-sans: "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-mono: "DM Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;

  /* Base colors — warm ivory background, navy accents */
  --background: #faf9f7;
  --foreground: #1a202c;
  --card: #ffffff;
  --card-foreground: #1a202c;
  --popover: #ffffff;
  --popover-foreground: #1a202c;

  /* Navy as primary */
  --primary: #1a365d;
  --primary-foreground: #ffffff;

  --secondary: #f0ede8;
  --secondary-foreground: #1a202c;
  --muted: #f0ede8;
  --muted-foreground: #64748b;
  --accent: #eee9e0;
  --accent-foreground: #1a202c;
  --destructive: #b91c1c;
  --destructive-foreground: #ffffff;
  --border: #d6d0c4;
  --input: #d6d0c4;
  --ring: #1a365d;
  --radius: 0.375rem;

  /* Shadows */
  --shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.04);
  --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04);
  --shadow: 0 4px 6px -1px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.04);
  --shadow-md: 0 10px 15px -3px rgb(0 0 0 / 0.07), 0 4px 6px -4px rgb(0 0 0 / 0.04);

  /* Status colors */
  --success: #166534;
  --success-light: #f0fdf4;
  --success-border: #bbf7d0;
  --error: #b91c1c;
  --error-light: #fef2f2;
  --error-border: #fecaca;
  --warning: #a16207;
  --warning-light: #fefce8;
  --warning-border: #fef08a;
  --pending: #6d28d9;
  --pending-light: #f5f3ff;
  --pending-border: #ddd6fe;

  /* Theme-specific */
  --keyword-color: #1a365d;
  --tag-bg: #eff6ff;
  --tag-color: #1e40af;
  --tag-border: #bfdbfe;
  --step-param-color: #7c3aed;

  /* Accordion/Collapsible */
  --accordion-header-hover: #f5f2ed;
  --accordion-content-bg: #faf8f5;
}

/* ============================================================================
   Dark Mode — Navy palette
   ============================================================================ */
[data-theme="dark"] {
  --font-heading: "Playfair Display", Georgia, "Times New Roman", serif;
  --font-body: "Source Serif 4", Georgia, "Times New Roman", serif;
  --font-sans: "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-mono: "DM Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;

  --background: #111827;
  --foreground: #f1f5f9;
  --card: #1e293b;
  --card-foreground: #f1f5f9;
  --popover: #1e293b;
  --popover-foreground: #f1f5f9;

  --primary: #93c5fd;
  --primary-foreground: #0f172a;

  --secondary: #1e293b;
  --secondary-foreground: #f1f5f9;
  --muted: #1e293b;
  --muted-foreground: #94a3b8;
  --accent: #1e293b;
  --accent-foreground: #f1f5f9;
  --destructive: #ef4444;
  --destructive-foreground: #ffffff;
  --border: #334155;
  --input: #334155;
  --ring: #93c5fd;

  --shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.3);
  --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.4), 0 1px 2px -1px rgb(0 0 0 / 0.3);
  --shadow: 0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.3);
  --shadow-md: 0 10px 15px -3px rgb(0 0 0 / 0.4), 0 4px 6px -4px rgb(0 0 0 / 0.3);

  --success: #4ade80;
  --success-light: hsl(145 30% 12%);
  --success-border: hsl(145 30% 22%);
  --error: #f87171;
  --error-light: hsl(0 30% 12%);
  --error-border: hsl(0 30% 22%);
  --warning: #fbbf24;
  --warning-light: hsl(38 30% 12%);
  --warning-border: hsl(38 30% 22%);
  --pending: #a78bfa;
  --pending-light: hsl(262 25% 14%);
  --pending-border: hsl(262 25% 22%);

  --keyword-color: #93c5fd;
  --tag-bg: hsl(220 40% 15%);
  --tag-color: #93c5fd;
  --tag-border: hsl(220 30% 25%);
  --step-param-color: #c4b5fd;

  --accordion-header-hover: #253347;
  --accordion-content-bg: #162033;
}

/* Auto dark mode based on system preference */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --background: #111827;
    --foreground: #f1f5f9;
    --card: #1e293b;
    --card-foreground: #f1f5f9;
    --popover: #1e293b;
    --popover-foreground: #f1f5f9;
    --primary: #93c5fd;
    --primary-foreground: #0f172a;
    --secondary: #1e293b;
    --secondary-foreground: #f1f5f9;
    --muted: #1e293b;
    --muted-foreground: #94a3b8;
    --accent: #1e293b;
    --accent-foreground: #f1f5f9;
    --destructive: #ef4444;
    --destructive-foreground: #ffffff;
    --border: #334155;
    --input: #334155;
    --ring: #93c5fd;
    --shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.3);
    --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.4), 0 1px 2px -1px rgb(0 0 0 / 0.3);
    --shadow: 0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.3);
    --shadow-md: 0 10px 15px -3px rgb(0 0 0 / 0.4), 0 4px 6px -4px rgb(0 0 0 / 0.3);
    --success: #4ade80;
    --success-light: hsl(145 30% 12%);
    --success-border: hsl(145 30% 22%);
    --error: #f87171;
    --error-light: hsl(0 30% 12%);
    --error-border: hsl(0 30% 22%);
    --warning: #fbbf24;
    --warning-light: hsl(38 30% 12%);
    --warning-border: hsl(38 30% 22%);
    --pending: #a78bfa;
    --pending-light: hsl(262 25% 14%);
    --pending-border: hsl(262 25% 22%);
    --keyword-color: #93c5fd;
    --tag-bg: hsl(220 40% 15%);
    --tag-color: #93c5fd;
    --tag-border: hsl(220 30% 25%);
    --step-param-color: #c4b5fd;
    --accordion-header-hover: #253347;
    --accordion-content-bg: #162033;
  }
}

/* ============================================================================
   Base Styles
   ============================================================================ */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: var(--font-body);
  font-size: 14px;
  line-height: 1.7;
  color: var(--foreground);
  background-color: var(--background);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ============================================================================
   Corporate Two-Pane Layout
   ============================================================================ */
.corporate-layout {
  display: flex;
  min-height: 100vh;
}

/* ============================================================================
   Sidebar / Table of Contents
   ============================================================================ */
.toc {
  position: fixed;
  top: 0;
  left: 0;
  width: 260px;
  height: 100vh;
  overflow-y: auto;
  background: var(--card);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  z-index: 20;
}

.toc-header {
  padding: 1.5rem 1.25rem 1rem;
  border-bottom: 1px solid var(--border);
}

.toc-title {
  font-family: var(--font-heading);
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--primary);
  letter-spacing: -0.01em;
  margin-bottom: 1rem;
}

.toc-stats {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.toc-stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: var(--font-sans);
  font-size: 0.75rem;
}

.toc-stat-label {
  color: var(--muted-foreground);
  font-weight: 500;
}

.toc-stat-value {
  font-weight: 600;
  color: var(--foreground);
  font-family: var(--font-mono);
}

.toc-stat-passed { color: var(--success); }
.toc-stat-failed { color: var(--error); }
.toc-stat-skipped { color: var(--warning); }

.toc-progress {
  height: 4px;
  background: var(--muted);
  border-radius: 2px;
  margin-top: 0.5rem;
  overflow: hidden;
}

.toc-progress-bar {
  height: 100%;
  background: var(--success);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.toc-pass-rate {
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  color: var(--muted-foreground);
  text-align: right;
  margin-top: 0.25rem;
}

.toc-nav {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem 0;
}

.toc-nav-label {
  font-family: var(--font-sans);
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted-foreground);
  padding: 0.5rem 1.25rem 0.375rem;
}

.toc-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1.25rem;
  text-decoration: none;
  color: var(--foreground);
  font-family: var(--font-sans);
  font-size: 0.8125rem;
  font-weight: 400;
  transition: all 0.15s ease;
  border-left: 2px solid transparent;
}

.toc-item:hover {
  background: var(--accent);
  color: var(--primary);
}

.toc-item.active {
  background: var(--accent);
  border-left-color: var(--primary);
  color: var(--primary);
  font-weight: 500;
}

.toc-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.toc-dot.dot-passed {
  background: var(--success);
}

.toc-dot.dot-failed {
  background: var(--error);
}

.toc-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toc-count {
  font-size: 0.6875rem;
  font-family: var(--font-mono);
  color: var(--muted-foreground);
  flex-shrink: 0;
}

/* ============================================================================
   Main Content Area
   ============================================================================ */
.corporate-main {
  margin-left: 260px;
  flex: 1;
  min-width: 0;
}

.container {
  max-width: 960px;
  margin: 0 auto;
  padding: 1.5rem 2rem;
}

@media (min-width: 768px) {
  .container {
    padding: 2rem 2.5rem;
  }
}

/* ============================================================================
   Responsive — collapse sidebar on small screens
   ============================================================================ */
@media (max-width: 860px) {
  .toc {
    display: none;
  }

  .corporate-main {
    margin-left: 0;
  }
}

/* ============================================================================
   Header — editorial style
   ============================================================================ */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 1.25rem;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--border);
}

.header h1 {
  font-family: var(--font-heading);
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--primary);
}

.header-actions {
  display: flex;
  gap: 0.625rem;
  align-items: center;
}

/* ============================================================================
   Theme Toggle
   ============================================================================ */
.theme-toggle {
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

.theme-toggle:hover {
  background: var(--accent);
  border-color: var(--border);
}

.theme-toggle:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--background), 0 0 0 4px var(--ring);
}

/* ============================================================================
   Search Input
   ============================================================================ */
.search-input {
  height: 2.25rem;
  padding: 0 0.875rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans);
  font-size: 0.875rem;
  width: 220px;
  transition: all 0.15s ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--ring);
  box-shadow: 0 0 0 3px hsl(220 60% 50% / 0.1);
}

.search-input::placeholder {
  color: var(--muted-foreground);
}

@media (min-width: 640px) {
  .search-input {
    width: 260px;
  }
}

/* ============================================================================
   Meta Info
   ============================================================================ */
.meta-info {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 1.75rem;
  margin-bottom: 1.25rem;
  padding: 0.75rem 1rem;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-size: 0.8125rem;
  font-family: var(--font-body);
  color: var(--muted-foreground);
}

.meta-info dt {
  font-weight: 500;
  color: var(--foreground);
  display: inline;
}

.meta-info dd {
  display: inline;
  margin: 0 0 0 0.375rem;
  font-family: var(--font-mono);
  font-size: 0.75rem;
}

/* ============================================================================
   Summary Cards
   ============================================================================ */
.summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

@media (max-width: 640px) {
  .summary {
    grid-template-columns: repeat(2, 1fr);
  }
}

.summary-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1rem 1.25rem;
  transition: all 0.15s ease;
}

.summary-card:hover {
  box-shadow: var(--shadow-sm);
}

.summary-card .label {
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted-foreground);
  font-weight: 500;
  margin-bottom: 0.375rem;
}

.summary-card .value {
  font-family: var(--font-heading);
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.1;
}

.summary-card.passed {
  background: var(--success-light);
  border-color: var(--success-border);
}
.summary-card.passed .value { color: var(--success); }

.summary-card.failed {
  background: var(--error-light);
  border-color: var(--error-border);
}
.summary-card.failed .value { color: var(--error); }

.summary-card.skipped {
  background: var(--warning-light);
  border-color: var(--warning-border);
}
.summary-card.skipped .value { color: var(--warning); }

.summary-card.pending {
  background: var(--pending-light);
  border-color: var(--pending-border);
}
.summary-card.pending .value { color: var(--pending); }

.summary-card.status-active {
  box-shadow: 0 0 0 2px var(--background), 0 0 0 4px var(--ring);
}

/* ============================================================================
   Tag Filter Bar
   ============================================================================ */
.tag-bar {
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  position: sticky;
  top: 0;
  z-index: 10;
}

.tag-bar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tag-bar-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  color: inherit;
  font: inherit;
}

.tag-bar-toggle:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
  border-radius: var(--radius);
}

.tag-bar-label {
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted-foreground);
  font-weight: 500;
}

.tag-bar-count {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--primary);
}

.tag-bar-chevron {
  color: var(--muted-foreground);
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

.tag-bar-collapsed .tag-bar-chevron {
  transform: rotate(0deg);
}

.tag-bar:not(.tag-bar-collapsed) .tag-bar-chevron {
  transform: rotate(180deg);
}

.tag-bar-clear {
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--destructive, #dc2626);
  background: var(--destructive-light, #fef2f2);
  border: 1px solid var(--destructive-border, #fecaca);
  cursor: pointer;
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius);
  transition: all 0.15s ease;
}

.tag-bar-clear:hover {
  background: var(--destructive-border, #fecaca);
}

.tag-bar-clear:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}

.tag-bar-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  max-height: 200px;
  overflow-y: auto;
  margin-top: 0.5rem;
}

.tag-bar-collapsed .tag-bar-pills {
  display: none;
}

.tag-pill {
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.25rem 0.625rem;
  background: var(--tag-bg);
  color: var(--tag-color);
  border: 1px solid var(--tag-border);
  border-radius: 9999px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tag-pill:hover {
  background: var(--success-border);
}

.tag-pill:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}

.tag-pill.active {
  background: var(--primary);
  color: var(--primary-foreground);
  border-color: var(--primary);
}

/* ============================================================================
   Filter Results Counter
   ============================================================================ */
.filter-results {
  text-align: center;
  font-family: var(--font-sans);
  font-size: 0.8125rem;
  color: var(--muted-foreground);
  margin-bottom: 1rem;
  font-weight: 500;
}

/* ============================================================================
   Feature Sections — editorial card style
   ============================================================================ */
.feature {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  margin-bottom: 0.75rem;
  overflow: hidden;
}

.feature-header {
  padding: 1rem 1.25rem;
  background: var(--card);
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.15s ease;
  gap: 1rem;
}

.feature-header:hover {
  background: var(--accordion-header-hover);
}

.feature-info {
  flex: 1;
  min-width: 0;
}

.feature-title {
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 1.0625rem;
  color: var(--foreground);
  letter-spacing: -0.01em;
}

.feature-path {
  font-size: 0.75rem;
  color: var(--muted-foreground);
  font-family: var(--font-mono);
  margin-top: 0.125rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.feature-stats {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  font-size: 0.8125rem;
  font-weight: 500;
  flex-shrink: 0;
}

.feature-stats .stat {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-family: var(--font-mono);
  font-size: 0.75rem;
}

.feature-stats .stat.passed { color: var(--success); }
.feature-stats .stat.failed { color: var(--error); }
.feature-stats .stat.skipped { color: var(--warning); }

.feature-content {
  padding: 0.75rem;
  border-top: 1px solid var(--border);
  background: var(--accordion-content-bg);
}

.feature.collapsed .feature-content {
  display: none;
}

/* ============================================================================
   Scenarios
   ============================================================================ */
.scenario {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) - 2px);
  margin-bottom: 0.5rem;
  overflow: hidden;
}

.scenario:last-child {
  margin-bottom: 0;
}

.scenario-header {
  padding: 0.75rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  cursor: pointer;
  transition: background-color 0.15s ease;
  gap: 1rem;
}

.scenario-header:hover {
  background: var(--accordion-header-hover);
}

.scenario-info {
  flex: 1;
  min-width: 0;
}

.scenario-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  font-size: 0.875rem;
  color: var(--foreground);
}

.scenario-name {
  font-family: var(--font-body);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.scenario-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-top: 0.375rem;
}

.tag {
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 500;
  padding: 0.125rem 0.5rem;
  background: var(--tag-bg);
  color: var(--tag-color);
  border: 1px solid var(--tag-border);
  border-radius: 9999px;
}

.scenario-duration {
  font-size: 0.75rem;
  color: var(--muted-foreground);
  font-family: var(--font-mono);
  white-space: nowrap;
  flex-shrink: 0;
}

.scenario-content {
  padding: 0.75rem 1rem 1rem;
  border-top: 1px solid var(--border);
}

.scenario.collapsed .scenario-content {
  display: none;
}

/* ============================================================================
   Status Icons — colored dots instead of emoji
   ============================================================================ */
.status-icon {
  font-size: 0.875rem;
  line-height: 1;
  flex-shrink: 0;
}

.status-passed { color: var(--success); }
.status-failed { color: var(--error); }
.status-skipped { color: var(--warning); }
.status-pending { color: var(--pending); }

/* ============================================================================
   Steps
   ============================================================================ */
.steps {
  margin-top: 0.25rem;
  padding: 0.25rem 0;
}

.step {
  display: flex;
  gap: 0.5rem;
  padding: 0.375rem 0;
  font-size: 0.8125rem;
  align-items: baseline;
  line-height: 1.6;
}

.step-status {
  flex-shrink: 0;
  width: 1rem;
  text-align: center;
  font-size: 0.75rem;
}

.step-keyword {
  font-weight: 600;
  color: var(--keyword-color);
  flex-shrink: 0;
  min-width: 52px;
  font-family: var(--font-sans);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.step.continuation {
  padding-left: 1.25rem;
}

.step.continuation .step-keyword {
  color: var(--muted-foreground);
  font-weight: 500;
}

.step-text {
  flex: 1;
  color: var(--foreground);
  font-family: var(--font-body);
}

.step-param {
  font-style: italic;
  font-weight: 500;
  color: var(--step-param-color);
}

.step-duration {
  color: var(--muted-foreground);
  font-size: 0.6875rem;
  font-family: var(--font-mono);
  white-space: nowrap;
  opacity: 0.7;
}

/* ============================================================================
   Error Display
   ============================================================================ */
.error-box {
  margin-top: 0.75rem;
  padding: 0.875rem 1rem;
  background: var(--error-light);
  border-radius: calc(var(--radius) - 2px);
  border: 1px solid var(--error-border);
  border-left: 3px solid var(--error);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-x: auto;
  color: var(--error);
}

/* ============================================================================
   Attachments
   ============================================================================ */
.attachments {
  margin-top: 0.75rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.attachment {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  background: var(--muted);
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) - 2px);
  font-size: 0.75rem;
  font-family: var(--font-mono);
  text-decoration: none;
  color: var(--muted-foreground);
  transition: all 0.15s ease;
}

.attachment:hover {
  background: var(--accent);
  color: var(--foreground);
  border-color: var(--ring);
}

.attachment-image {
  max-width: 100%;
  margin-top: 0.5rem;
  border-radius: calc(var(--radius) - 2px);
  border: 1px solid var(--border);
}

.attachment-video {
  max-width: 100%;
  margin-top: 0.5rem;
  border-radius: calc(var(--radius) - 2px);
  border: 1px solid var(--border);
}

/* ============================================================================
   Chevron Icon
   ============================================================================ */
.chevron {
  color: var(--muted-foreground);
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 0.75rem;
  flex-shrink: 0;
}

.collapsed .chevron {
  transform: rotate(-90deg);
}

/* ============================================================================
   Scrollbars
   ============================================================================ */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--muted-foreground);
}

/* ============================================================================
   Focus States
   ============================================================================ */
*:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--background), 0 0 0 4px var(--ring);
}

/* ============================================================================
   Selection
   ============================================================================ */
::selection {
  background: hsl(220 60% 50% / 0.15);
  color: inherit;
}

/* ============================================================================
   Animations
   ============================================================================ */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.feature {
  animation: fadeIn 0.2s ease-out;
}

.feature:nth-child(2) { animation-delay: 0.02s; }
.feature:nth-child(3) { animation-delay: 0.04s; }
.feature:nth-child(4) { animation-delay: 0.06s; }
.feature:nth-child(5) { animation-delay: 0.08s; }

/* ============================================================================
   Print Styles
   ============================================================================ */
@media print {
  :root {
    --background: white;
    --foreground: black;
    --card: white;
    --border: #e5e5e5;
    --muted: #f5f5f5;
    --muted-foreground: #666;
  }

  body {
    font-size: 12px;
  }

  .corporate-layout {
    display: block;
  }

  .toc {
    display: none;
  }

  .corporate-main {
    margin-left: 0;
  }

  .container {
    max-width: 100%;
    padding: 0;
  }

  .header-actions,
  .tag-bar,
  .filter-results {
    display: none !important;
  }

  .feature,
  .scenario {
    page-break-inside: avoid;
    box-shadow: none;
    animation: none;
  }

  .collapsed .feature-content,
  .collapsed .scenario-content {
    display: block;
  }
}

/* ============================================================================
   Documentation Entries — Containers
   ============================================================================ */
.story-docs {
  margin-bottom: 0.75rem;
  padding: 0.75rem;
  background: var(--accordion-content-bg);
  border-radius: calc(var(--radius) - 2px);
  border: 1px solid var(--border);
}

.step-docs {
  margin-left: 1.5rem;
  margin-top: 0.25rem;
  margin-bottom: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--accordion-content-bg);
  border-left: 2px solid var(--primary);
  border-radius: 0 calc(var(--radius) - 2px) calc(var(--radius) - 2px) 0;
}

/* ============================================================================
   Documentation Entries — Note
   ============================================================================ */
.doc-note {
  padding: 0.5rem 0.75rem;
  margin-bottom: 0.5rem;
  background: var(--muted);
  border-left: 3px solid var(--primary);
  border-radius: 0 calc(var(--radius) - 2px) calc(var(--radius) - 2px) 0;
  font-size: 0.8125rem;
  line-height: 1.6;
  color: var(--foreground);
  font-family: var(--font-body);
}

.doc-note:last-child {
  margin-bottom: 0;
}

/* ============================================================================
   Documentation Entries — Tags
   ============================================================================ */
.doc-tag {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-bottom: 0.5rem;
}

.doc-tag:last-child {
  margin-bottom: 0;
}

.doc-tag-item {
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 500;
  padding: 0.125rem 0.5rem;
  background: var(--tag-bg);
  color: var(--tag-color);
  border: 1px solid var(--tag-border);
  border-radius: 9999px;
}

/* ============================================================================
   Documentation Entries — Key-Value
   ============================================================================ */
.doc-kv {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.375rem;
  font-size: 0.8125rem;
  align-items: baseline;
}

.doc-kv:last-child {
  margin-bottom: 0;
}

.doc-kv-label {
  font-weight: 600;
  color: var(--muted-foreground);
  font-family: var(--font-sans);
  font-size: 0.75rem;
}

.doc-kv-value {
  color: var(--foreground);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  white-space: pre-wrap;
  word-break: break-word;
}

/* ============================================================================
   Documentation Entries — Code
   ============================================================================ */
.doc-code {
  margin-bottom: 0.5rem;
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) - 2px);
  overflow: hidden;
}

.doc-code:last-child {
  margin-bottom: 0;
}

.doc-code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.375rem 0.75rem;
  background: var(--muted);
  border-bottom: 1px solid var(--border);
}

.doc-code-label {
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--muted-foreground);
}

.doc-code-lang {
  font-family: var(--font-sans);
  font-size: 0.625rem;
  font-weight: 500;
  padding: 0.125rem 0.375rem;
  background: var(--primary);
  color: var(--primary-foreground);
  border-radius: 9999px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.doc-code-content {
  margin: 0;
  padding: 0.75rem;
  background: var(--card);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  line-height: 1.6;
  overflow-x: auto;
  white-space: pre;
}

.doc-code-content code {
  font-family: inherit;
  background: none;
}

/* ============================================================================
   Documentation Entries — Table
   ============================================================================ */
.doc-table {
  margin-bottom: 0.5rem;
}

.doc-table:last-child {
  margin-bottom: 0;
}

.doc-table-label {
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--muted-foreground);
  margin-bottom: 0.375rem;
}

.doc-table table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.75rem;
  font-family: var(--font-mono);
}

.doc-table th,
.doc-table td {
  padding: 0.5rem 0.75rem;
  text-align: left;
  border: 1px solid var(--border);
}

.doc-table th {
  background: var(--muted);
  font-weight: 600;
  color: var(--foreground);
  font-family: var(--font-sans);
}

.doc-table td {
  background: var(--card);
  color: var(--foreground);
}

.doc-table tr:hover td {
  background: var(--accordion-header-hover);
}

/* ============================================================================
   Documentation Entries — Link
   ============================================================================ */
.doc-link {
  margin-bottom: 0.375rem;
}

.doc-link:last-child {
  margin-bottom: 0;
}

.doc-link a {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8125rem;
  color: var(--primary);
  text-decoration: none;
  font-family: var(--font-body);
  transition: color 0.15s ease;
}

.doc-link a:hover {
  color: var(--keyword-color);
  text-decoration: underline;
}

.doc-link a::before {
  content: "\\2192";
  font-size: 0.75rem;
}

/* ============================================================================
   Documentation Entries — Section
   ============================================================================ */
.doc-section {
  margin-bottom: 0.5rem;
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) - 2px);
  overflow: hidden;
}

.doc-section:last-child {
  margin-bottom: 0;
}

.doc-section-title {
  padding: 0.5rem 0.75rem;
  background: var(--muted);
  border-bottom: 1px solid var(--border);
  font-family: var(--font-heading);
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--foreground);
}

.doc-section-content {
  margin: 0;
  padding: 0.75rem;
  background: var(--card);
  font-size: 0.8125rem;
  line-height: 1.7;
  white-space: pre-wrap;
  color: var(--foreground);
  font-family: var(--font-body);
}

/* Parsed markdown content in sections */
.doc-section-parsed .doc-section-content {
  white-space: normal;
}

.doc-section-parsed .doc-section-content h1,
.doc-section-parsed .doc-section-content h2,
.doc-section-parsed .doc-section-content h3,
.doc-section-parsed .doc-section-content h4,
.doc-section-parsed .doc-section-content h5,
.doc-section-parsed .doc-section-content h6 {
  font-family: var(--font-heading);
  margin-top: 1em;
  margin-bottom: 0.5em;
  font-weight: 600;
  line-height: 1.3;
  color: var(--foreground);
}

.doc-section-parsed .doc-section-content h1:first-child,
.doc-section-parsed .doc-section-content h2:first-child,
.doc-section-parsed .doc-section-content h3:first-child {
  margin-top: 0;
}

.doc-section-parsed .doc-section-content h1 { font-size: 1.25rem; }
.doc-section-parsed .doc-section-content h2 { font-size: 1.125rem; }
.doc-section-parsed .doc-section-content h3 { font-size: 1rem; }
.doc-section-parsed .doc-section-content h4 { font-size: 0.9375rem; }
.doc-section-parsed .doc-section-content h5 { font-size: 0.875rem; }
.doc-section-parsed .doc-section-content h6 { font-size: 0.8125rem; color: var(--muted-foreground); }

.doc-section-parsed .doc-section-content p {
  margin: 0.5em 0;
}

.doc-section-parsed .doc-section-content p:first-child {
  margin-top: 0;
}

.doc-section-parsed .doc-section-content p:last-child {
  margin-bottom: 0;
}

.doc-section-parsed .doc-section-content ul,
.doc-section-parsed .doc-section-content ol {
  margin: 0.5em 0;
  padding-left: 1.5em;
}

.doc-section-parsed .doc-section-content li {
  margin: 0.25em 0;
}

.doc-section-parsed .doc-section-content a {
  color: var(--primary);
  text-decoration: none;
}

.doc-section-parsed .doc-section-content a:hover {
  text-decoration: underline;
}

.doc-section-parsed .doc-section-content code {
  font-family: var(--font-mono);
  font-size: 0.85em;
  padding: 0.125em 0.375em;
  background: var(--muted);
  border-radius: 3px;
}

.doc-section-parsed .doc-section-content pre {
  margin: 0.75em 0;
  padding: 0.75em;
  background: var(--muted);
  border-radius: calc(var(--radius) - 2px);
  overflow-x: auto;
}

.doc-section-parsed .doc-section-content pre code {
  padding: 0;
  background: none;
}

.doc-section-parsed .doc-section-content blockquote {
  margin: 0.75em 0;
  padding: 0.5em 1em;
  border-left: 3px solid var(--primary);
  background: var(--muted);
  color: var(--muted-foreground);
  font-style: italic;
}

.doc-section-parsed .doc-section-content blockquote p {
  margin: 0;
}

.doc-section-parsed .doc-section-content hr {
  margin: 1em 0;
  border: none;
  border-top: 1px solid var(--border);
}

.doc-section-parsed .doc-section-content table {
  width: 100%;
  margin: 0.75em 0;
  border-collapse: collapse;
  font-size: 0.8125rem;
}

.doc-section-parsed .doc-section-content th,
.doc-section-parsed .doc-section-content td {
  padding: 0.5em 0.75em;
  border: 1px solid var(--border);
  text-align: left;
}

.doc-section-parsed .doc-section-content th {
  background: var(--muted);
  font-weight: 600;
}

.doc-section-parsed .doc-section-content img {
  max-width: 100%;
  height: auto;
  border-radius: calc(var(--radius) - 2px);
}

/* ============================================================================
   Documentation Entries — Mermaid
   ============================================================================ */
.doc-mermaid {
  margin-bottom: 0.5rem;
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) - 2px);
  overflow: hidden;
}

.doc-mermaid:last-child {
  margin-bottom: 0;
}

.doc-mermaid-title {
  padding: 0.375rem 0.75rem;
  background: var(--muted);
  border-bottom: 1px solid var(--border);
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--muted-foreground);
}

.doc-mermaid-title::before {
  content: "\\25C7 ";
  color: var(--primary);
}

.doc-mermaid-code {
  margin: 0;
  padding: 0.75rem;
  background: var(--card);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  line-height: 1.6;
  overflow-x: auto;
  white-space: pre;
}

.doc-mermaid-code code {
  font-family: inherit;
  background: none;
}

/* ============================================================================
   Documentation Entries — Screenshot
   ============================================================================ */
.doc-screenshot {
  margin-bottom: 0.5rem;
}

.doc-screenshot:last-child {
  margin-bottom: 0;
}

.doc-screenshot-img {
  max-width: 100%;
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) - 2px);
  display: block;
}

.doc-screenshot-caption {
  margin-top: 0.375rem;
  font-size: 0.75rem;
  color: var(--muted-foreground);
  font-style: italic;
  font-family: var(--font-body);
}

/* ============================================================================
   Documentation Entries — Custom
   ============================================================================ */
.doc-custom {
  margin-bottom: 0.5rem;
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) - 2px);
  overflow: hidden;
}

.doc-custom:last-child {
  margin-bottom: 0;
}

.doc-custom-type {
  padding: 0.375rem 0.75rem;
  background: var(--warning-light);
  border-bottom: 1px solid var(--warning-border);
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--warning);
}

.doc-custom-data {
  margin: 0;
  padding: 0.75rem;
  background: var(--card);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  line-height: 1.6;
  overflow-x: auto;
  white-space: pre;
}

.doc-custom-data code {
  font-family: inherit;
  background: none;
}

/* ============================================================================
   Trace View
   ============================================================================ */
.trace-view {
  margin-top: 0.75rem;
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) - 2px);
  overflow: hidden;
}

.trace-view-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--card);
  cursor: pointer;
  user-select: none;
  font-family: var(--font-sans);
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--foreground);
  transition: background-color 0.15s ease;
}

.trace-view-header:hover {
  background: var(--accordion-header-hover);
}

.trace-view-count {
  font-size: 0.6875rem;
  font-weight: 500;
  padding: 0.125rem 0.5rem;
  background: var(--success-light);
  color: var(--success);
  border: 1px solid var(--success-border);
  border-radius: 9999px;
  font-family: var(--font-mono);
}

.trace-view-content {
  border-top: 1px solid var(--border);
  padding: 0.5rem 0.75rem;
  background: var(--accordion-content-bg);
}

.trace-view.collapsed .trace-view-content {
  display: none;
}

.trace-view-axis {
  display: flex;
  justify-content: space-between;
  font-size: 0.625rem;
  font-family: var(--font-mono);
  color: var(--muted-foreground);
  padding-bottom: 0.375rem;
  margin-bottom: 0.375rem;
  border-bottom: 1px solid var(--border);
}

.trace-view-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.1875rem 0;
  font-size: 0.75rem;
}

.trace-view-name {
  width: 35%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-family: var(--font-mono);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--foreground);
}

.trace-view-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.trace-view-status-ok { background: var(--success); }
.trace-view-status-error { background: var(--error); }
.trace-view-status-unset { background: var(--muted-foreground); }

.trace-view-bar-container {
  flex: 1;
  position: relative;
  height: 1.25rem;
  background: var(--muted);
  border-radius: 2px;
}

.trace-view-bar {
  position: absolute;
  top: 0;
  height: 100%;
  border-radius: 2px;
  min-width: 2px;
  display: flex;
  align-items: center;
  padding: 0 0.375rem;
  font-size: 0.625rem;
  font-family: var(--font-mono);
  color: white;
  white-space: nowrap;
  overflow: hidden;
}

.trace-view-bar-ok { background: var(--success); }
.trace-view-bar-error { background: var(--error); }
.trace-view-bar-unset { background: var(--muted-foreground); }

@media print {
  .trace-view.collapsed .trace-view-content {
    display: block;
  }
}

/* ============================================================================
   History metric badges
   ============================================================================ */
.badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 0.75em; font-weight: 600; margin-left: 4px; vertical-align: middle; font-family: var(--font-sans); }
.badge-grade { color: #fff; }
.badge-grade-A { background: var(--success); }
.badge-grade-B { background: #2196F3; }
.badge-grade-C { background: #FF9800; }
.badge-grade-D { background: #f44336; }
.badge-grade-F { background: #9E0000; }
.badge-flaky { background: #FF9800; color: #fff; }
.badge-perf { font-size: 0.7em; }
.badge-perf-improving { color: var(--success); }
.badge-perf-regressing { color: var(--error); }

/* ============================================================================
   Failure summary
   ============================================================================ */
.failure-summary {
  margin: 1rem 0;
  padding: 0.75rem 1rem;
  border: 1px solid var(--error);
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--error) 8%, transparent);
}
.failure-summary-header {
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--error);
  margin-bottom: 0.5rem;
}
.failure-summary-note {
  font-size: 0.75rem;
  color: var(--muted-foreground);
  margin-bottom: 0.5rem;
}
.failure-summary-note code {
  font-family: var(--font-mono);
  font-size: 0.75rem;
}
.failure-summary ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.failure-summary li a {
  font-family: var(--font-body);
  font-size: 0.8125rem;
  color: var(--foreground);
  text-decoration: none;
}
.failure-summary li a:hover {
  text-decoration: underline;
  color: var(--error);
}

/* ============================================================================
   Source permalink
   ============================================================================ */
.source-link {
  font-size: 0.6875rem;
  color: var(--muted-foreground);
  text-decoration: none;
  font-family: var(--font-mono);
}
.source-link:hover {
  text-decoration: underline;
  color: var(--foreground);
}

/* ============================================================================
   Detail Level Toggle
   ============================================================================ */
.detail-toggle {
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

.detail-toggle:hover {
  background: var(--accent);
  border-color: var(--border);
}

.detail-toggle:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--background), 0 0 0 4px var(--ring);
}

[data-detail-level="minimal"] .story-docs,
[data-detail-level="minimal"] .step-docs {
  display: none;
}
`;

const CORPORATE_JS = `
// Sidebar TOC navigation — highlight active section on scroll, click to smooth-scroll
(function() {
  var tocItems = document.querySelectorAll('.toc-item');
  if (!tocItems.length) return;

  var featureAnchors = [];
  tocItems.forEach(function(item) {
    var href = item.getAttribute('href');
    if (href) {
      var el = document.querySelector(href);
      if (el) featureAnchors.push({ el: el, tocItem: item });
    }
  });

  // Click handler — smooth scroll
  tocItems.forEach(function(item) {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      var href = item.getAttribute('href');
      if (!href) return;
      var target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Scroll handler — highlight active section
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function() {
      var scrollY = window.scrollY || document.documentElement.scrollTop;
      var viewportH = window.innerHeight;
      var activeIdx = -1;

      for (var i = featureAnchors.length - 1; i >= 0; i--) {
        var rect = featureAnchors[i].el.getBoundingClientRect();
        if (rect.top <= viewportH * 0.3) {
          activeIdx = i;
          break;
        }
      }

      tocItems.forEach(function(item) { item.classList.remove('active'); });
      if (activeIdx >= 0) {
        featureAnchors[activeIdx].tocItem.classList.add('active');
      }

      ticking = false;
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
`;

export const corporateTheme: HtmlTheme = {
  name: "corporate",
  label: "Corporate",
  css: CORPORATE_CSS,
  buildBody: corporateBuildBody,
  additionalJs: CORPORATE_JS,
};
