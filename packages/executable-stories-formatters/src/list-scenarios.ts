/**
 * List scenarios from a test run (fn(args, deps) pattern).
 * Produces text table or JSON output.
 */

import type { TestCaseResult } from "./types/test-result";

export interface ListScenariosArgs {
  testCases: TestCaseResult[];
  format: "text" | "json";
}

export type ListScenariosDeps = Record<string, never>;

const STATUS_ICONS: Record<string, string> = {
  passed: "\u2705",
  failed: "\u274C",
  skipped: "\u23ED\uFE0F",
  pending: "\u23F3",
};

export function listScenarios(
  args: ListScenariosArgs,
  _deps: ListScenariosDeps,
): string {
  const { testCases, format } = args;

  if (format === "json") {
    const items = testCases.map((tc) => ({
      scenario: tc.story.scenario,
      status: tc.status,
      sourceFile: tc.sourceFile,
      sourceLine: tc.sourceLine,
      tags: tc.tags,
      id: tc.id,
    }));
    return JSON.stringify(items, null, 2);
  }

  // Text format
  if (testCases.length === 0) {
    return "No scenarios found.";
  }

  const sorted = [...testCases].sort((a, b) => {
    const rank = { failed: 0, pending: 1, skipped: 2, passed: 3 };
    if (rank[a.status] !== rank[b.status]) {
      return rank[a.status] - rank[b.status];
    }
    if (a.sourceFile !== b.sourceFile) {
      return a.sourceFile.localeCompare(b.sourceFile);
    }
    if (a.sourceLine !== b.sourceLine) {
      return a.sourceLine - b.sourceLine;
    }
    return a.story.scenario.localeCompare(b.story.scenario);
  });

  const summary = {
    total: sorted.length,
    failed: sorted.filter((tc) => tc.status === "failed").length,
    pending: sorted.filter((tc) => tc.status === "pending").length,
    skipped: sorted.filter((tc) => tc.status === "skipped").length,
    passed: sorted.filter((tc) => tc.status === "passed").length,
  };

  const lines = [
    `Review summary: ${summary.failed} failed, ${summary.pending} pending, ${summary.skipped} skipped, ${summary.passed} passed (${summary.total} total)`,
    summary.failed > 0
      ? "Priority: failed scenarios are listed first for review."
      : "Priority: no failed scenarios detected.",
    "",
    ...sorted.map((tc) => {
    const icon = STATUS_ICONS[tc.status] ?? "?";
    const status = tc.status.padEnd(7);
    const scenario = tc.story.scenario;
    const location = `${tc.sourceFile}:${tc.sourceLine}`;
    const tags = tc.tags.length > 0 ? tc.tags.join(", ") : "";
    return `${icon} ${status}  ${scenario}  ${location}${tags ? `  ${tags}` : ""}`;
    }),
  ];

  return lines.join("\n");
}
