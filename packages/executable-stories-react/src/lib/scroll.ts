/**
 * Scenario jumps are instant. Readers trigger them from keys (`f`/`F`), TOC
 * clicks and deep links many times a session, and the active TOC link shows
 * where they landed.
 */

import { splitHash, writeHash } from "./hash-state";

export interface ScrollToScenarioOptions {
  /** Replace the URL hash with `#<scenarioId>` after scrolling. Defaults to true. */
  updateHash?: boolean;
}

/**
 * Scrolls a scenario into view by id. No-op in SSR or when the element is
 * absent.
 */
export function scrollToScenarioId(
  scenarioId: string,
  options: ScrollToScenarioOptions = {},
): void {
  if (typeof document === "undefined") return;
  const el = document.getElementById(scenarioId);
  if (!el) return;
  el.scrollIntoView({ block: "start" });
  if (options.updateHash !== false) {
    // Keep any filter params already in the fragment: jumping to a scenario
    // must not silently drop the filters that surfaced it.
    writeHash(scenarioId, splitHash(window.location.hash).params.toString());
  }
}
