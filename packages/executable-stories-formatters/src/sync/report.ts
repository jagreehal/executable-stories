/**
 * Rendering for the two things a human reads: the coverage report and the plan.
 *
 * Coverage answers "what does my test-management system hold that my tests
 * already cover?", which needs no write access and is the whole reason to try
 * this. The plan borrows `terraform plan` deliberately: the idiom is already in
 * everyone's head, and it is what makes pointing this at a company's TestRail
 * feel safe.
 *
 * Pure functions of a {@link SyncAnalysis}. No IO here.
 */

import type { ClassifiedCase, SyncAnalysis, SyncApplyResult } from "./engine";

/**
 * Manual-only cases are the automation backlog, so they get listed rather than
 * merely counted. Capped because a first run against a real instance can return
 * hundreds, and the overflow is stated rather than silently dropped.
 */
const MANUAL_ONLY_LIMIT = 50;

export interface CoverageSummary {
  provider: string;
  target?: string;
  totalCases: number;
  automated: number;
  duplicated: number;
  possibleDuplicate: number;
  manualOnly: number;
  /** Stories with no case in the provider. */
  untracked: number;
  /** Stories whose case was reached through a human-authored ticket id. */
  adopted: number;
}

export interface CoverageJson extends CoverageSummary {
  schema: "executable-stories/sync-coverage/v1";
  cases: Array<{
    id: string;
    url: string;
    title: string;
    section?: string;
    classification: ClassifiedCase["classification"];
    resembles?: string;
    similarity?: number;
  }>;
  untrackedScenarios: string[];
  orphaned: Array<{ caseId: string; url: string; title: string }>;
  sections: Array<{ name: string; total: number; automated: number }>;
}

function summarize(analysis: SyncAnalysis): CoverageSummary {
  const count = (kind: ClassifiedCase["classification"]) =>
    analysis.remote.filter((c) => c.classification === kind).length;

  return {
    provider: analysis.provider,
    target: analysis.target,
    totalCases: analysis.remote.length,
    automated: count("automated"),
    duplicated: count("duplicated"),
    possibleDuplicate: count("possible-duplicate"),
    manualOnly: count("manual-only"),
    untracked: analysis.create.length,
    adopted: analysis.adopted.length,
  };
}

function sectionBreakdown(analysis: SyncAnalysis): Array<{ name: string; total: number; automated: number }> {
  const sections = new Map<string, { total: number; automated: number }>();
  for (const entry of analysis.remote) {
    const name = entry.case.section ?? "(no section)";
    const bucket = sections.get(name) ?? { total: 0, automated: 0 };
    bucket.total += 1;
    if (entry.classification === "automated") bucket.automated += 1;
    sections.set(name, bucket);
  }
  return [...sections.entries()]
    .map(([name, value]) => ({ name, ...value }))
    .sort((a, b) => b.automated - a.automated || b.total - a.total);
}

/** Human-readable coverage, the first thing anyone sees. */
export function renderCoverageText(analysis: SyncAnalysis): string {
  const summary = summarize(analysis);
  const lines: string[] = [];

  lines.push(`${analysis.provider}: ${analysis.target ?? "(target not described)"} (${summary.totalCases} cases)`);
  lines.push("");
  lines.push(`  ${pad(summary.automated)}  automated        already covered by a story`);
  lines.push(`  ${pad(summary.duplicated)}  duplicated       manual case duplicates an automated story`);
  if (summary.possibleDuplicate > 0) {
    lines.push(`  ${pad(summary.possibleDuplicate)}  possible dupe    similar to a story, needs a human to confirm`);
  }
  lines.push(`  ${pad(summary.manualOnly)}  manual only      no automated equivalent`);
  lines.push(`  ${pad(summary.untracked)}  untracked        story with no case`);
  if (summary.adopted > 0) {
    lines.push(`  ${pad(summary.adopted)}  linked           story bound to a hand-authored case`);
  }

  const sections = sectionBreakdown(analysis).filter((s) => s.automated > 0);
  if (sections.length > 0) {
    const top = sections[0]!;
    lines.push("");
    lines.push(`Biggest overlap: "${top.name}" section, ${top.automated} of ${top.total} automated.`);
  }

  if (analysis.orphaned.length > 0) {
    lines.push("");
    lines.push(`${analysis.orphaned.length} case(s) bound to a story that no longer exists. Nothing was removed.`);
  }
  if (analysis.partialRunWarning) {
    lines.push("");
    lines.push(`Note: ${analysis.partialRunWarning}`);
  }

  return lines.join("\n");
}

