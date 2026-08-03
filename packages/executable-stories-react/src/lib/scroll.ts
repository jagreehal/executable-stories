/**
 * Scroll helpers that honour `prefers-reduced-motion`.
 *
 * JS `scrollIntoView({ behavior: "smooth" })` bypasses the CSS
 * `scroll-behavior` cascade, so reduced-motion users must be handled
 * explicitly here rather than in the stylesheet.
 */

import { splitHash, writeHash } from "./hash-state";

/** True when the user has asked the OS to minimise non-essential motion. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export interface ScrollToScenarioOptions {
  /** Replace the URL hash with `#<scenarioId>` after scrolling. Defaults to true. */
  updateHash?: boolean;
}

/**
 * Scrolls a scenario into view by id. No-op in SSR or when the element is
 * absent. Uses an instant jump for reduced-motion users, smooth otherwise.
 */
export function scrollToScenarioId(
  scenarioId: string,
  options: ScrollToScenarioOptions = {},
): void {
  if (typeof document === "undefined") return;
  const el = document.getElementById(scenarioId);
  if (!el) return;
  el.scrollIntoView({
    behavior: prefersReducedMotion() ? "auto" : "smooth",
    block: "start",
  });
  if (options.updateHash !== false) {
    // Keep any filter params already in the fragment: jumping to a scenario
    // must not silently drop the filters that surfaced it.
    writeHash(scenarioId, splitHash(window.location.hash).params.toString());
  }
}
