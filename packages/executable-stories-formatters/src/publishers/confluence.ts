/**
 * Confluence publisher.
 *
 * Pushes an ADF JSON document to a Confluence Cloud page via the REST API v2.
 * - If `pageId` is provided, the page is updated in place (title + body + version).
 * - If `spaceId` is provided instead, a new page is created (optionally under `parentId`).
 *
 * Authentication: Basic auth with an Atlassian email + API token.
 * Generate tokens at https://id.atlassian.com/manage-profile/security/api-tokens.
 */

/** HTTP fetch function (injectable for tests). Matches global fetch signature. */
export type FetchFn = (
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body?: string;
  },
) => Promise<{
  ok: boolean;
  status: number;
  statusText: string;
  text(): Promise<string>;
  json(): Promise<unknown>;
}>;

export interface ConfluenceAuth {
  /** Atlassian account email */
  email: string;
  /** Atlassian API token */
  token: string;
}

export interface PublishConfluenceArgs {
  /** ADF document JSON string (the `{ version, type: "doc", content }` envelope) */
  adf: string;
  /** Page ID to update (mutually exclusive with spaceId for create) */
  pageId?: string;
  /** Space ID required when creating a new page */
  spaceId?: string;
  /** Parent page ID (optional, for new pages) */
  parentId?: string;
  /** Page title. Required for create; updates existing title if provided on update */
  title?: string;
  /** Base URL of the Confluence instance, e.g. https://acme.atlassian.net/wiki */
  baseUrl: string;
}

export interface PublishConfluenceDeps {
  auth: ConfluenceAuth;
  /** Defaults to globalThis.fetch */
  fetch?: FetchFn;
}

export interface PublishConfluenceResult {
  id: string;
  version: number;
  title: string;
  /** Canonical URL to view the page in Confluence */
  url: string;
  action: "created" | "updated";
}

/**
 * Validate that the supplied string parses to a valid ADF document envelope.
 * Returns the parsed object, or throws with a descriptive error.
 */
function parseAdf(adf: string): {
  version: number;
  type: string;
  content: unknown[];
} {
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
  return parsed as { version: number; type: string; content: unknown[] };
}

function basicAuthHeader(auth: ConfluenceAuth): string {
  const raw = `${auth.email}:${auth.token}`;
  const encoded =
    typeof Buffer !== "undefined"
      ? Buffer.from(raw, "utf8").toString("base64")
      : btoa(raw);
  return `Basic ${encoded}`;
}

async function parseErrorBody(
  response: { text(): Promise<string> },
): Promise<string> {
  try {
    const body = await response.text();
    return body ? body.slice(0, 800) : "";
  } catch {
    return "";
  }
}

/**
 * Publish an ADF document to Confluence. Creates a new page if `pageId` is
 * omitted, otherwise updates the existing page.
 */
export async function publishConfluencePage(
  args: PublishConfluenceArgs,
  deps: PublishConfluenceDeps,
): Promise<PublishConfluenceResult> {
  // Validate ADF up front so we fail fast with a clear message.
  parseAdf(args.adf);

  if (!args.pageId && !args.spaceId) {
    throw new Error(
      "publishConfluencePage requires either pageId (update) or spaceId (create)",
    );
  }
  if (!args.pageId && !args.title) {
    throw new Error("Creating a new page requires a title");
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

  if (args.pageId) {
    return updatePage(args, base, headers, fetchFn);
  }
  return createPage(args, base, headers, fetchFn);
}

async function updatePage(
  args: PublishConfluenceArgs,
  base: string,
  headers: Record<string, string>,
  fetchFn: FetchFn,
): Promise<PublishConfluenceResult> {
  // Look up current page to get version and default title.
  const getUrl = `${base}/api/v2/pages/${encodeURIComponent(args.pageId!)}`;
  const getResp = await fetchFn(getUrl, { method: "GET", headers });
  if (!getResp.ok) {
    const body = await parseErrorBody(getResp);
    throw new Error(
      `GET ${getUrl} failed with ${getResp.status} ${getResp.statusText}${body ? `: ${body}` : ""}`,
    );
  }
  const current = (await getResp.json()) as {
    id: string;
    title: string;
    version: { number: number };
    _links?: { webui?: string; base?: string };
  };
  const nextVersion = current.version.number + 1;
  const title = args.title ?? current.title;

  const putUrl = `${base}/api/v2/pages/${encodeURIComponent(args.pageId!)}`;
  const putResp = await fetchFn(putUrl, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      id: args.pageId,
      status: "current",
      title,
      body: {
        representation: "atlas_doc_format",
        value: args.adf,
      },
      version: { number: nextVersion },
    }),
  });
  if (!putResp.ok) {
    const body = await parseErrorBody(putResp);
    throw new Error(
      `PUT ${putUrl} failed with ${putResp.status} ${putResp.statusText}${body ? `: ${body}` : ""}`,
    );
  }
  const updated = (await putResp.json()) as {
    id: string;
    title: string;
    version: { number: number };
    _links?: { webui?: string; base?: string };
  };

  return {
    id: updated.id,
    title: updated.title,
    version: updated.version.number,
    url: buildPageUrl(base, updated._links?.webui, updated.id),
    action: "updated",
  };
}

async function createPage(
  args: PublishConfluenceArgs,
  base: string,
  headers: Record<string, string>,
  fetchFn: FetchFn,
): Promise<PublishConfluenceResult> {
  const body: Record<string, unknown> = {
    spaceId: args.spaceId,
    status: "current",
    title: args.title,
    body: {
      representation: "atlas_doc_format",
      value: args.adf,
    },
  };
  if (args.parentId) body.parentId = args.parentId;

  const postUrl = `${base}/api/v2/pages`;
  const resp = await fetchFn(postUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const errBody = await parseErrorBody(resp);
    throw new Error(
      `POST ${postUrl} failed with ${resp.status} ${resp.statusText}${errBody ? `: ${errBody}` : ""}`,
    );
  }
  const created = (await resp.json()) as {
    id: string;
    title: string;
    version: { number: number };
    _links?: { webui?: string; base?: string };
  };

  return {
    id: created.id,
    title: created.title,
    version: created.version.number,
    url: buildPageUrl(base, created._links?.webui, created.id),
    action: "created",
  };
}

function buildPageUrl(base: string, webui: string | undefined, id: string): string {
  if (webui) {
    return webui.startsWith("http") ? webui : `${base}${webui}`;
  }
  return `${base}/pages/${id}`;
}
