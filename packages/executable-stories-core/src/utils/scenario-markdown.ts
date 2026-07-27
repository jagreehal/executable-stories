/**
 * Scenario → Markdown. The ONE serializer behind every plain-text projection of
 * a scenario, so the surfaces can't drift:
 *
 *   - the HTML report's per-scenario "Copy as Markdown" button
 *     (executable-stories-react) — `variant: "compact"`
 *   - the Astro site's `<routeBase>/<slug>.md` twin endpoints
 *     (executable-stories-astro) — the default full variant
 *
 * Before this lived here there were two implementations and the same scenario
 * produced different Markdown depending on which surface you copied it from.
 *
 * `compact` is for pasting into a PR or issue: an h2, status in the heading,
 * steps, and the failure. The full variant is a standalone document: an h1,
 * caller-supplied metadata lines, per-step docs and errors, and every attached
 * doc entry.
 */
import { diffStateValues, summarizeStateChanges } from "../state-diff.js";
import type { ReportDocEntry, ReportScenario, ReportStep } from "../types/story-report.js";

export interface ScenarioMarkdownOptions {
  /**
   * `"full"` (default) renders a standalone document: h1 heading, `meta` lines,
   * step-level docs, a failure section, and the scenario's doc entries.
   * `"compact"` renders a paste-sized excerpt: h2 heading with the status,
   * steps, and the failure fence only.
   */
  variant?: "full" | "compact";
  /**
   * Metadata bullet lines rendered under the heading (full variant only).
   * Callers own these because the interesting fields — feature, tags, commit,
   * whether the data is a sample — live outside {@link ReportScenario}.
   */
  meta?: string[];
}

/** Escape a value for a single Markdown table cell. */
function cell(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

function stringify(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
}

/**
 * Render one doc entry (and its children) as Markdown lines. Exported so other
 * Markdown projections (e.g. a feature-level summary) reuse the same mapping.
 *
 * `stateLanes` tracks the previous `state` snapshot per label lane (label ?? "")
 * within one scenario walk — same lane semantics as `extractStoryboardFrames` —
 * so repeat captures render a diff summary. Omit it for standalone rendering
 * (no diff, just the snapshot).
 */
export function docEntryToMarkdown(entry: ReportDocEntry, stateLanes?: Map<string, unknown>): string[] {
  const lines: string[] = [];
  switch (entry.kind) {
    case "note":
      lines.push(entry.text);
      break;
    case "tag":
      lines.push(entry.names.map((n) => `\`@${n}\``).join(" "));
      break;
    case "kv":
      lines.push(`**${entry.label}:** ${stringify(entry.value)}`);
      break;
    case "code":
      lines.push(`**${entry.label}**`, "", "```" + (entry.lang ?? ""), entry.content, "```");
      break;
    case "table": {
      lines.push(`**${entry.label}**`, "");
      lines.push(`| ${entry.columns.map(cell).join(" | ")} |`);
      lines.push(`| ${entry.columns.map(() => "---").join(" | ")} |`);
      for (const row of entry.rows) lines.push(`| ${row.map(cell).join(" | ")} |`);
      break;
    }
    case "link":
      lines.push(`[${entry.label}](${entry.url})`);
      break;
    case "section":
      lines.push(`### ${entry.title}`, "", entry.markdown);
      break;
    case "mermaid":
      if (entry.title) lines.push(`**${entry.title}**`, "");
      lines.push("```mermaid", entry.code, "```");
      break;
    case "screenshot":
      lines.push(`![${entry.alt ?? "screenshot"}](${entry.path})`);
      break;
    case "video":
      lines.push(`Video: ${entry.path}${entry.caption ? ` — ${entry.caption}` : ""}`);
      break;
    case "html": {
      // Inline HTML is preserved in a fence so agents can still read it; a URL
      // embed becomes a link. Only a local-file embed stays a bare reference
      // (Markdown cannot iframe).
      const htmlTitle = entry.title ?? "Embedded HTML";
      if (entry.content) {
        lines.push(`**${htmlTitle}**`, "", "```html", entry.content, "```");
      } else if (entry.url) {
        lines.push(`[${htmlTitle}](${entry.url})`);
      } else {
        lines.push(`Embedded HTML: ${entry.path ?? "(inline)"}`);
      }
      break;
    }
    case "custom":
      lines.push(`**${entry.type}**`, "", "```json", stringify(entry.data), "```");
      break;
    case "state": {
      // Compact state block: label, diff vs the previous same-label capture in
      // this scenario, full snapshot collapsed behind <details>.
      const lane = entry.label ?? "";
      lines.push(`**${entry.label ?? "State"}**`);
      if (stateLanes?.has(lane)) {
        const summary = summarizeStateChanges(diffStateValues(stateLanes.get(lane), entry.value));
        if (summary.length > 0) lines.push("", ...summary.map((l) => `- ${l}`));
      }
      stateLanes?.set(lane, entry.value);
      lines.push("", "<details>", "<summary>snapshot</summary>", "", "```json", stringify(entry.value ?? null), "```", "", "</details>");
      break;
    }
  }
  for (const child of entry.children ?? []) {
    lines.push("", ...docEntryToMarkdown(child, stateLanes));
  }
  return lines;
}

/** One step as a numbered list item, with its error and docs when in full mode. */
function stepLines(step: ReportStep, ordinal: number, full: boolean, stateLanes?: Map<string, unknown>): string[] {
  const status = step.status === "passed" ? "" : ` — **${step.status}**`;
  const lines = [`${ordinal}. **${step.keyword}** ${step.text}${status}`];
  if (!full) return lines;
  if (step.errorMessage) {
    lines.push(...step.errorMessage.split("\n").map((l) => `   > ${l}`));
  }
  for (const entry of step.docEntries) {
    // Indent step-level docs under the list item so they read as belonging to it.
    lines.push("", ...docEntryToMarkdown(entry, stateLanes).map((l) => (l === "" ? l : `   ${l}`)));
  }
  return lines;
}

/** Render a scenario as Markdown. See {@link ScenarioMarkdownOptions}. */
export function scenarioToMarkdown(scenario: ReportScenario, options: ScenarioMarkdownOptions = {}): string {
  const { variant = "full", meta = [] } = options;
  const full = variant === "full";

  const lines: string[] = full
    ? [`# ${scenario.title}`, ""]
    : [`## ${scenario.title} _(${scenario.status})_`, ""];

  if (full && meta.length > 0) lines.push(...meta);

  // One lane map per scenario so repeat `state` captures diff against the
  // previous same-label snapshot (steps first, then scenario-level docs).
  const stateLanes = new Map<string, unknown>();

  if (scenario.steps.length > 0) {
    if (full) lines.push("", "## Steps", "");
    scenario.steps.forEach((step, i) => lines.push(...stepLines(step, i + 1, full, stateLanes)));
  }

  if (scenario.errorMessage) {
    if (full) lines.push("", "## Failure", "");
    else lines.push("");
    lines.push("```", scenario.errorMessage.trim(), "```");
  }

  if (full && scenario.docEntries.length > 0) {
    lines.push("", "## Docs", "");
    for (const entry of scenario.docEntries) lines.push(...docEntryToMarkdown(entry, stateLanes), "");
  }

  return lines.join("\n").replaceAll(/\n{3,}/g, "\n\n").trimEnd() + (full ? "\n" : "");
}
