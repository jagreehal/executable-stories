/**
 * Terminal theme — green-on-dark hacker aesthetic.
 */

import type { HtmlTheme } from "./types.js";

export const terminalTheme: HtmlTheme = {
  name: "terminal",
  label: "Terminal",
  css: `
/* ============================================================================
   Google Fonts Import - JetBrains Mono for terminal typography
   ============================================================================ */
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');

/* ============================================================================
   CSS Custom Properties - Light Mode (Always dark-feeling)
   Terminal theme: green-on-dark, high density, no rounding
   ============================================================================ */
:root {
  /* Typography */
  --font-sans: "JetBrains Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;

  /* Light terminal — paper-white with green accents */
  --background: #f5f5f0;
  --foreground: #1a1a1a;
  --card: #eaeae5;
  --card-foreground: #1a1a1a;
  --popover: #eaeae5;
  --popover-foreground: #1a1a1a;

  /* Green primary, darker for light bg */
  --primary: #008a45;
  --primary-foreground: #f5f5f0;

  --secondary: #e0e0d8;
  --secondary-foreground: #1a1a1a;
  --muted: #e8e8e2;
  --muted-foreground: #666660;
  --accent: #e0e0d8;
  --accent-foreground: #1a1a1a;
  --destructive: #cc2222;
  --destructive-foreground: #f5f5f0;
  --border: #c8c8c0;
  --input: #c8c8c0;
  --ring: #008a45;
  --radius: 0;

  /* No shadows — flat terminal look */
  --shadow-xs: none;
  --shadow-sm: none;
  --shadow: none;
  --shadow-md: none;

  /* Status colors — legible on light bg */
  --success: #008a45;
  --success-light: #008a4512;
  --success-border: #008a4533;
  --error: #cc2222;
  --error-light: #cc222212;
  --error-border: #cc222233;
  --warning: #b87800;
  --warning-light: #b8780012;
  --warning-border: #b8780033;
  --pending: #0088a0;
  --pending-light: #0088a012;
  --pending-border: #0088a033;

  /* Terminal-specific */
  --keyword-color: #008a45;
  --tag-bg: #008a4515;
  --tag-color: #008a45;
  --tag-border: #008a4533;
  --step-param-color: #0088a0;

  /* Accordion/Collapsible styling */
  --accordion-header-hover: #e0e0d8;
  --accordion-content-bg: #ebebeb;
}

/* ============================================================================
   Dark Mode — classic green-on-black terminal
   ============================================================================ */
[data-theme="dark"] {
  --font-sans: "JetBrains Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;

  --background: #0a0a0a;
  --foreground: #d4d4d4;
  --card: #111111;
  --card-foreground: #d4d4d4;
  --popover: #111111;
  --popover-foreground: #d4d4d4;

  --primary: #00d26a;
  --primary-foreground: #0a0a0a;

  --secondary: #1a1a1a;
  --secondary-foreground: #d4d4d4;
  --muted: #1a1a1a;
  --muted-foreground: #6b6b6b;
  --accent: #1a1a1a;
  --accent-foreground: #d4d4d4;
  --destructive: #ff4444;
  --destructive-foreground: #0a0a0a;
  --border: #2a2a2a;
  --input: #2a2a2a;
  --ring: #00d26a;

  --shadow-xs: none;
  --shadow-sm: none;
  --shadow: none;
  --shadow-md: none;

  --success: #00d26a;
  --success-light: #00d26a12;
  --success-border: #00d26a33;
  --error: #ff4444;
  --error-light: #ff444412;
  --error-border: #ff444433;
  --warning: #ffaa00;
  --warning-light: #ffaa0012;
  --warning-border: #ffaa0033;
  --pending: #00bcd4;
  --pending-light: #00bcd412;
  --pending-border: #00bcd433;

  --keyword-color: #00d26a;
  --tag-bg: #00d26a15;
  --tag-color: #00d26a;
  --tag-border: #00d26a33;
  --step-param-color: #00bcd4;

  --accordion-header-hover: #1a1a1a;
  --accordion-content-bg: #0e0e0e;
}

/* Auto dark mode — same values (always dark) */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --font-sans: "JetBrains Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
    --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;

    --background: #0a0a0a;
    --foreground: #d4d4d4;
    --card: #111111;
    --card-foreground: #d4d4d4;
    --popover: #111111;
    --popover-foreground: #d4d4d4;
    --primary: #00d26a;
    --primary-foreground: #0a0a0a;
    --secondary: #1a1a1a;
    --secondary-foreground: #d4d4d4;
    --muted: #1a1a1a;
    --muted-foreground: #6b6b6b;
    --accent: #1a1a1a;
    --accent-foreground: #d4d4d4;
    --destructive: #ff4444;
    --destructive-foreground: #0a0a0a;
    --border: #2a2a2a;
    --input: #2a2a2a;
    --ring: #00d26a;
    --shadow-xs: none;
    --shadow-sm: none;
    --shadow: none;
    --shadow-md: none;
    --success: #00d26a;
    --success-light: #00d26a12;
    --success-border: #00d26a33;
    --error: #ff4444;
    --error-light: #ff444412;
    --error-border: #ff444433;
    --warning: #ffaa00;
    --warning-light: #ffaa0012;
    --warning-border: #ffaa0033;
    --pending: #00bcd4;
    --pending-light: #00bcd412;
    --pending-border: #00bcd433;
    --keyword-color: #00d26a;
    --tag-bg: #00d26a15;
    --tag-color: #00d26a;
    --tag-border: #00d26a33;
    --step-param-color: #00bcd4;
    --accordion-header-hover: #1a1a1a;
    --accordion-content-bg: #0e0e0e;
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
   Layout — compact, high density
   ============================================================================ */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0.75rem;
}

@media (min-width: 768px) {
  .container {
    padding: 1rem 1.5rem;
  }
}

/* ============================================================================
   Header
   ============================================================================ */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0.75rem;
  margin-bottom: 0.75rem;
  border-bottom: 1px solid var(--border);
}

.header h1 {
  font-size: 1.125rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--primary);
}

.header h1::before {
  content: "> ";
  color: var(--muted-foreground);
}

.header-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
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
  color: var(--primary);
  font-size: 0.875rem;
  transition: all 0.1s ease;
}

.theme-toggle:hover {
  background: var(--accent);
  border-color: var(--primary);
}

.theme-toggle:focus-visible {
  outline: none;
  box-shadow: 0 0 0 1px var(--primary);
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
  width: 220px;
  transition: all 0.1s ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 1px var(--primary);
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
   Meta Info
   ============================================================================ */
.meta-info {
  display: flex;
  flex-wrap: wrap;
  gap: 0.125rem 1.5rem;
  margin-bottom: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-size: 0.75rem;
  color: var(--muted-foreground);
}

.meta-info dt {
  font-weight: 600;
  color: var(--primary);
  display: inline;
}

.meta-info dd {
  display: inline;
  margin: 0 0 0 0.25rem;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
}

/* ============================================================================
   Summary Cards
   ============================================================================ */
.summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
  margin-bottom: 0.75rem;
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
  padding: 0.625rem 0.75rem;
  transition: border-color 0.1s ease;
}

.summary-card:hover {
  border-color: var(--muted-foreground);
}

.summary-card .label {
  font-size: 0.625rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted-foreground);
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.summary-card .value {
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.1;
  font-family: var(--font-sans);
}

/* Passed — green */
.summary-card.passed {
  background: var(--success-light);
  border-color: var(--success-border);
}
.summary-card.passed .value { color: var(--success); }

/* Failed — red */
.summary-card.failed {
  background: var(--error-light);
  border-color: var(--error-border);
}
.summary-card.failed .value { color: var(--error); }

/* Skipped — amber */
.summary-card.skipped {
  background: var(--warning-light);
  border-color: var(--warning-border);
}
.summary-card.skipped .value { color: var(--warning); }

/* Pending — cyan */
.summary-card.pending {
  background: var(--pending-light);
  border-color: var(--pending-border);
}
.summary-card.pending .value { color: var(--pending); }

/* ============================================================================
   Tag Filter Bar
   ============================================================================ */
.tag-bar {
  margin-bottom: 0.5rem;
  padding: 0.5rem 0.75rem;
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
  outline: 1px solid var(--ring);
  outline-offset: 2px;
  border-radius: var(--radius);
}

.tag-bar-label {
  font-size: 0.625rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
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
  transition: transform 0.15s ease;
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
  color: var(--destructive);
  background: var(--error-light);
  border: 1px solid var(--error-border);
  cursor: pointer;
  padding: 0.125rem 0.625rem;
  border-radius: var(--radius);
  transition: all 0.1s ease;
}

.tag-bar-clear:hover {
  background: var(--error-border);
}

.tag-bar-clear:focus-visible {
  outline: 1px solid var(--ring);
  outline-offset: 2px;
}

.tag-bar-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
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
  padding: 0.125rem 0.5rem;
  background: var(--tag-bg);
  color: var(--tag-color);
  border: 1px solid var(--tag-border);
  border-radius: var(--radius);
  font-family: var(--font-mono);
  cursor: pointer;
  transition: all 0.1s ease;
}

.tag-pill:hover {
  background: var(--success-border);
}

.tag-pill:focus-visible {
  outline: 1px solid var(--ring);
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
  box-shadow: 0 0 0 1px var(--primary);
}

/* ============================================================================
   Filter Results Counter
   ============================================================================ */
.filter-results {
  text-align: center;
  font-size: 0.75rem;
  color: var(--muted-foreground);
  margin-bottom: 0.5rem;
  font-weight: 500;
}

/* ============================================================================
   Feature Sections
   ============================================================================ */
.feature {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  margin-bottom: 0.375rem;
  overflow: hidden;
}

.feature-header {
  padding: 0.5rem 0.75rem;
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
  color: var(--primary);
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
  padding: 0.375rem;
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
  border-radius: var(--radius);
  margin-bottom: 0.25rem;
  overflow: hidden;
}

.scenario:last-child {
  margin-bottom: 0;
}

.scenario-header {
  padding: 0.375rem 0.75rem;
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
  border-radius: var(--radius);
  font-family: var(--font-mono);
}

.scenario-duration {
  font-size: 0.6875rem;
  color: var(--muted-foreground);
  font-family: var(--font-mono);
  white-space: nowrap;
  flex-shrink: 0;
}

.scenario-content {
  padding: 0.5rem 0.75rem 0.625rem;
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
   Steps — compact terminal flow
   ============================================================================ */
.steps {
  margin-top: 0.125rem;
  padding: 0.125rem 0;
}

.step {
  display: flex;
  gap: 0.375rem;
  padding: 0.1875rem 0;
  font-size: 0.75rem;
  align-items: baseline;
  line-height: 1.4;
}

.step-status {
  flex-shrink: 0;
  width: 0.875rem;
  text-align: center;
  font-size: 0.6875rem;
}

.step-keyword {
  font-weight: 700;
  color: var(--keyword-color);
  flex-shrink: 0;
  min-width: 48px;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
}

/* Indent continuation keywords (And, But, *) */
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
  font-style: normal;
  font-weight: 600;
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
  padding: 0.5rem 0.75rem;
  background: var(--error-light);
  border-radius: var(--radius);
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
  border-radius: var(--radius);
  font-size: 0.6875rem;
  font-family: var(--font-mono);
  text-decoration: none;
  color: var(--muted-foreground);
  transition: all 0.1s ease;
}

.attachment:hover {
  background: var(--accent);
  color: var(--primary);
  border-color: var(--primary);
}

.attachment-image {
  max-width: 100%;
  margin-top: 0.375rem;
  border-radius: var(--radius);
  border: 1px solid var(--border);
}

.attachment-video {
  max-width: 100%;
  margin-top: 0.375rem;
  border-radius: var(--radius);
  border: 1px solid var(--border);
}

/* ============================================================================
   Chevron Icon
   ============================================================================ */
.chevron {
  color: var(--muted-foreground);
  transition: transform 0.15s ease;
  font-size: 0.6875rem;
  flex-shrink: 0;
}

.collapsed .chevron {
  transform: rotate(-90deg);
}

/* ============================================================================
   Scrollbars — thin green track
   ============================================================================ */
::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 0;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--primary);
}

/* ============================================================================
   Focus States
   ============================================================================ */
*:focus-visible {
  outline: none;
  box-shadow: 0 0 0 1px var(--primary);
}

/* ============================================================================
   Selection — green tinted
   ============================================================================ */
::selection {
  background: #00d26a33;
  color: inherit;
}

/* ============================================================================
   Animations — minimal, fast
   ============================================================================ */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.feature {
  animation: fadeIn 0.1s ease-out;
}

.feature:nth-child(2) { animation-delay: 0.01s; }
.feature:nth-child(3) { animation-delay: 0.02s; }
.feature:nth-child(4) { animation-delay: 0.03s; }
.feature:nth-child(5) { animation-delay: 0.04s; }

/* ============================================================================
   Print Styles
   ============================================================================ */
@media print {
  :root {
    --background: white;
    --foreground: black;
    --card: white;
    --border: #ccc;
    --muted: #f0f0f0;
    --muted-foreground: #555;
    --primary: #006633;
    --keyword-color: #006633;
  }

  body {
    font-size: 11px;
    color: black;
    background: white;
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
   Documentation Entries - Containers
   ============================================================================ */
.story-docs {
  margin-bottom: 0.5rem;
  padding: 0.5rem;
  background: var(--accordion-content-bg);
  border-radius: var(--radius);
  border: 1px solid var(--border);
}

.step-docs {
  margin-left: 1.25rem;
  margin-top: 0.125rem;
  margin-bottom: 0.375rem;
  padding: 0.375rem 0.625rem;
  background: var(--accordion-content-bg);
  border-left: 2px solid var(--primary);
  border-radius: var(--radius);
}

/* ============================================================================
   Documentation Entries - Note
   ============================================================================ */
.doc-note {
  padding: 0.375rem 0.625rem;
  margin-bottom: 0.375rem;
  background: var(--muted);
  border-left: 2px solid var(--primary);
  border-radius: var(--radius);
  font-size: 0.75rem;
  line-height: 1.4;
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
  gap: 0.25rem;
  margin-bottom: 0.375rem;
}

.doc-tag:last-child {
  margin-bottom: 0;
}

.doc-tag-item {
  font-size: 0.625rem;
  font-weight: 500;
  padding: 0.0625rem 0.375rem;
  background: var(--tag-bg);
  color: var(--tag-color);
  border: 1px solid var(--tag-border);
  border-radius: var(--radius);
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

.doc-kv:last-child {
  margin-bottom: 0;
}

.doc-kv-label {
  font-weight: 600;
  color: var(--primary);
  font-family: var(--font-mono);
  font-size: 0.6875rem;
}

.doc-kv-label::after {
  content: ":";
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
  border-radius: var(--radius);
  overflow: hidden;
}

.doc-code:last-child {
  margin-bottom: 0;
}

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
  font-weight: 600;
  padding: 0.0625rem 0.3125rem;
  background: var(--primary);
  color: var(--primary-foreground);
  border-radius: var(--radius);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.doc-code-content {
  margin: 0;
  padding: 0.5rem 0.625rem;
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

.doc-table:last-child {
  margin-bottom: 0;
}

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
  padding: 0.3125rem 0.625rem;
  text-align: left;
  border: 1px solid var(--border);
}

.doc-table th {
  background: var(--muted);
  font-weight: 600;
  color: var(--primary);
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

.doc-link:last-child {
  margin-bottom: 0;
}

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
  color: var(--foreground);
  text-decoration: underline;
}

.doc-link a::before {
  content: ">";
  font-size: 0.6875rem;
  color: var(--muted-foreground);
}

/* ============================================================================
   Documentation Entries - Section
   ============================================================================ */
.doc-section {
  margin-bottom: 0.375rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}

.doc-section:last-child {
  margin-bottom: 0;
}

.doc-section-title {
  padding: 0.375rem 0.625rem;
  background: var(--muted);
  border-bottom: 1px solid var(--border);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--primary);
}

.doc-section-content {
  margin: 0;
  padding: 0.5rem 0.625rem;
  background: var(--card);
  font-size: 0.75rem;
  line-height: 1.5;
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
  margin-top: 0.75em;
  margin-bottom: 0.375em;
  font-weight: 700;
  line-height: 1.3;
  color: var(--primary);
}

.doc-section-parsed .doc-section-content h1:first-child,
.doc-section-parsed .doc-section-content h2:first-child,
.doc-section-parsed .doc-section-content h3:first-child {
  margin-top: 0;
}

.doc-section-parsed .doc-section-content h1 { font-size: 1.125rem; }
.doc-section-parsed .doc-section-content h2 { font-size: 1rem; }
.doc-section-parsed .doc-section-content h3 { font-size: 0.9375rem; }
.doc-section-parsed .doc-section-content h4 { font-size: 0.875rem; }
.doc-section-parsed .doc-section-content h5 { font-size: 0.8125rem; }
.doc-section-parsed .doc-section-content h6 { font-size: 0.75rem; color: var(--muted-foreground); }

.doc-section-parsed .doc-section-content p {
  margin: 0.375em 0;
}

.doc-section-parsed .doc-section-content p:first-child {
  margin-top: 0;
}

.doc-section-parsed .doc-section-content p:last-child {
  margin-bottom: 0;
}

.doc-section-parsed .doc-section-content ul,
.doc-section-parsed .doc-section-content ol {
  margin: 0.375em 0;
  padding-left: 1.25em;
}

.doc-section-parsed .doc-section-content li {
  margin: 0.125em 0;
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
  padding: 0.0625em 0.25em;
  background: var(--muted);
  border-radius: var(--radius);
}

.doc-section-parsed .doc-section-content pre {
  margin: 0.5em 0;
  padding: 0.5em;
  background: var(--muted);
  border-radius: var(--radius);
  overflow-x: auto;
}

.doc-section-parsed .doc-section-content pre code {
  padding: 0;
  background: none;
}

.doc-section-parsed .doc-section-content blockquote {
  margin: 0.5em 0;
  padding: 0.375em 0.75em;
  border-left: 2px solid var(--primary);
  background: var(--muted);
  color: var(--muted-foreground);
}

.doc-section-parsed .doc-section-content blockquote p {
  margin: 0;
}

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
  border-radius: var(--radius);
}

/* ============================================================================
   Documentation Entries - Mermaid
   ============================================================================ */
.doc-mermaid {
  margin-bottom: 0.375rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}

.doc-mermaid:last-child {
  margin-bottom: 0;
}

.doc-mermaid-title {
  padding: 0.25rem 0.625rem;
  background: var(--muted);
  border-bottom: 1px solid var(--border);
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--muted-foreground);
}

.doc-mermaid-title::before {
  content: "> ";
  color: var(--primary);
}

.doc-mermaid-code {
  margin: 0;
  padding: 0.5rem 0.625rem;
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
.doc-screenshot {
  margin-bottom: 0.375rem;
}

.doc-screenshot:last-child {
  margin-bottom: 0;
}

.doc-screenshot-img {
  max-width: 100%;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  display: block;
}

.doc-screenshot-caption {
  margin-top: 0.25rem;
  font-size: 0.6875rem;
  color: var(--muted-foreground);
  font-style: normal;
}

.doc-screenshot-caption::before {
  content: "# ";
  color: var(--primary);
}

/* ============================================================================
   Documentation Entries - Custom
   ============================================================================ */
.doc-custom {
  margin-bottom: 0.375rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}

.doc-custom:last-child {
  margin-bottom: 0;
}

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
  padding: 0.5rem 0.625rem;
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
   Trace View - OTel span waterfall
   ============================================================================ */
.trace-view {
  margin-top: 0.5rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
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
  border-radius: var(--radius);
  font-family: var(--font-mono);
}

.trace-view-content {
  border-top: 1px solid var(--border);
  padding: 0.375rem 0.625rem;
  background: var(--accordion-content-bg);
}

.trace-view.collapsed .trace-view-content {
  display: none;
}

.trace-view-axis {
  display: flex;
  justify-content: space-between;
  font-size: 0.5625rem;
  font-family: var(--font-mono);
  color: var(--muted-foreground);
  padding-bottom: 0.25rem;
  margin-bottom: 0.25rem;
  border-bottom: 1px solid var(--border);
}

.trace-view-row {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.125rem 0;
  font-size: 0.6875rem;
}

.trace-view-name {
  width: 35%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-family: var(--font-mono);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--foreground);
}

.trace-view-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 0;
  flex-shrink: 0;
}

.trace-view-status-ok { background: var(--success); }
.trace-view-status-error { background: var(--error); }
.trace-view-status-unset { background: var(--muted-foreground); }

.trace-view-bar-container {
  flex: 1;
  position: relative;
  height: 1rem;
  background: var(--muted);
  border-radius: 0;
}

.trace-view-bar {
  position: absolute;
  top: 0;
  height: 100%;
  border-radius: 0;
  min-width: 2px;
  display: flex;
  align-items: center;
  padding: 0 0.25rem;
  font-size: 0.5625rem;
  font-family: var(--font-mono);
  color: var(--primary-foreground);
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
.badge { display: inline-block; padding: 1px 5px; border-radius: 0; font-size: 0.6875em; font-weight: 600; margin-left: 4px; vertical-align: middle; }
.badge-grade { color: var(--primary-foreground); }
.badge-grade-A { background: var(--success); }
.badge-grade-B { background: #2196F3; }
.badge-grade-C { background: #FF9800; }
.badge-grade-D { background: #f44336; }
.badge-grade-F { background: #9E0000; }
.badge-flaky { background: #FF9800; color: var(--primary-foreground); }
.badge-perf { font-size: 0.65em; }
.badge-perf-improving { color: var(--success); }
.badge-perf-regressing { color: var(--error); }

/* Failure summary */
.failure-summary {
  margin: 0.5rem 0;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--error);
  border-radius: var(--radius);
  background: var(--error-light);
}
.failure-summary-header {
  font-weight: 700;
  font-size: 0.8125rem;
  color: var(--error);
  margin-bottom: 0.375rem;
}
.failure-summary-note {
  font-size: 0.6875rem;
  color: var(--muted-foreground);
  margin-bottom: 0.375rem;
}
.failure-summary-note code {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
}
.failure-summary ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}
.failure-summary li a {
  font-size: 0.75rem;
  color: var(--foreground);
  text-decoration: none;
}
.failure-summary li a:hover {
  text-decoration: underline;
  color: var(--error);
}

/* Source permalink */
.source-link {
  font-size: 0.625rem;
  color: var(--muted-foreground);
  text-decoration: none;
  font-family: var(--font-mono);
}
.source-link:hover {
  text-decoration: underline;
  color: var(--primary);
}

/* ============================================================================
   Detail Level Toggle
   ============================================================================ */
.detail-toggle {
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

.detail-toggle:hover {
  background: var(--accent);
  border-color: var(--primary);
}

.detail-toggle:focus-visible {
  outline: none;
  box-shadow: 0 0 0 1px var(--primary);
}

[data-detail-level="minimal"] .story-docs,
[data-detail-level="minimal"] .step-docs {
  display: none;
}
`,
};
