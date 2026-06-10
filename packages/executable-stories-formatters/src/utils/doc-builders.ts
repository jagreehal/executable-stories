/**
 * Canonical builders for doc entries whose construction carries a rule worth
 * keeping in one place. Adapters import these instead of re-implementing the
 * logic (the `html` exactly-one-of-source rule was previously copied verbatim
 * across the Vitest, Jest, Cypress, and Playwright adapters).
 */

import type { DocEntry } from "../types/story";

/** Source/presentation options for an `html` doc entry. */
export interface HtmlDocOptions {
  /** Local HTML file path (inlined into the report by default). */
  path?: string;
  /** Remote URL rendered via iframe src. */
  url?: string;
  /** Inline HTML content rendered via iframe srcdoc. */
  content?: string;
  title?: string;
  /** Iframe height: number → px, string passed through (e.g. '60vh'). Default 400px. */
  height?: number | string;
}

/**
 * Build an `html` DocEntry, enforcing that exactly one of path/url/content is
 * set. Throws otherwise — this is the single source of that rule.
 */
export function buildHtmlDocEntry(options: HtmlDocOptions): DocEntry {
  const sources = [options.path, options.url, options.content].filter(
    (v) => v !== undefined,
  );
  if (sources.length !== 1) {
    throw new Error(
      "story.html() requires exactly one of path, url, or content",
    );
  }
  return {
    kind: "html",
    path: options.path,
    url: options.url,
    content: options.content,
    title: options.title,
    height: options.height,
    phase: "runtime",
  };
}
