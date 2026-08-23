/**
 * Jira publisher.
 *
 * Pushes an ADF JSON document to a Jira Cloud issue via the REST API v3.
 * - mode "comment"     adds the ADF as a new comment (default, non-destructive)
 * - mode "description" replaces the issue description field with the ADF
 *
 * Authentication: Basic auth with an Atlassian email + API token (same token
 * system as Confluence — create one at id.atlassian.com).
 *
 * Note: unlike Confluence v2 (which expects the ADF as a stringified value),
 * Jira v3 accepts ADF as a native JSON object in the request body.
 */

import type { FetchFn, ConfluenceAuth } from "./confluence";

/** Reuses the same auth + fetch shape as the Confluence publisher */
export type JiraAuth = ConfluenceAuth;

/** Update mode — default "comment" is non-destructive and append-only */
export type JiraPublishMode = "comment" | "description";

export interface PublishJiraArgs {
  /** ADF document JSON string (the `{ version, type: "doc", content }` envelope) */
  adf: string;
  /** Issue key, e.g. "PROJ-123" */
  issueKey: string;
  /** Base URL of the Jira instance, e.g. https://acme.atlassian.net */
  baseUrl: string;
  /** Defaults to "comment" */
  mode?: JiraPublishMode;
}

export interface PublishJiraDeps {
  auth: JiraAuth;
  /** Defaults to globalThis.fetch */
  fetch?: FetchFn;
}

export interface PublishJiraResult {
  issueKey: string;
  action: "description-updated" | "comment-added";
  /** Canonical URL to view the issue (and comment, if applicable) */
  url: string;
  /** Set only when mode = "comment" */
  commentId?: string;
}

/** Parse ADF and return the object (Jira accepts the full JSON object, not a string). */
function parseAdf(adf: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(adf);
  } catch (err) {
    throw new Error(`ADF payload is not valid JSON: ${(err as Error).message}`, {
      cause: err,
    });
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    (parsed as { type?: unknown }).type !== "doc" ||
    !Array.isArray((parsed as { content?: unknown }).content)
  ) {
    throw new Error(
      `ADF payload must be an object with { version, type: "doc", content: [...] }`,
    );
  }
  return parsed as Record<string, unknown>;
}

function basicAuthHeader(auth: JiraAuth): string {
  const raw = `${auth.email}:${auth.token}`;
  const encoded =
    typeof Buffer !== "undefined"
      ? Buffer.from(raw, "utf8").toString("base64")
      : btoa(raw);
  return `Basic ${encoded}`;
}

async function parseErrorBody(resp: {
  text(): Promise<string>;
}): Promise<string> {
  try {
    const body = await resp.text();
    return body ? body.slice(0, 800) : "";
  } catch {
    return "";
  }
}

/**
 * Publish an ADF document to a Jira issue. Defaults to adding a new comment.
 * Use mode: "description" to replace the issue's description field.
 */
export async function publishJiraIssue(
  args: PublishJiraArgs,
  deps: PublishJiraDeps,
): Promise<PublishJiraResult> {
  const adfObject = parseAdf(args.adf);
  if (!args.issueKey) {
    throw new Error("publishJiraIssue requires an issueKey, e.g. PROJ-123");
  }

  const base = args.baseUrl.replace(/\/$/, "");
  const fetchFn: FetchFn = deps.fetch ?? (globalThis.fetch as unknown as FetchFn);
  if (!fetchFn) {
    throw new Error("No fetch implementation available (Node >= 22 expected)");
  }

  const headers = {
    Authorization: basicAuthHeader(deps.auth),
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  const mode = args.mode ?? "comment";
  if (mode === "description") {
    return updateDescription(args.issueKey, base, adfObject, headers, fetchFn);
  }
  return addComment(args.issueKey, base, adfObject, headers, fetchFn);
}

async function addComment(
  issueKey: string,
  base: string,
  adf: Record<string, unknown>,
  headers: Record<string, string>,
  fetchFn: FetchFn,
): Promise<PublishJiraResult> {
  const url = `${base}/rest/api/3/issue/${encodeURIComponent(issueKey)}/comment`;
  const resp = await fetchFn(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ body: adf }),
  });
  if (!resp.ok) {
    const body = await parseErrorBody(resp);
    throw new Error(
      `POST ${url} failed with ${resp.status} ${resp.statusText}${body ? `: ${body}` : ""}`,
    );
  }
  const comment = (await resp.json()) as { id: string };
  const issueUrl = `${base}/browse/${encodeURIComponent(issueKey)}`;
  return {
    issueKey,
    action: "comment-added",
    url: `${issueUrl}?focusedCommentId=${encodeURIComponent(comment.id)}`,
    commentId: comment.id,
  };
}

async function updateDescription(
  issueKey: string,
  base: string,
  adf: Record<string, unknown>,
  headers: Record<string, string>,
  fetchFn: FetchFn,
): Promise<PublishJiraResult> {
  const url = `${base}/rest/api/3/issue/${encodeURIComponent(issueKey)}`;
  const resp = await fetchFn(url, {
    method: "PUT",
    headers,
    body: JSON.stringify({ fields: { description: adf } }),
  });
  // Jira returns 204 No Content on a successful PUT.
  if (!resp.ok) {
    const body = await parseErrorBody(resp);
    throw new Error(
      `PUT ${url} failed with ${resp.status} ${resp.statusText}${body ? `: ${body}` : ""}`,
    );
  }
  return {
    issueKey,
    action: "description-updated",
    url: `${base}/browse/${encodeURIComponent(issueKey)}`,
  };
}