function pad(value: number): string {
  return String(value).padStart(4, " ");
}

/** The same content as Markdown, so it can be pasted, published, or PR-commented. */
export function renderCoverageMarkdown(analysis: SyncAnalysis): string {
  const summary = summarize(analysis);
  const lines: string[] = [];

  lines.push(`# Test coverage vs ${analysis.provider}`);
  lines.push("");
  if (analysis.target) lines.push(`**Target:** ${analysis.target}`, "");
  lines.push("| Cases | Count | Meaning |");
  lines.push("| --- | ---: | --- |");
  lines.push(`| Automated | ${summary.automated} | Already covered by a story |`);
  lines.push(`| Duplicated | ${summary.duplicated} | Manual case duplicates an automated story |`);
  lines.push(`| Possible duplicate | ${summary.possibleDuplicate} | Similar to a story, needs review |`);
  lines.push(`| Manual only | ${summary.manualOnly} | No automated equivalent |`);
  lines.push(`| Untracked stories | ${summary.untracked} | Story with no case |`);
  lines.push("");

  const duplicates = analysis.remote.filter(
    (c) => c.classification === "duplicated" || c.classification === "possible-duplicate",
  );
  if (duplicates.length > 0) {
    lines.push("## Retire these first");
    lines.push("");
    lines.push("Manual cases an automated story already covers.");
    lines.push("");
    lines.push("| Case | Title | Covered by | Confidence |");
    lines.push("| --- | --- | --- | --- |");
    for (const entry of duplicates) {
      const confidence = entry.classification === "duplicated" ? "exact title" : `similarity ${entry.similarity}`;
      lines.push(
        `| [${entry.case.id}](${entry.case.url}) | ${escapeCell(entry.case.title)} | ${escapeCell(entry.resembles ?? "")} | ${confidence} |`,
      );
    }
    lines.push("");
  }

  const manualOnly = analysis.remote.filter((c) => c.classification === "manual-only");
  if (manualOnly.length > 0) {
    lines.push("## Not automated yet");
    lines.push("");
    lines.push("Cases with no automated equivalent. This is the backlog.");
    lines.push("");
    lines.push("| Case | Title | Section |");
    lines.push("| --- | --- | --- |");
    for (const entry of manualOnly.slice(0, MANUAL_ONLY_LIMIT)) {
      lines.push(
        `| [${entry.case.id}](${entry.case.url}) | ${escapeCell(entry.case.title)} | ${escapeCell(entry.case.section ?? "")} |`,
      );
    }
    if (manualOnly.length > MANUAL_ONLY_LIMIT) {
      lines.push("");
      lines.push(
        `_${manualOnly.length - MANUAL_ONLY_LIMIT} more not listed here. The JSON artifact has all ${manualOnly.length}._`,
      );
    }
    lines.push("");
  }

  if (analysis.create.length > 0) {
    lines.push("## Stories with no case");
    lines.push("");
    for (const planned of analysis.create) lines.push(`- ${planned.scenario}`);
    lines.push("");
  }

  if (analysis.orphaned.length > 0) {
    lines.push("## Cases with no story");
    lines.push("");
    lines.push("Bound to a story that has since been deleted. Nothing was removed automatically.");
    lines.push("");
    for (const orphan of analysis.orphaned) {
      lines.push(`- [${orphan.caseId}](${orphan.url}) ${escapeCell(orphan.title)}`);
    }
    lines.push("");
  }

  const sections = sectionBreakdown(analysis);
  if (sections.length > 1) {
    lines.push("## By section");
    lines.push("");
    lines.push("| Section | Automated | Total |");
    lines.push("| --- | ---: | ---: |");
    for (const section of sections) {
      lines.push(`| ${escapeCell(section.name)} | ${section.automated} | ${section.total} |`);
    }
    lines.push("");
  }

  if (analysis.partialRunWarning) {
    lines.push(`> ${analysis.partialRunWarning}`, "");
  }

  return lines.join("\n");
}

function escapeCell(text: string): string {
  return text.replace(/\|/g, "\\|");
}

export function buildCoverageJson(analysis: SyncAnalysis): CoverageJson {
  return {
    schema: "executable-stories/sync-coverage/v1",
    ...summarize(analysis),
    cases: analysis.remote.map((entry) => ({
      id: entry.case.id,
      url: entry.case.url,
      title: entry.case.title,
      section: entry.case.section,
      classification: entry.classification,
      resembles: entry.resembles,
      similarity: entry.similarity,
    })),
    untrackedScenarios: analysis.create.map((c) => c.scenario),
    orphaned: analysis.orphaned.map((o) => ({ caseId: o.caseId, url: o.url, title: o.title })),
    sections: sectionBreakdown(analysis),
  };
}

