/**
 * `triage` — the discovery-phase worklist for an agent loop.
 *
 * The automation that runs on a schedule needs a ranked queue of what to work
 * on, not a full report. This emits failing scenarios, regressions first, each
 * carrying the product code it `covers` (where to send the fixer), the error,
 * and its tickets. Failures with no `covers` are flagged: the loop can't route
 * them to code, so a human or a covers annotation is needed first.
 */

import type { TestCaseResult, TestStatus } from "executable-stories-core/types/test-result";
import { failingScenarioMessage } from "./scenario-failure";
import { ownersFor, type CodeownersRule } from "./codeowners";

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
  /** CODEOWNERS entries for the code this scenario covers. Empty = unclaimed. */
  owners: string[];
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
  /** Parsed CODEOWNERS. Without it every item is unowned. */
  codeowners?: readonly CodeownersRule[];
}

export type TriageDeps = Record<string, never>;

export function buildTriage(args: TriageArgs, _deps: TriageDeps = {}): TriageReport {
  const { testCases, baseline, codeowners } = args;

  // Route by the product code the scenario covers — that is where the fix
  // lands. A scenario with no `covers` falls back to its own test file, which
  // is at least in the right neighbourhood.
  const ownersOf = (tc: TestCaseResult): string[] => {
    if (!codeowners) return [];
    const paths = tc.story.covers?.length ? tc.story.covers : [tc.sourceFile];
    const found = new Set<string>();
    for (const path of paths) {
      for (const owner of ownersFor(codeowners, path)) found.add(owner);
    }
    return [...found];
  };

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
    owners: ownersOf(entry.tc),
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

export interface RenderTriageOptions {
  /** Group the text worklist under each CODEOWNERS owner. */
  byOwner?: boolean;
}

export function renderTriage(
  report: TriageReport,
  format: "text" | "json",
  options: RenderTriageOptions = {},
): string {
  if (format === "json") return JSON.stringify(report, null, 2);

  if (report.items.length === 0) {
    return "Nothing to triage. No failing scenarios.";
  }

  if (options.byOwner) return renderByOwner(report);

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
    if (item.owners.length > 0) {
      lines.push(`   owner: ${item.owners.join(", ")}`);
    }
    lines.push("");
  }

  if (report.needsCovers > 0) {
    lines.push(`${report.needsCovers} failing scenario(s) have no covers and can't be routed to code automatically.`);
  }

  return lines.join("\n").trimEnd();
}

const UNOWNED = "Unowned";

/**
 * The same worklist, split the way the repo already splits responsibility.
 * Unowned work sorts last: it needs a decision about who takes it, not a fix.
 */
function renderByOwner(report: TriageReport): string {
  const groups = new Map<string, TriageItem[]>();
  for (const item of report.items) {
    for (const owner of item.owners.length > 0 ? item.owners : [UNOWNED]) {
      const bucket = groups.get(owner);
      if (bucket) bucket.push(item);
      else groups.set(owner, [item]);
    }
  }

  const owners = [...groups.keys()].sort((a, b) => {
    if (a === UNOWNED) return 1;
    if (b === UNOWNED) return -1;
    return a.localeCompare(b);
  });

  const lines: string[] = [
    `${report.items.length} items to triage across ${owners.length} owner${owners.length === 1 ? "" : "s"}`,
    "",
  ];
  for (const owner of owners) {
    const items = groups.get(owner)!;
    lines.push(`${owner} (${items.length})`);
    for (const item of items) {
      const tag = item.regressed ? "[regression] " : "";
      lines.push(`  ${item.rank}. ${tag}${item.scenario}`);
      lines.push(`     ${item.location}`);
      if (item.errorMessage) {
        lines.push(`     → ${item.errorMessage.split("\n")[0]}`);
      }
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}
