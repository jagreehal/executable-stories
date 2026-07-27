import { toStoryReport } from "executable-stories-core/converters/story-report";
import type { ReportDocEntry, ReportScenario, StoryReport } from "executable-stories-core/types/story-report";
import type { TestRunResult } from "executable-stories-core/types/test-result";

/**
 * agent-text — the full behaviour of a run as flat, token-lean plain text for
 * pasting into an LLM. Same content as the Markdown report (steps, doc
 * entries, errors) minus everything a model never reads: ids, hashes,
 * durations, source lines, HTML/Markdown chrome, and JSON punctuation. For a
 * structured contract use story-report-json; this format optimizes tokens,
 * not parseability.
 */

const STATUS_WORD: Record<string, string> = {
  passed: "PASS",
  failed: "FAIL",
  skipped: "SKIP",
  pending: "PEND",
};

export class AgentTextFormatter {
  format(run: TestRunResult): string {
    return toAgentText(toStoryReport(run));
  }
}

export function toAgentText(report: StoryReport): string {
  const s = report.summary;
  const counts = [
    s.passed && `${s.passed} passed`,
    s.failed && `${s.failed} failed`,
    s.skipped && `${s.skipped} skipped`,
    s.pending && `${s.pending} pending`,
  ]
    .filter(Boolean)
    .join(", ");
  const lines: string[] = [
    `Test run: ${s.total} scenarios (${counts || "none"}).`,
    "Each block: STATUS Scenario title [tags]. Indented lines are its Given/When/Then steps; deeper lines are docs captured at that step.",
    "",
  ];

  for (const feature of report.features) {
    lines.push(`feature ${feature.title} · ${feature.sourceFile}`);
    for (const scenario of feature.scenarios) {
      lines.push("", ...scenarioLines(scenario));
    }
    lines.push("");
  }
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

function scenarioLines(scenario: ReportScenario): string[] {
  const tags = scenario.tags.length ? ` [${scenario.tags.join(" ")}]` : "";
  const lines = [`${STATUS_WORD[scenario.status] ?? scenario.status.toUpperCase()} ${scenario.title}${tags}`];
  for (const ticket of scenario.tickets ?? []) lines.push(`  ticket ${ticket.id}${ticket.url ? ` ${ticket.url}` : ""}`);
  if (scenario.covers?.length) lines.push(`  covers ${scenario.covers.join(", ")}`);
  for (const step of scenario.steps) {
    const failed = step.status === "failed" ? " !! FAILED" : "";
    lines.push(`  ${step.keyword} ${step.text}${failed}`);
    if (step.errorMessage) lines.push(indent(step.errorMessage, "    ! "));
    for (const entry of step.docEntries) lines.push(...docLines(entry, "    "));
  }
  for (const entry of scenario.docEntries) lines.push(...docLines(entry, "  "));
  if (scenario.errorMessage) lines.push(indent(`error: ${scenario.errorMessage}`, "  "));
  return lines;
}

function docLines(entry: ReportDocEntry, pad: string): string[] {
  const lines = ownDocLines(entry, pad);
  for (const child of entry.children ?? []) lines.push(...docLines(child, pad + "  "));
  return lines;
}

function ownDocLines(entry: ReportDocEntry, pad: string): string[] {
  switch (entry.kind) {
    case "note":
      return [indent(entry.text, pad)];
    case "tag":
      return []; // already on the scenario's tag line
    case "kv":
      return [`${pad}${entry.label}: ${compact(entry.value)}`];
    case "code":
      return [`${pad}code ${entry.label}${entry.lang ? ` (${entry.lang})` : ""}:`, indent(entry.content, pad + "  ")];
    case "table":
      return [
        `${pad}table ${entry.label}: ${entry.columns.join(" | ")}`,
        ...entry.rows.map((row) => `${pad}  ${row.join(" | ")}`),
      ];
    case "link":
      return [`${pad}link ${entry.label}: ${entry.url}`];
    case "section":
      return [`${pad}section ${entry.title}:`, indent(entry.markdown, pad + "  ")];
    case "mermaid":
      return [`${pad}mermaid${entry.title ? ` ${entry.title}` : ""}:`, indent(entry.code, pad + "  ")];
    case "screenshot":
      return [`${pad}screenshot ${entry.path}${entry.alt ? ` — ${entry.alt}` : ""}`];
    case "video":
      return [`${pad}video ${entry.path}${entry.caption ? ` — ${entry.caption}` : ""}`];
    case "html":
      return [`${pad}html ${entry.title ?? entry.path ?? entry.url ?? "(inline)"}`];
    case "state":
      return [`${pad}state${entry.label ? ` ${entry.label}` : ""}: ${compact(entry.value)}`];
    case "custom":
      return [`${pad}custom ${entry.type}: ${compact(entry.data)}`];
  }
}

function compact(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function indent(text: string, pad: string): string {
  return text
    .split("\n")
    .map((line) => pad + line)
    .join("\n");
}
