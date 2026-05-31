/**
 * List scenarios from a test run (fn(args, deps) pattern).
 * Produces text table or JSON output.
 */

import type { TestCaseResult } from "./types/test-result";
import type { StoryStep } from "./types/story";

export interface ListScenariosArgs {
  testCases: TestCaseResult[];
  format: "text" | "json" | "csv" | "markdown-table";
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
      id: tc.id,
      scenario: tc.story.scenario,
      status: tc.status,
      sourceFile: tc.sourceFile,
      sourceLine: tc.sourceLine,
      suitePath: tc.story.suitePath ?? tc.titlePath.slice(0, -1),
      tags: tc.tags,
      tickets: tc.story.tickets ?? [],
      covers: tc.story.covers ?? [],
      durationMs: tc.durationMs,
      error: tc.errorMessage
        ? {
            message: tc.errorMessage,
            stack: tc.errorStack,
          }
        : undefined,
      steps: tc.story.steps.map((step, index) => toScenarioStep(step, index, tc)),
      docKinds: collectDocKinds(tc),
    }));
    return JSON.stringify(items, null, 2);
  }

  if (format === "csv") {
    const header = "id,scenario,status,sourceFile,sourceLine,tags";
    const rows = testCases.map((tc) => {
      const fields = [
        tc.id,
        tc.story.scenario,
        tc.status,
        tc.sourceFile,
        String(tc.sourceLine),
        tc.tags.join(" "),
      ];
      return fields
        .map((f) => {
          if (f.includes(",") || f.includes('"') || f.includes("\n")) {
            return `"${f.replace(/"/g, '""')}"`;
          }
          return f;
        })
        .join(",");
    });
    return [header, ...rows].join("\n");
  }

  if (format === "markdown-table") {
    const header = "| Status | Scenario | Location | Tags |";
    const divider = "|--------|----------|----------|------|";
    const rows = testCases.map((tc) => {
      const icon = STATUS_ICONS[tc.status] ?? "?";
      const location = `${tc.sourceFile}:${tc.sourceLine}`;
      const tags = tc.tags.map((t) => `@${t}`).join(" ");
      return `| ${icon} | ${tc.story.scenario} | ${location} | ${tags} |`;
    });
    return [header, divider, ...rows].join("\n");
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

function toScenarioStep(
  step: StoryStep,
  index: number,
  testCase: TestCaseResult,
): {
  id?: string;
  index: number;
  keyword: StoryStep["keyword"];
  text: string;
  status: TestCaseResult["status"];
  durationMs: number;
  errorMessage?: string;
  mode?: StoryStep["mode"];
  docKinds: string[];
} {
  const result = testCase.stepResults.find(
    (candidate) => candidate.index === index || candidate.stepId === step.id,
  );

  return {
    id: step.id,
    index,
    keyword: step.keyword,
    text: step.text,
    status: result?.status ?? testCase.status,
    durationMs: result?.durationMs ?? step.durationMs ?? 0,
    errorMessage: result?.errorMessage,
    mode: step.mode,
    docKinds: (step.docs ?? []).map((doc) => doc.kind),
  };
}

function collectDocKinds(testCase: TestCaseResult): string[] {
  const kinds = new Set<string>();

  for (const doc of testCase.story.docs ?? []) {
    kinds.add(doc.kind);
  }

  for (const step of testCase.story.steps) {
    for (const doc of step.docs ?? []) {
      kinds.add(doc.kind);
    }
  }

  return [...kinds].sort();
}
