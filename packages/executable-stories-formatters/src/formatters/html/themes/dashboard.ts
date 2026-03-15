/**
 * Dashboard theme — Grafana/Datadog-inspired, data-dense, two-column layout.
 * Dark by default with DM Sans for UI and JetBrains Mono for metrics/timing.
 * Structural theme: overrides both CSS and HTML body via buildBody.
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

function dashboardBuildBody(args: BuildBodyArgs, deps: BuildBodyDeps): string {
  const { run } = args;

  const total = run.testCases.length;
  const passed = run.testCases.filter((tc) => tc.status === "passed").length;
  const failed = run.testCases.filter((tc) => tc.status === "failed").length;
  const skipped = run.testCases.filter(
    (tc) => tc.status === "skipped" || tc.status === "pending",
  ).length;
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

  const allTags = [...new Set(run.testCases.flatMap((tc) => tc.tags))].sort();
  const byFile = groupBy(run.testCases, (tc) => tc.sourceFile);

  // Build sidebar feature tree items
  const treeItems: string[] = [];
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
    const statusClass =
      fFailed > 0 ? "error" : fPassed === testCases.length ? "success" : "warning";

    treeItems.push(
      `<button type="button" class="db-tree-item" data-feature-index="${featureIndex}" title="${file}">
        <span class="db-tree-dot db-tree-dot--${statusClass}"></span>
        <span class="db-tree-name">${featureName}</span>
        <span class="db-tree-count">${testCases.length}</span>
      </button>`,
    );
    featureIndex++;
  }

  // Build tag chips
  const tagChips = allTags
    .map(
      (tag) =>
        `<span class="db-tag-chip">${tag}</span>`,
    )
    .join("\n          ");

  // Build run info
  const startDate = run.startedAtMs
    ? new Date(run.startedAtMs).toLocaleString()
    : "N/A";
  const durationSec =
    run.durationMs != null ? (run.durationMs / 1000).toFixed(1) : "N/A";

  // Build main content using deps (preserves all default classes)
  const mainParts: string[] = [];

  // Tag bar
  mainParts.push(
    deps.renderTagBar(
      { tags: allTags, totalScenarios: total },
      deps.tagBarDeps,
    ),
  );

  // Failure summary
  const failedCases = run.testCases.filter((tc) => tc.status === "failed");
  if (failedCases.length > 0) {
    mainParts.push(
      deps.renderFailureSummary({ failedCases }, deps.failureSummaryDeps),
    );
  }

  // Features
  for (const [file, testCases] of byFile) {
    mainParts.push(
      deps.renderFeature(
        { file, testCases, metricsMap: args.metricsMap },
        deps.featureDeps,
      ),
    );
  }

  const sidebar = `
<aside class="db-sidebar">
  <div class="db-sidebar-header">
    <div class="db-logo">Test Report</div>
    <div class="db-run-info">
      <span class="db-run-date">${startDate}</span>
      <span class="db-run-duration">${durationSec}s</span>
    </div>
  </div>

  <div class="db-metrics">
    <div class="db-metric db-metric--success">
      <div class="db-metric-value">${passed}</div>
      <div class="db-metric-label">Passed</div>
    </div>
    <div class="db-metric db-metric--error">
      <div class="db-metric-value">${failed}</div>
      <div class="db-metric-label">Failed</div>
    </div>
    <div class="db-metric db-metric--warning">
      <div class="db-metric-value">${skipped}</div>
      <div class="db-metric-label">Skipped</div>
    </div>
    <div class="db-metric db-metric--info">
      <div class="db-metric-value">${passRate}%</div>
      <div class="db-metric-label">Pass Rate</div>
    </div>
  </div>

  <div class="db-section">
    <div class="db-section-title">Features</div>
    <div class="db-tree">
      ${treeItems.join("\n      ")}
    </div>
  </div>

  ${
    allTags.length > 0
      ? `<div class="db-section">
    <div class="db-section-title">Tags</div>
    <div class="db-tag-chips">
      ${tagChips}
    </div>
  </div>`
      : ""
  }
</aside>`;

  const main = `
<div class="db-main">
  ${mainParts.join("\n  ")}
</div>`;

  return `<div class="dashboard-layout">${sidebar}${main}</div>`;
}

const DASHBOARD_CSS = `
/* ============================================================================
   Google Fonts Import - DM Sans + JetBrains Mono
   ============================================================================ */
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

/* ============================================================================
   CSS Custom Properties - Dark Mode (Default for Dashboard)
   ============================================================================ */
