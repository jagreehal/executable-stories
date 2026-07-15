/**
 * Canonical executable-stories theme tokens (--es-*).
 *
 * Source of truth for the `--es-color-*`, `--es-space-*`, `--es-font-*`,
 * `--es-size-*`, `--es-radius`, `--es-line`, and `--es-measure` CSS custom
 * properties consumed by:
 *
 * - executable-stories-react (styles.css)
 * - executable-stories-formatters HTML report (CSS_STYLES, via this module)
 *
 * Consumer-side overrides on `:root` or any ancestor of the report cascade
 * through both: setting `--es-color-failed: red` on body re-colors failures
 * in both the standalone HTML report and the React component.
 *
 * The HTML formatter's pre-existing tokens (--success, --error, etc.)
 * remain in place for backward compatibility; the --es-* tokens are emitted
 * alongside them as the public override surface.
 */

export const ES_THEME_TOKENS_CSS = `
:root,
[data-theme="light"] {
  --es-color-bg: #ffffff;
  --es-color-fg: #111827;
  --es-color-muted: #6b7280;
  --es-color-border: #e5e7eb;
  --es-color-surface: #f9fafb;
  --es-color-link: #2563eb;
  --es-color-passed: #16a34a;
  --es-color-failed: #dc2626;
  --es-color-skipped: #9ca3af;
  --es-color-pending: #d97706;
  --es-color-passed-bg: #f0fdf4;
  --es-color-failed-bg: #fef2f2;
  --es-color-skipped-bg: #f3f4f6;
  --es-color-pending-bg: #fffbeb;
  --es-warn-fg: #92400e;
  --es-font-body: "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  --es-font-mono: "Geist Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
  --es-size-base: 1rem;
  --es-size-sm: 0.875rem;
  --es-size-xs: 0.75rem;
  --es-size-h1: 1.875rem;
  --es-size-h2: 1.5rem;
  --es-size-h3: 1.25rem;
  --es-space-1: 0.25rem;
  --es-space-2: 0.5rem;
  --es-space-3: 0.75rem;
  --es-space-4: 1rem;
  --es-space-6: 1.5rem;
  --es-space-8: 2rem;
  --es-radius: 0.625rem;
  --es-line: 1.6;
  --es-measure: 72ch;
}

@media (prefers-color-scheme: dark) {
  :root {
    --es-color-bg: #0b0f17;
    --es-color-fg: #e5e7eb;
    --es-color-muted: #9ca3af;
    --es-color-border: #1f2937;
    --es-color-surface: #111827;
    --es-color-link: #60a5fa;
    --es-color-passed: #4ade80;
    --es-color-failed: #f87171;
    --es-color-skipped: #6b7280;
    --es-color-pending: #fbbf24;
    --es-color-passed-bg: rgba(74, 222, 128, 0.08);
    --es-color-failed-bg: rgba(248, 113, 113, 0.08);
    --es-color-skipped-bg: rgba(107, 114, 128, 0.08);
    --es-color-pending-bg: rgba(251, 191, 36, 0.08);
    --es-warn-fg: #fbbf24;
  }
}

[data-theme="dark"] {
  --es-color-bg: #0b0f17;
  --es-color-fg: #e5e7eb;
  --es-color-muted: #9ca3af;
  --es-color-border: #1f2937;
  --es-color-surface: #111827;
  --es-color-link: #60a5fa;
  --es-color-passed: #4ade80;
  --es-color-failed: #f87171;
  --es-color-skipped: #6b7280;
  --es-color-pending: #fbbf24;
  --es-color-passed-bg: rgba(74, 222, 128, 0.08);
  --es-color-failed-bg: rgba(248, 113, 113, 0.08);
  --es-color-skipped-bg: rgba(107, 114, 128, 0.08);
  --es-color-pending-bg: rgba(251, 191, 36, 0.08);
  --es-warn-fg: #fbbf24;
}
`.trim();

/**
 * JS-level mirror of the token values (for cases where TypeScript code needs
 * to read them — e.g., dynamic style injection or theme generators).
 */
export const ES_THEME_TOKEN_VALUES = {
  light: {
    "--es-color-bg": "#ffffff",
    "--es-color-fg": "#111827",
    "--es-color-muted": "#6b7280",
    "--es-color-border": "#e5e7eb",
    "--es-color-surface": "#f9fafb",
    "--es-color-link": "#2563eb",
    "--es-color-passed": "#16a34a",
    "--es-color-failed": "#dc2626",
    "--es-color-skipped": "#9ca3af",
    "--es-color-pending": "#d97706",
  },
  dark: {
    "--es-color-bg": "#0b0f17",
    "--es-color-fg": "#e5e7eb",
    "--es-color-muted": "#9ca3af",
    "--es-color-border": "#1f2937",
    "--es-color-surface": "#111827",
    "--es-color-link": "#60a5fa",
    "--es-color-passed": "#4ade80",
    "--es-color-failed": "#f87171",
    "--es-color-skipped": "#6b7280",
    "--es-color-pending": "#fbbf24",
  },
} as const;
