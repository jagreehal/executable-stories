/**
 * Xray (Jira Cloud) adapter.
 *
 * Xray splits its API in two and this adapter has to speak both: a GraphQL API
 * for test definitions, and a REST endpoint for importing execution results.
 * Evidence rides along with the results as base64, so screenshots and video
 * land on the execution without a separate upload call.
 *
 * A case id here is a Jira issue key ("PROJ-42"), not a number, which is why
 * `ticketPrefixStrip: false` is the right engine setting for this provider.
 *
 * Auth: an Xray API key pair (client id + secret) from Jira Settings -> Apps ->
 * Xray -> API Keys. Updating an existing test's summary or description also
 * needs Jira credentials, because those are Jira fields Xray does not own.
 */

import type {
  AdapterDeps,
  CaseBody,
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

export interface XrayConfig {
  /** Jira site URL, e.g. https://acme.atlassian.net */
  jiraBaseUrl: string;
  projectKey: string;
  /** Xray Cloud API base. */
  xrayBaseUrl?: string;
  /** Selects the existing tests to reconcile against. */
  jql?: string;
  /** Xray test type for created tests. */
  testType?: string;
  /** Link created executions to this test plan. */
  testPlanKey?: string;
  /** Push results into an existing execution instead of creating one. */
  testExecutionKey?: string;
  /** Summary for created executions. A UTC timestamp is appended. */
  executionSummary?: string;
  statuses?: { passed?: string; failed?: string; skipped?: string };
  maxAttachmentBytes?: number;
}

export interface XrayAuth {
  clientId: string;
  clientSecret: string;
  /** Atlassian account email, needed only to update Jira summary/description. */
  jiraEmail?: string;
  /** Atlassian API token, needed only to update Jira summary/description. */
  jiraToken?: string;
}

const DEFAULT_XRAY_BASE = "https://xray.cloud.getxray.app";
const DEFAULT_TEST_TYPE = "Manual";
/** Xray embeds evidence as base64 in the results payload, so keep files modest. */
const DEFAULT_MAX_ATTACHMENT_BYTES = 32 * 1024 * 1024;
const PAGE_LIMIT = 100;

interface XrayStep {
  id: string;
  action?: string;
  data?: string;
  result?: string;
}

interface XrayTest {
  issueId: string;
  jira?: { key?: string; summary?: string; description?: unknown };
  steps?: XrayStep[];
}

/**
 * Jira Cloud stores descriptions as ADF, so plain text has to be wrapped going
 * out and flattened coming back. Only paragraphs are produced: the description
 * is generated from the test, so nothing is lost by keeping the markup flat.
 */
function toAdf(text: string): Record<string, unknown> {
  const paragraphs = text.split("\n\n").filter((block) => block.trim() !== "");
  return {
    version: 1,
    type: "doc",
    content:
      paragraphs.length === 0
        ? [{ type: "paragraph", content: [] }]
        : paragraphs.map((block) => ({
            type: "paragraph",
            content: [{ type: "text", text: block }],
          })),
  };
}

function fromAdf(value: unknown): string {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";

  const blocks: string[] = [];
  const walk = (node: unknown, collected: string[]): void => {
    if (!node || typeof node !== "object") return;
    const typed = node as { type?: string; text?: string; content?: unknown[] };
    if (typed.type === "text" && typeof typed.text === "string") collected.push(typed.text);
    for (const child of typed.content ?? []) walk(child, collected);
  };

  for (const node of ((value as { content?: unknown[] }).content ?? [])) {
    const collected: string[] = [];
    walk(node, collected);
    blocks.push(collected.join(""));
  }

  return blocks.join("\n\n").trim();
}

export function createXrayProvider(
  config: XrayConfig,
  auth: XrayAuth,
  deps: AdapterDeps,
): SyncProvider {
  const xrayBase = (config.xrayBaseUrl ?? DEFAULT_XRAY_BASE).replace(/\/$/, "");
  const jiraBase = config.jiraBaseUrl.replace(/\/$/, "");
  const jql = config.jql ?? `project = "${config.projectKey}" AND issuetype = Test`;
  /** Issue key -> Xray internal issue id, needed for step mutations. */
  const issueIds = new Map<string, string>();
  let token: string | undefined;

  async function authenticate(): Promise<string> {
    if (token) return token;
    const response = await deps.fetch(`${xrayBase}/api/v2/authenticate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: auth.clientId, client_secret: auth.clientSecret }),
    });
    const text = await response.text();
    if (!response.ok) {
      // The commonest cause is reaching for the wrong pair of credentials: Jira
      // API tokens and Xray API keys look alike and are not interchangeable.
      throw new Error(
        `Xray authentication failed (${response.status}): ${text}\n` +
          `  XRAY_CLIENT_ID and XRAY_CLIENT_SECRET come from Jira -> Apps -> Xray -> API Keys. A Jira API token is a different credential and is rejected here.`,
      );
    }
    // The endpoint answers with a quoted JSON string, not an object.
    token = (JSON.parse(text) as string).replace(/^"|"$/g, "");
    return token;
  }

  async function graphql(query: string, variables?: Record<string, unknown>): Promise<unknown> {
    const bearer = await authenticate();
    const response = await deps.fetch(`${xrayBase}/api/v2/graphql`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bearer}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    });

    const text = await response.text();
    if (!response.ok) throw new Error(`Xray GraphQL failed (${response.status}): ${text}`);

    const payload = JSON.parse(text) as { data?: unknown; errors?: Array<{ message: string }> };
    if (payload.errors?.length) {
      throw new Error(`Xray GraphQL error: ${payload.errors.map((e) => e.message).join("; ")}`);
    }
    return payload.data;
  }

  function issueUrl(key: string): string {
    return `${jiraBase}/browse/${key}`;
  }

  function toRemoteCase(test: XrayTest): RemoteCase {
    const key = test.jira?.key ?? test.issueId;
    if (!key) {
      // Named here rather than left to fail later inside the engine's hashing,
      // where the message would point at nothing.
      throw new Error(
        `Xray returned a test with neither a Jira key nor an issue id: ${JSON.stringify(test)?.slice(0, 200)}`,
      );
    }
    if (test.jira?.key) issueIds.set(test.jira.key, test.issueId);

    const { description, links } = decodeDescription(fromAdf(test.jira?.description));

    return {
      id: key,
      url: issueUrl(key),
      title: test.jira?.summary ?? key,
      body: {
        title: test.jira?.summary ?? key,
        steps: (test.steps ?? []).map((step) => decodeStepText(step.action ?? "")),
        description,
        links,
      },
    };
  }

  async function jiraUpdate(key: string, fields: Record<string, unknown>): Promise<void> {
    if (!auth.jiraEmail || !auth.jiraToken) {
      deps.logger.warn(
        `Xray: summary/description for ${key} left unchanged. Set JIRA_EMAIL and JIRA_TOKEN to update Jira fields (steps are updated either way).`,
      );
      return;
    }
    const basic = Buffer.from(`${auth.jiraEmail}:${auth.jiraToken}`).toString("base64");
    const response = await deps.fetch(`${jiraBase}/rest/api/3/issue/${key}`, {
      method: "PUT",
      headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    });
    if (!response.ok) {
      throw new Error(`Jira update of ${key} failed (${response.status}): ${await response.text()}`);
    }
  }

  return {
    name: "xray",
    maxAttachmentBytes: config.maxAttachmentBytes ?? DEFAULT_MAX_ATTACHMENT_BYTES,

    describeTarget() {
      return `${config.projectKey} (${jiraBase})`;
    },

    async listCases() {
      const tests: XrayTest[] = [];
      for (let start = 0; ; start += PAGE_LIMIT) {
        const data = (await graphql(
          `query($jql: String!, $limit: Int!, $start: Int!) {
             getTests(jql: $jql, limit: $limit, start: $start) {
               total
               results {
                 issueId
                 jira(fields: ["key", "summary", "description"])
                 steps { id action data result }
               }
             }
           }`,
          { jql, limit: PAGE_LIMIT, start },
        )) as { getTests?: { total?: number; results?: XrayTest[] } };

        const page = data.getTests?.results ?? [];
        tests.push(...page);
        if (page.length < PAGE_LIMIT) break;
      }

      return tests.map(toRemoteCase);
    },

    async createCase(body) {
      const data = (await graphql(
        `mutation($testType: UpdateTestTypeInput!, $steps: [CreateStepInput], $jira: JSON!) {
           createTest(testType: $testType, steps: $steps, jira: $jira) {
             test { issueId jira(fields: ["key", "summary", "description"]) }
             warnings
           }
         }`,
        {
          testType: { name: config.testType ?? DEFAULT_TEST_TYPE },
          steps: body.steps.map((step) => ({ action: encodeStepText(step), result: "" })),
          jira: {
            fields: {
              summary: body.title,
              description: toAdf(encodeDescription(body)),
              project: { key: config.projectKey },
            },
          },
        },
      )) as { createTest?: { test?: XrayTest; warnings?: string[] } };

      const created = data.createTest?.test;
      if (!created) throw new Error(`Xray createTest returned no test for "${body.title}"`);
      for (const warning of data.createTest?.warnings ?? []) deps.logger.warn(`Xray: ${warning}`);

      return toRemoteCase(created);
    },

    async updateCase(id, body) {
      const issueId = issueIds.get(id);
      if (!issueId) {
        throw new Error(`Xray: no internal issue id cached for ${id}. Run listCases first.`);
      }

      // Xray has no "replace all steps" mutation, and these calls are neither
      // batched nor transactional, so reconcile position by position rather than
      // clearing and rebuilding: overwrite the steps that already exist, append
      // what is new, remove only the surplus.
      //
      // That matters because a failure part-way through is a question of which
      // half-written state the test is left in. Rebuilding leaves the case with
      // no steps at all if the run dies between the deletes and the adds. This
      // way every prefix is a correct prefix, and a rerun finishes the job.
      const current = (await graphql(
        `query($issueId: String!) { getTest(issueId: $issueId) { steps { id } } }`,
        { issueId },
      )) as { getTest?: { steps?: Array<{ id: string }> } };
      const existing = current.getTest?.steps ?? [];

      for (const [index, step] of body.steps.entries()) {
        const action = encodeStepText(step);
        const target = existing[index];
        if (target) {
          await graphql(
            `mutation($stepId: String!, $step: UpdateStepInput!) {
               updateTestStep(stepId: $stepId, step: $step)
             }`,
            { stepId: target.id, step: { action, result: "" } },
          );
        } else {
          await graphql(
            `mutation($issueId: String!, $step: CreateStepInput!) {
               addTestStep(issueId: $issueId, step: $step) { id }
             }`,
            { issueId, step: { action, result: "" } },
          );
        }
      }

      // Trailing steps the story no longer has. Removed last, and back to front,
      // so an interrupted run never renumbers a step it has yet to visit.
      for (const surplus of existing.slice(body.steps.length).reverse()) {
        await graphql(`mutation($stepId: String!) { removeTestStep(stepId: $stepId) }`, {
          stepId: surplus.id,
        });
      }

      await jiraUpdate(id, {
        summary: body.title,
        description: toAdf(encodeDescription(body)),
      });

      return {
        id,
        url: issueUrl(id),
        title: body.title,
        body,
      };
    },

    async recordResults(results): Promise<RecordResultsSummary> {
      const statuses = {
        passed: config.statuses?.passed ?? "PASSED",
        failed: config.statuses?.failed ?? "FAILED",
        skipped: config.statuses?.skipped ?? "TODO",
      };

      let attachmentsUploaded = 0;
      const tests = results.map((result) => {
        const evidence = (result.attachments ?? []).map((attachment) => {
          attachmentsUploaded += 1;
          return {
            data: Buffer.from(attachment.body).toString("base64"),
            filename: attachment.filename,
            contentType: attachment.mediaType,
          };
        });

        const comment = [result.message, result.url ? `Living documentation: ${result.url}` : undefined]
          .filter(Boolean)
          .join("\n\n");

        return {
          testKey: result.caseId,
          status: statuses[result.status],
          ...(comment ? { comment } : {}),
          ...(evidence.length > 0 ? { evidence } : {}),
        };
      });

      const bearer = await authenticate();
      const payload = {
        ...(config.testExecutionKey ? { testExecutionKey: config.testExecutionKey } : {}),
        info: {
          summary: `${config.executionSummary ?? "executable-stories"} ${new Date().toISOString()}`,
          project: config.projectKey,
          ...(config.testPlanKey ? { testPlanKey: config.testPlanKey } : {}),
        },
        tests,
      };

      const response = await deps.fetch(`${xrayBase}/api/v2/import/execution`, {
        method: "POST",
        headers: { Authorization: `Bearer ${bearer}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await response.text();
      if (!response.ok) {
        throw new Error(`Xray import execution failed (${response.status}): ${text}`);
      }

      const imported = JSON.parse(text) as { id?: string; key?: string };
      return {
        runId: imported.key,
        runUrl: imported.key ? issueUrl(imported.key) : undefined,
        recorded: tests.length,
        skipped: [],
        attachmentsUploaded,
      };
    },
  };
}