:root {
  /* Typography */
  --font-sans: "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;

  /* Base colors - dark by default */
  --background: #111318;
  --foreground: #e1e4ea;
  --card: #1a1d24;
  --card-foreground: #e1e4ea;
  --popover: #1a1d24;
  --popover-foreground: #e1e4ea;

  /* Primary - vibrant blue */
  --primary: #3b82f6;
  --primary-foreground: #ffffff;

  --secondary: #1e2028;
  --secondary-foreground: #c8ccd4;
  --muted: #1e2028;
  --muted-foreground: #6b7280;
  --accent: #252830;
  --accent-foreground: #e1e4ea;
  --destructive: #ef4444;
  --destructive-foreground: #ffffff;
  --border: #2a2d35;
  --input: #2a2d35;
  --ring: #3b82f6;
  --radius: 0.375rem;

  /* Shadows */
  --shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.4);
  --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.5), 0 1px 2px -1px rgb(0 0 0 / 0.45);
  --shadow: 0 4px 6px -1px rgb(0 0 0 / 0.5), 0 2px 4px -2px rgb(0 0 0 / 0.4);
  --shadow-md: 0 10px 15px -3px rgb(0 0 0 / 0.5), 0 4px 6px -4px rgb(0 0 0 / 0.4);

  /* Status colors - vibrant */
  --success: #10b981;
  --success-light: rgba(16, 185, 129, 0.1);
  --success-border: rgba(16, 185, 129, 0.25);
  --error: #ef4444;
  --error-light: rgba(239, 68, 68, 0.1);
  --error-border: rgba(239, 68, 68, 0.25);
  --warning: #f59e0b;
  --warning-light: rgba(245, 158, 11, 0.1);
  --warning-border: rgba(245, 158, 11, 0.25);
  --pending: #8b5cf6;
  --pending-light: rgba(139, 92, 246, 0.1);
  --pending-border: rgba(139, 92, 246, 0.25);

  /* Dashboard-specific */
  --keyword-color: #10b981;
  --tag-bg: rgba(59, 130, 246, 0.1);
  --tag-color: #60a5fa;
  --tag-border: rgba(59, 130, 246, 0.25);
  --step-param-color: #60a5fa;

  /* Accordion/Collapsible */
  --accordion-header-hover: #1e2028;
  --accordion-content-bg: #15171e;
}

/* Dark mode explicit */
[data-theme="dark"] {
  --font-sans: "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;

  --background: #111318;
  --foreground: #e1e4ea;
  --card: #1a1d24;
  --card-foreground: #e1e4ea;
  --popover: #1a1d24;
  --popover-foreground: #e1e4ea;

  --primary: #3b82f6;
  --primary-foreground: #ffffff;

  --secondary: #1e2028;
  --secondary-foreground: #c8ccd4;
  --muted: #1e2028;
  --muted-foreground: #6b7280;
  --accent: #252830;
  --accent-foreground: #e1e4ea;
  --destructive: #ef4444;
  --destructive-foreground: #ffffff;
  --border: #2a2d35;
  --input: #2a2d35;
  --ring: #3b82f6;
  --radius: 0.375rem;

  --shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.4);
  --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.5), 0 1px 2px -1px rgb(0 0 0 / 0.45);
  --shadow: 0 4px 6px -1px rgb(0 0 0 / 0.5), 0 2px 4px -2px rgb(0 0 0 / 0.4);
  --shadow-md: 0 10px 15px -3px rgb(0 0 0 / 0.5), 0 4px 6px -4px rgb(0 0 0 / 0.4);

  --success: #10b981;
  --success-light: rgba(16, 185, 129, 0.1);
  --success-border: rgba(16, 185, 129, 0.25);
  --error: #ef4444;
  --error-light: rgba(239, 68, 68, 0.1);
  --error-border: rgba(239, 68, 68, 0.25);
  --warning: #f59e0b;
  --warning-light: rgba(245, 158, 11, 0.1);
  --warning-border: rgba(245, 158, 11, 0.25);
  --pending: #8b5cf6;
  --pending-light: rgba(139, 92, 246, 0.1);
  --pending-border: rgba(139, 92, 246, 0.25);

  --keyword-color: #10b981;
  --tag-bg: rgba(59, 130, 246, 0.1);
  --tag-color: #60a5fa;
  --tag-border: rgba(59, 130, 246, 0.25);
  --step-param-color: #60a5fa;

  --accordion-header-hover: #1e2028;
  --accordion-content-bg: #15171e;
}

/* Light mode */
[data-theme="light"] {
  --background: #f8f9fb;
  --foreground: #1a1d24;
  --card: #ffffff;
  --card-foreground: #1a1d24;
  --popover: #ffffff;
  --popover-foreground: #1a1d24;

  --primary: #2563eb;
  --primary-foreground: #ffffff;

  --secondary: #f1f3f5;
  --secondary-foreground: #374151;
  --muted: #f1f3f5;
  --muted-foreground: #6b7280;
  --accent: #e8ebef;
  --accent-foreground: #1a1d24;
  --destructive: #dc2626;
  --destructive-foreground: #ffffff;
  --border: #e2e5ea;
  --input: #e2e5ea;
  --ring: #2563eb;

  --shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.04);
  --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06);
  --shadow: 0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05);
  --shadow-md: 0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.05);

  --success: #059669;
  --success-light: rgba(5, 150, 105, 0.08);
  --success-border: rgba(5, 150, 105, 0.2);
  --error: #dc2626;
  --error-light: rgba(220, 38, 38, 0.08);
  --error-border: rgba(220, 38, 38, 0.2);
  --warning: #d97706;
  --warning-light: rgba(217, 119, 6, 0.08);
  --warning-border: rgba(217, 119, 6, 0.2);
  --pending: #7c3aed;
  --pending-light: rgba(124, 58, 237, 0.08);
  --pending-border: rgba(124, 58, 237, 0.2);

  --keyword-color: #059669;
  --tag-bg: rgba(37, 99, 235, 0.08);
  --tag-color: #2563eb;
  --tag-border: rgba(37, 99, 235, 0.2);
  --step-param-color: #2563eb;

  --accordion-header-hover: #f1f3f5;
  --accordion-content-bg: #fafbfc;
}

