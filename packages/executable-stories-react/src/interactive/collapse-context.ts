"use client";

import { createContext, useCallback, useContext, useState } from "react";

export interface CollapseApi {
  isCollapsed: (id: string) => boolean;
  toggle: (id: string) => void;
}

/**
 * Provided only inside <ReportInteractive>. When null (the static <Report/>
 * render, Storybook, Astro), components render fully expanded with no toggle
 * affordance — so the static path and component-tier tests are unaffected.
 */
const CollapseContext = createContext<CollapseApi | null>(null);

export const CollapseProvider = CollapseContext.Provider;

export function useCollapse(): CollapseApi | null {
  return useContext(CollapseContext);
}

const STORAGE_KEY = "es-collapsed-ids";

function readPersisted(): Set<string> {
  if (typeof localStorage === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function persist(ids: Set<string>): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    /* quota / disabled — collapse still works for the session */
  }
}

/**
 * Collapse state for the interactive report: a persisted set of collapsed
 * feature/scenario ids, plus expand-all / collapse-all.
 */
export function useCollapseState() {
  const [collapsed, setCollapsed] = useState<Set<string>>(readPersisted);

  const isCollapsed = useCallback((id: string) => collapsed.has(id), [collapsed]);

  const toggle = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      persist(next);
      return next;
    });
  }, []);

  const collapseAll = useCallback((ids: string[]) => {
    setCollapsed(() => {
      const next = new Set(ids);
      persist(next);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setCollapsed(() => {
      const next = new Set<string>();
      persist(next);
      return next;
    });
  }, []);

  return { api: { isCollapsed, toggle } as CollapseApi, collapseAll, expandAll };
}
