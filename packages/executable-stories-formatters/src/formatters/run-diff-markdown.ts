import type { RunDiffResult, ScenarioDiff, ScenarioSnapshot } from "../types/compare";
import type { DocEntry, StoryStep } from "../types/story";

export interface RunDiffMarkdownOptions {
  title?: string;
}

function formatStatus(kind: ScenarioDiff["kind"]): string {
  switch (kind) {
    case "regressed":
      return "Regressed";
    case "fixed":
      return "Fixed";
    case "added":
      return "Added";
    case "removed":
      return "Removed";
    case "changed":
      return "Changed";
    default:
      return "Unchanged";
  }
}

function formatDurationDelta(deltaMs?: number): string | null {
  if (deltaMs === undefined || deltaMs === 0) return null;
  return `${deltaMs > 0 ? "+" : ""}${deltaMs}ms`;
}

function renderScenario(lines: string[], scenario: ScenarioDiff): void {
  const before = scenario.baseline;
  const after = scenario.current;

  lines.push(`## ${formatStatus(scenario.kind)}: ${scenario.scenario}`);
  lines.push("");
  lines.push(`- File: \`${scenario.sourceFile}:${scenario.sourceLine}\``);
  if (before && after) {
    lines.push(`- Status: \`${before.status}\` -> \`${after.status}\``);
  } else if (after) {
    lines.push(`- Status: new \`${after.status}\``);
  } else if (before) {
    lines.push(`- Status: removed \`${before.status}\``);
  }
  if (scenario.changedFields.length > 0) {
    lines.push(`- Changed: ${scenario.changedFields.map((field) => `\`${field}\``).join(", ")}`);
  }
  const durationDelta = formatDurationDelta(scenario.durationDeltaMs);
  if (durationDelta) {
    lines.push(`- Duration delta: ${durationDelta}`);
  }
  lines.push("");

  if (before && after) {
    lines.push("| Field | Baseline | Current |");
    lines.push("| --- | --- | --- |");
    lines.push(`| Scenario | ${escapeCell(before.scenario)} | ${escapeCell(after.scenario)} |`);
    lines.push(`| Tags | ${escapeCell(before.tags.join(", "))} | ${escapeCell(after.tags.join(", "))} |`);
    lines.push(`| Suite | ${escapeCell(before.titlePath.join(" > "))} | ${escapeCell(after.titlePath.join(" > "))} |`);
    lines.push(`| Error | ${escapeCell(before.errorMessage ?? "")} | ${escapeCell(after.errorMessage ?? "")} |`);
    if (scenario.flags.steps) {
      lines.push(`| Steps | ${escapeCell(formatSteps(before.steps))} | ${escapeCell(formatSteps(after.steps))} |`);
    }
    if (scenario.flags.docs) {
      lines.push(`| Docs | ${escapeCell(formatDocs(before.docs))} | ${escapeCell(formatDocs(after.docs))} |`);
    }
    if (scenario.flags.tickets) {
      lines.push(`| Tickets | ${escapeCell(before.tickets.map(t => t.id).join(", "))} | ${escapeCell(after.tickets.map(t => t.id).join(", "))} |`);
    }
    lines.push("");
  } else {
    const snapshot = after ?? before;
    if (snapshot) {
      renderSnapshotDetail(lines, snapshot);
    }
  }
}

function renderSnapshotDetail(lines: string[], snapshot: ScenarioSnapshot): void {
  if (snapshot.tags.length > 0) {
    lines.push(`**Tags:** ${snapshot.tags.join(", ")}`);
    lines.push("");
  }
  if (snapshot.tickets.length > 0) {
    lines.push(`**Tickets:** ${snapshot.tickets.map(t => t.id).join(", ")}`);
    lines.push("");
  }
  if (snapshot.steps.length > 0) {
    lines.push("**Steps:**");
    lines.push("");
    for (const step of snapshot.steps) {
      lines.push(`- ${formatStep(step)}`);
    }
    lines.push("");
  }
  if (snapshot.docs.length > 0) {
    lines.push("**Docs:**");
    lines.push("");
    for (const doc of snapshot.docs) {
      lines.push(`- ${formatDocEntry(doc)}`);
    }
    lines.push("");
  }
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, "<br>");
}

function formatStep(step: StoryStep): string {
  let result = `**${step.keyword}** ${step.text}`;
  if (step.mode && step.mode !== "normal") {
    result += ` [${step.mode}]`;
  }
  if (step.docs && step.docs.length > 0) {
    result += ` (${step.docs.map(formatDocEntry).join("; ")})`;
  }
  return result;
}

function formatSteps(steps: StoryStep[]): string {
  if (steps.length === 0) return "(none)";
  return steps.map(formatStep).join("; ");
}

function formatDocEntry(doc: DocEntry): string {
  switch (doc.kind) {
    case "note":
      return doc.text;
    case "tag":
      return doc.names.join(", ");
    case "kv":
      return `${doc.label}: ${typeof doc.value === "object" && doc.value !== null ? JSON.stringify(doc.value) : String(doc.value)}`;
    case "code":
      return `${doc.label}${doc.lang ? ` (${doc.lang})` : ""}: \`${doc.content}\``;
    case "table":
      return `${doc.label}: [${doc.columns.join(", ")}] ${doc.rows.map((row) => row.join(", ")).join("; ")}`;
    case "link":
      return `${doc.label}: ${doc.url}`;
    case "section":
      return `${doc.title}: ${doc.markdown}`;
    case "mermaid":
      return `${doc.title ?? "mermaid diagram"}: \`${doc.code}\``;
    case "screenshot":
      return `${doc.alt ? `${doc.alt}: ` : ""}${doc.path}`;
    case "video":
      return `${doc.caption ? `${doc.caption}: ` : ""}${doc.path}`;
    case "html":
      return `${doc.title ? `${doc.title}: ` : ""}${doc.url ?? doc.path ?? "(inline html)"}`;
    case "custom":
      return `${doc.type}: ${JSON.stringify(doc.data)}`;
  }
}