/* Auto dark mode based on system preference */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --background: #111318;
    --foreground: #e1e4ea;
    --card: #1a1d24;
    --card-foreground: #e1e4ea;
    --popover: #1a1d24;
    --popover-foreground: #e1e4ea;
    --primary: #3b82f6;
    --primary-foreground: #ffffff;
    --secondary: #1e2028;
    --secondary-foreground: #c8ccd4;
    --muted: #1e2028;
    --muted-foreground: #6b7280;
    --accent: #252830;
    --accent-foreground: #e1e4ea;
    --destructive: #ef4444;
    --destructive-foreground: #ffffff;
    --border: #2a2d35;
    --input: #2a2d35;
    --ring: #3b82f6;
    --shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.4);
    --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.5), 0 1px 2px -1px rgb(0 0 0 / 0.45);
    --shadow: 0 4px 6px -1px rgb(0 0 0 / 0.5), 0 2px 4px -2px rgb(0 0 0 / 0.4);
    --shadow-md: 0 10px 15px -3px rgb(0 0 0 / 0.5), 0 4px 6px -4px rgb(0 0 0 / 0.4);
    --success: #10b981;
    --success-light: rgba(16, 185, 129, 0.1);
    --success-border: rgba(16, 185, 129, 0.25);
    --error: #ef4444;
    --error-light: rgba(239, 68, 68, 0.1);
    --error-border: rgba(239, 68, 68, 0.25);
    --warning: #f59e0b;
    --warning-light: rgba(245, 158, 11, 0.1);
    --warning-border: rgba(245, 158, 11, 0.25);
    --pending: #8b5cf6;
    --pending-light: rgba(139, 92, 246, 0.1);
    --pending-border: rgba(139, 92, 246, 0.25);
    --keyword-color: #10b981;
    --tag-bg: rgba(59, 130, 246, 0.1);
    --tag-color: #60a5fa;
    --tag-border: rgba(59, 130, 246, 0.25);
    --step-param-color: #60a5fa;
    --accordion-header-hover: #1e2028;
    --accordion-content-bg: #15171e;
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
  font-family: var(--font-sans);
  font-size: 13px;
  line-height: 1.5;
  color: var(--foreground);
  background-color: var(--background);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ============================================================================
   Layout - Container wraps the dashboard
   ============================================================================ */
.container {
  max-width: 100%;
  margin: 0;
  padding: 0;
}

/* ============================================================================
   Dashboard Two-Column Layout
   ============================================================================ */
.dashboard-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  min-height: 100vh;
}

@media (max-width: 900px) {
  .dashboard-layout {
    grid-template-columns: 1fr;
  }
}

/* ============================================================================
   Sidebar
   ============================================================================ */
.db-sidebar {
  background: var(--card);
  border-right: 1px solid var(--border);
  padding: 0;
  overflow-y: auto;
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

@media (max-width: 900px) {
  .db-sidebar {
    position: relative;
    height: auto;
    border-right: none;
    border-bottom: 1px solid var(--border);
  }
}

.db-sidebar-header {
  padding: 1.25rem 1rem 1rem;
  border-bottom: 1px solid var(--border);
}

.db-logo {
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--foreground);
  letter-spacing: -0.02em;
}

.db-run-info {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.375rem;
  font-size: 0.6875rem;
  color: var(--muted-foreground);
  font-family: var(--font-mono);
}

.db-run-duration {
  color: var(--primary);
  font-weight: 500;
}

/* ============================================================================
   Metrics Grid
   ============================================================================ */
.db-metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border);
}

.db-metric {
  padding: 0.625rem 0.75rem;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--background);
}

.db-metric-value {
  font-size: 1.375rem;
  font-weight: 700;
  font-family: var(--font-mono);
  line-height: 1.1;
  letter-spacing: -0.03em;
}

.db-metric-label {
  font-size: 0.625rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted-foreground);
  font-weight: 500;
  margin-top: 0.125rem;
}

.db-metric--success .db-metric-value { color: var(--success); }
.db-metric--success { border-color: var(--success-border); background: var(--success-light); }
.db-metric--error .db-metric-value { color: var(--error); }
.db-metric--error { border-color: var(--error-border); background: var(--error-light); }
.db-metric--warning .db-metric-value { color: var(--warning); }
.db-metric--warning { border-color: var(--warning-border); background: var(--warning-light); }
.db-metric--info .db-metric-value { color: var(--primary); }
.db-metric--info { border-color: var(--tag-border); background: var(--tag-bg); }

/* ============================================================================
   Sidebar Sections
   ============================================================================ */
