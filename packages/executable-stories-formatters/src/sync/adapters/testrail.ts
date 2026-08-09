/**
 * TestRail adapter.
 *
 * Translates between the sync port and TestRail's API v2. All decisions about
 * what to write live in the engine; this file only knows how TestRail spells
 * things.
 *
 * Case templates differ per instance, which is why the step and description
 * field names are configurable. The defaults match TestRail's stock
 * "Test Case (Steps)" template.
 *
 * Auth: basic, with an API key rather than a password. Generate one under
 * My Settings -> API Keys.
 */

import type {
  AdapterDeps,
  CaseBody,
  CaseResult,
  RecordResultsSummary,
  RemoteCase,
  SyncProvider,
} from "../port";
import {
  decodeDescription,
  decodeStepText,
  encodeDescription,
  encodeStepText,
} from "./case-text";

export interface TestRailConfig {
  /** Instance URL, e.g. https://acme.testrail.io */
  url: string;
  projectId: number | string;
  /** Required on multi-suite projects. */
  suiteId?: number | string;
  /** Target section for created cases. Without it, creation is refused. */
  sectionId?: number | string;
  /** Reuse an existing run instead of creating one per sync. */
  runId?: number | string;
  /** Name for created runs. A UTC timestamp is appended. */
  runName?: string;
  /** Close the run after recording results. */
  closeRun?: boolean;
  /** Case template to create against, when the project uses a non-default one. */
  templateId?: number;
  /**
   * Result status ids. TestRail ships 1=Passed and 5=Failed; there is no stock
   * "skipped", so skipped results are dropped unless an id is configured.
   */
  statusIds?: { passed?: number; failed?: number; skipped?: number };
  /** Field names, for instances with customised case templates. */
  fields?: { steps?: string; description?: string };
  /**
   * Per-file attachment limit. Conservative by default: instances have storage
   * quotas, and a surprise 200 MB of video is a support ticket.
   */
  maxAttachmentBytes?: number;
}

export interface TestRailAuth {
  username: string;
  apiKey: string;
}

const DEFAULT_STEPS_FIELD = "custom_steps_separated";
const DEFAULT_DESCRIPTION_FIELD = "custom_preconds";
const DEFAULT_MAX_ATTACHMENT_BYTES = 64 * 1024 * 1024;
const PAGE_LIMIT = 250;
/** Attempts per request before a 429 becomes an error. */
const MAX_ATTEMPTS = 3;

interface TestRailCase {
  id: number;
  title: string;
  section_id?: number;
  [field: string]: unknown;
}

interface TestRailStep {
  content?: string;
  expected?: string;
}

/** `{ cases: [...] }` on current TestRail, a bare array on older instances. */
function unwrapList<T>(payload: unknown, key: string): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const list = (payload as Record<string, unknown>)[key];
    if (Array.isArray(list)) return list as T[];
  }
  return [];
}

/** TestRail rejects an elapsed under one second, and "0s" outright. */
function encodeElapsed(durationMs: number): string | undefined {
  const seconds = Math.floor(durationMs / 1000);
  if (seconds < 1) return undefined;
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest === 0 ? `${minutes}m` : `${minutes}m ${rest}s`;
}

/**
 * Turn the two failures every first run hits into something actionable.
 *
 * A bare "401: Authentication failed" sends people to check the password they
 * already checked. The real causes are narrow and worth naming: TestRail
 * rejects passwords outright once an instance enforces API keys, and the API
 * itself is off by default until an admin enables it.
 */
function authHint(status: number): string {
  if (status === 401) {
    return "\n  TESTRAIL_USERNAME must be the login email and TESTRAIL_API_KEY an API key from My Settings -> API Keys. A password fails here when the instance enforces API keys.";
  }
  if (status === 403) {
    return "\n  The credentials were accepted but the request was refused. Usually the API is disabled: an admin enables it under Administration -> Site Settings -> API.";
  }
  return "";
}

