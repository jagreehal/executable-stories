/**
 * Theme resolution for the story pages.
 *
 * The pages style themselves from `--es-*` CSS custom properties (see
 * styles/es.css). A theme is just a set of those tokens; this module merges a
 * built-in preset, the `accent` shorthand, and explicit `tokens` overrides into
 * a single `:root { ... }` string the integration injects. Status/accent tokens
 * are the safe ones to repaint; `fg`/`muted`/`border`/`surface` default to the
 * host's (Starlight's) light/dark palette, so presets leave them alone.
 */
import type { StoryTheme, ThemePreset, ThemeToken } from "./config.js";

/** Built-in palettes. `default` inherits the host — it sets nothing. */
const PRESETS: Record<ThemePreset, Partial<Record<ThemeToken, string>>> = {
  default: {},
  terminal: { accent: "#22c55e", pass: "#16a34a", fail: "#dc2626", warn: "#d97706" },
  minimal: { accent: "#334155", pass: "#475569", fail: "#9f1239", warn: "#92400e" },
  vibrant: { accent: "#7c3aed", pass: "#15803d", fail: "#e11d48", warn: "#ea580c" },
};

/** Keep a token value from breaking out of the `<style>` it's injected into. */
function sanitize(value: string): string {
  return value.replace(/[<>{};]/g, "").trim();
}

/**
 * Resolve a {@link StoryTheme} to a `:root { --es-*: … }` CSS string, or `""`
 * when the theme sets nothing. Precedence (low → high): preset, `accent`,
 * `tokens`.
 */
export function resolveThemeCss(theme?: StoryTheme): string {
  if (!theme) return "";
  const merged: Partial<Record<ThemeToken, string>> = {
    ...(theme.preset ? PRESETS[theme.preset] : {}),
    ...(theme.accent ? { accent: theme.accent } : {}),
    ...theme.tokens,
  };
  const decls = Object.entries(merged)
    .filter(([, v]) => v != null && v !== "")
    .map(([name, v]) => `--es-${name}:${sanitize(v as string)};`)
    .join("");
  return decls ? `:root{${decls}}` : "";
}