.db-section {
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--border);
  flex: 1;
  overflow-y: auto;
}

.db-section:last-child {
  border-bottom: none;
  flex: none;
}

.db-section-title {
  font-size: 0.625rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted-foreground);
  font-weight: 600;
  padding: 0 1rem 0.5rem;
}

/* ============================================================================
   Feature Tree
   ============================================================================ */
.db-tree {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.db-tree-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4375rem 1rem;
  background: none;
  border: none;
  width: 100%;
  text-align: left;
  cursor: pointer;
  color: var(--foreground);
  font-family: var(--font-sans);
  font-size: 0.8125rem;
  transition: background-color 0.1s ease;
}

.db-tree-item:hover {
  background: var(--accent);
}

.db-tree-item.active {
  background: var(--accent);
  border-left: 2px solid var(--primary);
  padding-left: calc(1rem - 2px);
}

.db-tree-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.db-tree-dot--success { background: var(--success); }
.db-tree-dot--error { background: var(--error); }
.db-tree-dot--warning { background: var(--warning); }

.db-tree-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.db-tree-count {
  font-size: 0.6875rem;
  font-family: var(--font-mono);
  color: var(--muted-foreground);
  flex-shrink: 0;
}

/* ============================================================================
   Tag Chips (sidebar)
   ============================================================================ */
.db-tag-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  padding: 0 1rem;
}

.db-tag-chip {
  font-size: 0.6875rem;
  font-weight: 500;
  padding: 0.125rem 0.5rem;
  background: var(--tag-bg);
  color: var(--tag-color);
  border: 1px solid var(--tag-border);
  border-radius: 9999px;
  font-family: var(--font-mono);
}

/* ============================================================================
   Main Content Area
   ============================================================================ */
.db-main {
  padding: 1.25rem 1.5rem;
  overflow-y: auto;
  max-width: 1000px;
}

@media (max-width: 900px) {
  .db-main {
    padding: 1rem;
  }
}

/* ============================================================================
   Header - hidden in dashboard (info is in sidebar)
   ============================================================================ */
.header {
  display: none;
}

/* ============================================================================
   Meta Info - hidden in dashboard (info is in sidebar)
   ============================================================================ */
.meta-info {
  display: none;
}

/* ============================================================================
   Summary Cards - hidden in dashboard (metrics in sidebar)
   ============================================================================ */
.summary {
  display: none;
}

/* ============================================================================
   Tag Filter Bar
   ============================================================================ */
.tag-bar {
  margin-bottom: 0.75rem;
  padding: 0.625rem 0.875rem;
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
  font-size: 0.625rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted-foreground);
  font-weight: 500;
}

.tag-bar-count {
  font-size: 0.625rem;
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
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--error);
  background: var(--error-light);
  border: 1px solid var(--error-border);
  cursor: pointer;
  padding: 0.1875rem 0.625rem;
  border-radius: var(--radius);
  transition: all 0.15s ease;
}

.tag-bar-clear:hover {
  background: var(--error-border);
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
  margin-top: 0.375rem;
}

.tag-bar-collapsed .tag-bar-pills {
  display: none;
}

.tag-pill {
  font-size: 0.6875rem;
  font-weight: 500;
  padding: 0.1875rem 0.5rem;
  background: var(--tag-bg);
  color: var(--tag-color);
  border: 1px solid var(--tag-border);
  border-radius: 9999px;
  font-family: var(--font-mono);
  cursor: pointer;
  transition: all 0.15s ease;
}

.tag-pill:hover {
  background: var(--accent);
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
   Summary Card Status Filter
   ============================================================================ */
.summary-card.status-active {
  box-shadow: 0 0 0 2px var(--background), 0 0 0 4px var(--ring);
}

/* ============================================================================
   Filter Results Counter
   ============================================================================ */
.filter-results {
  text-align: center;
  font-size: 0.75rem;
  color: var(--muted-foreground);
  margin-bottom: 0.75rem;
  font-weight: 500;
}

/* ============================================================================
   Failure Summary
   ============================================================================ */
.failure-summary {
  margin-bottom: 0.75rem;
  padding: 0.75rem 0.875rem;
  background: var(--error-light);
  border: 1px solid var(--error-border);
  border-radius: var(--radius);
}

.failure-summary-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--error);
  margin-bottom: 0.375rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.failure-summary-list {
  list-style: none;
  padding: 0;
}

.failure-summary-list li {
  padding: 0.25rem 0;
}

.failure-summary-list a {
  font-size: 0.8125rem;
  color: var(--error);
  text-decoration: none;
  transition: opacity 0.15s ease;
}

.failure-summary-list a:hover {
  opacity: 0.8;
  text-decoration: underline;
}

/* ============================================================================
   Feature Sections - compact card style
   ============================================================================ */
.feature {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  margin-bottom: 0.5rem;
  overflow: hidden;
}

.feature-header {
  padding: 0.625rem 0.875rem;
  background: var(--card);
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.1s ease;
  gap: 0.75rem;
}

.feature-header:hover {
  background: var(--accordion-header-hover);
}

.feature-info {
  flex: 1;
  min-width: 0;
}

