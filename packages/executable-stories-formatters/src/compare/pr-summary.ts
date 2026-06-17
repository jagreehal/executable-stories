import type { RunDiffResult, ScenarioDiff } from "../types/compare";

function titleFor(kind: ScenarioDiff["kind"]): string {
  switch (kind) {
    case "regressed":
      return "Regressed";
    case "fixed":
      return "Fixed";
    case "added":
      return "Added";
    case "removed":
      return "Removed";
    case "renamed":
      return "Renamed";
    case "moved":
      return "Moved";
    case "changed":
      return "Changed";
    default:
      return "Unchanged";
  }
}

function summarizeScenario(scenario: ScenarioDiff): string {
  const before = scenario.baseline?.status;
  const after = scenario.current?.status;
  const statusPart =
    before && after
      ? `status \`${before}\` -> \`${after}\``
      : before
        ? `removed from \`${before}\``
        : `new \`${after}\``;
  const fields =
    scenario.changedFields.length > 0
      ? `; changed ${scenario.changedFields.map((field) => `\`${field}\``).join(", ")}`
      : "";
  return `- ${scenario.scenario} (\`${scenario.sourceFile}:${scenario.sourceLine}\`): ${statusPart}${fields}`;
}

function addSection(
  lines: string[],
  diff: RunDiffResult,
  kind: ScenarioDiff["kind"],
  maxScenarios: number
): void {
  const scenarios = diff.scenarios.filter((scenario) => scenario.kind === kind);
  if (scenarios.length === 0) return;

  lines.push(`### ${titleFor(kind)} (${scenarios.length})`);
  lines.push("");
  for (const scenario of scenarios.slice(0, maxScenarios)) {
    lines.push(summarizeScenario(scenario));
  }
  if (scenarios.length > maxScenarios) {
    lines.push(`- ...and ${scenarios.length - maxScenarios} more`);
  }
  lines.push("");
}

export function createPrCommentSummary(
  diff: RunDiffResult,
  maxScenarios = 10
): string {
  const lines: string[] = [];

  lines.push("## Executable Stories Review Summary");
  lines.push("");
  lines.push(
    `Priority signal: ${diff.summary.regressed} regressed, ${diff.summary.fixed} fixed, ${diff.summary.added} added, ${diff.summary.removed} removed, ${diff.summary.changed} changed.`
  );
  lines.push("");

  if (diff.summary.regressed > 0) {
    lines.push("> Regressions detected. Review these first.");
    lines.push("");
  } else if (diff.summary.fixed > 0) {
    lines.push("> No regressions detected. Review fixed scenarios next.");
    lines.push("");
  } else {
    lines.push("> No regressions or fixes detected. Remaining changes are neutral.");
    lines.push("");
  }

  addSection(lines, diff, "regressed", maxScenarios);
  addSection(lines, diff, "fixed", maxScenarios);
  addSection(lines, diff, "added", maxScenarios);
  addSection(lines, diff, "removed", maxScenarios);
  addSection(lines, diff, "renamed", maxScenarios);
  addSection(lines, diff, "moved", maxScenarios);
  addSection(lines, diff, "changed", maxScenarios);

  return lines.join("\n").trimEnd();
}
