/**
 * Playful theme — warm pastels, rounded corners, cheerful aesthetic.
 * Nunito font, WCAG AAA contrast, color-blind safe palette.
 */

import type { HtmlTheme } from "./types.js";

export const playfulTheme: HtmlTheme = {
  name: "playful",
  label: "Playful",
  css: `
/* ============================================================================
   Google Fonts Import - Nunito for playful headings
   ============================================================================ */
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&family=Source+Sans+3:wght@400;500;600&family=Source+Code+Pro:wght@400;500&display=swap');

/* ============================================================================
   CSS Custom Properties - Light Mode (Default)
   Warm pastel palette with coral accent
   ============================================================================ */
:root {
  /* Typography */
  --font-sans: "Source Sans 3", "Nunito", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-mono: "Source Code Pro", ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;

  /* Base colors — warm cream background, brown foreground */
  --background: #fef7f0;
  --foreground: #3d3229;
  --card: #ffffff;
  --card-foreground: #3d3229;
  --popover: #ffffff;
  --popover-foreground: #3d3229;

  /* Coral/salmon as primary */
  --primary: #e07a5f;
  --primary-foreground: #ffffff;

  --secondary: #fdf0e6;
  --secondary-foreground: #3d3229;
  --muted: #f5ebe0;
  --muted-foreground: #6b5b4e;
  --accent: #fdf0e6;
  --accent-foreground: #3d3229;
  --destructive: #c44536;
  --destructive-foreground: #ffffff;
  --border: #e6d5c3;
  --input: #e6d5c3;
  --ring: #e07a5f;
  --radius: 1rem;

  /* Shadows — soft and warm */
  --shadow-xs: 0 1px 2px 0 rgb(61 50 41 / 0.04);
  --shadow-sm: 0 1px 4px 0 rgb(61 50 41 / 0.06), 0 1px 2px -1px rgb(61 50 41 / 0.04);
  --shadow: 0 4px 8px -2px rgb(61 50 41 / 0.08), 0 2px 4px -2px rgb(61 50 41 / 0.04);
  --shadow-md: 0 10px 20px -4px rgb(61 50 41 / 0.1), 0 4px 8px -4px rgb(61 50 41 / 0.05);

  /* Status colors — color-blind safe, cheerful */
  --success: #2d8659;
  --success-light: #eef8f0;
  --success-border: #b8e0c8;
  --error: #c44536;
  --error-light: #fdf0ee;
  --error-border: #f0c4be;
  --warning: #c77d18;
  --warning-light: #fdf5e6;
  --warning-border: #f0d8a8;
  --pending: #7c5cbf;
  --pending-light: #f4f0fa;
  --pending-border: #d4c8ec;

  /* Playful-specific */
  --keyword-color: #b05740;
  --tag-bg: #fdf0e6;
  --tag-color: #b05740;
  --tag-border: #f0cdb8;
  --step-param-color: #5b7fc7;

  /* Accordion/Collapsible styling */
  --accordion-header-hover: #fdf5ed;
  --accordion-content-bg: #fdf8f3;
}

/* ============================================================================
   Dark Mode — warm dark palette
   ============================================================================ */
[data-theme="dark"] {
  --font-sans: "Source Sans 3", "Nunito", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-mono: "Source Code Pro", ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;

  --background: #1e1814;
  --foreground: #f0e6dc;
  --card: #2a2118;
  --card-foreground: #f0e6dc;
  --popover: #2a2118;
  --popover-foreground: #f0e6dc;

  --primary: #e8957d;
  --primary-foreground: #1e1814;

  --secondary: #332920;
  --secondary-foreground: #f0e6dc;
  --muted: #332920;
  --muted-foreground: #a89585;
  --accent: #332920;
  --accent-foreground: #f0e6dc;
  --destructive: #e05a4c;
  --destructive-foreground: #ffffff;
  --border: #4a3d32;
  --input: #4a3d32;
  --ring: #e8957d;
  --radius: 1rem;

  --shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.25);
  --shadow-sm: 0 1px 4px 0 rgb(0 0 0 / 0.35), 0 1px 2px -1px rgb(0 0 0 / 0.3);
  --shadow: 0 4px 8px -2px rgb(0 0 0 / 0.35), 0 2px 4px -2px rgb(0 0 0 / 0.3);
  --shadow-md: 0 10px 20px -4px rgb(0 0 0 / 0.4), 0 4px 8px -4px rgb(0 0 0 / 0.3);

  --success: #5ab87e;
  --success-light: #1e2e22;
  --success-border: #2d5e3e;
  --error: #e05a4c;
  --error-light: #2e1e1c;
  --error-border: #6b302a;
  --warning: #e0a63e;
  --warning-light: #2e2518;
  --warning-border: #6b5120;
  --pending: #a68be0;
  --pending-light: #241e30;
  --pending-border: #4a3870;

  --keyword-color: #e8957d;
  --tag-bg: #332920;
  --tag-color: #e8957d;
  --tag-border: #5a4535;
  --step-param-color: #8aade0;

  --accordion-header-hover: #332920;
  --accordion-content-bg: #241e18;
}

/* Auto dark mode based on system preference */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --background: #1e1814;
    --foreground: #f0e6dc;
    --card: #2a2118;
    --card-foreground: #f0e6dc;
    --popover: #2a2118;
    --popover-foreground: #f0e6dc;
    --primary: #e8957d;
    --primary-foreground: #1e1814;
    --secondary: #332920;
    --secondary-foreground: #f0e6dc;
    --muted: #332920;
    --muted-foreground: #a89585;
    --accent: #332920;
    --accent-foreground: #f0e6dc;
    --destructive: #e05a4c;
    --destructive-foreground: #ffffff;
    --border: #4a3d32;
    --input: #4a3d32;
    --ring: #e8957d;
    --shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.25);
    --shadow-sm: 0 1px 4px 0 rgb(0 0 0 / 0.35), 0 1px 2px -1px rgb(0 0 0 / 0.3);
    --shadow: 0 4px 8px -2px rgb(0 0 0 / 0.35), 0 2px 4px -2px rgb(0 0 0 / 0.3);
    --shadow-md: 0 10px 20px -4px rgb(0 0 0 / 0.4), 0 4px 8px -4px rgb(0 0 0 / 0.3);
    --success: #5ab87e;
    --success-light: #1e2e22;
    --success-border: #2d5e3e;
    --error: #e05a4c;
    --error-light: #2e1e1c;
    --error-border: #6b302a;
    --warning: #e0a63e;
    --warning-light: #2e2518;
    --warning-border: #6b5120;
    --pending: #a68be0;
    --pending-light: #241e30;
    --pending-border: #4a3870;
    --keyword-color: #e8957d;
    --tag-bg: #332920;
    --tag-color: #e8957d;
    --tag-border: #5a4535;
    --step-param-color: #8aade0;
    --accordion-header-hover: #332920;
    --accordion-content-bg: #241e18;
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
  font-size: 15px;
  line-height: 1.7;
  color: var(--foreground);
  background-color: var(--background);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

h1, h2, h3, h4, h5, h6,
.feature-title,
.header h1 {
  font-family: "Nunito", var(--font-sans);
  font-weight: 700;
}

/* ============================================================================
   Layout
   ============================================================================ */
.container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 1.5rem;
}

@media (min-width: 768px) {
  .container {
    padding: 2.5rem 3rem;
  }
}

/* ============================================================================
   Header — playful style
   ============================================================================ */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 1.5rem;
  margin-bottom: 2rem;
  border-bottom: 2px solid var(--border);
}

.header h1 {
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--foreground);
}

.header-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

/* ============================================================================
   Theme Toggle — large touch target
   ============================================================================ */
.theme-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border: 2px solid var(--border);
  border-radius: var(--radius);
  background: var(--card);
  cursor: pointer;
  color: var(--foreground);
  font-size: 1.125rem;
  transition: all 0.2s ease;
}

.theme-toggle:hover {
  background: var(--accent);
  border-color: var(--primary);
  transform: scale(1.05);
}

.theme-toggle:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--background), 0 0 0 5px var(--ring);
}

/* ============================================================================
   Search Input — rounded, large touch target
   ============================================================================ */
.search-input {
  height: 2.75rem;
  padding: 0 1rem;
  border: 2px solid var(--border);
  border-radius: var(--radius);
  background: var(--card);
  color: var(--foreground);
  font-family: var(--font-sans);
  font-size: 0.9375rem;
  width: 220px;
  transition: all 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--ring);
  box-shadow: 0 0 0 4px rgb(224 122 95 / 0.15);
}

.search-input::placeholder {
  color: var(--muted-foreground);
}

@media (min-width: 640px) {
  .search-input {
    width: 280px;
  }
}

/* ============================================================================
   Meta Info — warm card
   ============================================================================ */
.meta-info {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem 2rem;
  margin-bottom: 1.5rem;
  padding: 1rem 1.25rem;
  background: var(--card);
  border: 2px solid var(--border);
  border-radius: var(--radius);
  font-size: 0.875rem;
  color: var(--muted-foreground);
}

.meta-info dt {
  font-weight: 600;
  color: var(--foreground);
  display: inline;
}

.meta-info dd {
  display: inline;
  margin: 0 0 0 0.375rem;
  font-family: var(--font-mono);
  font-size: 0.8125rem;
}

/* ============================================================================
   Summary Cards — pastel tinted with hover animation
   ============================================================================ */
.summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
}

@media (max-width: 640px) {
  .summary {
    grid-template-columns: repeat(2, 1fr);
  }
}

.summary-card {
  background: var(--card);
  border: 2px solid var(--border);
  border-radius: var(--radius);
  padding: 1.25rem 1.5rem;
  transition: all 0.25s ease;
  cursor: default;
}

.summary-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-3px);
}

.summary-card .label {
  font-family: "Nunito", var(--font-sans);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted-foreground);
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.summary-card .value {
  font-family: "Nunito", var(--font-sans);
  font-size: 2.25rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.1;
}

/* Passed — green tint */
.summary-card.passed {
  background: var(--success-light);
  border-color: var(--success-border);
}
.summary-card.passed .value { color: var(--success); }

/* Failed — red tint */
.summary-card.failed {
  background: var(--error-light);
  border-color: var(--error-border);
}
.summary-card.failed .value { color: var(--error); }

/* Skipped — amber tint */
.summary-card.skipped {
  background: var(--warning-light);
  border-color: var(--warning-border);
}
.summary-card.skipped .value { color: var(--warning); }

/* Pending — purple tint */
.summary-card.pending {
  background: var(--pending-light);
  border-color: var(--pending-border);
}
.summary-card.pending .value { color: var(--pending); }

/* ============================================================================
   Tag Filter Bar
   ============================================================================ */
.tag-bar {
  margin-bottom: 1.25rem;
  padding: 1rem 1.25rem;
  background: var(--card);
  border: 2px solid var(--border);
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
  font-family: "Nunito", var(--font-sans);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted-foreground);
  font-weight: 700;
}

.tag-bar-count {
  font-size: 0.75rem;
  font-weight: 700;
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
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--destructive);
  background: var(--error-light);
  border: 2px solid var(--error-border);
  cursor: pointer;
  padding: 0.375rem 0.875rem;
  border-radius: var(--radius);
  transition: all 0.2s ease;
  min-height: 2.25rem;
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
  gap: 0.5rem;
  max-height: 200px;
  overflow-y: auto;
  margin-top: 0.625rem;
}

.tag-bar-collapsed .tag-bar-pills {
  display: none;
}

.tag-pill {
  font-size: 0.8125rem;
  font-weight: 600;
  padding: 0.375rem 0.75rem;
  background: var(--tag-bg);
  color: var(--tag-color);
  border: 2px solid var(--tag-border);
  border-radius: 9999px;
  font-family: var(--font-mono);
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 2rem;
}

.tag-pill:hover {
  background: var(--success-border);
  transform: scale(1.05);
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
  box-shadow: 0 0 0 3px var(--background), 0 0 0 5px var(--ring);
}

/* ============================================================================
   Filter Results Counter
   ============================================================================ */
.filter-results {
  text-align: center;
  font-size: 0.875rem;
  color: var(--muted-foreground);
  margin-bottom: 1.25rem;
  font-weight: 600;
}

/* ============================================================================
   Feature Sections — rounded accordion
   ============================================================================ */
.feature {
  background: var(--card);
  border: 2px solid var(--border);
  border-radius: var(--radius);
  margin-bottom: 0.875rem;
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
  transition: background-color 0.2s ease;
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
  font-weight: 700;
  font-size: 1.0625rem;
  color: var(--foreground);
  letter-spacing: -0.01em;
}

.feature-path {
  font-size: 0.8125rem;
  color: var(--muted-foreground);
  font-family: var(--font-mono);
  margin-top: 0.1875rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.feature-stats {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.875rem;
  font-weight: 600;
  flex-shrink: 0;
}

.feature-stats .stat {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-family: var(--font-mono);
  font-size: 0.8125rem;
}

.feature-stats .stat.passed { color: var(--success); }
.feature-stats .stat.failed { color: var(--error); }
.feature-stats .stat.skipped { color: var(--warning); }

.feature-content {
  padding: 0.75rem;
  border-top: 2px solid var(--border);
  background: var(--accordion-content-bg);
}

.feature.collapsed .feature-content {
  display: none;
}

/* ============================================================================
   Scenarios — pastel nested cards
   ============================================================================ */
.scenario {
  background: var(--card);
  border: 2px solid var(--border);
  border-radius: calc(var(--radius) - 2px);
  margin-bottom: 0.625rem;
  overflow: hidden;
}

.scenario:last-child {
  margin-bottom: 0;
}

.scenario-header {
  padding: 0.875rem 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  cursor: pointer;
  transition: background-color 0.2s ease;
  gap: 1rem;
  min-height: 2.75rem;
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
  font-weight: 600;
  font-size: 0.9375rem;
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
  gap: 0.375rem;
  margin-top: 0.5rem;
}

.tag {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.1875rem 0.625rem;
  background: var(--tag-bg);
  color: var(--tag-color);
  border: 2px solid var(--tag-border);
  border-radius: 9999px;
  font-family: var(--font-mono);
}

.scenario-duration {
  font-size: 0.8125rem;
  color: var(--muted-foreground);
  font-family: var(--font-mono);
  white-space: nowrap;
  flex-shrink: 0;
}

.scenario-content {
  padding: 0.875rem 1.25rem 1.25rem;
  border-top: 2px solid var(--border);
}

.scenario.collapsed .scenario-content {
  display: none;
}

/* ============================================================================
   Status Icons — cheerful
   ============================================================================ */
.status-icon {
  font-size: 1rem;
  line-height: 1;
  flex-shrink: 0;
}

.status-passed { color: var(--success); }
.status-failed { color: var(--error); }
.status-skipped { color: var(--warning); }
.status-pending { color: var(--pending); }

/* ============================================================================
   Steps — individual pastel cards
   ============================================================================ */
.steps {
  margin-top: 0.375rem;
  padding: 0.25rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.step {
  display: flex;
  gap: 0.625rem;
  padding: 0.625rem 0.875rem;
  font-size: 0.875rem;
  align-items: baseline;
  line-height: 1.6;
  background: var(--accordion-content-bg);
  border: 2px solid var(--border);
  border-radius: calc(var(--radius) - 4px);
  transition: border-color 0.2s ease;
}

.step:hover {
  border-color: var(--primary);
}

.step-status {
  flex-shrink: 0;
  width: 1.125rem;
  text-align: center;
  font-size: 0.8125rem;
}

.step-keyword {
  font-weight: 700;
  color: var(--keyword-color);
  flex-shrink: 0;
  min-width: 56px;
  font-family: var(--font-mono);
  font-size: 0.8125rem;
}

/* Indent continuation keywords (And, But, *) to show they belong to previous step */
.step.continuation {
  padding-left: 2rem;
}

.step.continuation .step-keyword {
  color: var(--muted-foreground);
  font-weight: 600;
}

.step-text {
  flex: 1;
  color: var(--foreground);
}

.step-param {
  font-style: italic;
  font-weight: 600;
  color: var(--step-param-color);
}

.step-duration {
  color: var(--muted-foreground);
  font-size: 0.75rem;
  font-family: var(--font-mono);
  white-space: nowrap;
  opacity: 0.7;
}

/* ============================================================================
   Error Display — alert style
   ============================================================================ */
.error-box {
  margin-top: 0.875rem;
  padding: 1rem 1.25rem;
  background: var(--error-light);
  border-radius: calc(var(--radius) - 2px);
  border: 2px solid var(--error-border);
  border-left: 4px solid var(--error);
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  line-height: 1.7;
  white-space: pre-wrap;
  overflow-x: auto;
  color: var(--error);
}

/* ============================================================================
   Attachments — badge style
   ============================================================================ */
.attachments {
  margin-top: 0.875rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.625rem;
}

.attachment {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.875rem;
  background: var(--muted);
  border: 2px solid var(--border);
  border-radius: calc(var(--radius) - 2px);
  font-size: 0.8125rem;
  font-family: var(--font-mono);
  text-decoration: none;
  color: var(--muted-foreground);
  transition: all 0.2s ease;
  min-height: 2.25rem;
}

.attachment:hover {
  background: var(--accent);
  color: var(--foreground);
  border-color: var(--ring);
}

.attachment-image {
  max-width: 100%;
  margin-top: 0.625rem;
  border-radius: calc(var(--radius) - 2px);
  border: 2px solid var(--border);
}

.attachment-video {
  max-width: 100%;
  margin-top: 0.625rem;
  border-radius: calc(var(--radius) - 2px);
  border: 2px solid var(--border);
}

/* ============================================================================
   Chevron Icon — smooth rotation
   ============================================================================ */
.chevron {
  color: var(--muted-foreground);
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 0.8125rem;
  flex-shrink: 0;
}

.collapsed .chevron {
  transform: rotate(-90deg);
}

/* ============================================================================
   Scrollbars — rounded, warm
   ============================================================================ */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--muted-foreground);
}

/* ============================================================================
   Focus States — coral ring
   ============================================================================ */
*:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--background), 0 0 0 5px var(--ring);
}

/* ============================================================================
   Selection — warm coral tint
   ============================================================================ */
::selection {
  background: rgb(224 122 95 / 0.2);
  color: inherit;
}

/* ============================================================================
   Animations — playful reveals
   ============================================================================ */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: translateY(0); }
}

.feature {
  animation: fadeIn 0.3s ease-out;
}

.feature:nth-child(2) { animation-delay: 0.03s; }
.feature:nth-child(3) { animation-delay: 0.06s; }
.feature:nth-child(4) { animation-delay: 0.09s; }
.feature:nth-child(5) { animation-delay: 0.12s; }

/* ============================================================================
   Print Styles
   ============================================================================ */
@media print {
  :root {
    --background: white;
    --foreground: #1a1a1a;
    --card: white;
    --border: #ddd;
    --muted: #f5f5f5;
    --muted-foreground: #666;
  }

  body {
    font-size: 12px;
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

  .step {
    background: none;
    border: 1px solid #ddd;
  }

  .summary-card:hover {
    transform: none;
    box-shadow: none;
  }

  .collapsed .feature-content,
  .collapsed .scenario-content {
    display: block;
  }
}

/* ============================================================================
   Documentation Entries - Containers
   ============================================================================ */
.story-docs {
  margin-bottom: 0.875rem;
  padding: 0.875rem;
  background: var(--accordion-content-bg);
  border-radius: calc(var(--radius) - 2px);
  border: 2px solid var(--border);
}

.step-docs {
  margin-left: 1.75rem;
  margin-top: 0.375rem;
  margin-bottom: 0.625rem;
  padding: 0.625rem 0.875rem;
  background: var(--accordion-content-bg);
  border-left: 3px solid var(--primary);
  border-radius: 0 calc(var(--radius) - 2px) calc(var(--radius) - 2px) 0;
}

/* ============================================================================
   Documentation Entries - Note
   ============================================================================ */
.doc-note {
  padding: 0.625rem 0.875rem;
  margin-bottom: 0.625rem;
  background: var(--muted);
  border-left: 4px solid var(--primary);
  border-radius: 0 calc(var(--radius) - 2px) calc(var(--radius) - 2px) 0;
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--foreground);
}

.doc-note:last-child {
  margin-bottom: 0;
}

/* ============================================================================
   Documentation Entries - Tags
   ============================================================================ */
.doc-tag {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.625rem;
}

.doc-tag:last-child {
  margin-bottom: 0;
}

.doc-tag-item {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.1875rem 0.625rem;
  background: var(--tag-bg);
  color: var(--tag-color);
  border: 2px solid var(--tag-border);
  border-radius: 9999px;
  font-family: var(--font-mono);
}

/* ============================================================================
   Documentation Entries - Key-Value
   ============================================================================ */
.doc-kv {
  display: flex;
  gap: 0.625rem;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  align-items: baseline;
}

.doc-kv:last-child {
  margin-bottom: 0;
}

.doc-kv-label {
  font-weight: 700;
  color: var(--muted-foreground);
  font-family: var(--font-mono);
  font-size: 0.8125rem;
}

.doc-kv-value {
  color: var(--foreground);
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  white-space: pre-wrap;
  word-break: break-word;
}

/* ============================================================================
   Documentation Entries - Code
   ============================================================================ */
.doc-code {
  margin-bottom: 0.625rem;
  border: 2px solid var(--border);
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
  padding: 0.5rem 0.875rem;
  background: var(--muted);
  border-bottom: 2px solid var(--border);
}

.doc-code-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--muted-foreground);
}

.doc-code-lang {
  font-size: 0.6875rem;
  font-weight: 700;
  padding: 0.1875rem 0.5rem;
  background: var(--primary);
  color: var(--primary-foreground);
  border-radius: 9999px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.doc-code-content {
  margin: 0;
  padding: 0.875rem;
  background: var(--card);
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  line-height: 1.7;
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
  margin-bottom: 0.625rem;
}

.doc-table:last-child {
  margin-bottom: 0;
}

.doc-table-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--muted-foreground);
  margin-bottom: 0.5rem;
}

.doc-table table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 0.8125rem;
  font-family: var(--font-mono);
  border: 2px solid var(--border);
  border-radius: calc(var(--radius) - 2px);
  overflow: hidden;
}

.doc-table th,
.doc-table td {
  padding: 0.625rem 0.875rem;
  text-align: left;
  border-bottom: 2px solid var(--border);
  border-right: 2px solid var(--border);
}

.doc-table th:last-child,
.doc-table td:last-child {
  border-right: none;
}

.doc-table tr:last-child td {
  border-bottom: none;
}

.doc-table th {
  background: var(--muted);
  font-weight: 700;
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
  margin-bottom: 0.5rem;
}

.doc-link:last-child {
  margin-bottom: 0;
}

.doc-link a {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.875rem;
  color: var(--primary);
  text-decoration: none;
  transition: color 0.2s ease;
  font-weight: 600;
}

.doc-link a:hover {
  color: var(--keyword-color);
  text-decoration: underline;
}

.doc-link a::before {
  content: "\\2192";
  font-size: 0.8125rem;
}

/* ============================================================================
   Documentation Entries - Section
   ============================================================================ */
.doc-section {
  margin-bottom: 0.625rem;
  border: 2px solid var(--border);
  border-radius: calc(var(--radius) - 2px);
  overflow: hidden;
}

.doc-section:last-child {
  margin-bottom: 0;
}

.doc-section-title {
  padding: 0.625rem 0.875rem;
  background: var(--muted);
  border-bottom: 2px solid var(--border);
  font-family: "Nunito", var(--font-sans);
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--foreground);
}

.doc-section-content {
  margin: 0;
  padding: 0.875rem;
  background: var(--card);
  font-size: 0.875rem;
  line-height: 1.7;
  white-space: pre-wrap;
  color: var(--foreground);
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
  font-family: "Nunito", var(--font-sans);
  margin-top: 1em;
  margin-bottom: 0.5em;
  font-weight: 700;
  line-height: 1.3;
  color: var(--foreground);
}

.doc-section-parsed .doc-section-content h1:first-child,
.doc-section-parsed .doc-section-content h2:first-child,
.doc-section-parsed .doc-section-content h3:first-child {
  margin-top: 0;
}

.doc-section-parsed .doc-section-content h1 { font-size: 1.375rem; }
.doc-section-parsed .doc-section-content h2 { font-size: 1.1875rem; }
.doc-section-parsed .doc-section-content h3 { font-size: 1.0625rem; }
.doc-section-parsed .doc-section-content h4 { font-size: 1rem; }
.doc-section-parsed .doc-section-content h5 { font-size: 0.9375rem; }
.doc-section-parsed .doc-section-content h6 { font-size: 0.875rem; color: var(--muted-foreground); }

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
  font-weight: 600;
}

.doc-section-parsed .doc-section-content a:hover {
  text-decoration: underline;
}

.doc-section-parsed .doc-section-content code {
  font-family: var(--font-mono);
  font-size: 0.85em;
  padding: 0.15em 0.4em;
  background: var(--muted);
  border-radius: 6px;
}

.doc-section-parsed .doc-section-content pre {
  margin: 0.75em 0;
  padding: 0.875em;
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
  padding: 0.625em 1.125em;
  border-left: 4px solid var(--primary);
  background: var(--muted);
  color: var(--muted-foreground);
  border-radius: 0 calc(var(--radius) - 2px) calc(var(--radius) - 2px) 0;
}

.doc-section-parsed .doc-section-content blockquote p {
  margin: 0;
}

.doc-section-parsed .doc-section-content hr {
  margin: 1em 0;
  border: none;
  border-top: 2px solid var(--border);
}

.doc-section-parsed .doc-section-content table {
  width: 100%;
  margin: 0.75em 0;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.doc-section-parsed .doc-section-content th,
.doc-section-parsed .doc-section-content td {
  padding: 0.5em 0.75em;
  border: 2px solid var(--border);
  text-align: left;
}

.doc-section-parsed .doc-section-content th {
  background: var(--muted);
  font-weight: 700;
}

.doc-section-parsed .doc-section-content img {
  max-width: 100%;
  height: auto;
  border-radius: calc(var(--radius) - 2px);
}

/* ============================================================================
   Documentation Entries - Mermaid
   ============================================================================ */
.doc-mermaid {
  margin-bottom: 0.625rem;
  border: 2px solid var(--border);
  border-radius: calc(var(--radius) - 2px);
  overflow: hidden;
}

.doc-mermaid:last-child {
  margin-bottom: 0;
}

.doc-mermaid-title {
  padding: 0.5rem 0.875rem;
  background: var(--muted);
  border-bottom: 2px solid var(--border);
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--muted-foreground);
}

.doc-mermaid-title::before {
  content: "\\25C7 ";
  color: var(--primary);
}

.doc-mermaid-code {
  margin: 0;
  padding: 0.875rem;
  background: var(--card);
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  line-height: 1.7;
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
.doc-screenshot {
  margin-bottom: 0.625rem;
}

.doc-screenshot:last-child {
  margin-bottom: 0;
}

.doc-screenshot-img {
  max-width: 100%;
  border: 2px solid var(--border);
  border-radius: calc(var(--radius) - 2px);
  display: block;
}

.doc-screenshot-caption {
  margin-top: 0.5rem;
  font-size: 0.8125rem;
  color: var(--muted-foreground);
  font-style: italic;
}

/* ============================================================================
   Documentation Entries - Custom
   ============================================================================ */
.doc-custom {
  margin-bottom: 0.625rem;
  border: 2px solid var(--border);
  border-radius: calc(var(--radius) - 2px);
  overflow: hidden;
}

.doc-custom:last-child {
  margin-bottom: 0;
}

.doc-custom-type {
  padding: 0.5rem 0.875rem;
  background: var(--warning-light);
  border-bottom: 2px solid var(--warning-border);
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--warning);
}

.doc-custom-data {
  margin: 0;
  padding: 0.875rem;
  background: var(--card);
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  line-height: 1.7;
  overflow-x: auto;
  white-space: pre;
}

.doc-custom-data code {
  font-family: inherit;
  background: none;
}

/* ============================================================================
   Trace View - OTel span waterfall
   ============================================================================ */
.trace-view {
  margin-top: 0.875rem;
  border: 2px solid var(--border);
  border-radius: calc(var(--radius) - 2px);
  overflow: hidden;
}

.trace-view-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.875rem;
  background: var(--card);
  cursor: pointer;
  user-select: none;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--foreground);
  transition: background-color 0.2s ease;
  min-height: 2.75rem;
}

.trace-view-header:hover {
  background: var(--accordion-header-hover);
}

.trace-view-count {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.1875rem 0.625rem;
  background: var(--success-light);
  color: var(--success);
  border: 2px solid var(--success-border);
  border-radius: 9999px;
  font-family: var(--font-mono);
}

.trace-view-content {
  border-top: 2px solid var(--border);
  padding: 0.625rem 0.875rem;
  background: var(--accordion-content-bg);
}

.trace-view.collapsed .trace-view-content {
  display: none;
}

.trace-view-axis {
  display: flex;
  justify-content: space-between;
  font-size: 0.6875rem;
  font-family: var(--font-mono);
  color: var(--muted-foreground);
  padding-bottom: 0.5rem;
  margin-bottom: 0.5rem;
  border-bottom: 2px solid var(--border);
}

.trace-view-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.25rem 0;
  font-size: 0.8125rem;
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
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.trace-view-status-ok { background: var(--success); }
.trace-view-status-error { background: var(--error); }
.trace-view-status-unset { background: var(--muted-foreground); }

.trace-view-bar-container {
  flex: 1;
  position: relative;
  height: 1.5rem;
  background: var(--muted);
  border-radius: 6px;
}

.trace-view-bar {
  position: absolute;
  top: 0;
  height: 100%;
  border-radius: 6px;
  min-width: 2px;
  display: flex;
  align-items: center;
  padding: 0 0.5rem;
  font-size: 0.6875rem;
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
.badge { display: inline-block; padding: 3px 8px; border-radius: 8px; font-size: 0.75em; font-weight: 700; margin-left: 4px; vertical-align: middle; }
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

/* Failure summary */
.failure-summary {
  margin: 1.25rem 0;
  padding: 1rem 1.25rem;
  border: 2px solid var(--error);
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--error) 8%, transparent);
}
.failure-summary-header {
  font-family: "Nunito", var(--font-sans);
  font-weight: 700;
  font-size: 0.9375rem;
  color: var(--error);
  margin-bottom: 0.625rem;
}
.failure-summary-note {
  font-size: 0.8125rem;
  color: var(--muted-foreground);
  margin-bottom: 0.625rem;
}
.failure-summary-note code {
  font-family: var(--font-mono);
  font-size: 0.8125rem;
}
.failure-summary ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}
.failure-summary li a {
  font-size: 0.875rem;
  color: var(--foreground);
  text-decoration: none;
}
.failure-summary li a:hover {
  text-decoration: underline;
  color: var(--error);
}

/* Source permalink */
.source-link {
  font-size: 0.75rem;
  color: var(--muted-foreground);
  text-decoration: none;
  font-family: var(--font-mono);
}
.source-link:hover {
  text-decoration: underline;
  color: var(--foreground);
}

/* ============================================================================
   Detail Level Toggle — large touch target
   ============================================================================ */
.detail-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border: 2px solid var(--border);
  border-radius: var(--radius);
  background: var(--card);
  cursor: pointer;
  color: var(--foreground);
  font-size: 1.125rem;
  transition: all 0.2s ease;
}

.detail-toggle:hover {
  background: var(--accent);
  border-color: var(--primary);
  transform: scale(1.05);
}

.detail-toggle:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--background), 0 0 0 5px var(--ring);
}

[data-detail-level="minimal"] .story-docs,
[data-detail-level="minimal"] .step-docs {
  display: none;
}
`,
};