export function createTestRailProvider(
  config: TestRailConfig,
  auth: TestRailAuth,
  deps: AdapterDeps,
): SyncProvider {
  const base = config.url.replace(/\/$/, "");
  const stepsField = config.fields?.steps ?? DEFAULT_STEPS_FIELD;
  const descriptionField = config.fields?.description ?? DEFAULT_DESCRIPTION_FIELD;
  const basicAuth = Buffer.from(`${auth.username}:${auth.apiKey}`).toString("base64");

  let projectName: string | undefined;
  let suiteName: string | undefined;
  const sectionNames = new Map<number, string>();

  async function api(method: string, init?: { body?: unknown; form?: FormData }): Promise<unknown> {
    const url = `${base}/index.php?/api/v2/${method}`;
    const headers: Record<string, string> = {
      Authorization: `Basic ${basicAuth}`,
    };
    // Spelled out rather than `BodyInit`: that name only exists when the DOM lib
    // is loaded, and this source is type-checked by packages that do not load it.
    let body: string | FormData | undefined;

    if (init?.form) {
      // Let fetch set the multipart boundary.
      body = init.form;
    } else if (init?.body !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(init.body);
    }

    // TestRail rate-limits hard on cloud plans and answers 429 with Retry-After.
    // Three attempts, honouring the header rather than backing off blindly: the
    // server states how long it wants, and a per-run sync never needs more.
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const response = await deps.fetch(url, {
        method: body === undefined ? "GET" : "POST",
        headers,
        body,
      });

      if (response.status === 429 && attempt < MAX_ATTEMPTS - 1) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "1");
        deps.logger.warn(`TestRail rate limit hit, retrying in ${retryAfter}s`);
        await new Promise((resolve) => setTimeout(resolve, Math.max(1, retryAfter) * 1000));
        continue;
      }

      const text = await response.text();
      if (text.length === 0) {
        if (response.ok) return undefined;
        throw new Error(
          `TestRail ${method} failed (${response.status}) with an empty response${authHint(response.status)}`,
        );
      }

      // Parse before branching on `ok`. A misconfigured `url` gets a login page
      // back with a 200, so checking the status first would leave the real
      // failure to surface as "Unexpected token '<'" further down.
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error(
          `TestRail ${method} returned HTML rather than JSON (status ${response.status}).\n` +
            `  Check that sync.testrail.url is the instance root, e.g. https://acme.testrail.io, with no path after it.`,
        );
      }

      if (!response.ok) {
        const detail = (parsed as { error?: string }).error ?? text;
        throw new Error(
          `TestRail ${method} failed (${response.status}): ${detail}${authHint(response.status)}`,
        );
      }

      return parsed;
    }

    throw new Error(`TestRail ${method} failed: rate limited after ${MAX_ATTEMPTS} attempts`);
  }

  /** Walk TestRail's offset pagination. */
  async function paginate<T>(method: string, key: string): Promise<T[]> {
    const all: T[] = [];
    for (let offset = 0; ; offset += PAGE_LIMIT) {
      // The base URL already carries the "?", so every parameter appends with "&".
      const page = await api(`${method}&limit=${PAGE_LIMIT}&offset=${offset}`);
      const items = unwrapList<T>(page, key);
      all.push(...items);
      if (items.length < PAGE_LIMIT) return all;
    }
  }

  function caseUrl(id: number | string): string {
    return `${base}/index.php?/cases/view/${id}`;
  }

  /**
   * @param context The call this case came back from, named in the error when
   * the response is not a case at all. Without it a partial response fails much
   * later as a TypeError from inside the hashing, pointing at nothing useful.
   */
  function toRemoteCase(raw: TestRailCase, context: string): RemoteCase {
    if (raw?.id === undefined) {
      throw new Error(
        `TestRail ${context} returned no case id. The response was: ${JSON.stringify(raw)?.slice(0, 200)}`,
      );
    }
    const title = typeof raw.title === "string" ? raw.title : "";
    const steps = Array.isArray(raw[stepsField]) ? (raw[stepsField] as TestRailStep[]) : [];
    const rawDescription = typeof raw[descriptionField] === "string" ? (raw[descriptionField] as string) : "";
    const { description, links } = decodeDescription(rawDescription);

    return {
      id: String(raw.id),
      url: caseUrl(raw.id),
      title,
      section: raw.section_id === undefined ? undefined : sectionNames.get(raw.section_id),
      body: {
        title,
        steps: steps.map((step) => decodeStepText(step.content ?? "")),
        description,
        links,
      },
    };
  }

  function bodyToPayload(body: CaseBody): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      title: body.title,
      [stepsField]: body.steps.map((step) => ({ content: encodeStepText(step), expected: "" })),
      [descriptionField]: encodeDescription(body),
    };
    if (config.templateId !== undefined) payload["template_id"] = config.templateId;
    return payload;
  }

  const suiteQuery = config.suiteId === undefined ? "" : `&suite_id=${config.suiteId}`;

  return {
    name: "testrail",
    maxAttachmentBytes: config.maxAttachmentBytes ?? DEFAULT_MAX_ATTACHMENT_BYTES,

    describeTarget() {
      const project = projectName ?? `project ${config.projectId}`;
      const suite = suiteName ?? (config.suiteId === undefined ? undefined : `suite ${config.suiteId}`);
      return suite ? `${project} / ${suite}` : project;
    },

    async listCases() {
      // Names are cosmetic (plan header, section breakdown), so a permissions
      // failure here must not sink the whole read.
      try {
        const project = (await api(`get_project/${config.projectId}`)) as { name?: string } | undefined;
        projectName = project?.name;
        if (config.suiteId !== undefined) {
          const suite = (await api(`get_suite/${config.suiteId}`)) as { name?: string } | undefined;
          suiteName = suite?.name;
        }
        const sections = await paginate<{ id: number; name: string }>(
          `get_sections/${config.projectId}${suiteQuery}`,
          "sections",
        );
        for (const section of sections) sectionNames.set(section.id, section.name);
      } catch (err) {
        deps.logger.warn(`TestRail metadata lookup failed, continuing without names: ${(err as Error).message}`);
      }

      const cases = await paginate<TestRailCase>(`get_cases/${config.projectId}${suiteQuery}`, "cases");
      return cases.map((raw) => toRemoteCase(raw, "get_cases"));
    },

    async createCase(body) {
      if (config.sectionId === undefined) {
        throw new Error(
          "TestRail needs a sectionId to create cases. Set sync.testrail.sectionId to the section new cases should land in.",
        );
      }
      const created = (await api(`add_case/${config.sectionId}`, {
        body: bodyToPayload(body),
      })) as TestRailCase;
      return toRemoteCase(created, `add_case/${config.sectionId}`);
    },

    async updateCase(id, body) {
      const updated = (await api(`update_case/${id}`, { body: bodyToPayload(body) })) as TestRailCase;
      return toRemoteCase(updated, `update_case/${id}`);
    },

    async recordResults(results): Promise<RecordResultsSummary> {
      const statusIds = {
        passed: config.statusIds?.passed ?? 1,
        failed: config.statusIds?.failed ?? 5,
        skipped: config.statusIds?.skipped,
      };

      const skipped: RecordResultsSummary["skipped"] = [];
      const sendable: Array<{ result: CaseResult; caseId: number; statusId: number }> = [];

      for (const result of results) {
        const caseId = Number(result.caseId);
        if (!Number.isFinite(caseId)) {
          skipped.push({ caseId: result.caseId, reason: "case id is not numeric" });
          continue;
        }
        const statusId = result.status === "skipped" ? statusIds.skipped : statusIds[result.status];
        if (statusId === undefined) {
          skipped.push({
            caseId: result.caseId,
            reason: "no TestRail status id configured for skipped (set sync.testrail.statusIds.skipped)",
          });
          continue;
        }
        sendable.push({ result, caseId, statusId });
      }

      if (sendable.length === 0) {
        return { recorded: 0, skipped, attachmentsUploaded: 0 };
      }

      let runId = config.runId;
      if (runId === undefined) {
        const name = `${config.runName ?? "executable-stories"} ${new Date().toISOString()}`;
        const run = (await api(`add_run/${config.projectId}`, {
          body: {
            ...(config.suiteId === undefined ? {} : { suite_id: config.suiteId }),
            name,
            include_all: false,
            // Deduplicated: two stories can carry the same ticket id, and
            // TestRail rejects a run whose case list repeats one.
            case_ids: [...new Set(sendable.map((s) => s.caseId))],
          },
        })) as { id: number };
        runId = run.id;
      }
      const runUrl = `${base}/index.php?/runs/view/${runId}`;

      const payload = sendable.map(({ result, caseId, statusId }) => {
        const elapsed = encodeElapsed(result.durationMs);
        const comment = [result.message, result.url ? `Living documentation: ${result.url}` : undefined]
          .filter(Boolean)
          .join("\n\n");
        return {
          case_id: caseId,
          status_id: statusId,
          ...(comment ? { comment } : {}),
          ...(elapsed ? { elapsed } : {}),
        };
      });

      const recorded = unwrapList<{ id: number; case_id: number }>(
        await api(`add_results_for_cases/${runId}`, { body: { results: payload } }),
        "results",
      );

      // TestRail answers in submission order, so pair positionally rather than
      // trusting case_id, which repeats when a case appears twice in a run.
      let attachmentsUploaded = 0;
      for (const [index, entry] of recorded.entries()) {
        const source = sendable[index]?.result;
        for (const attachment of source?.attachments ?? []) {
          try {
            const form = new FormData();
            // Handed to Blob as a plain ArrayBuffer. `BlobPart` only exists with
            // the DOM lib loaded, and a Uint8Array view is not assignable to it
            // under this TypeScript version, so neither name works across every
            // package that type-checks this source.
            const bytes = attachment.body.buffer.slice(
              attachment.body.byteOffset,
              attachment.body.byteOffset + attachment.body.byteLength,
            ) as ArrayBuffer;
            form.append(
              "attachment",
              new Blob([bytes], { type: attachment.mediaType }),
              attachment.filename,
            );
            await api(`add_attachment_to_result/${entry.id}`, { form });
            attachmentsUploaded += 1;
          } catch (err) {
            // Evidence is additive. A rejected upload must not lose the result
            // that was already recorded.
            deps.logger.warn(
              `TestRail attachment "${attachment.filename}" failed: ${(err as Error).message}`,
            );
          }
        }
      }

      if (config.closeRun && config.runId === undefined) {
        await api(`close_run/${runId}`, { body: {} });
      }

      return {
        runId: String(runId),
        runUrl,
        recorded: recorded.length,
        skipped,
        attachmentsUploaded,
      };
    },
  };
}
