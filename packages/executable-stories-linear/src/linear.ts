/**
 * Linear for executable-stories: a `TrackerClient` over Linear's GraphQL API.
 *
 * Linear answers a failed operation with HTTP 200 and an `errors` array, so
 * every call checks both. An issue's status is an attachment: Linear keys an
 * attachment by issue + URL, so the stable URL of a ticket's status updates
 * the same attachment run after run.
 */

import type { ReportTicket, TicketScenario, TicketStatus, TrackerClient } from "executable-stories-trackers";
import { STATUS_SOURCE, TICKET_KEY } from "executable-stories-trackers";

export const LINEAR_API_URL = "https://api.linear.app/graphql";

export interface LinearDeps {
  fetch: typeof fetch;
}

/** A personal API key (lin_api_…) goes bare; an OAuth access token is a bearer token. */
export type LinearAuth = { apiKey: string } | { accessToken: string };

export interface LinearOptions {
  auth: LinearAuth;
  /** For a proxy or a test stand-in. */
  apiUrl?: string;
  /**
   * Links of other writers whose statuses this one may adopt (e.g. the hosted
   * app's address). A writer always trusts its own link.
   */
  trustedLinks?: readonly string[];
}

/** JSON as GraphQL variables carry it. */
export type GraphqlValue =
  | string
  | number
  | boolean
  | null
  | GraphqlValue[]
  | { [key: string]: GraphqlValue };

