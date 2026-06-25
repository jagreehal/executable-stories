/**
 * Standalone theme-token CSS for the string-built HTML reports
 * (Evidence Review `review-html` and run-diff `run-diff-html`).
 *
 * These reports build their own markup + component CSS and only need the shared
 * design tokens — the `--es-*` canonical tokens plus the shadcn-style semantic
 * tokens (`--background`, `--foreground`, `--card`, `--primary`, `--destructive`,
 * `--success`, `--warning`, `--border`, `--radius`, fonts, …) in light/dark.
 *
 * This is the source of those shadcn tokens *for the standalone string reports*
 * with their fixed cucumber palette. (The Astro docs site intentionally re-maps
 * the same token names onto its Starlight-derived `--es-*` in `es.css`, so it
 * themes with the surrounding site instead.) Dark mode follows
 * `[data-theme="dark"]` and the system preference, so the reports' dark-mode
 * toggles keep working.
 *
 * Override any token on `:root` (or any ancestor of the report) to re-theme.
 */
import { ES_THEME_TOKENS_CSS } from "executable-stories-core/theme/tokens";

// Dark-mode token values, defined once and emitted into both the explicit
// `[data-theme="dark"]` toggle and the system-preference fallback below — the
// two selectors differ, but the values must not drift.
const DARK_TOKENS = `
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
  --step-param-color: hsl(220 70% 70%);

  --accordion-header-hover: hsl(0 0% 11%);
  --accordion-content-bg: hsl(0 0% 7%);`;

export const REPORT_THEME_CSS = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');

/* executable-stories canonical tokens (--es-*), shared with executable-stories-react. */
${ES_THEME_TOKENS_CSS}

/* Light mode (default) — shadcn/ui base with cucumber accent. */
:root {
  --font-sans: "IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;

  --background: hsl(0 0% 100%);
  --foreground: hsl(0 0% 9%);
  --card: hsl(0 0% 100%);
  --card-foreground: hsl(0 0% 9%);
  --popover: hsl(0 0% 100%);
  --popover-foreground: hsl(0 0% 9%);

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

  --shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.03);
  --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06);
  --shadow: 0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05);
  --shadow-md: 0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.05);

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

  --keyword-color: hsl(145 63% 32%);
  --tag-bg: hsl(145 55% 95%);
  --tag-color: hsl(145 63% 30%);
  --tag-border: hsl(145 55% 85%);
  --step-param-color: hsl(220 70% 50%);

  --accordion-header-hover: hsl(0 0% 98%);
  --accordion-content-bg: hsl(0 0% 98.5%);
}

/* Dark mode (explicit toggle). */
[data-theme="dark"] {${DARK_TOKENS}
}

/* Auto dark mode based on system preference (unless light is forced). */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {${DARK_TOKENS}
  }
}
`;
