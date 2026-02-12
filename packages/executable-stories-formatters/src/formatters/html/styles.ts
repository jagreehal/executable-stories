/**
 * HTML Report Styles.
 *
 * Modern, clean CSS inspired by shadcn/ui base theme with Cucumber branding.
 * Supports dark/light mode via CSS custom properties and prefers-color-scheme.
 */

export const CSS_STYLES = `
/* ============================================================================
   Google Fonts Import - IBM Plex for refined typography
   ============================================================================ */
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');

/* ============================================================================
   CSS Custom Properties - Light Mode (Default)
   Cucumber-branded shadcn/ui base theme
   ============================================================================ */
:root {
  /* Typography */
  --font-sans: "IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;

  /* Base colors (shadcn base with cucumber accent) */
  --background: hsl(0 0% 100%);
  --foreground: hsl(0 0% 9%);
  --card: hsl(0 0% 100%);
  --card-foreground: hsl(0 0% 9%);
  --popover: hsl(0 0% 100%);
  --popover-foreground: hsl(0 0% 9%);

  /* Cucumber green as primary */
  --primary: hsl(145 63% 42%);
  --primary-foreground: hsl(0 0% 100%);

  --secondary: hsl(0 0% 96.5%);
  --secondary-foreground: hsl(0 0% 9%);
  --muted: hsl(0 0% 96.5%);
  --muted-foreground: hsl(0 0% 45%);
  --accent: hsl(0 0% 96.5%);
  --accent-foreground: hsl(0 0% 9%);
  --destructive: hsl(0 84% 60%);
  --destructive-foreground: hsl(0 0% 100%);
  --border: hsl(0 0% 90%);
  --input: hsl(0 0% 90%);
  --ring: hsl(145 63% 42%);
  --radius: 0.5rem;

  /* Shadows - refined for depth */
  --shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.03);
  --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06);
  --shadow: 0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05);
  --shadow-md: 0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.05);

  /* Status colors - cucumber-harmonized */
  --success: hsl(145 63% 42%);
  --success-light: hsl(145 55% 96%);
  --success-border: hsl(145 55% 88%);
  --error: hsl(0 72% 51%);
  --error-light: hsl(0 86% 97%);
  --error-border: hsl(0 72% 92%);
  --warning: hsl(38 92% 50%);
  --warning-light: hsl(48 100% 96%);
  --warning-border: hsl(48 96% 88%);
  --pending: hsl(262 60% 55%);
  --pending-light: hsl(262 55% 97%);
  --pending-border: hsl(262 55% 90%);

  /* Cucumber-specific */
  --keyword-color: hsl(145 63% 32%);
  --tag-bg: hsl(145 55% 95%);
  --tag-color: hsl(145 63% 30%);
  --tag-border: hsl(145 55% 85%);

  /* Accordion/Collapsible styling */
  --accordion-header-hover: hsl(0 0% 98%);
  --accordion-content-bg: hsl(0 0% 98.5%);
}

/* ============================================================================
   Dark Mode - Cucumber branded
   ============================================================================ */
[data-theme="dark"] {
  --background: hsl(0 0% 6%);
  --foreground: hsl(0 0% 95%);
  --card: hsl(0 0% 9%);
  --card-foreground: hsl(0 0% 95%);
  --popover: hsl(0 0% 9%);
  --popover-foreground: hsl(0 0% 95%);

  /* Cucumber green stays vibrant in dark mode */
  --primary: hsl(145 63% 50%);
  --primary-foreground: hsl(0 0% 6%);

  --secondary: hsl(0 0% 13%);
  --secondary-foreground: hsl(0 0% 95%);
  --muted: hsl(0 0% 13%);
  --muted-foreground: hsl(0 0% 55%);
  --accent: hsl(0 0% 13%);
  --accent-foreground: hsl(0 0% 95%);
  --destructive: hsl(0 72% 55%);
  --destructive-foreground: hsl(0 0% 100%);
  --border: hsl(0 0% 16%);
  --input: hsl(0 0% 16%);
  --ring: hsl(145 63% 50%);

  /* Shadows (subtle for dark mode) */
  --shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.3);
  --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.4), 0 1px 2px -1px rgb(0 0 0 / 0.35);
  --shadow: 0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.35);
  --shadow-md: 0 10px 15px -3px rgb(0 0 0 / 0.45), 0 4px 6px -4px rgb(0 0 0 / 0.35);

  /* Status colors (dark mode) */
  --success: hsl(145 63% 55%);
  --success-light: hsl(145 35% 14%);
  --success-border: hsl(145 35% 22%);
  --error: hsl(0 72% 60%);
  --error-light: hsl(0 35% 14%);
  --error-border: hsl(0 35% 22%);
  --warning: hsl(38 92% 55%);
  --warning-light: hsl(38 35% 14%);
  --warning-border: hsl(38 35% 22%);
  --pending: hsl(262 60% 65%);
  --pending-light: hsl(262 25% 14%);
  --pending-border: hsl(262 25% 22%);

  /* Cucumber-specific (dark) */
  --keyword-color: hsl(145 63% 60%);
  --tag-bg: hsl(145 35% 14%);
  --tag-color: hsl(145 63% 60%);
  --tag-border: hsl(145 35% 22%);

  /* Accordion/Collapsible styling */
  --accordion-header-hover: hsl(0 0% 11%);
  --accordion-content-bg: hsl(0 0% 7%);
}

/* Auto dark mode based on system preference */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --background: hsl(0 0% 6%);
    --foreground: hsl(0 0% 95%);
    --card: hsl(0 0% 9%);
    --card-foreground: hsl(0 0% 95%);
    --popover: hsl(0 0% 9%);
    --popover-foreground: hsl(0 0% 95%);
    --primary: hsl(145 63% 50%);
    --primary-foreground: hsl(0 0% 6%);
    --secondary: hsl(0 0% 13%);
    --secondary-foreground: hsl(0 0% 95%);
    --muted: hsl(0 0% 13%);
    --muted-foreground: hsl(0 0% 55%);
    --accent: hsl(0 0% 13%);
    --accent-foreground: hsl(0 0% 95%);
    --destructive: hsl(0 72% 55%);
    --destructive-foreground: hsl(0 0% 100%);
    --border: hsl(0 0% 16%);
    --input: hsl(0 0% 16%);
    --ring: hsl(145 63% 50%);
    --shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.3);
    --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.4), 0 1px 2px -1px rgb(0 0 0 / 0.35);
    --shadow: 0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.35);
    --shadow-md: 0 10px 15px -3px rgb(0 0 0 / 0.45), 0 4px 6px -4px rgb(0 0 0 / 0.35);
    --success: hsl(145 63% 55%);
    --success-light: hsl(145 35% 14%);
    --success-border: hsl(145 35% 22%);
    --error: hsl(0 72% 60%);
    --error-light: hsl(0 35% 14%);
    --error-border: hsl(0 35% 22%);
    --warning: hsl(38 92% 55%);
    --warning-light: hsl(38 35% 14%);
    --warning-border: hsl(38 35% 22%);
    --pending: hsl(262 60% 65%);
    --pending-light: hsl(262 25% 14%);
    --pending-border: hsl(262 25% 22%);
    --keyword-color: hsl(145 63% 60%);
    --tag-bg: hsl(145 35% 14%);
    --tag-color: hsl(145 63% 60%);
    --tag-border: hsl(145 35% 22%);
    --accordion-header-hover: hsl(0 0% 11%);
    --accordion-content-bg: hsl(0 0% 7%);
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
  font-size: 14px;
  line-height: 1.6;
  color: var(--foreground);
  background-color: var(--background);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ============================================================================
   Layout
   ============================================================================ */
.container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 1.25rem;
}

@media (min-width: 768px) {
  .container {
    padding: 2rem 2.5rem;
  }
}

/* ============================================================================
   Header - shadcn style
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
  font-size: 1.375rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--foreground);
}

.header-actions {
  display: flex;
  gap: 0.625rem;
  align-items: center;
}

/* ============================================================================
   Theme Toggle - shadcn button style
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
   Search Input - shadcn input style
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
  box-shadow: 0 0 0 3px hsl(145 63% 42% / 0.1);
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
   Meta Info - clean card style
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
   Summary Cards - tinted card style
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
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted-foreground);
  font-weight: 500;
  margin-bottom: 0.375rem;
}

.summary-card .value {
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.1;
  font-family: var(--font-sans);
}

/* Passed - green tint */
.summary-card.passed {
  background: var(--success-light);
  border-color: var(--success-border);
}
.summary-card.passed .value { color: var(--success); }

/* Failed - red tint */
.summary-card.failed {
  background: var(--error-light);
  border-color: var(--error-border);
}
.summary-card.failed .value { color: var(--error); }

/* Skipped - amber tint */
.summary-card.skipped {
  background: var(--warning-light);
  border-color: var(--warning-border);
}
.summary-card.skipped .value { color: var(--warning); }

/* Pending - purple tint */
.summary-card.pending {
  background: var(--pending-light);
  border-color: var(--pending-border);
}
.summary-card.pending .value { color: var(--pending); }

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
  margin-bottom: 0.5rem;
}

.tag-bar-label {
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted-foreground);
  font-weight: 500;
}

.tag-bar-clear {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--primary);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius);
  transition: all 0.15s ease;
}

.tag-bar-clear:hover {
  background: var(--muted);
}

.tag-bar-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.tag-pill {
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.25rem 0.625rem;
  background: var(--tag-bg);
  color: var(--tag-color);
  border: 1px solid var(--tag-border);
  border-radius: 9999px;
  font-family: var(--font-mono);
  cursor: pointer;
  transition: all 0.15s ease;
}

.tag-pill:hover {
  background: var(--success-border);
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
  font-size: 0.8125rem;
  color: var(--muted-foreground);
  margin-bottom: 1rem;
  font-weight: 500;
}

/* ============================================================================
   Feature Sections - shadcn accordion style
   ============================================================================ */
.feature {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  margin-bottom: 0.625rem;
  overflow: hidden;
}

.feature-header {
  padding: 0.875rem 1rem;
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
  font-weight: 600;
  font-size: 0.9375rem;
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
  padding: 0.625rem;
  border-top: 1px solid var(--border);
  background: var(--accordion-content-bg);
}

.feature.collapsed .feature-content {
  display: none;
}

/* ============================================================================
   Scenarios - nested accordion style
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
  padding: 0.125rem 0.5rem;
  background: var(--tag-bg);
  color: var(--tag-color);
  border: 1px solid var(--tag-border);
  border-radius: 9999px;
  font-family: var(--font-mono);
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
   Status Icons - refined
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
   Steps - story-like flow
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
  line-height: 1.5;
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
  font-size: 0.75rem;
}

/* Indent continuation keywords (And, But, *) to show they belong to previous step */
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

.step-duration {
  color: var(--muted-foreground);
  font-size: 0.6875rem;
  font-family: var(--font-mono);
  white-space: nowrap;
  opacity: 0.7;
}

/* ============================================================================
   Error Display - alert style
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
   Attachments - badge style
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
   Chevron Icon - smooth rotation
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
   Scrollbars - subtle styling
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
   Focus States - cucumber ring color
   ============================================================================ */
*:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--background), 0 0 0 4px var(--ring);
}

/* ============================================================================
   Selection - cucumber tinted
   ============================================================================ */
::selection {
  background: hsl(145 63% 42% / 0.15);
  color: inherit;
}

/* ============================================================================
   Animations - smooth reveals
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
   Documentation Entries - Note
   ============================================================================ */
.doc-note {
  padding: 0.5rem 0.75rem;
  margin-bottom: 0.5rem;
  background: var(--muted);
  border-left: 3px solid var(--primary);
  border-radius: 0 calc(var(--radius) - 2px) calc(var(--radius) - 2px) 0;
  font-size: 0.8125rem;
  line-height: 1.5;
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
  gap: 0.375rem;
  margin-bottom: 0.5rem;
}

.doc-tag:last-child {
  margin-bottom: 0;
}

.doc-tag-item {
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
   Documentation Entries - Key-Value
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
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--muted-foreground);
}

.doc-code-lang {
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
   Documentation Entries - Table
   ============================================================================ */
.doc-table {
  margin-bottom: 0.5rem;
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
  transition: color 0.15s ease;
}

.doc-link a:hover {
  color: var(--keyword-color);
  text-decoration: underline;
}

.doc-link a::before {
  content: "→";
  font-size: 0.75rem;
}

/* ============================================================================
   Documentation Entries - Section
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
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--foreground);
}

.doc-section-content {
  margin: 0;
  padding: 0.75rem;
  background: var(--card);
  font-size: 0.8125rem;
  line-height: 1.6;
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
   Documentation Entries - Mermaid (displayed as code)
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
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--muted-foreground);
}

.doc-mermaid-title::before {
  content: "◇ ";
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
   Documentation Entries - Screenshot
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
}

/* ============================================================================
   Documentation Entries - Custom
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
`;
