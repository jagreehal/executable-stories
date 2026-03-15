/**
 * Theme registry — resolves theme names to theme objects.
 */

import type { HtmlTheme, HtmlThemeName } from "./types.js";
import { defaultTheme } from "./default.js";
import { corporateTheme } from "./corporate.js";
import { terminalTheme } from "./terminal.js";
import { minimalTheme } from "./minimal.js";
import { dashboardTheme } from "./dashboard.js";
import { playfulTheme } from "./playful.js";

const THEME_REGISTRY = new Map<string, HtmlTheme>([
  ["default", defaultTheme],
  ["corporate", corporateTheme],
  ["terminal", terminalTheme],
  ["minimal", minimalTheme],
  ["dashboard", dashboardTheme],
  ["playful", playfulTheme],
]);

/** Resolve a theme by name or pass through a custom theme object. */
export function resolveTheme(nameOrTheme: string | HtmlTheme): HtmlTheme {
  if (typeof nameOrTheme === "object") return nameOrTheme;
  const theme = THEME_REGISTRY.get(nameOrTheme);
  if (!theme) {
    throw new Error(
      `Unknown theme: "${nameOrTheme}". Available: ${[...THEME_REGISTRY.keys()].join(", ")}`,
    );
  }
  return theme;
}

/** List available built-in theme names. */
export function getAvailableThemes(): string[] {
  return [...THEME_REGISTRY.keys()];
}

export type { HtmlTheme, HtmlThemeName } from "./types.js";