// --- plan -------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** terraform-plan-shaped output. Read before anything is written. */
export function renderPlan(analysis: SyncAnalysis, opts: { dryRun: boolean }): string {
  const lines: string[] = [];

  lines.push(`${analysis.provider}: ${analysis.target ?? "(target not described)"}`);
  lines.push("");
  lines.push(`  + create    ${pad(analysis.create.length)} cases`);
  lines.push(`  ~ update    ${pad(analysis.update.length)} cases`);
  lines.push(`  = unchanged ${pad(analysis.unchanged.length)} cases`);
  if (analysis.adopted.length > 0) {
    lines.push(`  · linked    ${pad(analysis.adopted.length)} cases  (hand-authored, results only)`);
  }
  if (analysis.skipped.length > 0) {
    const edited = analysis.skipped.filter((s) => s.reason === "remote-edited").length;
    const missing = analysis.skipped.filter((s) => s.reason === "case-missing").length;
    if (edited > 0) {
      lines.push(`  ! skipped   ${pad(edited)} cases  (edited in ${analysis.provider} since last sync)`);
    }
    if (missing > 0) {
      lines.push(`  ! skipped   ${pad(missing)} cases  (bound case no longer exists)`);
    }
  }
  if (analysis.orphaned.length > 0) {
    lines.push(`  ? orphaned  ${pad(analysis.orphaned.length)} cases  (story deleted from codebase, never removed)`);
  }

  lines.push(`  → results   ${pad(analysis.results.length)} executions`);

  if (analysis.attachments.files > 0) {
    const roles = Object.entries(analysis.attachments.byRole)
      .map(([role, count]) => `${count} ${role}${count === 1 ? "" : "s"}`)
      .join(", ");
    lines.push(
      `  ↑ upload    ${pad(analysis.attachments.files)} attachments (${roles}, ${formatBytes(analysis.attachments.bytes)})`,
    );
  }
  for (const oversized of analysis.attachments.oversized) {
    lines.push(
      `  ! oversized ${oversized.filename} (${formatBytes(oversized.bytes)}, provider limit ${formatBytes(oversized.limit)})`,
    );
  }

  for (const capability of analysis.unsupported) {
    lines.push(`  ! ${analysis.provider} does not support ${capability} — those changes are not applied`);
  }

  if (analysis.driftUncheckable > 0) {
    lines.push(
      `  ! ${analysis.driftUncheckable} case(s): ${analysis.provider} returned no body, so a hand edit to them cannot be detected`,
    );
  }

  if (analysis.partialRunWarning) {
    lines.push("");
    lines.push(`Note: ${analysis.partialRunWarning}`);
  }

  if (analysis.skipped.some((s) => s.reason === "remote-edited")) {
    lines.push("");
    lines.push("Skipped cases were edited by hand after we last wrote them. Nothing overwrites them.");
    for (const skip of analysis.skipped.filter((s) => s.reason === "remote-edited")) {
      lines.push(`  ${skip.caseId} ${skip.title} ${skip.url}`);
    }
  }

  if (opts.dryRun && hasWork(analysis)) {
    lines.push("");
    lines.push("Nothing was written. Run the same command with --apply to make these changes.");
  }

  return lines.join("\n");
}

function hasWork(analysis: SyncAnalysis): boolean {
  return (
    analysis.create.length > 0 ||
    analysis.update.length > 0 ||
    analysis.results.length > 0
  );
}

/** What actually happened, printed after a real run. */
export function renderApplyResult(result: SyncApplyResult): string {
  const lines: string[] = [];

  for (const created of result.created) {
    lines.push(`  + ${created.caseId}  ${created.scenario}  ${created.url}`);
  }
  for (const updated of result.updated) {
    lines.push(`  ~ ${updated.caseId}  ${updated.scenario}`);
  }

  lines.push("");
  lines.push(
    `Created ${result.created.length}, updated ${result.updated.length}, recorded ${result.resultsRecorded} execution(s), uploaded ${result.attachmentsUploaded} attachment(s).`,
  );
  if (result.runUrl) lines.push(`Run: ${result.runUrl}`);

  for (const skipped of result.resultsSkipped) {
    lines.push(`  ! result for case ${skipped.caseId} not recorded: ${skipped.reason}`);
  }
  for (const error of result.errors) {
    lines.push(`  ✗ ${error}`);
  }

  return lines.join("\n");
}
