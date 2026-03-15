/**
 * HTML theme type definitions.
 */

import type { BuildBodyArgs, BuildBodyDeps } from "../renderers/body.js";
import type { HtmlTemplateOptions } from "../template.js";

/** Built-in theme names */
export type HtmlThemeName =
  | "default"
  | "corporate"
  | "terminal"
  | "minimal"
  | "dashboard"
  | "playful";

/** A theme definition */
export interface HtmlTheme {
  /** Theme identifier */
  name: string;

  /** Display label */
  label: string;

  /** Full CSS string (replaces CSS_STYLES). Must define all custom properties for both light and dark modes. */
  css: string;

  /** Optional: override body rendering. Receives the same (args, deps) as buildBody. */
  buildBody?: (args: BuildBodyArgs, deps: BuildBodyDeps) => string;

  /** Optional: override the HTML template wrapper. */
  generateTemplate?: (
    title: string,
    styles: string,
    body: string,
    options: HtmlTemplateOptions,
  ) => string;

  /** Optional: additional inline JS injected after core JS. */
  additionalJs?: string;

  /** Optional: additional ESM import statements for CDN libraries. */
  additionalImports?: string[];
}