.feature-title {
  font-weight: 600;
  font-size: 0.8125rem;
  color: var(--foreground);
  letter-spacing: -0.01em;
}

.feature-path {
  font-size: 0.6875rem;
  color: var(--muted-foreground);
  font-family: var(--font-mono);
  margin-top: 0.0625rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.feature-stats {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  flex-shrink: 0;
}

.feature-stats .stat {
  display: inline-flex;
  align-items: center;
  gap: 0.1875rem;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
}

.feature-stats .stat.passed { color: var(--success); }
.feature-stats .stat.failed { color: var(--error); }
.feature-stats .stat.skipped { color: var(--warning); }

.feature-content {
  padding: 0.5rem;
  border-top: 1px solid var(--border);
  background: var(--accordion-content-bg);
}

.feature.collapsed .feature-content {
  display: none;
}

/* ============================================================================
   Scenarios - compact nested style
   ============================================================================ */
.scenario {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) - 1px);
  margin-bottom: 0.375rem;
  overflow: hidden;
}

.scenario:last-child {
  margin-bottom: 0;
}

.scenario-header {
  padding: 0.5rem 0.75rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  cursor: pointer;
  transition: background-color 0.1s ease;
  gap: 0.75rem;
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
  gap: 0.375rem;
  font-weight: 500;
  font-size: 0.8125rem;
  color: var(--foreground);
}

.scenario-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.scenario-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-top: 0.25rem;
}

.tag {
  font-size: 0.625rem;
  font-weight: 500;
  padding: 0.0625rem 0.375rem;
  background: var(--tag-bg);
  color: var(--tag-color);
  border: 1px solid var(--tag-border);
  border-radius: 9999px;
  font-family: var(--font-mono);
}

.scenario-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.scenario-duration {
  font-size: 0.6875rem;
  color: var(--muted-foreground);
  font-family: var(--font-mono);
  white-space: nowrap;
  flex-shrink: 0;
}

.scenario-content {
  padding: 0.5rem 0.75rem 0.75rem;
  border-top: 1px solid var(--border);
}

.scenario.collapsed .scenario-content {
  display: none;
}

/* ============================================================================
   Status Icons
   ============================================================================ */
.status-icon {
  font-size: 0.8125rem;
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
  margin-top: 0.125rem;
  padding: 0.125rem 0;
}

.step {
  display: flex;
  gap: 0.375rem;
  padding: 0.25rem 0;
  font-size: 0.75rem;
  align-items: baseline;
  line-height: 1.5;
}

.step-status {
  flex-shrink: 0;
  width: 0.875rem;
  text-align: center;
  font-size: 0.6875rem;
}

.step-keyword {
  font-weight: 600;
  color: var(--keyword-color);
  flex-shrink: 0;
  min-width: 48px;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
}

.step.continuation {
  padding-left: 1rem;
}

.step.continuation .step-keyword {
  color: var(--muted-foreground);
  font-weight: 500;
}

.step-text {
  flex: 1;
  color: var(--foreground);
}

.step-param {
  font-style: italic;
  font-weight: 500;
  color: var(--step-param-color);
}

.step-duration {
  color: var(--muted-foreground);
  font-size: 0.625rem;
  font-family: var(--font-mono);
  white-space: nowrap;
  opacity: 0.6;
}

/* ============================================================================
   Error Display
   ============================================================================ */
.error-box {
  margin-top: 0.5rem;
  padding: 0.625rem 0.75rem;
  background: var(--error-light);
  border-radius: calc(var(--radius) - 1px);
  border: 1px solid var(--error-border);
  border-left: 3px solid var(--error);
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-x: auto;
  color: var(--error);
}

/* ============================================================================
   Attachments
   ============================================================================ */
.attachments {
  margin-top: 0.5rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.attachment {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.625rem;
  background: var(--muted);
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) - 1px);
  font-size: 0.6875rem;
  font-family: var(--font-mono);
  text-decoration: none;
  color: var(--muted-foreground);
  transition: all 0.1s ease;
}

.attachment:hover {
  background: var(--accent);
  color: var(--foreground);
  border-color: var(--ring);
}

.attachment-image {
  max-width: 100%;
  margin-top: 0.375rem;
  border-radius: calc(var(--radius) - 1px);
  border: 1px solid var(--border);
}

.attachment-video {
  max-width: 100%;
  margin-top: 0.375rem;
  border-radius: calc(var(--radius) - 1px);
  border: 1px solid var(--border);
}

/* ============================================================================
   Chevron Icon
   ============================================================================ */
.chevron {
  color: var(--muted-foreground);
  transition: transform 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 0.6875rem;
  flex-shrink: 0;
}

.collapsed .chevron {
  transform: rotate(-90deg);
}

/* ============================================================================
   Scrollbars - thin dark
   ============================================================================ */
::-webkit-scrollbar {
  width: 5px;
  height: 5px;
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
  background: rgba(59, 130, 246, 0.2);
  color: inherit;
}

/* ============================================================================
   Animations - subtle
   ============================================================================ */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-2px); }
  to { opacity: 1; transform: translateY(0); }
}

