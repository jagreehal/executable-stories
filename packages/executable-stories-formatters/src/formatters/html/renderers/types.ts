/**
 * Shared types for HTML renderers (fn(args, deps) pattern).
 * Contract-first: Args and Deps are defined explicitly.
 */

import type { TestStatus } from "../../../types/test-result";

/** Subset of HtmlOptions used by renderers */
export interface RenderOptions {
  startCollapsed: boolean;
  embedScreenshots: boolean;
  syntaxHighlighting: boolean;
  markdownEnabled: boolean;
  mermaidEnabled: boolean;
}

/** Escape function injected into renderers (avoids importing template in tests) */
export type EscapeHtml = (str: string) => string;

/** Status icon function (injected so tests can assert icon behavior) */
export type GetStatusIcon = (status: TestStatus) => string;
