import { describe, it, expect } from "vitest";

import { createXrayProvider } from "../../src/sync/adapters/xray";
import { hashCaseBody } from "../../src/sync/lockfile";
import { makeBody, silentLogger } from "./helpers";

const config = { jiraBaseUrl: "https://acme.atlassian.net", projectKey: "PROJ" };
const auth = { clientId: "id", clientSecret: "secret" };

function adf(text: string) {
  return {
    version: 1,
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}

/** Collects every GraphQL body sent, and answers each route by substring. */
function xrayFetch(handlers: Array<{ match: string; body: unknown; status?: number }>) {
  const sent: Array<{ url: string; body: unknown }> = [];

  const fetchFn = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const parsed = init?.body ? JSON.parse(String(init.body)) : undefined;
    sent.push({ url, body: parsed });

    if (url.includes("/authenticate")) {
      return new Response(JSON.stringify("jwt-token"), { status: 200 });
    }

    const handler = handlers.find((candidate) =>
      url.includes("/graphql")
        ? String((parsed as { query?: string })?.query ?? "").includes(candidate.match)
        : url.includes(candidate.match),
    );
    if (!handler) return new Response(JSON.stringify({ data: {} }), { status: 200 });

    return new Response(JSON.stringify(handler.body), { status: handler.status ?? 200 });
  }) as typeof globalThis.fetch;

  return { fetch: fetchFn, sent };
}

describe("Xray adapter", () => {
  it("authenticates once and reuses the bearer token", async () => {
    const { fetch, sent } = xrayFetch([
      { match: "getTests", body: { data: { getTests: { results: [] } } } },
    ]);

    const provider = createXrayProvider(config, auth, { fetch, logger: silentLogger });
    await provider.listCases();
    await provider.listCases();

    expect(sent.filter((call) => call.url.includes("/authenticate"))).toHaveLength(1);
  });

  it("maps a Jira issue key to the case id and flattens the ADF description", async () => {
    const { fetch } = xrayFetch([
      {
        match: "getTests",
        body: {
          data: {
            getTests: {
              results: [
                {
                  issueId: "10001",
                  jira: { key: "PROJ-42", summary: "User signs in", description: adf("Some context") },
                  steps: [{ id: "s1", action: "Given a registered user" }],
                },
              ],
            },
          },
        },
      },
    ]);

    const cases = await createXrayProvider(config, auth, { fetch, logger: silentLogger }).listCases();

    expect(cases[0]).toMatchObject({
      id: "PROJ-42",
      url: "https://acme.atlassian.net/browse/PROJ-42",
      title: "User signs in",
    });
    expect(cases[0]!.body).toMatchObject({
      description: "Some context",
      steps: [{ keyword: "Given", text: "a registered user" }],
    });
  });

  it("round-trips a body so the drift guard does not fire on our own writes", async () => {
    const body = makeBody({
      description: "Some context",
      links: [{ label: "Living documentation", url: "https://docs/story" }],
    });

    const fetchFn = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/authenticate")) return new Response(JSON.stringify("jwt"), { status: 200 });

      const parsed = JSON.parse(String(init?.body)) as {
        variables?: { jira?: { fields?: { summary?: string; description?: unknown } }; steps?: Array<{ action: string }> };
      };
      const fields = parsed.variables?.jira?.fields;

      return new Response(
        JSON.stringify({
          data: {
            createTest: {
              test: {
                issueId: "10001",
                jira: { key: "PROJ-42", summary: fields?.summary, description: fields?.description },
                steps: (parsed.variables?.steps ?? []).map((step, index) => ({
                  id: `s${index}`,
                  action: step.action,
                })),
              },
            },
          },
        }),
        { status: 200 },
      );
    }) as typeof globalThis.fetch;

    const provider = createXrayProvider(config, auth, { fetch: fetchFn, logger: silentLogger });
    const created = await provider.createCase!(body);

    expect(hashCaseBody(created.body!)).toBe(hashCaseBody(body));
  });

  it("imports executions with evidence encoded as base64", async () => {
    const { fetch, sent } = xrayFetch([
      { match: "import/execution", body: { id: "1", key: "PROJ-99" } },
    ]);

    const provider = createXrayProvider(config, auth, { fetch, logger: silentLogger });
    const summary = await provider.recordResults!([
      {
        caseId: "PROJ-42",
        status: "failed",
        durationMs: 100,
        message: "boom",
        attachments: [
          {
            filename: "shot.png",
            mediaType: "image/png",
            body: new Uint8Array([1, 2, 3]),
            role: "screenshot",
          },
        ],
      },
    ]);

    const importCall = sent.find((call) => call.url.includes("import/execution"))!;
    const payload = importCall.body as { tests: Array<Record<string, unknown>> };

    expect(payload.tests[0]).toMatchObject({ testKey: "PROJ-42", status: "FAILED" });
    expect((payload.tests[0]!["evidence"] as Array<{ data: string }>)[0]!.data).toBe(
      Buffer.from([1, 2, 3]).toString("base64"),
    );
    expect(summary).toMatchObject({ recorded: 1, attachmentsUploaded: 1, runId: "PROJ-99" });
  });

  it("maps a skipped test to TODO rather than inventing a failure", async () => {
    const { fetch, sent } = xrayFetch([{ match: "import/execution", body: { key: "PROJ-99" } }]);

    const provider = createXrayProvider(config, auth, { fetch, logger: silentLogger });
    await provider.recordResults!([{ caseId: "PROJ-1", status: "skipped", durationMs: 0 }]);

    const payload = sent.find((call) => call.url.includes("import/execution"))!.body as {
      tests: Array<{ status: string }>;
    };
    expect(payload.tests[0]!.status).toBe("TODO");
  });

  it("surfaces GraphQL errors instead of returning empty data", async () => {
    const { fetch } = xrayFetch([
      { match: "getTests", body: { errors: [{ message: "jql is invalid" }] } },
    ]);

    const provider = createXrayProvider(config, auth, { fetch, logger: silentLogger });

    await expect(provider.listCases()).rejects.toThrow(/jql is invalid/);
  });

  it("updates steps but leaves Jira fields alone without Jira credentials", async () => {
    const { fetch, sent } = xrayFetch(stepRoutes([{ id: "s1" }]));

    const provider = createXrayProvider(config, auth, { fetch, logger: silentLogger });
    await provider.listCases();
    await provider.updateCase!("PROJ-42", makeBody());

    expect(mutations(sent)).toContain("updateTestStep");
    expect(sent.some((call) => call.url.includes("/rest/api/3/issue/"))).toBe(false);
  });

  it("overwrites the steps that already exist instead of clearing and rebuilding", async () => {
    // A rebuild leaves the case with no steps at all if the run dies between
    // the deletes and the adds. Overwriting in place means every prefix of the
    // work is a correct prefix.
    const { fetch, sent } = xrayFetch(stepRoutes([{ id: "s1" }, { id: "s2" }]));

    const provider = createXrayProvider(config, auth, { fetch, logger: silentLogger });
    await provider.listCases();
    await provider.updateCase!("PROJ-42", {
      ...makeBody(),
      steps: [
        { keyword: "Given", text: "one" },
        { keyword: "When", text: "two" },
      ],
    });

    expect(mutations(sent)).toEqual(["updateTestStep", "updateTestStep"]);
    expect(stepIds(sent, "updateTestStep")).toEqual(["s1", "s2"]);
  });

  it("appends the steps a story gained", async () => {
    const { fetch, sent } = xrayFetch(stepRoutes([{ id: "s1" }]));

    const provider = createXrayProvider(config, auth, { fetch, logger: silentLogger });
    await provider.listCases();
    await provider.updateCase!("PROJ-42", {
      ...makeBody(),
      steps: [
        { keyword: "Given", text: "one" },
        { keyword: "When", text: "two" },
      ],
    });

    expect(mutations(sent)).toEqual(["updateTestStep", "addTestStep"]);
  });

  it("removes surplus steps last and back to front", async () => {
    const { fetch, sent } = xrayFetch(stepRoutes([{ id: "s1" }, { id: "s2" }, { id: "s3" }]));

    const provider = createXrayProvider(config, auth, { fetch, logger: silentLogger });
    await provider.listCases();
    await provider.updateCase!("PROJ-42", {
      ...makeBody(),
      steps: [{ keyword: "Given", text: "only one now" }],
    });

    expect(mutations(sent)).toEqual(["updateTestStep", "removeTestStep", "removeTestStep"]);
    // Back to front, so an interrupted run never renumbers a step it has yet
    // to reach.
    expect(stepIds(sent, "removeTestStep")).toEqual(["s3", "s2"]);
  });
});

