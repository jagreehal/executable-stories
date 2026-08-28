"use client";

import { createContext, useContext } from "react";
import type { StoryReport } from "executable-stories-core";

export interface ScenarioFreshness {
  /** Days before a scenario counts as stale; 0 disables the signal. */
  staleAfterDays: number;
  /** The run being rendered, used for scenarios carrying no stamp of their own. */
  report: Pick<StoryReport, "startedAtMs" | "finishedAtMs">;
  /** Test seam: fixed "now". Left undefined, the badge reads the clock on mount. */
  nowMs?: number;
}

/**
 * Provided only where a report knows its staleness threshold. When null (a bare
 * <Report/> render, Storybook), scenario cards simply omit the age signal —
 * same shape as the run-history context.
 */
const ScenarioFreshnessContext = createContext<ScenarioFreshness | null>(null);

export const ScenarioFreshnessProvider = ScenarioFreshnessContext.Provider;

export function useScenarioFreshness(): ScenarioFreshness | null {
  return useContext(ScenarioFreshnessContext);
}