.feature {
  animation: fadeIn 0.15s ease-out;
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

  body { font-size: 11px; }
  .container { max-width: 100%; padding: 0; }

  .dashboard-layout { grid-template-columns: 1fr; }
  .db-sidebar { display: none; }

  .header-actions,
  .tag-bar,
  .filter-results { display: none !important; }

  .feature,
  .scenario {
    page-break-inside: avoid;
    box-shadow: none;
    animation: none;
  }

  .collapsed .feature-content,
  .collapsed .scenario-content { display: block; }
}

/* ============================================================================
   Documentation Entries - Containers
   ============================================================================ */
.story-docs {
  margin-bottom: 0.5rem;
  padding: 0.5rem;
  background: var(--accordion-content-bg);
  border-radius: calc(var(--radius) - 1px);
  border: 1px solid var(--border);
}

.step-docs {
  margin-left: 1.25rem;
  margin-top: 0.125rem;
  margin-bottom: 0.375rem;
  padding: 0.375rem 0.625rem;
  background: var(--accordion-content-bg);
  border-left: 2px solid var(--primary);
  border-radius: 0 calc(var(--radius) - 1px) calc(var(--radius) - 1px) 0;
}

/* ============================================================================
   Documentation Entries - Note
   ============================================================================ */
.doc-note {
  padding: 0.375rem 0.625rem;
  margin-bottom: 0.375rem;
  background: var(--muted);
  border-left: 3px solid var(--primary);
  border-radius: 0 calc(var(--radius) - 1px) calc(var(--radius) - 1px) 0;
  font-size: 0.75rem;
  line-height: 1.5;
  color: var(--foreground);
}

.doc-note:last-child { margin-bottom: 0; }

/* ============================================================================
   Documentation Entries - Tags
   ============================================================================ */
.doc-tag {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-bottom: 0.375rem;
}

.doc-tag:last-child { margin-bottom: 0; }

.doc-tag-item {
  font-size: 0.625rem;
  font-weight: 500;
  padding: 0.0625rem 0.375rem;
  background: var(--tag-bg);
  color: var(--tag-color);
  border: 1px solid var(--tag-border);
  border-radius: 9999px;
  font-family: var(--font-mono);
}

/* ============================================================================
   Documentation Entries - Key-Value
   ============================================================================ */
.doc-kv {
  display: flex;
  gap: 0.375rem;
  margin-bottom: 0.25rem;
  font-size: 0.75rem;
  align-items: baseline;
}

.doc-kv:last-child { margin-bottom: 0; }

.doc-kv-label {
  font-weight: 600;
  color: var(--muted-foreground);
  font-family: var(--font-mono);
  font-size: 0.6875rem;
}

.doc-kv-value {
  color: var(--foreground);
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  white-space: pre-wrap;
  word-break: break-word;
}

/* ============================================================================
   Documentation Entries - Code
   ============================================================================ */
.doc-code {
  margin-bottom: 0.375rem;
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) - 1px);
  overflow: hidden;
}

.doc-code:last-child { margin-bottom: 0; }

.doc-code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.25rem 0.625rem;
  background: var(--muted);
  border-bottom: 1px solid var(--border);
}

.doc-code-label {
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--muted-foreground);
}

.doc-code-lang {
  font-size: 0.5625rem;
  font-weight: 500;
  padding: 0.0625rem 0.3125rem;
  background: var(--primary);
  color: var(--primary-foreground);
  border-radius: 9999px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.doc-code-content {
  margin: 0;
  padding: 0.625rem;
  background: var(--card);
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  line-height: 1.5;
  overflow-x: auto;
  white-space: pre;
}

.doc-code-content code {
  font-family: inherit;
  background: none;
}

/* ============================================================================
   Documentation Entries - Table
   ============================================================================ */
.doc-table {
  margin-bottom: 0.375rem;
}

.doc-table:last-child { margin-bottom: 0; }

.doc-table-label {
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--muted-foreground);
  margin-bottom: 0.25rem;
}

.doc-table table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.6875rem;
  font-family: var(--font-mono);
}

.doc-table th,
.doc-table td {
  padding: 0.375rem 0.625rem;
  text-align: left;
  border: 1px solid var(--border);
}

.doc-table th {
  background: var(--muted);
  font-weight: 600;
  color: var(--foreground);
}

.doc-table td {
  background: var(--card);
  color: var(--foreground);
}

.doc-table tr:hover td {
  background: var(--accordion-header-hover);
}

/* ============================================================================
   Documentation Entries - Link
   ============================================================================ */
.doc-link {
  margin-bottom: 0.25rem;
}

.doc-link:last-child { margin-bottom: 0; }

.doc-link a {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: var(--primary);
  text-decoration: none;
  transition: color 0.1s ease;
}

.doc-link a:hover {
  color: var(--keyword-color);
  text-decoration: underline;
}

.doc-link a::before {
  content: "\\2192";
  font-size: 0.6875rem;
}

/* ============================================================================
   Documentation Entries - Section
   ============================================================================ */
.doc-section {
  margin-bottom: 0.375rem;
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) - 1px);
  overflow: hidden;
}

