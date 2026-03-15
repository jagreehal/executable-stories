/**
 * Minimal theme — zen-like typography-first aesthetic.
 *
 * Noto Serif Display headings, DM Sans body, warm neutrals, teal accent.
 * No cards, no shadows — just typography and space.
 */

import type { HtmlTheme } from "./types.js";

export const minimalTheme: HtmlTheme = {
  name: "minimal",
  label: "Minimal",
  css: `
/* ============================================================================
   Google Fonts Import - Noto Serif Display + DM Sans
   ============================================================================ */
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+Display:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

/* ============================================================================
   CSS Custom Properties - Light Mode (Default)
   Warm neutral palette with teal accent
   ============================================================================ */
:root {
  /* Typography */
  --font-sans: "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-mono: "DM Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;

  /* Base colors — warm neutrals */
  --background: #fdfcfa;
  --foreground: #2d2d2d;
  --card: #fdfcfa;
  --card-foreground: #2d2d2d;
  --popover: #fdfcfa;
  --popover-foreground: #2d2d2d;

  /* Teal primary */
  --primary: #2a9d8f;
  --primary-foreground: #ffffff;

  --secondary: #f5f3ef;
  --secondary-foreground: #2d2d2d;
  --muted: #f5f3ef;
  --muted-foreground: #8a8680;
  --accent: #f0ece6;
  --accent-foreground: #2d2d2d;
  --destructive: #c1554d;
  --destructive-foreground: #ffffff;
  --border: #e8e4de;
  --input: #e8e4de;
  --ring: #2a9d8f;
  --radius: 0.25rem;

  /* Shadows — nearly invisible for minimal aesthetic */
  --shadow-xs: none;
  --shadow-sm: none;
  --shadow: none;
  --shadow-md: none;

  /* Status colors — muted, warm tones */
  --success: #2a9d8f;
  --success-light: #f0faf8;
  --success-border: #c4e8e3;
  --error: #c1554d;
  --error-light: #fdf5f4;
  --error-border: #e8c5c2;
  --warning: #c68a19;
  --warning-light: #fdf8ed;
  --warning-border: #e8d9b0;
  --pending: #7c6daa;
  --pending-light: #f7f5fb;
  --pending-border: #d5cfea;

  /* Theme-specific */
  --keyword-color: #1f7a6e;
  --tag-bg: #f0faf8;
  --tag-color: #1f7a6e;
  --tag-border: #c4e8e3;
  --step-param-color: #4a7fb5;

  /* Accordion/Collapsible styling */
  --accordion-header-hover: #f5f3ef;
  --accordion-content-bg: #fdfcfa;
}

/* ============================================================================
   Dark Mode
   ============================================================================ */
[data-theme="dark"] {
  --font-sans: "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-mono: "DM Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;

  --background: #1a1a18;
  --foreground: #e0ddd8;
  --card: #1a1a18;
  --card-foreground: #e0ddd8;
  --popover: #1a1a18;
  --popover-foreground: #e0ddd8;

  --primary: #3dbcad;
  --primary-foreground: #1a1a18;

  --secondary: #262622;
  --secondary-foreground: #e0ddd8;
  --muted: #262622;
  --muted-foreground: #8a8680;
  --accent: #2e2e2a;
  --accent-foreground: #e0ddd8;
  --destructive: #d4706a;
  --destructive-foreground: #ffffff;
  --border: #3a3836;
  --input: #3a3836;
  --ring: #3dbcad;
  --radius: 0.25rem;

  --shadow-xs: none;
  --shadow-sm: none;
  --shadow: none;
  --shadow-md: none;

  --success: #3dbcad;
  --success-light: #1c2b28;
  --success-border: #2a4a44;
  --error: #d4706a;
  --error-light: #2b1c1c;
  --error-border: #4a2a28;
  --warning: #d4a033;
  --warning-light: #2b2618;
  --warning-border: #4a3e22;
  --pending: #9688c0;
  --pending-light: #221e2e;
  --pending-border: #3a3450;

  --keyword-color: #4ed4c4;
  --tag-bg: #1c2b28;
  --tag-color: #4ed4c4;
  --tag-border: #2a4a44;
  --step-param-color: #7aade0;

  --accordion-header-hover: #262622;
  --accordion-content-bg: #1e1e1c;
}

/* Auto dark mode based on system preference */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --background: #1a1a18;
    --foreground: #e0ddd8;
    --card: #1a1a18;
    --card-foreground: #e0ddd8;
    --popover: #1a1a18;
    --popover-foreground: #e0ddd8;
    --primary: #3dbcad;
    --primary-foreground: #1a1a18;
    --secondary: #262622;
    --secondary-foreground: #e0ddd8;
    --muted: #262622;
    --muted-foreground: #8a8680;
    --accent: #2e2e2a;
    --accent-foreground: #e0ddd8;
    --destructive: #d4706a;
    --destructive-foreground: #ffffff;
    --border: #3a3836;
    --input: #3a3836;
    --ring: #3dbcad;
    --shadow-xs: none;
    --shadow-sm: none;
    --shadow: none;
    --shadow-md: none;
    --success: #3dbcad;
    --success-light: #1c2b28;
    --success-border: #2a4a44;
    --error: #d4706a;
    --error-light: #2b1c1c;
    --error-border: #4a2a28;
    --warning: #d4a033;
    --warning-light: #2b2618;
    --warning-border: #4a3e22;
    --pending: #9688c0;
    --pending-light: #221e2e;
    --pending-border: #3a3450;
    --keyword-color: #4ed4c4;
    --tag-bg: #1c2b28;
    --tag-color: #4ed4c4;
    --tag-border: #2a4a44;
    --step-param-color: #7aade0;
    --accordion-header-hover: #262622;
    --accordion-content-bg: #1e1e1c;
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
  line-height: 1.8;
  color: var(--foreground);
  background-color: var(--background);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ============================================================================
   Layout — single-column centered, generous whitespace
   ============================================================================ */
.container {
  max-width: 680px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

@media (min-width: 768px) {
  .container {
    padding: 3rem 2rem;
  }
}

/* ============================================================================
   Header — serif heading, minimal rule
   ============================================================================ */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.5rem;
  padding-bottom: 1.5rem;
  margin-bottom: 2rem;
  border-bottom: 1px solid var(--border);
}

.header h1 {
  font-family: "Noto Serif Display", Georgia, "Times New Roman", serif;
  font-size: 1.75rem;
  font-weight: 500;
  letter-spacing: -0.02em;
  color: var(--foreground);
  white-space: nowrap;
}

.header-actions {
  display: flex;
  gap: 0.625rem;
  align-items: center;
  flex-shrink: 0;
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
  background: transparent;
  cursor: pointer;
  color: var(--muted-foreground);
  font-size: 0.875rem;
  transition: color 0.2s ease;
}

.theme-toggle:hover {
  color: var(--foreground);
  background: transparent;
  border-color: var(--foreground);
}

.theme-toggle:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--background), 0 0 0 4px var(--ring);
}

/* ============================================================================
   Search Input
   ============================================================================ */
.search-input {
  height: 2rem;
  padding: 0 0.75rem;
  border: none;
  border-bottom: 1px solid var(--border);
  border-radius: 0;
  background: transparent;
  color: var(--foreground);
  font-family: var(--font-sans);
  font-size: 0.875rem;
  width: 200px;
  transition: border-color 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary);
}

.search-input::placeholder {
  color: var(--muted-foreground);
}

@media (min-width: 640px) {
  .search-input {
    width: 240px;
  }
}

/* ============================================================================
   Meta Info — understated inline text
   ============================================================================ */
.meta-info {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 1.5rem;
  margin-bottom: 2rem;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 0;
  font-size: 0.8125rem;
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
   Summary Cards — flat, typographic counters
   ============================================================================ */
.summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0;
  margin-bottom: 2.5rem;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}

@media (max-width: 640px) {
  .summary {
    grid-template-columns: repeat(2, 1fr);
  }
}

.summary-card {
  background: transparent;
  border: none;
  border-radius: 0;
  padding: 1rem 1rem;
  border-right: 1px solid var(--border);
  transition: none;
}

.summary-card:last-child {
  border-right: none;
}

.summary-card:hover {
  box-shadow: none;
}

.summary-card .label {
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted-foreground);
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.summary-card .value {
  font-family: "Noto Serif Display", Georgia, serif;
  font-size: 2rem;
  font-weight: 400;
  letter-spacing: -0.02em;
  line-height: 1.1;
}

/* Passed — teal text only */
.summary-card.passed {
  background: transparent;
  border-color: var(--border);
}
.summary-card.passed .value { color: var(--success); }

/* Failed — red text only */
.summary-card.failed {
  background: transparent;
  border-color: var(--border);
}
.summary-card.failed .value { color: var(--error); }

/* Skipped — amber text only */
.summary-card.skipped {
  background: transparent;
  border-color: var(--border);
}
.summary-card.skipped .value { color: var(--warning); }

/* Pending — purple text only */
.summary-card.pending {
  background: transparent;
  border-color: var(--border);
}
.summary-card.pending .value { color: var(--pending); }

/* ============================================================================
   Tag Filter Bar
   ============================================================================ */
.tag-bar {
  margin-bottom: 1.5rem;
  padding: 0.75rem 0;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--border);
  border-radius: 0;
  position: sticky;
  top: 0;
  z-index: 10;
  backdrop-filter: blur(8px);
  background: color-mix(in srgb, var(--background) 90%, transparent);
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
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
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
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--destructive);
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--destructive);
  cursor: pointer;
  padding: 0.125rem 0;
  border-radius: 0;
  transition: opacity 0.15s ease;
}

.tag-bar-clear:hover {
  opacity: 0.7;
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
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.125rem 0.5rem;
  background: transparent;
  color: var(--muted-foreground);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-family: var(--font-mono);
  cursor: pointer;
  transition: all 0.15s ease;
}

.tag-pill:hover {
  color: var(--primary);
  border-color: var(--primary);
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
  box-shadow: none;
  border-bottom: 2px solid var(--ring);
}

/* ============================================================================
   Filter Results Counter
   ============================================================================ */
.filter-results {
  text-align: center;
  font-size: 0.8125rem;
  color: var(--muted-foreground);
  margin-bottom: 1.5rem;
  font-weight: 400;
  font-style: italic;
}

/* ============================================================================
   Feature Sections — no card, separated by large rules
   ============================================================================ */
.feature {
  background: transparent;
  border: none;
  border-radius: 0;
  margin-bottom: 0;
  padding-bottom: 2rem;
  border-bottom: 2px solid var(--border);
  overflow: visible;
}

.feature:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.feature + .feature {
  padding-top: 2rem;
}

.feature-header {
  padding: 0.75rem 0;
  background: transparent;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
  transition: none;
  gap: 1rem;
}

.feature-header:hover {
  background: transparent;
}

.feature-info {
  flex: 1;
  min-width: 0;
}

.feature-title {
  font-family: "Noto Serif Display", Georgia, "Times New Roman", serif;
  font-weight: 500;
  font-size: 1.25rem;
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
  padding: 0.5rem 0 0 0;
  border-top: none;
  background: transparent;
}

.feature.collapsed .feature-content {
  display: none;
}

/* ============================================================================
   Scenarios — left-border accent, no card
   ============================================================================ */
.scenario {
  background: transparent;
  border: none;
  border-left: 3px solid var(--border);
  border-radius: 0;
  margin-bottom: 1.25rem;
  padding-left: 1rem;
  overflow: visible;
}

.scenario:last-child {
  margin-bottom: 0;
}

.scenario-header {
  padding: 0.5rem 0;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  cursor: pointer;
  transition: none;
  gap: 1rem;
}

.scenario-header:hover {
  background: transparent;
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
  margin-top: 0.375rem;
}

.tag {
  font-size: 0.6875rem;
  font-weight: 500;
  padding: 0.0625rem 0.375rem;
  background: transparent;
  color: var(--muted-foreground);
  border: none;
  border-radius: 0;
  font-family: var(--font-mono);
}

.tag::before {
  content: "#";
  opacity: 0.5;
}

.scenario-duration {
  font-size: 0.75rem;
  color: var(--muted-foreground);
  font-family: var(--font-mono);
  white-space: nowrap;
  flex-shrink: 0;
}

.scenario-content {
  padding: 0.25rem 0 0.5rem;
  border-top: none;
}

.scenario.collapsed .scenario-content {
  display: none;
}

/* Status-based left border for scenarios */
.scenario:has(.status-passed) {
  border-left-color: var(--success);
}

.scenario:has(.status-failed) {
  border-left-color: var(--error);
}

.scenario:has(.status-skipped) {
  border-left-color: var(--warning);
}

.scenario:has(.status-pending) {
  border-left-color: var(--pending);
}

/* ============================================================================
   Status Icons
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
   Steps — generous line-height, quiet styling
   ============================================================================ */
.steps {
  margin-top: 0.25rem;
  padding: 0.25rem 0;
}

.step {
  display: flex;
  gap: 0.5rem;
  padding: 0.25rem 0;
  font-size: 0.875rem;
  align-items: baseline;
  line-height: 1.7;
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
  font-family: var(--font-mono);
  font-size: 0.8125rem;
}

/* Indent continuation keywords (And, But, *) */
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
  opacity: 0.5;
}

/* ============================================================================
   Error Display — left-border accent, minimal
   ============================================================================ */
.error-box {
  margin-top: 0.75rem;
  padding: 0.75rem 1rem;
  background: transparent;
  border-radius: 0;
  border: none;
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
  padding: 0.25rem 0;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--border);
  border-radius: 0;
  font-size: 0.75rem;
  font-family: var(--font-mono);
  text-decoration: none;
  color: var(--muted-foreground);
  transition: color 0.15s ease;
}

.attachment:hover {
  background: transparent;
  color: var(--primary);
  border-color: var(--primary);
}

.attachment-image {
  max-width: 100%;
  margin-top: 0.5rem;
  border-radius: var(--radius);
  border: 1px solid var(--border);
}

.attachment-video {
  max-width: 100%;
  margin-top: 0.5rem;
  border-radius: var(--radius);
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
   Scrollbars — hidden track
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
  border-radius: 2px;
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
  background: color-mix(in srgb, var(--primary) 15%, transparent);
  color: inherit;
}

/* ============================================================================
   Animations — subtle fade only
   ============================================================================ */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.feature {
  animation: fadeIn 0.3s ease-out;
}

.feature:nth-child(2) { animation-delay: 0.03s; }
.feature:nth-child(3) { animation-delay: 0.06s; }
.feature:nth-child(4) { animation-delay: 0.09s; }
.feature:nth-child(5) { animation-delay: 0.12s; }

/* ============================================================================
   Print Styles — optimized by default
   ============================================================================ */
@media print {
  :root {
    --background: white;
    --foreground: black;
    --card: white;
    --border: #d4d4d4;
    --muted: #f5f5f5;
    --muted-foreground: #555;
  }

  body {
    font-size: 11pt;
    line-height: 1.6;
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

  .header h1 {
    font-size: 18pt;
  }

  .feature {
    page-break-inside: avoid;
    animation: none;
    border-bottom: 1pt solid #d4d4d4;
  }

  .scenario {
    page-break-inside: avoid;
  }

  .collapsed .feature-content,
  .collapsed .scenario-content {
    display: block;
  }

  .summary-card .value {
    font-size: 16pt;
  }

  .step {
    font-size: 10pt;
  }
}

/* ============================================================================
   Documentation Entries - Containers
   ============================================================================ */
.story-docs {
  margin-bottom: 1rem;
  padding: 0.75rem 0;
  background: transparent;
  border-radius: 0;
  border: none;
  border-top: 1px solid var(--border);
}

.step-docs {
  margin-left: 1.5rem;
  margin-top: 0.25rem;
  margin-bottom: 0.5rem;
  padding: 0.5rem 0 0.5rem 0.75rem;
  background: transparent;
  border-left: 2px solid var(--primary);
  border-radius: 0;
}

/* ============================================================================
   Documentation Entries - Note
   ============================================================================ */
.doc-note {
  padding: 0.5rem 0 0.5rem 0.75rem;
  margin-bottom: 0.5rem;
  background: transparent;
  border-left: 2px solid var(--muted-foreground);
  border-radius: 0;
  font-size: 0.875rem;
  line-height: 1.7;
  color: var(--muted-foreground);
  font-style: italic;
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
  gap: 0.375rem;
  margin-bottom: 0.5rem;
}

.doc-tag:last-child {
  margin-bottom: 0;
}

.doc-tag-item {
  font-size: 0.6875rem;
  font-weight: 500;
  padding: 0.0625rem 0.375rem;
  background: transparent;
  color: var(--tag-color);
  border: none;
  border-radius: 0;
  font-family: var(--font-mono);
}

.doc-tag-item::before {
  content: "#";
  opacity: 0.5;
}

/* ============================================================================
   Documentation Entries - Key-Value
   ============================================================================ */
.doc-kv {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.375rem;
  font-size: 0.875rem;
  align-items: baseline;
}

.doc-kv:last-child {
  margin-bottom: 0;
}

.doc-kv-label {
  font-weight: 600;
  color: var(--muted-foreground);
  font-family: var(--font-mono);
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
   Documentation Entries - Code
   ============================================================================ */
.doc-code {
  margin-bottom: 0.75rem;
  border: none;
  border-radius: 0;
  overflow: hidden;
}

.doc-code:last-child {
  margin-bottom: 0;
}

.doc-code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.375rem 0;
  background: transparent;
  border-bottom: 1px solid var(--border);
}

.doc-code-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--muted-foreground);
}

.doc-code-lang {
  font-size: 0.625rem;
  font-weight: 500;
  padding: 0.0625rem 0.375rem;
  background: transparent;
  color: var(--muted-foreground);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.doc-code-content {
  margin: 0;
  padding: 0.75rem 0;
  background: transparent;
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
  margin-bottom: 0.75rem;
}

.doc-table:last-child {
  margin-bottom: 0;
}

.doc-table-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--muted-foreground);
  margin-bottom: 0.375rem;
}

.doc-table table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
  font-family: var(--font-mono);
}

.doc-table th,
.doc-table td {
  padding: 0.5rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

.doc-table th {
  background: transparent;
  font-weight: 600;
  color: var(--foreground);
  border-bottom: 2px solid var(--border);
}

.doc-table td {
  background: transparent;
  color: var(--foreground);
}

.doc-table tr:hover td {
  background: var(--accent);
}

/* ============================================================================
   Documentation Entries - Link
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
  font-size: 0.875rem;
  color: var(--primary);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color 0.15s ease;
}

.doc-link a:hover {
  border-bottom-color: var(--primary);
  text-decoration: none;
}

.doc-link a::before {
  content: "\\2192";
  font-size: 0.75rem;
}

/* ============================================================================
   Documentation Entries - Section
   ============================================================================ */
.doc-section {
  margin-bottom: 0.75rem;
  border: none;
  border-radius: 0;
  overflow: hidden;
}

.doc-section:last-child {
  margin-bottom: 0;
}

.doc-section-title {
  padding: 0.375rem 0;
  background: transparent;
  border-bottom: 1px solid var(--border);
  font-family: "Noto Serif Display", Georgia, serif;
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--foreground);
}

.doc-section-content {
  margin: 0;
  padding: 0.75rem 0;
  background: transparent;
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
  font-family: "Noto Serif Display", Georgia, serif;
  margin-top: 1.25em;
  margin-bottom: 0.5em;
  font-weight: 500;
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
  border-bottom: 1px solid transparent;
}

.doc-section-parsed .doc-section-content a:hover {
  border-bottom-color: var(--primary);
}

.doc-section-parsed .doc-section-content code {
  font-family: var(--font-mono);
  font-size: 0.85em;
  padding: 0.125em 0.375em;
  background: var(--muted);
  border-radius: 2px;
}

.doc-section-parsed .doc-section-content pre {
  margin: 0.75em 0;
  padding: 0.75em;
  background: var(--muted);
  border-radius: var(--radius);
  overflow-x: auto;
}

.doc-section-parsed .doc-section-content pre code {
  padding: 0;
  background: none;
}

.doc-section-parsed .doc-section-content blockquote {
  margin: 0.75em 0;
  padding: 0.5em 1em;
  border-left: 2px solid var(--primary);
  background: transparent;
  color: var(--muted-foreground);
  font-style: italic;
}

.doc-section-parsed .doc-section-content blockquote p {
  margin: 0;
}

.doc-section-parsed .doc-section-content hr {
  margin: 1.5em 0;
  border: none;
  border-top: 1px solid var(--border);
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
  border-bottom: 1px solid var(--border);
  text-align: left;
}

.doc-section-parsed .doc-section-content th {
  background: transparent;
  font-weight: 600;
  border-bottom: 2px solid var(--border);
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
  margin-bottom: 0.75rem;
  border: none;
  border-radius: 0;
  overflow: hidden;
}

.doc-mermaid:last-child {
  margin-bottom: 0;
}

.doc-mermaid-title {
  padding: 0.375rem 0;
  background: transparent;
  border-bottom: 1px solid var(--border);
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
  padding: 0.75rem 0;
  background: transparent;
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
  margin-bottom: 0.75rem;
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
  margin-top: 0.375rem;
  font-size: 0.75rem;
  color: var(--muted-foreground);
  font-style: italic;
}

/* ============================================================================
   Documentation Entries - Custom
   ============================================================================ */
.doc-custom {
  margin-bottom: 0.75rem;
  border: none;
  border-radius: 0;
  overflow: hidden;
}

.doc-custom:last-child {
  margin-bottom: 0;
}

.doc-custom-type {
  padding: 0.375rem 0;
  background: transparent;
  border-bottom: 1px solid var(--border);
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted-foreground);
}

.doc-custom-data {
  margin: 0;
  padding: 0.75rem 0;
  background: transparent;
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
   Trace View
   ============================================================================ */
.trace-view {
  margin-top: 0.75rem;
  border: none;
  border-top: 1px solid var(--border);
  border-radius: 0;
  overflow: hidden;
}

.trace-view-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0;
  background: transparent;
  cursor: pointer;
  user-select: none;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--foreground);
  transition: none;
}

.trace-view-header:hover {
  background: transparent;
}

.trace-view-count {
  font-size: 0.6875rem;
  font-weight: 500;
  padding: 0.0625rem 0.375rem;
  background: transparent;
  color: var(--success);
  border: 1px solid var(--success-border);
  border-radius: var(--radius);
  font-family: var(--font-mono);
}

.trace-view-content {
  border-top: 1px solid var(--border);
  padding: 0.5rem 0;
  background: transparent;
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
.badge { display: inline-block; padding: 2px 6px; border-radius: 2px; font-size: 0.75em; font-weight: 600; margin-left: 4px; vertical-align: middle; }
.badge-grade { color: #fff; }
.badge-grade-A { background: var(--success); }
.badge-grade-B { background: #4a7fb5; }
.badge-grade-C { background: #c68a19; }
.badge-grade-D { background: #c1554d; }
.badge-grade-F { background: #8a2020; }
.badge-flaky { background: #c68a19; color: #fff; }
.badge-perf { font-size: 0.7em; }
.badge-perf-improving { color: var(--success); }
.badge-perf-regressing { color: var(--error); }

/* Failure summary */
.failure-summary {
  margin: 1.5rem 0;
  padding: 0.75rem 0 0.75rem 1rem;
  border: none;
  border-left: 3px solid var(--error);
  border-radius: 0;
  background: transparent;
}
.failure-summary-header {
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
  font-size: 0.8125rem;
  color: var(--foreground);
  text-decoration: none;
}
.failure-summary li a:hover {
  text-decoration: underline;
  color: var(--error);
}

/* Source permalink */
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
  width: 2rem;
  height: 2rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: transparent;
  cursor: pointer;
  color: var(--muted-foreground);
  font-size: 0.875rem;
  transition: color 0.15s ease;
}

.detail-toggle:hover {
  color: var(--foreground);
  background: transparent;
  border-color: var(--foreground);
}

.detail-toggle:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--background), 0 0 0 4px var(--ring);
}

[data-detail-level="minimal"] .story-docs,
[data-detail-level="minimal"] .step-docs {
  display: none;
}
`,
};
