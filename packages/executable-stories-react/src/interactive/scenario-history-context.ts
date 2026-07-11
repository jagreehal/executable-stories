"use client";

import { createContext, useContext } from "react";
import type { ScenarioHistoryMap } from "../lib/run-history";

/**
 * Provided only inside <ReportInteractive> when the CLI embedded a run
 * history (--history-file). When null (the static <Report/> render,
 * Storybook, Astro), scenario cards simply omit the history strip.
 */
const ScenarioHistoryContext = createContext<ScenarioHistoryMap | null>(null);

export const ScenarioHistoryProvider = ScenarioHistoryContext.Provider;

export function useScenarioHistory(): ScenarioHistoryMap | null {
  return useContext(ScenarioHistoryContext);
}