.doc-section:last-child { margin-bottom: 0; }

.doc-section-title {
  padding: 0.375rem 0.625rem;
  background: var(--muted);
  border-bottom: 1px solid var(--border);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--foreground);
}

.doc-section-content {
  margin: 0;
  padding: 0.625rem;
  background: var(--card);
  font-size: 0.75rem;
  line-height: 1.5;
  white-space: pre-wrap;
  color: var(--foreground);
}

/* Parsed markdown content in sections */
.doc-section-parsed .doc-section-content { white-space: normal; }

.doc-section-parsed .doc-section-content h1,
.doc-section-parsed .doc-section-content h2,
.doc-section-parsed .doc-section-content h3,
.doc-section-parsed .doc-section-content h4,
.doc-section-parsed .doc-section-content h5,
.doc-section-parsed .doc-section-content h6 {
  margin-top: 0.75em;
  margin-bottom: 0.375em;
  font-weight: 600;
  line-height: 1.3;
  color: var(--foreground);
}

.doc-section-parsed .doc-section-content h1:first-child,
.doc-section-parsed .doc-section-content h2:first-child,
.doc-section-parsed .doc-section-content h3:first-child { margin-top: 0; }

.doc-section-parsed .doc-section-content h1 { font-size: 1.125rem; }
.doc-section-parsed .doc-section-content h2 { font-size: 1rem; }
.doc-section-parsed .doc-section-content h3 { font-size: 0.9375rem; }
.doc-section-parsed .doc-section-content h4 { font-size: 0.875rem; }
.doc-section-parsed .doc-section-content h5 { font-size: 0.8125rem; }
.doc-section-parsed .doc-section-content h6 { font-size: 0.75rem; color: var(--muted-foreground); }

.doc-section-parsed .doc-section-content p { margin: 0.375em 0; }
.doc-section-parsed .doc-section-content p:first-child { margin-top: 0; }
.doc-section-parsed .doc-section-content p:last-child { margin-bottom: 0; }

.doc-section-parsed .doc-section-content ul,
.doc-section-parsed .doc-section-content ol { margin: 0.375em 0; padding-left: 1.25em; }
.doc-section-parsed .doc-section-content li { margin: 0.125em 0; }

.doc-section-parsed .doc-section-content a { color: var(--primary); text-decoration: none; }
.doc-section-parsed .doc-section-content a:hover { text-decoration: underline; }

.doc-section-parsed .doc-section-content code {
  font-family: var(--font-mono);
  font-size: 0.85em;
  padding: 0.0625em 0.25em;
  background: var(--muted);
  border-radius: 3px;
}

.doc-section-parsed .doc-section-content pre {
  margin: 0.5em 0;
  padding: 0.625em;
  background: var(--muted);
  border-radius: calc(var(--radius) - 1px);
  overflow-x: auto;
}

.doc-section-parsed .doc-section-content pre code { padding: 0; background: none; }

.doc-section-parsed .doc-section-content blockquote {
  margin: 0.5em 0;
  padding: 0.375em 0.75em;
  border-left: 3px solid var(--primary);
  background: var(--muted);
  color: var(--muted-foreground);
}

.doc-section-parsed .doc-section-content blockquote p { margin: 0; }

.doc-section-parsed .doc-section-content hr {
  margin: 0.75em 0;
  border: none;
  border-top: 1px solid var(--border);
}

.doc-section-parsed .doc-section-content table {
  width: 100%;
  margin: 0.5em 0;
  border-collapse: collapse;
  font-size: 0.75rem;
}

.doc-section-parsed .doc-section-content th,
.doc-section-parsed .doc-section-content td {
  padding: 0.375em 0.625em;
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
  border-radius: calc(var(--radius) - 1px);
}

/* ============================================================================
   Documentation Entries - Mermaid
   ============================================================================ */
.doc-mermaid {
  margin-bottom: 0.375rem;
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) - 1px);
  overflow: hidden;
}

.doc-mermaid:last-child { margin-bottom: 0; }

.doc-mermaid-title {
  padding: 0.25rem 0.625rem;
  background: var(--muted);
  border-bottom: 1px solid var(--border);
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--muted-foreground);
}

.doc-mermaid-title::before {
  content: "\\25C7 ";
  color: var(--primary);
}

.doc-mermaid-code {
  margin: 0;
  padding: 0.625rem;
  background: var(--card);
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  line-height: 1.5;
  overflow-x: auto;
  white-space: pre;
}

.doc-mermaid-code code {
  font-family: inherit;
  background: none;
}

/* ============================================================================
   Documentation Entries - Screenshot
   ============================================================================ */
.doc-screenshot { margin-bottom: 0.375rem; }
.doc-screenshot:last-child { margin-bottom: 0; }

.doc-screenshot-img {
  max-width: 100%;
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) - 1px);
  display: block;
}

.doc-screenshot-caption {
  margin-top: 0.25rem;
  font-size: 0.6875rem;
  color: var(--muted-foreground);
  font-style: italic;
}

/* ============================================================================
   Documentation Entries - Custom
   ============================================================================ */