export async function linearRequest(
  options: LinearOptions,
  query: string,
  variables: Record<string, GraphqlValue>,
  deps: LinearDeps,
): Promise<Record<string, unknown>> {
  const authorization = "apiKey" in options.auth ? options.auth.apiKey : `Bearer ${options.auth.accessToken}`;
  const response = await deps.fetch(options.apiUrl ?? LINEAR_API_URL, {
    method: "POST",
    headers: { authorization, "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const body: unknown = await response.json().catch(() => null);
  const errors = readErrors(body);
  if (!response.ok || errors.length > 0) {
    throw new Error(errors.join("; ") || `Linear answered ${response.status}`);
  }
  const data = isRecord(body) ? body["data"] : undefined;
  if (!isRecord(data)) throw new Error("Linear answered with no data");
  return data;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readErrors(body: unknown): string[] {
  if (!isRecord(body) || !Array.isArray(body["errors"])) return [];
  return body["errors"].map((error) =>
    isRecord(error) && typeof error["message"] === "string" ? error["message"] : "Unknown Linear error",
  );
}

/** The workspace a key belongs to: its URL key (linear.app/<urlKey>/…) and name. */
export async function linearWorkspace(options: LinearOptions, deps: LinearDeps) {
  const data = await linearRequest(options, "{ viewer { organization { urlKey name } } }", {}, deps);
  const viewer = data["viewer"];
  const organization = isRecord(viewer) ? viewer["organization"] : undefined;
  if (!isRecord(organization) || typeof organization["urlKey"] !== "string") {
    throw new Error("Linear did not say which workspace this key belongs to");
  }
  return { urlKey: organization["urlKey"], name: String(organization["name"] ?? organization["urlKey"]) };
}

/**
 * Is this ticket an issue in the workspace? A key-shaped id with no URL, or
 * whose URL is the workspace's link for it (Linear adds a /slug).
 */
export function ownsTicket(urlKey: string, ticket: ReportTicket): boolean {
  if (!TICKET_KEY.test(ticket.id)) return false;
  if (!ticket.url) return true;
  const own = `https://linear.app/${urlKey}/issue/${ticket.id}`;
  return ticket.url === own || ticket.url.startsWith(`${own}/`);
}

/**
 * The attachment's modal: Linear renders `metadata.title`, `metadata.messages`
 * ({ subject, body, timestamp }) and `metadata.attributes` ({ name, value })
 * natively, so a reader sees the stories without leaving Linear. Linear asks
 * for message text under 10k characters; we keep the whole modal under this.
 */
export const MODAL_BUDGET = 9000;
/** Steps shown per scenario before "… N more steps". */
export const STEP_LIMIT = 25;

const MARK: Record<TicketScenario["status"], string> = { passed: "✓", failed: "✗", skipped: "–", pending: "○" };

/** What a scenario's assertions say about its result, in words; null when there is nothing to add. */
function assertionsLine(scenario: TicketScenario): string | null {
  if (scenario.assertions === null) return null;
  if (scenario.assertions === 0 && scenario.status === "passed") {
    return "No assertions observed: this pass checked nothing.";
  }
  return `Assertions observed: ${scenario.assertions}`;
}

/** Any one line in a message: a long step or error is cut here, with "…". */
export const LINE_LIMIT = 300;
/** Any one scenario's message (subject + body), so no single scenario crowds out the rest. */
export const MESSAGE_LIMIT = 1500;
/** Kept free in the budget for the closing "N more scenarios not shown" notice. */
export const NOTICE_RESERVE = 600;

const clip = (text: string, limit = LINE_LIMIT) => (text.length > limit ? `${text.slice(0, limit - 1)}…` : text);

/**
 * One scenario as a modal message, at most MESSAGE_LIMIT characters. Linear's
 * modal shows a message's body but not its subject, so the body opens with
 * the outcome and the scenario's name; the subject repeats it for clients
 * that show it. The name, where it failed, why, and its assertions are always
 * kept; steps give way first, from the end, with a note of how many.
 */
export function scenarioMessage(scenario: TicketScenario, timestamp: string | null) {
  const heading = clip(`${MARK[scenario.status]} ${scenario.title} (${scenario.status}) · ${scenario.feature}`);
  const tail: string[] = [];
  if (scenario.failure) {
    tail.push("");
    if (scenario.failure.step) tail.push(clip(`Failed at: ${scenario.failure.step}`));
    tail.push(clip(`Why: ${scenario.failure.message}`));
  }
  const assertions = assertionsLine(scenario);
  if (assertions) tail.push("", assertions);

  const stepLines = scenario.steps.slice(0, STEP_LIMIT).map((step) => clip(`${MARK[step.status]} ${step.keyword} ${step.text}`));
  const bodyOf = (steps: string[]) => {
    const hidden = scenario.steps.length - steps.length;
    const middle = scenario.steps.length === 0 ? ["No steps recorded."] : [...steps, ...(hidden > 0 ? [`… ${hidden} more steps`] : [])];
    return [heading, "", ...middle, ...tail].join("\n");
  };
  let kept = stepLines;
  // heading appears twice (subject and body); drop steps until the message fits.
  while (kept.length > 0 && heading.length + bodyOf(kept).length > MESSAGE_LIMIT) kept = kept.slice(0, -1);
  return {
    subject: heading,
    body: bodyOf(kept),
    ...(timestamp ? { timestamp } : {}),
  };
}

/**
 * Failures first, then everything else as it ran, within MODAL_BUDGET with
 * room kept for the closing notice. A message that does not fit is skipped,
 * not the end of the list, so a later, shorter failure is still shown.
 */
export function modalMessages(status: TicketStatus) {
  const order: TicketScenario["status"][] = ["failed", "pending", "skipped", "passed"];
  const ordered = [...status.scenarios].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
  const messages: ReturnType<typeof scenarioMessage>[] = [];
  let used = 0;
  for (const scenario of ordered) {
    const message = scenarioMessage(scenario, status.context.ranAt);
    const size = message.subject.length + message.body.length;
    if (used + size > MODAL_BUDGET - NOTICE_RESERVE) continue;
    messages.push(message);
    used += size;
  }
  const left = ordered.length - messages.length;
  if (left > 0) {
    const heading = `${left} more scenario${left === 1 ? "" : "s"} not shown`;
    messages.push({
      subject: heading,
      body: clip(
        `${heading}\n\nShown: ${messages.length} of ${ordered.length}, failures first. Every scenario is in the full report: ${status.runUrl ?? status.stableUrl}`,
        NOTICE_RESERVE - heading.length,
      ),
    });
  }
  return messages;
}

/**
 * The modal's attributes sit in narrow columns that cut values at about a
 * dozen characters, so each value is short. The result and scope are in the
 * attachment's own title, so they are not repeated here.
 */
export function modalAttributes(status: TicketStatus): { name: string; value: string }[] {
  const observed = status.scenarios.filter((scenario) => scenario.assertions !== null);
  const total = observed.reduce((sum, scenario) => sum + (scenario.assertions ?? 0), 0);
  const unasserted = observed.filter((scenario) => scenario.assertions === 0 && scenario.status === "passed").length;
  const runId = status.runUrl?.match(/\/actions\/runs\/(\d+)/)?.[1];
  const ranAt = status.context.ranAt ? shortUtc(status.context.ranAt) : null;
  const attributes: ({ name: string; value: string } | null)[] = [
    { name: "Assertions", value: observed.length > 0 ? String(total) : "n/a" },
    unasserted > 0 ? { name: "Unasserted", value: `${unasserted} pass${unasserted === 1 ? "" : "es"}` } : null,
    status.context.branch ? { name: "Branch", value: status.context.branch } : null,
    status.context.commit ? { name: "Commit", value: status.context.commit.slice(0, 7) } : null,
    ranAt ? { name: "Ran at (UTC)", value: ranAt } : null,
    runId ? { name: "Run", value: `#${runId}` } : null,
  ];
  return attributes.filter((attribute): attribute is { name: string; value: string } => attribute !== null);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "31 Oct 18:40": fits the attribute column; null for a date it cannot read. */
function shortUtc(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

/** The attachment for one ticket's status: its summary line, the modal, and our identity fields. */
export function attachmentInput(status: TicketStatus) {
  return {
    issueId: status.ticket,
    title: status.resolved ? "Quality checks passed" : "Quality checks",
    subtitle: status.title,
    url: status.stableUrl,
    metadata: {
      // Rendered by Linear in the attachment's modal.
      title: status.title,
      messages: modalMessages(status),
      attributes: modalAttributes(status),
      // Ours: which status this is, for the one-status-per-scope rule.
      source: STATUS_SOURCE,
      scope: status.scope,
      run: status.runUrl,
      resolved: status.resolved,
    },
  };
}

/**
 * Of the statuses for one scope on one issue, the one every writer keeps: the
 * smallest id. Ids never change (an update keeps its id and URL), so every
 * writer that sees the same two statuses picks the same one.
 */
export function canonicalStatus(ids: readonly string[]): string | undefined {
  return [...ids].sort()[0];
}

/**
 * A web URL, or null. Only http and https: other schemes (javascript:, data:,
 * file:) have the opaque origin "null", which would compare equal to each other.
 */
function urlOf(value: string): URL | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  return url.protocol === "https:" || url.protocol === "http:" ? url : null;
}

/**
 * Does `candidate` fall under the trusted link `trusted`? Policy:
 * - same origin, and the same path or one beneath it (a trailing slash is
 *   ignored, and https://good.example never admits https://good.example.evil);
 * - every query parameter on the trusted link must be on the candidate with
 *   the same value; the candidate may carry more (ours, for instance).
 * So `https://app.example/requirements?project=abc` trusts that project's
 * links only. With `exact`, the path must be the trusted path itself.
 */
export function isUnderTrustedLink(candidate: URL, trusted: URL, options: { exact?: boolean } = {}): boolean {
  if (candidate.origin !== trusted.origin) return false;
  const path = candidate.pathname.replace(/\/$/, "");
  const trustedPath = trusted.pathname.replace(/\/$/, "");
  if (path !== trustedPath && (options.exact || !path.startsWith(`${trustedPath}/`))) return false;
  return [...trusted.searchParams].every(([name, value]) => candidate.searchParams.getAll(name).includes(value));
}

/**
 * Is this status one a trusted writer made? Anyone who can edit the issue can
 * add an attachment with our marker, so the marker is not enough: the link
 * must name this ticket and fall under a trusted link (our own, or one we
 * were told to trust). A lookalike is never adopted, updated or deleted, so
 * a live result is never lent to a link we did not make.
 */
export function isTrustedStatusUrl(
  url: string,
  ticket: string,
  ownStableUrl: string,
  trustedLinks: readonly string[] = [],
): boolean {
  const candidate = urlOf(url);
  if (!candidate || candidate.searchParams.get("executable-stories-ticket") !== ticket) return false;
  // Our own link (--link) matches its exact path, since we create statuses there and nowhere
  // beneath it; its query parameters stay requirements. --trust links admit paths beneath.
  const own = urlOf(ownStableUrl);
  own?.searchParams.delete("executable-stories-ticket");
  own?.searchParams.delete("executable-stories-scope");
  if (own && isUnderTrustedLink(candidate, own, { exact: true })) return true;
  const trusted = trustedLinks.map(urlOf).filter((link): link is URL => link !== null);
  return trusted.some((link) => isUnderTrustedLink(candidate, link));
}

/** How many times a post re-lists when the status it chose was removed by another writer. */
export const POST_ATTEMPTS = 3;

/**
 * Post the status as the issue's one status for its scope, whoever else posts.
 *
 * List this scope's trusted statuses; create ours only when there are none,
 * then list again. Update the canonical one (smallest id) in place and delete
 * the rest.
 *
 * Why this never leaves none: a writer deletes a status only after seeing one
 * with a smaller id, so the smallest id ever created in a race is deleted by
 * nobody, and updating a status never changes its id. Why it does not leave
 * two: whichever writer finishes last sees both and deletes the larger. No
 * timestamps are compared. If the status it chose was deleted by another
 * writer before the update, it lists again and updates the survivor, so a
 * concurrent publish still lands.
 *
 * The canonical status keeps the link it was created with (always a trusted
 * one); each post updates its title, subtitle and run.
 */
export async function postLinearStatus(options: LinearOptions, status: TicketStatus, deps: LinearDeps) {
  // SAFETY: attachmentInput builds only strings, booleans, numbers, null and plain objects/arrays of them.
  const input = attachmentInput(status) as unknown as Record<string, GraphqlValue>;
  const { issueId: _issueId, url: _url, ...content } = input;
  for (let attempt = 1; attempt <= POST_ATTEMPTS; attempt += 1) {
    let ids = await scopeStatusIds(options, status, deps);
    if (ids.length === 0) {
      const data = await linearRequest(
        options,
        "mutation($input: AttachmentCreateInput!) { attachmentCreate(input: $input) { success } }",
        { input },
        deps,
      );
      const created = data["attachmentCreate"];
      if (!isRecord(created) || created["success"] !== true) {
        throw new Error(`Linear did not attach the status to ${status.ticket}`);
      }
      ids = await scopeStatusIds(options, status, deps);
    }
    const canonical = canonicalStatus(ids);
    if (!canonical) continue;
    const updated = await linearRequest(
      options,
      "mutation($id: String!, $input: AttachmentUpdateInput!) { attachmentUpdate(id: $id, input: $input) { success } }",
      { id: canonical, input: content },
      deps,
    ).then(
      (data) => isRecord(data["attachmentUpdate"]) && data["attachmentUpdate"]["success"] === true,
      () => false,
    );
    if (!updated) {
      // Removed by another writer since we listed: list again and update the survivor.
      if (!(await scopeStatusIds(options, status, deps)).includes(canonical)) continue;
      throw new Error(`Linear did not update the status on ${status.ticket}`);
    }
    for (const id of ids.filter((each) => each !== canonical)) {
      await deleteStatus(options, status, id, deps);
    }
    return;
  }
  throw new Error(`Gave up posting to ${status.ticket}: other writers kept replacing its status`);
}

/** Ids of trusted status attachments on the issue for this scope. */
async function scopeStatusIds(options: LinearOptions, status: TicketStatus, deps: LinearDeps) {
  const data = await linearRequest(
    options,
    "query($id: String!) { issue(id: $id) { attachments { nodes { id url metadata } } } }",
    { id: status.ticket },
    deps,
  );
  const issue = data["issue"];
  const attachments = isRecord(issue) ? issue["attachments"] : undefined;
  const nodes = isRecord(attachments) && Array.isArray(attachments["nodes"]) ? attachments["nodes"] : [];
  return nodes.flatMap((node) => {
    if (!isRecord(node) || typeof node["id"] !== "string" || typeof node["url"] !== "string") return [];
    const metadata = node["metadata"];
    const sameScope =
      isRecord(metadata) && metadata["source"] === STATUS_SOURCE && metadata["scope"] === status.scope;
    const trusted = isTrustedStatusUrl(node["url"], status.ticket, status.stableUrl, options.trustedLinks);
    return sameScope && trusted ? [node["id"]] : [];
  });
}

/**
 * Delete a non-canonical status. Another writer deleting it first is the
 * outcome wanted; anything that leaves it in place fails the ticket, so it is
 * not reported as posted while two statuses remain.
 */
async function deleteStatus(options: LinearOptions, status: TicketStatus, id: string, deps: LinearDeps) {
  const deleted = await linearRequest(
    options,
    "mutation($id: String!) { attachmentDelete(id: $id) { success } }",
    { id },
    deps,
  ).then(
    (data) => isRecord(data["attachmentDelete"]) && data["attachmentDelete"]["success"] === true,
    () => false,
  );
  if (deleted) return;
  if ((await scopeStatusIds(options, status, deps)).includes(id)) {
    throw new Error(`Posted the status to ${status.ticket}, but Linear would not remove a duplicate (${id})`);
  }
}

/** A TrackerClient for the workspace the credentials belong to. */
export async function createLinearClient(options: LinearOptions, deps: LinearDeps): Promise<TrackerClient & { workspace: string }> {
  const workspace = await linearWorkspace(options, deps);
  return {
    name: "Linear",
    workspace: workspace.urlKey,
    owns: (ticket) => ownsTicket(workspace.urlKey, ticket),
    postStatus: (status) => postLinearStatus(options, status, deps),
  };
}
