"use client";

import { useEffect, useRef } from "react";
import { scrollToScenarioId } from "../lib/scroll";
import { splitHash } from "../lib/hash-state";

/**
 * Scrolls to a scenario by URL hash on mount and whenever the deep link
 * changes. No-op in SSR (only runs in useEffect). Honours
 * `prefers-reduced-motion`.
 *
 * The fragment also carries filter state (`#<anchor>?q=...`), so only the
 * anchor half is read — and a hashchange that merely rewrote the filters must
 * not yank the page back to the last anchor, hence the last-anchor guard.
 */
export function useDeepLinkScroll(): void {
  const lastAnchor = useRef<string | null>(null);

  useEffect(() => {
    function scrollToHash() {
      const { anchor } = splitHash(window.location.hash);
      if (!anchor || anchor === lastAnchor.current) return;
      lastAnchor.current = anchor;
      // The hash is already in the URL; don't rewrite history on arrival.
      requestAnimationFrame(() => {
        scrollToScenarioId(anchor, { updateHash: false });
      });
    }
    scrollToHash();
    window.addEventListener("hashchange", scrollToHash);
    return () => window.removeEventListener("hashchange", scrollToHash);
  }, []);
}
