"use client";

import { useEffect } from "react";
import { scrollToScenarioId } from "../lib/scroll";

/**
 * Scrolls to a scenario by URL hash on mount and whenever the hash changes.
 * No-op in SSR (only runs in useEffect). Honours `prefers-reduced-motion`.
 */
export function useDeepLinkScroll(): void {
  useEffect(() => {
    function scrollToHash() {
      const hash = window.location.hash.replace(/^#/, "");
      if (!hash) return;
      // The hash is already in the URL; don't rewrite history on arrival.
      requestAnimationFrame(() => {
        scrollToScenarioId(hash, { updateHash: false });
      });
    }
    scrollToHash();
    window.addEventListener("hashchange", scrollToHash);
    return () => window.removeEventListener("hashchange", scrollToHash);
  }, []);
}
