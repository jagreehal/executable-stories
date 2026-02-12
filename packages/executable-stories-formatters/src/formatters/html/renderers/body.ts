/**
 * Build report body from run (fn(args, deps)).
 * Composes meta, summary, tag bar, and features; uses groupBy for feature grouping.
 */

import type { TestRunResult } from "../../../types/test-result";
import type { RenderTagBarArgs, RenderTagBarDeps } from "./tag-bar.js";

function groupBy<T, K>(items: T[], keyFn: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const existing = map.get(key);
    if (existing) {
      existing.push(item);
    } else {
      map.set(key, [item]);
    }
  }
  return map;
}

export interface BuildBodyArgs {
  run: TestRunResult;
}

export interface BuildBodyDeps {
  renderMetaInfo: (
    args: import("./meta.js").RenderMetaInfoArgs,
    deps: import("./meta.js").RenderMetaInfoDeps,
  ) => string;
  renderSummary: (
    args: import("./summary.js").RenderSummaryArgs,
    deps: import("./summary.js").RenderSummaryDeps,
  ) => string;
  renderTagBar: (args: RenderTagBarArgs, deps: RenderTagBarDeps) => string;
  renderFeature: (
    args: import("./feature.js").RenderFeatureArgs,
    deps: import("./feature.js").RenderFeatureDeps,
  ) => string;
  metaDeps: import("./meta.js").RenderMetaInfoDeps;
  summaryDeps: import("./summary.js").RenderSummaryDeps;
  tagBarDeps: RenderTagBarDeps;
  featureDeps: import("./feature.js").RenderFeatureDeps;
}

export function buildBody(args: BuildBodyArgs, deps: BuildBodyDeps): string {
  const { run } = args;
  const parts: string[] = [];

  parts.push(
    deps.renderMetaInfo(
      {
        startedAtMs: run.startedAtMs,
        durationMs: run.durationMs,
        packageVersion: run.packageVersion,
        gitSha: run.gitSha,
        ciName: run.ci?.name,
      },
      deps.metaDeps,
    ),
  );

  const total = run.testCases.length;
  const passed = run.testCases.filter((tc) => tc.status === "passed").length;
  const failed = run.testCases.filter((tc) => tc.status === "failed").length;
  const skipped = run.testCases.filter(
    (tc) => tc.status === "skipped" || tc.status === "pending",
  ).length;
  parts.push(
    deps.renderSummary(
      { total, passed, failed, skipped },
      deps.summaryDeps,
    ),
  );

  const allTags = [
    ...new Set(run.testCases.flatMap((tc) => tc.tags)),
  ].sort();
  parts.push(
    deps.renderTagBar(
      { tags: allTags, totalScenarios: total },
      deps.tagBarDeps,
    ),
  );

  const byFile = groupBy(run.testCases, (tc) => tc.sourceFile);
  for (const [file, testCases] of byFile) {
    parts.push(
      deps.renderFeature({ file, testCases }, deps.featureDeps),
    );
  }

  return parts.join("\n");
}
