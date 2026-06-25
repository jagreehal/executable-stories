import type { TestCaseResult, TestRunResult, TestStatus } from "executable-stories-core/types/test-result";

/**
 * Requirement-first view of a run. Groups scenarios under the ticket/user-story
 * they verify, rolls up the code each requirement covers and whether it passed,
 * and surfaces two gaps a scenario-keyed index hides: requirements with a failing
 * scenario, and scenarios linked to no requirement at all (untraced behavior).
 *
 * The set of requirements is derived from the tickets found on scenarios — the
 * tests are the source of truth, so a requirement only appears once a scenario
 * claims it.
 */
export interface TraceabilityRequirement {
  /** Ticket / user-story id (e.g. "US-101", "JIRA-42"). */
  ticket: string;
  /** Direct URL when a scenario supplied one. */
  url?: string;
  /** "verified" = every scenario passed; "failing" = at least one failed; "incomplete" = only skipped/pending. */
  status: "verified" | "failing" | "incomplete";
  scenarios: Array<{
    id: string;
    title: string;
    status: TestStatus;
    sourceFile: string;
    sourceLine: number;
    covers: string[];
  }>;
  /** Union of every covered path across this requirement's scenarios. */
  covers: string[];
}

export interface TraceabilityMatrix {
  schemaVersion: "1.0";
  generatedAt: string;
  run: {
    startedAt: string;
    finishedAt: string;
    gitSha?: string;
    branch?: string;
  };
  summary: {
    requirements: number;
    requirementsVerified: number;
    requirementsFailing: number;
    scenarios: number;
    untracedScenarios: number;
  };
  requirements: TraceabilityRequirement[];
  /** Scenarios with no ticket — behavior verified but not linked to a requirement. */
  untraced: Array<{
    id: string;
    title: string;
    status: TestStatus;
    sourceFile: string;
    sourceLine: number;
  }>;
}

export class TraceabilityMatrixFormatter {
  format(run: TestRunResult): string {
    const matrix = toTraceabilityMatrix(run);
    const lines: string[] = [];

    lines.push("# Traceability Matrix");
    lines.push("");
    lines.push(`Generated: ${matrix.generatedAt}`);
    lines.push(`Run: ${matrix.run.startedAt} to ${matrix.run.finishedAt}`);
    if (matrix.run.branch) lines.push(`Branch: ${matrix.run.branch}`);
    if (matrix.run.gitSha) lines.push(`Commit: ${matrix.run.gitSha}`);
    lines.push("");
    lines.push("| Requirements | Verified | Failing | Scenarios | Untraced |");
    lines.push("| ---: | ---: | ---: | ---: | ---: |");
    lines.push(
      `| ${matrix.summary.requirements} | ${matrix.summary.requirementsVerified} | ${matrix.summary.requirementsFailing} | ${matrix.summary.scenarios} | ${matrix.summary.untracedScenarios} |`,
    );
    lines.push("");

    for (const req of matrix.requirements) {
      const heading = req.url ? `[${req.ticket}](${req.url})` : req.ticket;
      lines.push(`## ${heading}`);
      lines.push("");
      lines.push(`Status: ${renderRequirementStatus(req.status)}`);
      if (req.covers.length > 0) {
        lines.push(`Covers: ${req.covers.map((path) => `\`${path}\``).join(", ")}`);
      }
      lines.push("");
      lines.push("| Status | Scenario | Source | Covers |");
      lines.push("| --- | --- | --- | --- |");
      for (const scenario of req.scenarios) {
        const source = `${scenario.sourceFile}:${scenario.sourceLine}`;
        const covers = scenario.covers.length > 0 ? scenario.covers.map((path) => `\`${path}\``).join(", ") : "";
        lines.push(`| ${scenario.status} | ${escapePipe(scenario.title)} | \`${source}\` | ${covers} |`);
      }
      lines.push("");
    }

    if (matrix.untraced.length > 0) {
      lines.push("## Untraced scenarios");
      lines.push("");
      lines.push("Behavior with no requirement link. Add a `ticket` to each so it appears against a requirement.");
      lines.push("");
      lines.push("| Status | Scenario | Source |");
      lines.push("| --- | --- | --- |");
      for (const scenario of matrix.untraced) {
        const source = `${scenario.sourceFile}:${scenario.sourceLine}`;
        lines.push(`| ${scenario.status} | ${escapePipe(scenario.title)} | \`${source}\` |`);
      }
      lines.push("");
    }

    return lines.join("\n").trimEnd();
  }
}

export function toTraceabilityMatrix(run: TestRunResult): TraceabilityMatrix {
  const sorted = [...run.testCases].sort((a, b) => a.id.localeCompare(b.id));

  const byTicket = new Map<string, { url?: string; cases: TestCaseResult[] }>();
  const untraced: TraceabilityMatrix["untraced"] = [];

  for (const tc of sorted) {
    const tickets = tc.story.tickets ?? [];
    if (tickets.length === 0) {
      untraced.push({
        id: tc.id,
        title: tc.story.scenario,
        status: tc.status,
        sourceFile: tc.sourceFile,
        sourceLine: tc.sourceLine,
      });
      continue;
    }
    for (const ticket of tickets) {
      const entry = byTicket.get(ticket.id) ?? { url: ticket.url, cases: [] };
      if (!entry.url && ticket.url) entry.url = ticket.url;
      entry.cases.push(tc);
      byTicket.set(ticket.id, entry);
    }
  }

  const requirements: TraceabilityRequirement[] = [...byTicket.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ticket, entry]) => {
      const scenarios = entry.cases.map((tc) => ({
        id: tc.id,
        title: tc.story.scenario,
        status: tc.status,
        sourceFile: tc.sourceFile,
        sourceLine: tc.sourceLine,
        covers: tc.story.covers ?? [],
      }));
      const covers = [...new Set(scenarios.flatMap((s) => s.covers))].sort();
      return { ticket, url: entry.url, status: requirementStatus(entry.cases), scenarios, covers };
    });

  return {
    schemaVersion: "1.0",
    generatedAt: new Date().toISOString(),
    run: {
      startedAt: new Date(run.startedAtMs).toISOString(),
      finishedAt: new Date(run.finishedAtMs).toISOString(),
      gitSha: run.gitSha,
      branch: run.ci?.branch,
    },
    summary: {
      requirements: requirements.length,
      requirementsVerified: requirements.filter((r) => r.status === "verified").length,
      requirementsFailing: requirements.filter((r) => r.status === "failing").length,
      scenarios: run.testCases.length,
      untracedScenarios: untraced.length,
    },
    requirements,
    untraced,
  };
}

function requirementStatus(cases: TestCaseResult[]): TraceabilityRequirement["status"] {
  if (cases.some((tc) => tc.status === "failed")) return "failing";
  if (cases.some((tc) => tc.status === "passed")) return "verified";
  return "incomplete";
}

function renderRequirementStatus(status: TraceabilityRequirement["status"]): string {
  switch (status) {
    case "verified":
      return "verified (all scenarios passed)";
    case "failing":
      return "failing (a scenario failed)";
    default:
      return "incomplete (no scenario passed yet)";
  }
}

function escapePipe(value: string): string {
  return value.replace(/\|/g, "\\|");
}