.doc-custom {
  margin-bottom: 0.375rem;
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) - 1px);
  overflow: hidden;
}

.doc-custom:last-child { margin-bottom: 0; }

.doc-custom-type {
  padding: 0.25rem 0.625rem;
  background: var(--warning-light);
  border-bottom: 1px solid var(--warning-border);
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--warning);
}

.doc-custom-data {
  margin: 0;
  padding: 0.625rem;
  background: var(--card);
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  line-height: 1.5;
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
  margin-top: 0.5rem;
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) - 1px);
  overflow: hidden;
}

.trace-view-header {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.625rem;
  background: var(--card);
  cursor: pointer;
  user-select: none;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--foreground);
  transition: background-color 0.1s ease;
}

.trace-view-header:hover {
  background: var(--accordion-header-hover);
}

.trace-view-count {
  font-size: 0.625rem;
  font-weight: 500;
  padding: 0.0625rem 0.375rem;
  background: var(--success-light);
  color: var(--success);
  border: 1px solid var(--success-border);
  border-radius: 9999px;
}

/* ============================================================================
   Search Input
   ============================================================================ */
.search-input {
  height: 2rem;
  padding: 0 0.75rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans);
  font-size: 0.8125rem;
  width: 200px;
  transition: all 0.1s ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--ring);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.search-input::placeholder {
  color: var(--muted-foreground);
}

/* ============================================================================
   Theme Toggle
   ============================================================================ */
.theme-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--background);
  cursor: pointer;
  color: var(--foreground);
  font-size: 0.875rem;
  transition: all 0.1s ease;
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
   Summary Card (kept for JS filter compatibility)
   ============================================================================ */
.summary-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0.75rem 1rem;
  transition: all 0.1s ease;
}

.summary-card .label {
  font-size: 0.625rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted-foreground);
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.summary-card .value {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.1;
  font-family: var(--font-mono);
}

.summary-card.passed { background: var(--success-light); border-color: var(--success-border); }
.summary-card.passed .value { color: var(--success); }
.summary-card.failed { background: var(--error-light); border-color: var(--error-border); }
.summary-card.failed .value { color: var(--error); }
.summary-card.skipped { background: var(--warning-light); border-color: var(--warning-border); }
.summary-card.skipped .value { color: var(--warning); }
.summary-card.pending { background: var(--pending-light); border-color: var(--pending-border); }
.summary-card.pending .value { color: var(--pending); }

/* ============================================================================
   Retry info
   ============================================================================ */
.retry-info {
  font-size: 0.625rem;
  font-weight: 500;
  padding: 0.0625rem 0.375rem;
  background: var(--warning-light);
  color: var(--warning);
  border: 1px solid var(--warning-border);
  border-radius: 9999px;
  font-family: var(--font-mono);
}

/* ============================================================================
   Metrics badge (sparkline-like trend indicator)
   ============================================================================ */
.metrics-badge {
  font-size: 0.625rem;
  font-weight: 500;
  padding: 0.0625rem 0.375rem;
  border-radius: 9999px;
  font-family: var(--font-mono);
}

.metrics-badge.improving {
  background: var(--success-light);
  color: var(--success);
  border: 1px solid var(--success-border);
}

.metrics-badge.degrading {
  background: var(--error-light);
  color: var(--error);
  border: 1px solid var(--error-border);
}

.metrics-badge.stable {
  background: var(--muted);
  color: var(--muted-foreground);
  border: 1px solid var(--border);
}
`;

const DASHBOARD_JS = `
(function() {
  // Feature tree navigation: click to scroll
  var treeItems = document.querySelectorAll('.db-tree-item');
  var features = document.querySelectorAll('.db-main .feature');

  treeItems.forEach(function(item) {
    item.addEventListener('click', function() {
      var index = parseInt(item.getAttribute('data-feature-index'), 10);
      var target = features[index];
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Expand if collapsed
        if (target.classList.contains('collapsed')) {
          target.classList.remove('collapsed');
          var header = target.querySelector('.feature-header');
          if (header) header.setAttribute('aria-expanded', 'true');
        }
      }
      // Mark active
      treeItems.forEach(function(t) { t.classList.remove('active'); });
      item.classList.add('active');
    });
  });

  // Highlight active feature in sidebar on scroll
  var mainEl = document.querySelector('.db-main');
  if (mainEl && features.length > 0) {
    var onScroll = function() {
      var scrollTop = mainEl.scrollTop || window.scrollY;
      var activeIndex = 0;
      features.forEach(function(f, i) {
        var rect = f.getBoundingClientRect();
        if (rect.top <= 120) {
          activeIndex = i;
        }
      });
      treeItems.forEach(function(t, i) {
        if (i === activeIndex) {
          t.classList.add('active');
        } else {
          t.classList.remove('active');
        }
      });
    };

    // Listen on both the main element and window for scroll
    mainEl.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
  }
})();
`;

export const dashboardTheme: HtmlTheme = {
  name: "dashboard",
  label: "Dashboard",
  css: DASHBOARD_CSS,
  buildBody: dashboardBuildBody,
  additionalJs: DASHBOARD_JS,
};
