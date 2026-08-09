import { describe, it, expect } from "vitest";

import { createTestRailProvider } from "../../src/sync/adapters/testrail";
import { hashCaseBody } from "../../src/sync/lockfile";
import { makeBody, routedFetch, silentLogger } from "./helpers";

const config = { url: "https://acme.testrail.io", projectId: 1, suiteId: 2, sectionId: 3 };
const auth = { username: "qa@acme.test", apiKey: "key" };

const metadataRoutes = [
  { match: "get_project/", body: { name: "ACME" } },
  { match: "get_suite/", body: { name: "Web Regression" } },
  { match: "get_sections/", body: { sections: [{ id: 10, name: "Checkout" }] } },
];

function stockCase(overrides: Record<string, unknown> = {}) {
  return {
    id: 42,
    title: "User signs in",
    section_id: 10,
    custom_steps_separated: [{ content: "Given a registered user", expected: "" }],
    custom_preconds: "Some context",
    ...overrides,
  };
}

describe("TestRail adapter", () => {
  describe("first-run failures name their fix", () => {
    async function listWith(route: { status: number; body: unknown }): Promise<string> {
      const { fetch } = routedFetch([{ match: "get_", ...route }]);
      const provider = createTestRailProvider(config, auth, { fetch, logger: silentLogger });
      return provider.listCases().then(
        () => "no error thrown",
        (err: Error) => err.message,
      );
    }

    it("points a 401 at API keys rather than the password already retyped twice", async () => {
      const message = await listWith({ status: 401, body: { error: "Authentication failed." } });
      expect(message).toContain("401");
      expect(message).toContain("My Settings -> API Keys");
    });

    it("points a 403 at the instance-level API toggle", async () => {
      const message = await listWith({ status: 403, body: { error: "No permissions." } });
      expect(message).toContain("Site Settings -> API");
    });

    // A wrong `url` gets a login page back with a 200, so this has to be caught
    // before the status is trusted.
    it("reads an HTML login page as a wrong url, not a JSON parse error", async () => {
      const message = await listWith({ status: 200, body: "<html>Log in</html>" });
      expect(message).toContain("sync.testrail.url");
      expect(message).not.toContain("Unexpected token");
      // The credentials hint would be a wrong steer here.
      expect(message).not.toContain("API Keys");
    });
  });

  it("reads cases and attaches their section name", async () => {
    const { fetch } = routedFetch([
      ...metadataRoutes,
      { match: "get_cases/", body: { cases: [stockCase()] } },
    ]);

    const cases = await createTestRailProvider(config, auth, { fetch, logger: silentLogger }).listCases();

    expect(cases[0]).toMatchObject({
      id: "42",
      title: "User signs in",
      section: "Checkout",
      url: "https://acme.testrail.io/index.php?/cases/view/42",
    });
  });

  it("accepts the bare-array response older instances return", async () => {
    const { fetch } = routedFetch([
      ...metadataRoutes,
      { match: "get_cases/", body: [stockCase()] },
    ]);

    const cases = await createTestRailProvider(config, auth, { fetch, logger: silentLogger }).listCases();

    expect(cases).toHaveLength(1);
  });

  it("keeps reading when the instance denies the metadata lookups", async () => {
    const { fetch } = routedFetch([
      { match: "get_project/", status: 403, body: { error: "no access" } },
      { match: "get_cases/", body: { cases: [stockCase()] } },
    ]);

    const cases = await createTestRailProvider(config, auth, { fetch, logger: silentLogger }).listCases();

    expect(cases).toHaveLength(1);
    expect(cases[0]!.section).toBeUndefined();
  });

  it("round-trips a body so the drift guard does not fire on our own writes", async () => {
    const body = makeBody({
      description: "Some context",
      links: [{ label: "Living documentation", url: "https://docs/story" }],
    });

    // Echo the payload back as if TestRail had stored it verbatim.
    const capturing = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const sent = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(JSON.stringify({ id: 42, section_id: 10, ...sent }), { status: 200 });
    }) as typeof globalThis.fetch;

    const provider = createTestRailProvider(config, auth, { fetch: capturing, logger: silentLogger });
    const created = await provider.createCase!(body);

    expect(hashCaseBody(created.body!)).toBe(hashCaseBody(body));
  });

  it("encodes the BDD keyword into the step text", async () => {
    let sent: Record<string, unknown> = {};
    const capturing = (async (input: RequestInfo | URL, init?: RequestInit) => {
      sent = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(JSON.stringify({ id: 1, title: "t" }), { status: 200 });
    }) as typeof globalThis.fetch;

    const provider = createTestRailProvider(config, auth, { fetch: capturing, logger: silentLogger });
    await provider.createCase!(makeBody({ steps: [{ keyword: "When", text: "they sign in" }] }));

    expect(sent["custom_steps_separated"]).toEqual([{ content: "When they sign in", expected: "" }]);
  });

  it("refuses to create without a target section instead of guessing one", async () => {
    const { fetch } = routedFetch([]);
    const provider = createTestRailProvider(
      { ...config, sectionId: undefined },
      auth,
      { fetch, logger: silentLogger },
    );

    await expect(provider.createCase!(makeBody())).rejects.toThrow(/sectionId/);
  });

  it("surfaces the API error message rather than a bare status code", async () => {
    const { fetch } = routedFetch([
      { match: "add_case/", status: 400, body: { error: "Field :title is a required field." } },
    ]);
    const provider = createTestRailProvider(config, auth, { fetch, logger: silentLogger });

    await expect(provider.createCase!(makeBody())).rejects.toThrow(/required field/);
  });

  it("records results against a new run and uploads evidence", async () => {
    const calls: string[] = [];
    const fetchFn = (async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      if (url.includes("add_run/")) return new Response(JSON.stringify({ id: 77 }), { status: 200 });
      if (url.includes("add_results_for_cases/")) {
        return new Response(JSON.stringify([{ id: 500, case_id: 42 }]), { status: 200 });
      }
      return new Response("{}", { status: 200 });
    }) as typeof globalThis.fetch;

    const provider = createTestRailProvider(config, auth, { fetch: fetchFn, logger: silentLogger });
    const summary = await provider.recordResults!([
      {
        caseId: "42",
        status: "failed",
        durationMs: 4200,
        message: "expected true",
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

    expect(summary).toMatchObject({ recorded: 1, attachmentsUploaded: 1, runId: "77" });
    expect(calls.some((url) => url.includes("add_attachment_to_result/500"))).toBe(true);
  });

  it("omits an elapsed TestRail would reject and keeps one it accepts", async () => {
    const bodies: Array<Record<string, unknown>> = [];
    const fetchFn = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("add_results_for_cases/")) {
        bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
        return new Response(JSON.stringify([{ id: 1 }, { id: 2 }]), { status: 200 });
      }
      if (url.includes("add_run/")) return new Response(JSON.stringify({ id: 77 }), { status: 200 });
      return new Response("{}", { status: 200 });
    }) as typeof globalThis.fetch;

    const provider = createTestRailProvider(config, auth, { fetch: fetchFn, logger: silentLogger });
    await provider.recordResults!([
      { caseId: "1", status: "passed", durationMs: 200 },
      { caseId: "2", status: "passed", durationMs: 95_000 },
    ]);

    const results = bodies[0]!["results"] as Array<Record<string, unknown>>;
    expect(results[0]).not.toHaveProperty("elapsed");
    expect(results[1]!["elapsed"]).toBe("1m 35s");
  });

  it("names the call when a response comes back without a case id", async () => {
    // Otherwise this surfaces much later as a TypeError from inside the engine's
    // hashing, pointing at nothing the reader can act on.
    const fetchFn = (async () => new Response("{}", { status: 200 })) as typeof globalThis.fetch;
    const provider = createTestRailProvider(config, auth, { fetch: fetchFn, logger: silentLogger });

    await expect(provider.updateCase!("77", makeBody())).rejects.toThrow(
      /update_case\/77 returned no case id/,
    );
  });

  it("deduplicates the case list a run is created with", async () => {
    // Two stories can carry the same ticket id, and TestRail rejects a run whose
    // case list repeats one.
    const bodies: Array<Record<string, unknown>> = [];
    const fetchFn = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.body) bodies.push(JSON.parse(String(init.body)) as Record<string, unknown>);
      return new Response(JSON.stringify({ id: 77 }), { status: 200 });
    }) as typeof globalThis.fetch;

    const provider = createTestRailProvider(config, auth, { fetch: fetchFn, logger: silentLogger });
    await provider.recordResults!([
      { caseId: "1", status: "passed", durationMs: 10 },
      { caseId: "1", status: "failed", durationMs: 10 },
      { caseId: "2", status: "passed", durationMs: 10 },
    ]);

    expect(bodies[0]!["case_ids"]).toEqual([1, 2]);
    // Both executions still get recorded; only the run's case list is deduped.
    expect((bodies[1]!["results"] as unknown[]).length).toBe(3);
  });

  it("reports skipped results as unrecorded when the instance has no status for them", async () => {
    const fetchFn = (async () => new Response("{}", { status: 200 })) as typeof globalThis.fetch;
    const provider = createTestRailProvider(config, auth, { fetch: fetchFn, logger: silentLogger });

    const summary = await provider.recordResults!([{ caseId: "1", status: "skipped", durationMs: 0 }]);

    expect(summary.recorded).toBe(0);
    expect(summary.skipped[0]!.reason).toContain("statusIds.skipped");
  });

  it("retries once when the instance rate-limits", async () => {
    let attempts = 0;
    const fetchFn = (async () => {
      attempts += 1;
      if (attempts === 1) {
        return new Response("{}", { status: 429, headers: { "retry-after": "0" } });
      }
      return new Response(JSON.stringify({ cases: [] }), { status: 200 });
    }) as typeof globalThis.fetch;

    const provider = createTestRailProvider(
      { ...config },
      auth,
      { fetch: fetchFn, logger: silentLogger },
    );
    await provider.listCases();

    expect(attempts).toBeGreaterThan(1);
  });
});
