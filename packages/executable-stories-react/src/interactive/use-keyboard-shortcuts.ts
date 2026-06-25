"use client";

import { useEffect, useRef } from "react";

export interface KeyboardShortcutHandlers {
  onFocusSearch?: () => void;
  onNextFailure?: () => void;
  onPrevFailure?: () => void;
  onToggleHelp?: () => void;
  onEscape?: () => void;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

/**
 * Attaches one keydown listener for the lifetime of the component, regardless
 * of how often the consumer passes a fresh handlers object. Handlers are read
 * from a ref so each keypress hits the latest version — see Vercel's
 * advanced-use-latest pattern.
 */
export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers): void {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const h = ref.current;
      if (e.key === "Escape") {
        h.onEscape?.();
        return;
      }

      if (isEditableTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case "/":
          h.onFocusSearch?.();
          e.preventDefault();
          return;
        case "?":
          h.onToggleHelp?.();
          e.preventDefault();
          return;
        case "f":
          h.onNextFailure?.();
          e.preventDefault();
          return;
        case "F":
          h.onPrevFailure?.();
          e.preventDefault();
          return;
        case "e":
          h.onExpandAll?.();
          e.preventDefault();
          return;
        case "c":
          h.onCollapseAll?.();
          e.preventDefault();
          return;
        default:
          return;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
