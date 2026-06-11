/**
 * `triage` — the discovery-phase worklist for an agent loop.
 *
 * The automation that runs on a schedule needs a ranked queue of what to work
 * on, not a full report. This emits failing scenarios, regressions first, each
 * carrying the product code it `covers` (where to send the fixer), the error,
 * and its tickets. Failures with no `covers` are flagged: the loop can't route
 * them to code, so a human or a covers annotation is needed first.
 */

import type { TestCaseResult, TestStatus } from "./types/test-result";
import { failingScenarioMessage } from "./scenario-failure";

export interface TriageItem {
  rank: number;
  id: string;
  scenario: string;
  status: TestStatus;
  /** `sourceFile:sourceLine` */
  location: string;
  /** Product-code paths to fix. Empty when the scenario declared no `covers`. */
  covers: string[];
  tickets: string[];
  errorMessage?: string;
  /** Passed in the baseline, failing now. Ranked first. */
  regressed: boolean;
  reason: "regression" | "failing";
}

export interface TriageReport {
  total: number;
  failing: number;
  regressions: number;
  /** Failing scenarios with no `covers` — the loop can't route them to code. */
  needsCovers: number;
  items: TriageItem[];
}

export interface TriageArgs {
  testCases: TestCaseResult[];
  /** Baseline statuses by scenario id, to flag regressions and rank them first. */
  baseline?: Map<string, TestStatus>;
  format: "text" | "json";
}

export type TriageDeps = Record<string, never>;

export function buildTriage(args: TriageArgs, _deps: TriageDeps = {}): TriageReport {
  const { testCases, baseline } = args;

  const failing = testCases.filter((tc) => tc.status === "failed");

  const ranked = failing
    .map((tc) => {
      const regressed = baseline?.get(tc.id) === "passed";
      return {
        tc,
        regressed,
        covers: tc.story.covers ?? [],
      };
    })
    // Regressions first (an edit just broke a green scenario), then by location.
    .sort((a, b) => {
      if (a.regressed !== b.regressed) return a.regressed ? -1 : 1;
      const la = `${a.tc.sourceFile}:${a.tc.sourceLine}`;
      const lb = `${b.tc.sourceFile}:${b.tc.sourceLine}`;
      return la.localeCompare(lb);
    });

  const items: TriageItem[] = ranked.map((entry, index) => ({
    rank: index + 1,
    id: entry.tc.id,
    scenario: entry.tc.story.scenario,
    status: entry.tc.status,
    location: `${entry.tc.sourceFile}:${entry.tc.sourceLine}`,
    covers: entry.covers,
    tickets: (entry.tc.story.tickets ?? []).map((t) => t.id),
    errorMessage: failingScenarioMessage(entry.tc),
    regressed: entry.regressed,
    reason: entry.regressed ? "regression" : "failing",
  }));

  return {
    total: testCases.length,
    failing: failing.length,
    regressions: items.filter((i) => i.regressed).length,
    needsCovers: items.filter((i) => i.covers.length === 0).length,
    items,
  };
}

export function renderTriage(report: TriageReport, format: "text" | "json"): string {
  if (format === "json") return JSON.stringify(report, null, 2);

  if (report.items.length === 0) {
    return "Nothing to triage. No failing scenarios.";
  }

  const header =
    report.regressions > 0
      ? `${report.items.length} items to triage (${report.regressions} regression${report.regressions === 1 ? "" : "s"})`
      : `${report.items.length} items to triage`;
  const lines = [header, ""];

  for (const item of report.items) {
    const tag = item.regressed ? "[regression] " : "";
    lines.push(`${item.rank}. ${tag}${item.scenario}`);
    lines.push(`   ${item.location}`);
    if (item.errorMessage) {
      lines.push(`   → ${item.errorMessage.split("\n")[0]}`);
    }
    if (item.covers.length > 0) {
      lines.push(`   fix: ${item.covers.join(", ")}`);
    } else {
      lines.push("   fix: (no covers declared — add `covers` to route this to code)");
    }
    if (item.tickets.length > 0) {
      lines.push(`   ticket: ${item.tickets.join(", ")}`);
    }
    lines.push("");
  }

  if (report.needsCovers > 0) {
    lines.push(`${report.needsCovers} failing scenario(s) have no covers and can't be routed to code automatically.`);
  }

  return lines.join("\n").trimEnd();
}