function formatDocs(docs: DocEntry[]): string {
  if (docs.length === 0) return "(none)";
  return docs.map(formatDocEntry).join("; ");
}

export class RunDiffMarkdownFormatter {
  private title: string;

  constructor(options: RunDiffMarkdownOptions = {}) {
    this.title = options.title ?? "Run Comparison";
  }

  format(diff: RunDiffResult): string {
    const lines: string[] = [];

    lines.push(`# ${this.title}`);
    lines.push("");
    lines.push(`Baseline: \`${new Date(diff.baseline.startedAtMs).toISOString()}\``);
    lines.push(`Current: \`${new Date(diff.current.startedAtMs).toISOString()}\``);
    lines.push("");
    lines.push("## Review Priority");
    lines.push("");
    if (diff.summary.regressed > 0) {
      lines.push(`Review regressions first: ${diff.summary.regressed} scenario(s) got worse.`);
    } else if (diff.summary.fixed > 0) {
      lines.push(`No regressions detected. Review ${diff.summary.fixed} fixed scenario(s) next.`);
    } else {
      lines.push("No regressions or fixes detected. Remaining changes are neutral.");
    }
    lines.push("");
    lines.push("| Added | Removed | Regressed | Fixed | Changed | Unchanged |");
    lines.push("| ---: | ---: | ---: | ---: | ---: | ---: |");
    lines.push(
      `| ${diff.summary.added} | ${diff.summary.removed} | ${diff.summary.regressed} | ${diff.summary.fixed} | ${diff.summary.changed} | ${diff.summary.unchanged} |`
    );
    lines.push("");

    for (const kind of ["regressed", "fixed", "added", "removed", "changed"] as const) {
      const scenarios = diff.scenarios.filter((scenario) => scenario.kind === kind);
      if (scenarios.length === 0) continue;
      lines.push(`## ${formatStatus(kind)} (${scenarios.length})`);
      lines.push("");
      for (const scenario of scenarios) {
        renderScenario(lines, scenario);
      }
    }

    return lines.join("\n").trimEnd();
  }
}
