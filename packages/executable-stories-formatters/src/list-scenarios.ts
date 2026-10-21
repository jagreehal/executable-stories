/**
 * List scenarios from a test run (fn(args, deps) pattern).
 * Produces text table or JSON output.
 */

import type { TestCaseResult } from "executable-stories-core/types/test-result";
import type { StoryStep } from "executable-stories-core/types/story";
import { assertionState, assertiveSteps } from "executable-stories-core/utils/assertive-steps";

export interface ListScenariosArgs {
  testCases: TestCaseResult[];
  format: "text" | "json" | "csv" | "markdown-table" | "feature-map";
  /** Emit compact (single-line) JSON for agent consumption. Only affects "json". Default false. */
  minify?: boolean;
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
  const { testCases, format, minify = false } = args;

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
      // "unasserted": its Then steps ran and checked nothing. "unobserved": the adapter can't count, not zero.
      assertion: assertionState(tc.story.steps),
    }));
    return minify ? JSON.stringify(items) : JSON.stringify(items, null, 2);
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

  if (format === "feature-map") {
    return featureMap(testCases);
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

/**
 * A feature map in the shape `verify-<app>/features/` agent skills read: one
 * section per story file with Sub-features, How to get to it, Driving it, and
 * Gotchas. It comes from the run, so it always matches what the tests check.
 */
function featureMap(testCases: TestCaseResult[]): string {
  const byFile = new Map<string, TestCaseResult[]>();
  for (const tc of testCases) {
    byFile.set(tc.sourceFile, [...(byFile.get(tc.sourceFile) ?? []), tc]);
  }
  const features = [...byFile].sort(([a], [b]) => a.localeCompare(b));
  const titleOf = (cases: TestCaseResult[], file: string) =>
    cases[0].story.suitePath?.[0] ?? cases[0].titlePath[0] ?? file;

  const lines = [
    "# Feature map",
    "",
    "Generated from the story run by `executable-stories list <run> --list-format feature-map`.",
    "Regenerate it after a run; do not edit it by hand. A wrong entry means a wrong test.",
    "",
    ...features.map(([file, cases]) => {
      const failing = cases.filter((tc) => tc.status === "failed").length;
      const title = titleOf(cases, file);
      const label = title === file ? `\`${file}\`` : `${title}: \`${file}\``;
      const count = `${cases.length} scenario${cases.length === 1 ? "" : "s"}`;
      return `- ${label} (${count}${failing ? `, ${failing} failing` : ""})`;
    }),
  ];

  for (const [file, cases] of features) {
    const gotchas = cases.flatMap((tc) => scenarioGotchas(tc));
    lines.push(
      "",
      `## ${titleOf(cases, file)}`,
      "",
      "### Sub-features",
      "",
      ...cases.map(
        (tc) => `- ${STATUS_ICONS[tc.status] ?? "?"} ${tc.story.scenario} (\`${file}:${tc.sourceLine}\`)`,
      ),
      "",
      "### How to get to it (user POV)",
      "",
      ...cases.map((tc) => {
        const claim = new Set(assertiveSteps(tc.story.steps));
        const setup = tc.story.steps.filter((step) => !claim.has(step));
        return `- ${tc.story.scenario}: ${setup.map(stepText).join("; ") || "no setup steps"}`;
      }),
      "",
      "### Driving it with the story suite",
      "",
      `Run \`${file}\` with the project's test command, filtered to the scenario title. The run's report is the evidence.`,
      "",
      ...cases.map((tc) => {
        const claim = assertiveSteps(tc.story.steps);
        return `- ${tc.story.scenario}: proven by ${claim.map(stepText).join("; ") || "no Then step"}`;
      }),
      "",
      "### Gotchas",
      "",
      ...(gotchas.length > 0 ? gotchas : ["- None recorded by the run."]),
    );
  }

  return lines.join("\n");
}

function stepText(step: StoryStep): string {
  return `${step.keyword} ${step.text}`;
}

function scenarioGotchas(tc: TestCaseResult): string[] {
  const name = tc.story.scenario;
  const notes = [...(tc.story.docs ?? []), ...tc.story.steps.flatMap((step) => step.docs ?? [])]
    .flatMap((doc) => (doc.kind === "note" ? [`- ${name}: ${doc.text.replace(/\s+/g, " ").trim()}`] : []));
  const status =
    tc.status === "failed"
      ? [`- ${name}: failing in this run: ${(tc.errorMessage ?? "no message").split("\n")[0]}`]
      : tc.status === "passed"
        ? []
        : [`- ${name}: ${tc.status} in this run, so nothing here is proven yet.`];
  const unasserted =
    assertionState(tc.story.steps) === "unasserted"
      ? [`- ${name}: its Then steps asserted nothing, so a pass proves nothing.`]
      : [];
  return [...status, ...unasserted, ...notes];
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
