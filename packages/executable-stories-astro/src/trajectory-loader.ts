/**
 * Companion Content Layer loader that tracks the session trajectory across
 * re-syncs. Folds the combined run (all configured sources) into a module-level
 * RunState (advanceState) and stores a single `session` entry with count-level
 * deltas versus the session baseline and the previous run.
 *
 *   trajectory: defineCollection({ loader: trajectoryLoader({ source: "reports/raw-run.json" }) })
 */
import fs from "node:fs";
import path from "node:path";

import {
  advanceState,
  initialRunState,
  trajectorySummary,
  type RunState,
  type TestRunResult,
} from "executable-stories-core";

import { resolveSources, type ExecutableStoriesConfig } from "./config.js";
import { expandSource } from "./loader.js";
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

/**
 * Read every configured source into runs.
 *
 * A source may name a directory of per-file reports, which reading as one JSON
 * file simply failed at — leaving the trajectory empty for the scaffold's own
 * default source.
 */
export function readRunsFromSources(
  options: ExecutableStoriesConfig,
  read: (absPath: string) => unknown | null
): TestRunResult[] {
  const runs: TestRunResult[] = [];
  for (const src of resolveSources(options)) {
    const resolved = path.resolve(src.source);
    const isDir = (() => {
      try {
        return fs.statSync(resolved).isDirectory();
      } catch {
        return false;
      }
    })();
    const inputType = src.inputType ?? (isDir ? "canonical" : "raw");
    for (const abs of isDir ? expandSource(resolved) : [resolved]) {
      const raw = read(abs);
      if (raw == null) continue;
      runs.push(toRunResult(raw, { inputType, synthesize: src.synthesize }));
    }
  }
  return runs;
}

export function trajectoryLoader(options: ExecutableStoriesConfig): StoriesLoader {
  const sources = resolveSources(options).map((s) => ({ ...s, abs: path.resolve(s.source) }));
  // Module-level so it persists across the loader's re-invocations within one dev session.
  let state: RunState = initialRunState;

  function sync(ctx: LoaderContext): void {
    const runs = readRunsFromSources(options, (abs) => readSource(abs, ctx));
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
