import type { TestRunResult } from "executable-stories-core/types/test-result";

import type { RunDiffResult, ScenarioChangeKind, ScenarioDiff } from "../types/compare";

export interface RunDiffChangelogOptions {
  title?: string;
}

/**
 * Release-notes sections in reader order: what the release delivers first,
 * then what it repaired, broke, and dropped; refactors last because they
 * change no behavior.
 */
const SECTIONS: Array<{ kinds: ScenarioChangeKind[]; heading: string }> = [
  { kinds: ["added"], heading: "New behavior" },
  { kinds: ["fixed"], heading: "Fixed" },
  { kinds: ["regressed"], heading: "Broken" },
  { kinds: ["removed"], heading: "Removed" },
  { kinds: ["renamed", "moved"], heading: "Renamed or moved" },
  { kinds: ["changed"], heading: "Changed" },
];

function describeRun(run: TestRunResult): string {
  const parts: string[] = [];
  if (run.packageVersion) parts.push(run.packageVersion);
  const sha = run.gitSha ?? run.ci?.commitSha;
  if (sha) parts.push(`\`${sha.slice(0, 8)}\``);
  parts.push(new Date(run.startedAtMs).toISOString().slice(0, 10));
  return parts.join(" · ");
}

function scenarioLine(diff: ScenarioDiff): string {
  const title = diff.current?.scenario ?? diff.scenario;
  const source = `\`${diff.sourceFile}\``;
  switch (diff.kind) {
    case "renamed":
      return `- ${diff.baseline?.scenario ?? "?"} → **${title}** (${source})`;
    case "moved":
      return `- **${title}** moved from \`${diff.baseline?.sourceFile ?? "?"}\` to ${source}`;
    case "regressed":
      return `- **${title}** (${source})${diff.current?.errorMessage ? ` — ${firstLine(diff.current.errorMessage)}` : ""}`;
    case "changed":
      return `- **${title}** (${source}) — ${diff.changedFields.join(", ")}`;
    default:
      return `- **${title}** (${source})`;
  }
}

function firstLine(text: string): string {
  return text.split("\n", 1)[0]!.trim();
}

/**
 * Behavior changelog between two runs: release-notes-style Markdown built
 * from the same RunDiffResult as `compare`'s review outputs, but written for
 * the reader of a release ("what can the product do now") rather than the
 * reviewer of a diff. New behaviors include their Given/When/Then steps so
 * the entry reads as a specification, not a test name.
 */
export class RunDiffChangelogFormatter {
  private readonly title: string;

  constructor(options: RunDiffChangelogOptions = {}) {
    this.title = options.title ?? "Behavior Changelog";
  }

  format(diff: RunDiffResult): string {
    const lines: string[] = [];
    lines.push(`# ${this.title}`);
    lines.push("");
    lines.push(`${describeRun(diff.baseline)} → ${describeRun(diff.current)}`);
    if (diff.current.ci?.branch) lines.push(`Branch: \`${diff.current.ci.branch}\``);
    lines.push("");

    let hasEntries = false;
    for (const section of SECTIONS) {
      const scenarios = diff.scenarios.filter((s) => section.kinds.includes(s.kind));
      if (scenarios.length === 0) continue;
      hasEntries = true;

      lines.push(`## ${section.heading} (${scenarios.length})`);
      lines.push("");
      for (const scenario of scenarios) {
        lines.push(scenarioLine(scenario));
        if (scenario.kind === "added" && scenario.current) {
          for (const step of scenario.current.steps) {
            lines.push(`  - _${step.keyword}_ ${step.text}`);
          }
        }
      }
      lines.push("");
    }

    if (!hasEntries) {
      lines.push("No behavior changes between these runs.");
      lines.push("");
    }

    lines.push(`_${diff.summary.unchanged} unchanged scenario${diff.summary.unchanged === 1 ? "" : "s"}._`);

    return lines.join("\n");
  }
}
