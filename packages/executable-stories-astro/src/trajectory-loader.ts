/**
 * Companion Content Layer loader that tracks the session trajectory across
 * re-syncs. Folds the combined run (all configured sources) into a module-level
 * RunState (advanceState) and stores a single `session` entry with count-level
 * deltas versus the session baseline and the previous run.
 *
 *   trajectory: defineCollection({ loader: trajectoryLoader({ source: "reports/raw-run.json" }) })
 */
import path from "node:path";

import {
  advanceState,
  initialRunState,
  trajectorySummary,
  type RunState,
  type TestRunResult,
} from "executable-stories-core";

import { resolveSources, type ExecutableStoriesConfig } from "./config.js";
import {
  readSource,
  toRunResult,
  watchAll,
  type LoaderContext,
  type StoriesLoader,
} from "./loader-context.js";

/** Concatenate several run results into one (for combined trajectory counts). */
function mergeRunResults(runs: TestRunResult[]): TestRunResult {
  const base = runs[0]!;
  if (runs.length === 1) return base;
  return {
    ...base,
    testCases: runs.flatMap((r) => r.testCases),
    startedAtMs: Math.min(...runs.map((r) => r.startedAtMs)),
    finishedAtMs: Math.max(...runs.map((r) => r.finishedAtMs)),
    durationMs: Math.max(...runs.map((r) => r.durationMs)),
  };
}

export function trajectoryLoader(options: ExecutableStoriesConfig): StoriesLoader {
  const sources = resolveSources(options).map((s) => ({ ...s, abs: path.resolve(s.source) }));
  // Module-level so it persists across the loader's re-invocations within one dev session.
  let state: RunState = initialRunState;

  function sync(ctx: LoaderContext): void {
    const runs: TestRunResult[] = [];
    for (const src of sources) {
      const raw = readSource(src.abs, ctx);
      if (raw == null) continue;
      runs.push(toRunResult(raw, { inputType: src.inputType, synthesize: src.synthesize }));
    }
    if (runs.length === 0) return; // keep prior trajectory until a readable run
    state = advanceState(state, mergeRunResults(runs));
    const summary = trajectorySummary(state);
    ctx.store.clear();
    ctx.store.set({ id: "session", data: summary as unknown as Record<string, unknown> });
    const d = summary.session?.diff;
    ctx.logger.info(
      `[executable-stories] trajectory: run #${summary.runCount}, ${summary.current.passed}/${summary.current.total} passed` +
        (d ? ` (${d.passed >= 0 ? "+" : ""}${d.passed} vs baseline)` : ""),
    );
  }

  return {
    name: "executable-stories-trajectory",
    load: async (ctx: LoaderContext) => {
      sync(ctx);
      watchAll(ctx, sources.map((s) => s.abs), () => sync(ctx));
    },
  };
}