/** Routes for an updateCase call against a test that already holds `steps`. */
function stepRoutes(steps: Array<{ id: string }>) {
  return [
    {
      match: "getTests",
      body: {
        data: {
          getTests: {
            results: [{ issueId: "10001", jira: { key: "PROJ-42", summary: "x" }, steps: [] }],
          },
        },
      },
    },
    { match: "getTest(", body: { data: { getTest: { steps } } } },
    { match: "updateTestStep", body: { data: { updateTestStep: true } } },
    { match: "removeTestStep", body: { data: { removeTestStep: true } } },
    { match: "addTestStep", body: { data: { addTestStep: { id: "new" } } } },
  ];
}

const STEP_MUTATIONS = ["updateTestStep", "addTestStep", "removeTestStep"] as const;

/** The step mutations sent, in order, so the recovery story is asserted not assumed. */
function mutations(sent: Array<{ body: unknown }>): string[] {
  return sent.flatMap((call) => {
    const query = String((call.body as { query?: string })?.query ?? "");
    const found = STEP_MUTATIONS.find((name) => query.includes(name));
    return found ? [found] : [];
  });
}

function stepIds(sent: Array<{ body: unknown }>, mutation: string): string[] {
  return sent.flatMap((call) => {
    const typed = call.body as { query?: string; variables?: { stepId?: string } };
    return String(typed?.query ?? "").includes(mutation) && typed.variables?.stepId
      ? [typed.variables.stepId]
      : [];
  });
}
