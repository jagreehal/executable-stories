/**
 * Put a run on the tickets its stories name, in any issue tracker.
 *
 * A story says which ticket it verifies (`story.init(task, { ticket: 'PAY-12' })`).
 * This package reads a run, groups its scenarios by ticket, words one status
 * per ticket ("CI main @ abc1234: 3 passed, 1 failed") and hands each to a
 * `TrackerClient`. A tracker package (executable-stories-linear) only has to
 * say which tickets are its own and how to post a status.
 *
 * fn(args, deps): nothing here talks to a network; the client does.
 */

import { canonicalizeRun } from "executable-stories-core/converters/acl/canonicalize";
import { toStoryReport } from "executable-stories-core/converters/story-report";
import type { RawRun } from "executable-stories-core/types/raw";
import type { ReportScenario, ReportTicket, StoryReport } from "executable-stories-core/types/story-report";

export type { ReportTicket, StoryReport };

/** Where a run is usually written, in the order the formatter CLI looks. */
export const DEFAULT_RUN_FILES = [".executable-stories/raw-run.json", "reports/raw-run.json"];

/**
 * A run file as a StoryReport: either a raw run, as the framework reporters
 * write it, or a StoryReport (`--format story-report-json`).
 */
export function readRun(text: string, options: { ticketUrlTemplate?: string } = {}): StoryReport {
  const parsed: unknown = JSON.parse(text);
  if (isObject(parsed) && Array.isArray(parsed["testCases"])) {
    // SAFETY: the reporters write RawRun; canonicalizeRun validates field by field.
    return toStoryReport(canonicalizeRun(parsed as unknown as RawRun), options);
  }
  if (isObject(parsed) && typeof parsed["schemaVersion"] === "string" && Array.isArray(parsed["features"])) {
    // SAFETY: schemaVersion + features is the StoryReport v1 envelope.
    return parsed as unknown as StoryReport;
  }
  throw new Error("Not a run: expected a raw run (testCases) or a StoryReport (schemaVersion, features).");
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A Linear or Jira style key: TEAM-123. */
export const TICKET_KEY = /^[A-Z][A-Z0-9_]*-\d+$/;

/** The order a summary lists outcomes in; anything else reads as "not run". */
export const OUTCOMES = ["passed", "failed", "skipped", "pending"] as const;
export type Outcome = (typeof OUTCOMES)[number];

export interface TicketStep {
  /** Given, When, Then, And, But. */
  keyword: string;
  text: string;
  status: Outcome;
}

export interface TicketScenario {
  feature: string;
  title: string;
  status: Outcome;
  /** The story as written, step by step, with each step's outcome. */
  steps: TicketStep[];
  /** Why it failed: the failing step and the error's first line. Absent unless it failed. */
  failure?: { step: string | null; message: string };
  /**
   * Assertions the adapter observed across the steps: a number, 0 when it
   * observed that none ran (a green result that proved nothing), or null when
   * the adapter cannot observe assertions.
   */
  assertions: number | null;
}

/**
 * Marks a status as ours in a tracker, so any writer (this CLI in CI, the
 * hosted app) finds and replaces the one status per ticket per scope rather
 * than adding a second that could disagree.
 */
export const STATUS_SOURCE = "executable-stories";

/**
 * The scope a CI run reports under unless told otherwise: "CI acme/app main".
 * Every writer names CI evidence this way, so they share one status per ticket.
 */
export function defaultScope(where: { repository?: string | null; branch?: string | null }): string {
  if (!where.branch) return "Local";
  return where.repository ? `CI ${where.repository} ${where.branch}` : `CI ${where.branch}`;
}

export interface TicketStatus {
  /** The ticket key, e.g. PAY-12. */
  ticket: string;
  /** The stream of evidence this status stands for; one status per ticket per scope. */
  scope: string;
  /** One line: "CI main @ abc1234: 3 passed, 1 failed". */
  title: string;
  /** Every scenario for the ticket passed. */
  resolved: boolean;
  counts: Partial<Record<Outcome, number>>;
  scenarios: TicketScenario[];
  /** The run (CI job, report) this status comes from, when known. */
  runUrl: string | null;
  /**
   * The same for every run of this scope on this ticket, so a tracker that
   * keys a status by URL (Linear attachments) updates one instead of adding one.
   */
  stableUrl: string;
  /** How current the evidence is: where and when the run happened. */
  context: { branch: string | null; commit: string | null; ranAt: string | null };
}

const outcomeOf = (status: string): Outcome =>
  OUTCOMES.find((outcome) => outcome === status) ?? "pending";

/** The first line of an error, which is what a reader needs; the stack is for the report. */
const firstLine = (message: string) => message.split("\n").find((line) => line.trim())?.trim() ?? message;

/** A scenario as a tracker shows it: steps, outcome, failure and assertions. */
export function ticketScenario(feature: string, scenario: ReportScenario): TicketScenario {
  const steps = scenario.steps.map((step) => ({
    keyword: step.keyword,
    text: step.text,
    status: outcomeOf(step.status),
  }));
  const failedStep = scenario.steps.find((step) => step.status === "failed");
  const message = failedStep?.errorMessage ?? scenario.errorMessage;
  const observed = scenario.steps.map((step) => step.assertions);
  const assertions =
    observed.length > 0 && observed.every((count) => typeof count === "number")
      ? observed.reduce<number>((sum, count) => sum + (count ?? 0), 0)
      : null;
  const status = outcomeOf(scenario.status);
  return {
    feature,
    title: scenario.title,
    status,
    steps,
    ...(status === "failed"
      ? {
          failure: {
            step: failedStep ? `${failedStep.keyword} ${failedStep.text}` : null,
            message: message ? firstLine(message) : "Failed without an error message",
          },
        }
      : {}),
    assertions,
  };
}

/**
 * Scenarios by the tickets they name, for tickets `owns` accepts (a tracker
 * knows its own keys and URLs). A scenario naming two tickets counts for both.
 */
export function scenariosByTicket(
  report: StoryReport,
  owns: (ticket: ReportTicket) => boolean,
): Map<string, TicketScenario[]> {
  const byTicket = new Map<string, TicketScenario[]>();
  for (const feature of report.features) {
    for (const scenario of feature.scenarios) {
      for (const ticket of scenario.tickets ?? []) {
        if (!owns(ticket)) continue;
        const list = byTicket.get(ticket.id) ?? [];
        list.push(ticketScenario(feature.title, scenario));
        byTicket.set(ticket.id, list);
      }
    }
  }
  return byTicket;
}

/** "3 passed, 1 failed" and the counts behind it. */
export function summarise(scenarios: readonly TicketScenario[]) {
  const counts: Partial<Record<Outcome, number>> = {};
  for (const scenario of scenarios) counts[scenario.status] = (counts[scenario.status] ?? 0) + 1;
  const text = OUTCOMES.filter((outcome) => counts[outcome])
    .map((outcome) => `${counts[outcome]} ${outcome}`)
    .join(", ");
  return { counts, text, resolved: scenarios.length > 0 && counts.passed === scenarios.length };
}

/** "CI main @ abc1234", or the scope you name. */
export function runLabel(report: StoryReport, scope?: string): string {
  if (scope) return scope;
  const branch = report.ci?.branch;
  const sha = (report.ci?.commitSha ?? report.gitSha)?.slice(0, 7);
  const where = [branch, sha ? `@ ${sha}` : null].filter(Boolean).join(" ");
  return report.ci ? `${report.ci.name}${where ? ` ${where}` : ""}` : where || "Local run";
}

/**
 * A link that stays the same for every run of one scope on one ticket: the
 * base link (a report site, the repository) plus which ticket and scope.
 */
export function stableTicketUrl(base: string, ticket: string, scope: string): string {
  const url = new URL(base);
  url.searchParams.set("executable-stories-ticket", ticket);
  url.searchParams.set("executable-stories-scope", scope);
  return url.toString();
}

export function ticketStatuses(args: {
  report: StoryReport;
  owns: (ticket: ReportTicket) => boolean;
  /** Names this stream of evidence ("CI main", "nightly"); one status per ticket per scope. */
  scope: string;
  /** Where a status links to for good: a report site or the repository. */
  link: string;
  runUrl?: string | null;
}): TicketStatus[] {
  const label = runLabel(args.report, args.scope);
  return [...scenariosByTicket(args.report, args.owns)].map(([ticket, scenarios]) => {
    const summary = summarise(scenarios);
    return {
      ticket,
      scope: args.scope,
      title: `${label}: ${summary.text}`,
      resolved: summary.resolved,
      counts: summary.counts,
      scenarios,
      runUrl: args.runUrl ?? args.report.ci?.url ?? null,
      stableUrl: stableTicketUrl(args.link, ticket, args.scope),
      context: {
        branch: args.report.ci?.branch ?? null,
        commit: args.report.ci?.commitSha ?? args.report.gitSha ?? null,
        ranAt: Number.isFinite(args.report.finishedAtMs) ? new Date(args.report.finishedAtMs).toISOString() : null,
      },
    };
  });
}

/** What a tracker package implements. */
export interface TrackerClient {
  /** "Linear", "Jira": used in messages. */
  name: string;
  /** Is this ticket one of the tracker's own (its key shape, its site in the URL)? */
  owns: (ticket: ReportTicket) => boolean;
  /** Post or update the status on its ticket; throw to report the ticket as failed. */
  postStatus: (status: TicketStatus) => Promise<void>;
}

export interface PublishResult {
  posted: string[];
  failed: { ticket: string; error: string }[];
}

/**
 * Post every ticket's status, one at a time so a large run does not trip a
 * tracker's rate limit. A ticket the tracker refuses (deleted, no access) is
 * reported, never thrown: the rest still go out.
 */
export async function publishRun(args: {
  report: StoryReport;
  client: TrackerClient;
  scope: string;
  link: string;
  runUrl?: string | null;
}): Promise<PublishResult & { statuses: TicketStatus[] }> {
  const statuses = ticketStatuses({ ...args, owns: args.client.owns });
  const result: PublishResult = { posted: [], failed: [] };
  for (const status of statuses) {
    try {
      await args.client.postStatus(status);
      result.posted.push(status.ticket);
    } catch (error) {
      result.failed.push({
        ticket: status.ticket,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return { ...result, statuses };
}
