"use client";

import { useEffect } from "react";

/**
 * Scrolls to a scenario by URL hash on mount and whenever the hash changes.
 * No-op in SSR (only runs in useEffect).
 */
export function useDeepLinkScroll(): void {
  useEffect(() => {
    function scrollToHash() {
      const hash = window.location.hash.replace(/^#/, "");
      if (!hash) return;
      const el = document.getElementById(hash);
      if (!el) return;
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
    scrollToHash();
    window.addEventListener("hashchange", scrollToHash);
    return () => window.removeEventListener("hashchange", scrollToHash);
  }, []);
}
