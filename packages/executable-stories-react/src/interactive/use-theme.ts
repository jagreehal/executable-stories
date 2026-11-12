"use client";

import { useCallback, useEffect, useState } from "react";

export type ThemePref = "light" | "system" | "dark";
const KEY = "es-theme";

function systemDark(): boolean {
  return typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolve(pref: ThemePref): "light" | "dark" {
  return pref === "system" ? (systemDark() ? "dark" : "light") : pref;
}

function applyTheme(pref: ThemePref): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  // Suspend transitions for one frame so every colour flips together.
  root.setAttribute("data-theme-switching", "");
  const resolved = resolve(pref);
  root.setAttribute("data-theme", resolved);
  // The standalone report's dark code theme: follow the chosen theme.
  document
    .querySelector("link[data-es-hljs-dark]")
    ?.setAttribute("media", resolved === "dark" ? "all" : "not all");
  requestAnimationFrame(() => root.removeAttribute("data-theme-switching"));
}

function initialPref(): ThemePref {
  if (typeof localStorage !== "undefined") {
    const stored = localStorage.getItem(KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  }
  // Nothing stored → follow the OS. (The old 2-way toggle also honoured the
  // prefers-color-scheme media query on first load, so this keeps that default.)
  return "system";
}

/**
 * Light / System / Dark theme preference for the standalone report. Sets
 * `data-theme` on <html> (the Tailwind `dark` variant keys off it), resolving
 * "system" through prefers-color-scheme and re-resolving when the OS flips while
 * on "system". Persists the choice. No-ops gracefully outside the browser.
 */
export function useTheme(): { pref: ThemePref; setPref: (p: ThemePref) => void } {
  const [pref, setPrefState] = useState<ThemePref>("system");

  useEffect(() => {
    const p = initialPref();
    setPrefState(p);
    applyTheme(p);
  }, []);

  useEffect(() => {
    if (typeof matchMedia === "undefined") return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (pref === "system") applyTheme("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [pref]);

  const setPref = useCallback((p: ThemePref) => {
    setPrefState(p);
    applyTheme(p);
    try {
      localStorage.setItem(KEY, p);
    } catch {
      /* disabled / quota */
    }
  }, []);

  return { pref, setPref };
}
