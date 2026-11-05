import { describe, expect, it, vi } from "vitest";

import { type CliDeps, runCli } from "./cli";
import type { TicketScenario, TicketStatus } from "executable-stories-trackers";

import {
  attachmentInput,
  attachVideo,
  canonicalStatus,
  isTrustedStatusUrl,
  linearRequest,
  MESSAGE_LIMIT,
  MODAL_BUDGET,
  modalMessages,
  NOTICE_RESERVE,
  ownsTicket,
  postLinearStatus,
  scenarioMessage,
  STEP_LIMIT,
  VIDEO_SOURCE,
} from "./linear";

type Call = { query: string; variables: Record<string, unknown> };

/** A fake Linear: answers each GraphQL call through `answer`, records it. */
function fakeLinear(answer: (call: Call) => object) {
  const calls: Call[] = [];
  const fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    const call = JSON.parse(String(init?.body)) as Call;
    calls.push(call);
    return new Response(JSON.stringify(answer(call)));
  });
  return { fetch: fetch as unknown as typeof globalThis.fetch, calls, raw: fetch };
}

const workspace = { data: { viewer: { organization: { urlKey: "acme", name: "Acme" } } } };

/** A run whose stories name PAY-12 (twice), PAY-404 and an issue on another site. */
const run = JSON.stringify({
  projectRoot: "/repo",
  ci: { name: "GitHub Actions", branch: "main", commitSha: "abc1234def" },
  testCases: [
    { title: "Refund", sourceFile: "a.story.test.ts", status: "pass", story: { scenario: "Refund", steps: [], tickets: [{ id: "PAY-12" }] } },
    {
      title: "Refund too much",
      sourceFile: "a.story.test.ts",
      status: "fail",
      story: { scenario: "Refund too much", steps: [], tickets: [{ id: "PAY-12", url: "https://linear.app/acme/issue/PAY-12/refunds" }] },
    },
    { title: "Gone", sourceFile: "a.story.test.ts", status: "pass", story: { scenario: "Gone", steps: [], tickets: [{ id: "PAY-404" }] } },
    {
      title: "Elsewhere",
      sourceFile: "a.story.test.ts",
      status: "pass",
      story: { scenario: "Elsewhere", steps: [], tickets: [{ id: "OPS-1", url: "https://acme.atlassian.net/browse/OPS-1" }] },
    },
  ],
});

function cli(env: CliDeps["env"], fetch: typeof globalThis.fetch = vi.fn() as unknown as typeof globalThis.fetch) {
  const out: string[] = [];
  const err: string[] = [];
  const deps: CliDeps = {
    env,
    readFile: async () => run,
    readBytes: async () => new Uint8Array([1, 2, 3]),
    exists: (path) => path === ".executable-stories/raw-run.json",
    fetch,
    out: (line) => out.push(line),
    err: (line) => err.push(line),
  };
  return { deps, out, err };
}

describe("linearRequest", () => {
  it("sends a personal key bare and an OAuth token as a bearer token", async () => {
    const linear = fakeLinear(() => ({ data: { ok: true } }));
    await linearRequest({ auth: { apiKey: "lin_api_x" } }, "{ ok }", {}, linear);
    await linearRequest({ auth: { accessToken: "oauth" } }, "{ ok }", {}, linear);
    const header = (index: number) => new Headers(linear.raw.mock.calls[index]?.[1]?.headers).get("authorization");
    expect(header(0)).toBe("lin_api_x");
    expect(header(1)).toBe("Bearer oauth");
  });

  it("treats errors on an HTTP 200 as a failure", async () => {
    const linear = fakeLinear(() => ({ data: null, errors: [{ message: "Entity not found" }] }));
    await expect(linearRequest({ auth: { apiKey: "k" } }, "{ x }", {}, linear)).rejects.toThrow("Entity not found");
  });
});

describe("ownsTicket", () => {
  it("owns key-shaped tickets with no URL or this workspace's link, slug and all", () => {
    expect(ownsTicket("acme", { id: "PAY-12" })).toBe(true);
    expect(ownsTicket("acme", { id: "PAY-12", url: "https://linear.app/acme/issue/PAY-12/refunds" })).toBe(true);
    expect(ownsTicket("acme", { id: "PAY-12", url: "https://linear.app/other/issue/PAY-12" })).toBe(false);
    expect(ownsTicket("acme", { id: "OPS-1", url: "https://acme.atlassian.net/browse/OPS-1" })).toBe(false);
    expect(ownsTicket("acme", { id: "login works" })).toBe(false);
  });
});

describe("the attachment's modal", () => {
  const scenario = (overrides: Partial<TicketScenario> = {}): TicketScenario => ({
    feature: "Refunds",
    title: "Refund a card payment",
    status: "passed",
    steps: [
      { keyword: "Given", text: "a settled card payment", status: "passed" },
      { keyword: "When", text: "the customer refunds it", status: "passed" },
      { keyword: "Then", text: "the refund is confirmed", status: "passed" },
    ],
    assertions: 3,
    ...overrides,
  });
  const failing = scenario({
    title: "Refund more than was paid",
    status: "failed",
    steps: [
      { keyword: "Given", text: "a settled card payment", status: "passed" },
      { keyword: "When", text: "the customer refunds more than was paid", status: "failed" },
      { keyword: "Then", text: "the refund is refused", status: "skipped" },
    ],
    failure: { step: "When the customer refunds more than was paid", message: "expected 409 to be 200" },
    assertions: 2,
  });
  const status = (scenarios: TicketScenario[]): TicketStatus => ({
    ticket: "PAY-12",
    scope: "CI acme/app main",
    title: "CI acme/app main: 1 passed, 1 failed",
    resolved: false,
    counts: { passed: 1, failed: 1 },
    scenarios,
    runUrl: "https://github.com/acme/app/actions/runs/77",
    stableUrl: "https://github.com/acme/app?executable-stories-ticket=PAY-12",
    context: { branch: "main", commit: "abc1234def5678", ranAt: "2026-10-31T10:00:00.000Z" },
  });

  it("puts Linear's documented modal fields beside our identity fields", () => {
    const input = attachmentInput(status([scenario(), failing]));
    expect(input).toMatchObject({
      issueId: "PAY-12",
      title: "Quality checks",
      subtitle: "CI acme/app main: 1 passed, 1 failed",
      url: "https://github.com/acme/app?executable-stories-ticket=PAY-12",
      metadata: {
        title: "CI acme/app main: 1 passed, 1 failed",
        source: "executable-stories",
        scope: "CI acme/app main",
        run: "https://github.com/acme/app/actions/runs/77",
        resolved: false,
      },
    });
    // Short values: Linear's attribute columns cut at about a dozen characters.
    expect(input.metadata.attributes).toEqual([
      { name: "Assertions", value: "5" },
      { name: "Branch", value: "main" },
      { name: "Commit", value: "abc1234" },
      { name: "Ran at (UTC)", value: "31 Oct 10:00" },
      { name: "Run", value: "#77" },
    ]);
    expect(input.metadata.attributes.every((attribute) => attribute.value.length <= 12)).toBe(true);
  });

  it("shows failures first, with the story's steps, where it failed and why", () => {
    const [first, second] = modalMessages(status([scenario(), failing]));
    expect(first).toEqual({
      subject: "✗ Refund more than was paid (failed) · Refunds",
      // Linear's modal shows the body but not the subject: the body names the scenario first.
      body: [
        "✗ Refund more than was paid (failed) · Refunds",
        "",
        "✓ Given a settled card payment",
        "✗ When the customer refunds more than was paid",
        "– Then the refund is refused",
        "",
        "Failed at: When the customer refunds more than was paid",
        "Why: expected 409 to be 200",
        "",
        "Assertions observed: 2",
      ].join("\n"),
      timestamp: "2026-10-31T10:00:00.000Z",
    });
    expect(second?.body.split("\n")[0]).toBe("✓ Refund a card payment (passed) · Refunds");
  });

  it("calls out a pass that observed no assertions, and says nothing when it cannot tell", () => {
    expect(scenarioMessage(scenario({ assertions: 0 }), null).body).toContain(
      "No assertions observed: this pass checked nothing.",
    );
    expect(scenarioMessage(scenario({ assertions: null }), null).body).not.toContain("Assertions");
    expect(attachmentInput(status([scenario({ assertions: 0 }), scenario({ assertions: null })])).metadata.attributes).toContainEqual({
      name: "Unasserted",
      value: "1 pass",
    });
    expect(attachmentInput(status([scenario({ assertions: null })])).metadata.attributes).toContainEqual({
      name: "Assertions",
      value: "n/a",
    });
  });

  it("stays within Linear's size guidance and says what it left out", () => {
    const many = Array.from({ length: 200 }, (_, index) => scenario({ title: `Scenario ${index}` }));
    const messages = modalMessages(status(many));
    const size = messages.reduce((sum, message) => sum + message.subject.length + message.body.length, 0);
    expect(size).toBeLessThan(10_000);
    expect(messages.at(-1)?.subject).toMatch(/^\d+ more scenarios not shown$/);
    expect(messages.at(-1)?.body).toContain("https://github.com/acme/app/actions/runs/77");
  });

  it("says where the steps would be when the adapter recorded none, before why it failed", () => {
    const body = scenarioMessage(scenario({ steps: [], status: "failed", failure: { step: null, message: "boom" } }), null).body;
    expect(body.split("\n")).toEqual(["✗ Refund a card payment (failed) · Refunds", "", "No steps recorded.", "", "Why: boom", "", "Assertions observed: 3"]);
  });

  it("an oversized first failure is cut to fit, keeping its name and why, and the next failure still shows", () => {
    const huge = "x".repeat(20_000);
    const oversized = scenario({
      title: "Refund with a giant payload",
      status: "failed",
      steps: [
        { keyword: "Given", text: huge, status: "passed" },
        { keyword: "When", text: "the refund is sent", status: "failed" },
        ...Array.from({ length: 40 }, (_, index) => ({ keyword: "And", text: `${huge} ${index}`, status: "skipped" as const })),
      ],
      failure: { step: `When ${huge}`, message: `boom ${huge}` },
      assertions: 1,
    });
    const shortFailure = scenario({ title: "Refund twice", status: "failed", failure: { step: null, message: "duplicate refund" }, assertions: 1 });
    const many = Array.from({ length: 60 }, (_, index) => scenario({ title: `Passing ${index}` }));
    const messages = modalMessages(status([oversized, shortFailure, ...many]));

    const [first, second] = messages;
    expect(first?.body.split("\n")[0]).toBe("✗ Refund with a giant payload (failed) · Refunds");
    expect(first?.body).toMatch(/Failed at: When x+…/);
    expect(first?.body).toMatch(/Why: boom x+…/);
    expect(first?.body).toMatch(/… \d+ more steps/);
    expect((first?.subject.length ?? 0) + (first?.body.length ?? 0)).toBeLessThanOrEqual(MESSAGE_LIMIT);
    expect(second?.body).toContain("Why: duplicate refund");

    const total = messages.reduce((sum, message) => sum + message.subject.length + message.body.length, 0);
    expect(total).toBeLessThanOrEqual(MODAL_BUDGET);
    expect(messages.at(-1)?.subject).toMatch(/more scenarios not shown$/);
  });

  it("keeps the closing notice within its reserve even with a very long run link", () => {
    const many = Array.from({ length: 200 }, (_, index) => scenario({ title: `Scenario ${index}` }));
    const notice = modalMessages({ ...status(many), runUrl: `https://ci.example/${"r".repeat(5_000)}` }).at(-1);
    expect((notice?.subject.length ?? 0) + (notice?.body.length ?? 0)).toBeLessThanOrEqual(NOTICE_RESERVE);
  });

  it("shortens a long story to its first steps", () => {
    const long = scenario({
      steps: Array.from({ length: STEP_LIMIT + 5 }, (_, index) => ({ keyword: "And", text: `step ${index}`, status: "passed" as const })),
    });
    expect(scenarioMessage(long, null).body).toContain("… 5 more steps");
  });
});

describe("executable-stories-linear publish", () => {
  const github = {
    GITHUB_SERVER_URL: "https://github.com",
    GITHUB_REPOSITORY: "acme/app",
    GITHUB_RUN_ID: "77",
  };

  it("posts one attachment per workspace issue, reports a refused one, exits 1", async () => {
    const linear = fakeLinear((call) => {
      if (call.query.includes("viewer")) return workspace;
      if (call.query.includes("attachmentDelete")) return { data: { attachmentDelete: { success: true } } };
      if (call.query.includes("attachmentUpdate")) return { data: { attachmentUpdate: { success: true } } };
      if (call.query.includes("attachments { nodes")) {
        if (call.variables.id === "PAY-404") return { data: null, errors: [{ message: "Entity not found" }] };
        // The hosted app and an earlier CLI run both posted this scope (a race); a person's link is not ours.
        return {
          data: {
            issue: {
              attachments: {
                nodes: [
                  { id: "b-hosted", url: "https://app.example/requirements?executable-stories-ticket=PAY-12", metadata: { source: "executable-stories", scope: "CI acme/app main" } },
                  { id: "a-cli", url: "https://github.com/acme/app?executable-stories-ticket=PAY-12", metadata: { source: "executable-stories", scope: "CI acme/app main" } },
                  { id: "pr", url: "https://github.com/acme/app/pull/9", metadata: {} },
                ],
              },
            },
          },
        };
      }
      const input = (call.variables.input ?? {}) as { issueId?: string };
      return input.issueId === "PAY-404"
        ? { data: null, errors: [{ message: "Entity not found" }] }
        : { data: { attachmentCreate: { success: true } } };
    });
    const { deps, out, err } = cli(
      { ...github, LINEAR_API_KEY: "lin_api_x", EXECUTABLE_STORIES_TRUSTED_LINKS: "https://app.example" },
      linear.fetch,
    );
    expect(await runCli(["publish"], deps)).toBe(1);
    expect(out).toEqual(["posted PAY-12: CI acme/app main: 1 passed, 1 failed"]);
    expect(err).toEqual(["could not post PAY-404: Entity not found"]);
    // Statuses already exist: the canonical one (smallest id) is updated in place, none created.
    expect(linear.calls.some((call) => call.query.includes("attachmentCreate"))).toBe(false);
    expect(linear.calls.find((call) => call.query.includes("attachmentUpdate"))?.variables).toMatchObject({
      id: "a-cli",
      input: { subtitle: "CI acme/app main: 1 passed, 1 failed", metadata: { run: "https://github.com/acme/app/actions/runs/77" } },
    });
    expect(linear.calls.some((call) => JSON.stringify(call.variables).includes("OPS-1"))).toBe(false);
    // The duplicate from the race is removed, the unrelated link kept.
    expect(linear.calls.filter((call) => call.query.includes("attachmentDelete")).map((call) => call.variables)).toEqual([
      { id: "b-hosted" },
    ]);
  });

  it("dry-runs without a key, listing what it would post", async () => {
    const { deps, out } = cli(github);
    expect(await runCli(["publish", "--dry-run"], deps)).toBe(0);
    expect(out.sort()).toEqual([
      "would post PAY-12: CI acme/app main: 1 passed, 1 failed",
      "would post PAY-404: CI acme/app main: 1 passed",
    ]);
  });

  it("stops with a clear message and exit 2 when set up wrong", async () => {
    const noKey = cli(github);
    expect(await runCli(["publish"], noKey.deps)).toBe(2);
    expect(noKey.err[0]).toContain("LINEAR_API_KEY");

    const noLink = cli({ LINEAR_API_KEY: "k" });
    expect(await runCli(["publish"], noLink.deps)).toBe(2);
    expect(noLink.err[0]).toContain("--link");

    const wrongCommand = cli({});
    expect(await runCli(["push"], wrongCommand.deps)).toBe(2);
  });
});

describe("two writers on one issue", () => {
  type Stored = { id: string; url: string; subtitle: string; metadata: object };

  /**
   * A fake Linear with real attachment state. `hooks[n]` runs just before the
   * n-th request (0-based) is answered, to stage another writer in between.
   * `ids` are handed to new attachments in order, so a test picks which is smaller.
   */
  function statefulLinear(ids: string[], hooks: Record<number, () => Promise<void>> = {}) {
    const store: Stored[] = [];
    let request = 0;
    const fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      const hook = hooks[request];
      request += 1;
      if (hook) await hook();
      const call = JSON.parse(String(init?.body)) as {
        query: string;
        variables: { input?: { url: string; subtitle: string; metadata: object }; id?: string };
      };
      const reply = (data: object) => new Response(JSON.stringify({ data }));
      if (call.query.includes("attachmentCreate")) {
        const input = call.variables.input!;
        const existing = store.find((row) => row.url === input.url);
        if (existing) Object.assign(existing, { subtitle: input.subtitle, metadata: input.metadata });
        else store.push({ id: ids.shift()!, url: input.url, subtitle: input.subtitle, metadata: input.metadata });
        return reply({ attachmentCreate: { success: true } });
      }
      if (call.query.includes("attachmentUpdate")) {
        const row = store.find((each) => each.id === call.variables.id);
        if (!row) return new Response(JSON.stringify({ data: null, errors: [{ message: "Entity not found" }] }));
        Object.assign(row, { subtitle: call.variables.input!.subtitle, metadata: call.variables.input!.metadata });
        return reply({ attachmentUpdate: { success: true } });
      }
      if (call.query.includes("attachmentDelete")) {
        const index = store.findIndex((row) => row.id === call.variables.id);
        if (index < 0) return new Response(JSON.stringify({ data: null, errors: [{ message: "Entity not found" }] }));
        store.splice(index, 1);
        return reply({ attachmentDelete: { success: true } });
      }
      if (call.query.includes("attachments { nodes")) {
        return reply({ issue: { attachments: { nodes: store.map(({ id, url, metadata }) => ({ id, url, metadata })) } } });
      }
      throw new Error(`unexpected ${call.query}`);
    }) as typeof globalThis.fetch;
    return { fetch, store };
  }

  const status = (link: string, subtitle = "CI acme/app main: 1 passed"): TicketStatus => ({
    ticket: "PAY-12",
    scope: "CI acme/app main",
    title: subtitle,
    resolved: true,
    counts: { passed: 1 },
    scenarios: [],
    runUrl: null,
    stableUrl: `${link}?executable-stories-ticket=PAY-12`,
    context: { branch: null, commit: null, ranAt: null },
  });
  // Each writer trusts the other's link, as the CLI does with --trust for the hosted app.
  const auth = { auth: { apiKey: "k" }, trustedLinks: ["https://github.com/acme/app", "https://app.example"] };

  it("both see none and both create: exactly one remains", async () => {
    // A lists (none); before A creates, B posts in full (lists none, creates "b", lists, updates).
    // Then A creates "a" ("a" < "b"), lists both, keeps "a" and deletes "b".
    const linear: ReturnType<typeof statefulLinear> = statefulLinear(["b", "a"], {
      1: () => postLinearStatus(auth, status("https://app.example", "from B"), { fetch: linear.fetch }),
    });
    await postLinearStatus(auth, status("https://github.com/acme/app", "from A"), { fetch: linear.fetch });
    expect(linear.store.map((row) => [row.id, row.subtitle])).toEqual([["a", "from A"]]);
  });

  it("both see the duplicate and both delete it: the second finds it gone, no error, one remains", async () => {
    const linear: ReturnType<typeof statefulLinear> = statefulLinear([]);
    linear.store.push(
      { id: "a", url: "https://github.com/acme/app?executable-stories-ticket=PAY-12", subtitle: "old", metadata: { source: "executable-stories", scope: "CI acme/app main" } },
      { id: "b", url: "https://app.example?executable-stories-ticket=PAY-12", subtitle: "old", metadata: { source: "executable-stories", scope: "CI acme/app main" } },
    );
    await Promise.all([
      postLinearStatus(auth, status("https://github.com/acme/app", "from A"), { fetch: linear.fetch }),
      postLinearStatus(auth, status("https://app.example", "from B"), { fetch: linear.fetch }),
    ]);
    expect(linear.store.map((row) => row.id)).toEqual(["a"]);
  });

  it("updates the one status in place on the next run, never creating another", async () => {
    const linear = statefulLinear(["a", "b"]);
    await postLinearStatus(auth, status("https://github.com/acme/app", "run 1"), linear);
    await postLinearStatus(auth, status("https://app.example", "run 2"), linear);
    expect(linear.store.map((row) => [row.id, row.url, row.subtitle])).toEqual([
      ["a", "https://github.com/acme/app?executable-stories-ticket=PAY-12", "run 2"],
    ]);
  });

  it("lands its result when the status it chose is deleted by the other writer before it updates", async () => {
    // A creates "b" and lists it; before A updates, B (which also saw none) creates "a" < "b",
    // updates "a" and deletes "b". A's update of "b" then fails: it lists again and updates "a".
    const marker = { source: "executable-stories", scope: "CI acme/app main" };
    const linear: ReturnType<typeof statefulLinear> = statefulLinear(["b"], {
      3: async () => {
        linear.store.push({ id: "a", url: "https://app.example?executable-stories-ticket=PAY-12", subtitle: "from B", metadata: marker });
        linear.store.splice(linear.store.findIndex((row) => row.id === "b"), 1);
      },
    });
    await postLinearStatus(auth, status("https://github.com/acme/app", "from A"), { fetch: linear.fetch });
    expect(linear.store.map((row) => [row.id, row.subtitle])).toEqual([["a", "from A"]]);
  });

  it("never adopts or deletes a lookalike: our marker on a link no trusted writer made", async () => {
    const linear = statefulLinear(["ours"]);
    linear.store.push({
      id: "aaa",
      url: "https://evil.example/login?executable-stories-ticket=PAY-12",
      subtitle: "fake",
      metadata: { source: "executable-stories", scope: "CI acme/app main" },
    });
    await postLinearStatus(auth, status("https://github.com/acme/app", "real"), linear);
    expect(linear.store.map((row) => [row.id, row.subtitle])).toEqual([
      ["aaa", "fake"],
      ["ours", "real"],
    ]);
  });

  it("fails the ticket when Linear will not remove a duplicate", async () => {
    const fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const query = String(JSON.parse(String(init?.body)).query);
      const reply = (data: object) => new Response(JSON.stringify({ data }));
      if (query.includes("attachmentUpdate")) return reply({ attachmentUpdate: { success: true } });
      if (query.includes("attachmentDelete")) return reply({ attachmentDelete: { success: false } });
      return reply({
        issue: {
          attachments: {
            nodes: [
              { id: "a", url: "https://github.com/acme/app?executable-stories-ticket=PAY-12", metadata: { source: "executable-stories", scope: "CI acme/app main" } },
              { id: "b", url: "https://github.com/acme/app/other?executable-stories-ticket=PAY-12", metadata: { source: "executable-stories", scope: "CI acme/app main" } },
            ],
          },
        },
      });
    }) as unknown as typeof globalThis.fetch;
    await expect(postLinearStatus(auth, status("https://github.com/acme/app"), { fetch })).rejects.toThrow(
      "would not remove a duplicate (b)",
    );
  });
});

describe("isTrustedStatusUrl", () => {
  const own = "https://github.com/acme/app?executable-stories-ticket=PAY-12";
  it("trusts our own link and links we were told to trust, for this ticket only", () => {
    expect(isTrustedStatusUrl(own, "PAY-12", own)).toBe(true);
    expect(isTrustedStatusUrl("https://app.example/requirements?executable-stories-ticket=PAY-12", "PAY-12", own, ["https://app.example"])).toBe(true);
    expect(isTrustedStatusUrl("https://github.com/acme/app?executable-stories-ticket=PAY-13", "PAY-12", own)).toBe(false);
    expect(isTrustedStatusUrl("https://evil.example/?executable-stories-ticket=PAY-12", "PAY-12", own)).toBe(false);
    expect(isTrustedStatusUrl("https://app.example.evil/?executable-stories-ticket=PAY-12", "PAY-12", own, ["https://app.example"])).toBe(false);
    expect(isTrustedStatusUrl("not a url", "PAY-12", own)).toBe(false);
    // Opaque origins ("null") never match each other: only http(s) links are compared.
    expect(isTrustedStatusUrl("javascript:alert(1)//?executable-stories-ticket=PAY-12", "PAY-12", own, ["javascript:void(0)"])).toBe(false);
    expect(isTrustedStatusUrl("data:text/html,x?executable-stories-ticket=PAY-12", "PAY-12", own, ["data:text/html,y"])).toBe(false);
  });

  it("matches our own link by exact path, and --trust links by path or beneath", () => {
    expect(isTrustedStatusUrl("https://github.com/acme/app/?executable-stories-ticket=PAY-12", "PAY-12", own)).toBe(true);
    expect(isTrustedStatusUrl("https://github.com/acme/app/blob/x/y?executable-stories-ticket=PAY-12", "PAY-12", own)).toBe(false);
    const beneath = "https://app.example/requirements/r1?executable-stories-ticket=PAY-12";
    expect(isTrustedStatusUrl(beneath, "PAY-12", own, ["https://app.example/requirements"])).toBe(true);
  });

  it("treats a trusted link's query parameters as requirements the candidate must carry", () => {
    const project = ["https://app.example/requirements?project=abc"];
    const link = (query: string) => `https://app.example/requirements?${query}&executable-stories-ticket=PAY-12`;
    expect(isTrustedStatusUrl(link("project=abc"), "PAY-12", own, project)).toBe(true);
    expect(isTrustedStatusUrl(link("project=abc&scope=x"), "PAY-12", own, project)).toBe(true);
    expect(isTrustedStatusUrl(link("project=other"), "PAY-12", own, project)).toBe(false);
    expect(isTrustedStatusUrl(link("x=1"), "PAY-12", own, project)).toBe(false);
  });

  it("keeps the publisher's own link query as a requirement, dropping only the identity parameters", () => {
    const ownWithProject = "https://app.example/requirements?project=abc&executable-stories-ticket=PAY-12&executable-stories-scope=CI";
    const link = (project: string) =>
      `https://app.example/requirements?project=${project}&executable-stories-ticket=PAY-12&executable-stories-scope=CI`;
    expect(isTrustedStatusUrl(link("abc"), "PAY-12", ownWithProject)).toBe(true);
    expect(isTrustedStatusUrl(link("other"), "PAY-12", ownWithProject)).toBe(false);
    // Another scope's identity parameters do not count against it: only --link's own query does.
    expect(
      isTrustedStatusUrl("https://app.example/requirements?project=abc&executable-stories-ticket=PAY-12&executable-stories-scope=other", "PAY-12", ownWithProject),
    ).toBe(true);
  });

  it("matches paths by segment, ignoring a trailing slash, and skips links that are not URLs", () => {
    const candidate = "https://app.example/requirements/PAY-12?executable-stories-ticket=PAY-12";
    expect(isTrustedStatusUrl(candidate, "PAY-12", own, ["https://app.example/requirements/"])).toBe(true);
    expect(isTrustedStatusUrl(candidate, "PAY-12", own, ["https://app.example/req"])).toBe(false);
    expect(isTrustedStatusUrl(candidate, "PAY-12", own, ["not a url"])).toBe(false);
  });
});

describe("canonicalStatus", () => {
  it("is the smallest id, whatever order a writer saw them in", () => {
    expect(canonicalStatus(["c", "a", "b"])).toBe("a");
    expect(canonicalStatus([])).toBeUndefined();
  });
});

describe("attachVideo", () => {
  const options = { auth: { apiKey: "lin_api_x" } };
  const video = { ticket: "PAY-12", scenario: "Refund", scope: "Local", filename: "refund.mp4", bytes: new Uint8Array([1, 2, 3]) };
  const sha256 = "039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81";
  const uploaded = (id: string, hash: string, url = `https://uploads.linear.app/${id}`, scenario = "Refund") => ({
    id,
    url,
    metadata: { source: VIDEO_SOURCE, scenario, scope: "Local", sha256: hash },
  });

  /** A fake Linear and its storage: GraphQL goes through `fakeLinear`, the PUT through `storage`. */
  function linear(nodes: object[], storage = new Response()) {
    const puts: { url: string; init: RequestInit }[] = [];
    const graphql = fakeLinear((call) => {
      if (call.query.includes("attachments")) return { data: { issue: { attachments: { nodes } } } };
      if (call.query.includes("fileUpload")) {
        return {
          data: {
            fileUpload: {
              success: true,
              uploadFile: {
                uploadUrl: "https://storage.example/put",
                assetUrl: "https://uploads.linear.app/new",
                headers: [{ key: "x-signed", value: "yes" }],
              },
            },
          },
        };
      }
      if (call.query.includes("attachmentCreate")) return { data: { attachmentCreate: { success: true } } };
      return { data: { attachmentDelete: { success: true } } };
    });
    const fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "PUT") {
        puts.push({ url: String(input), init });
        return storage;
      }
      return graphql.fetch(input, init);
    }) as typeof globalThis.fetch;
    return { fetch, calls: graphql.calls, puts };
  }

  it("uploads the bytes with the signed headers, then attaches the stored file", async () => {
    const { fetch, calls, puts } = linear([]);
    expect(await attachVideo(options, video, { fetch })).toBe("attached");
    expect(calls.find((c) => c.query.includes("fileUpload"))?.variables).toEqual({
      contentType: "video/mp4",
      filename: "refund.mp4",
      size: 3,
    });
    expect(puts[0]?.url).toBe("https://storage.example/put");
    expect(puts[0]?.init.headers).toEqual({
      "Content-Type": "video/mp4",
      "Cache-Control": "public, max-age=31536000",
      "x-signed": "yes",
    });
    expect(calls.find((c) => c.query.includes("attachmentCreate"))?.variables).toEqual({
      input: {
        issueId: "PAY-12",
        title: "Video: Refund",
        subtitle: "Local",
        url: "https://uploads.linear.app/new",
        metadata: { source: VIDEO_SOURCE, scenario: "Refund", scope: "Local", sha256 },
      },
    });
  });

  it("uploads nothing when the issue already has these bytes", async () => {
    const { fetch, calls, puts } = linear([uploaded("a", sha256)]);
    expect(await attachVideo(options, video, { fetch })).toBe("unchanged");
    expect(puts).toEqual([]);
    expect(calls).toHaveLength(1);
  });

  it("replaces an older video only after the new one is attached", async () => {
    const { fetch, calls } = linear([uploaded("old", "other")]);
    await attachVideo(options, video, { fetch });
    const order = calls.map((c) => /attachmentCreate|attachmentDelete/.exec(c.query)?.[0]).filter(Boolean);
    expect(order).toEqual(["attachmentCreate", "attachmentDelete"]);
    expect(calls.at(-1)?.variables).toEqual({ id: "old" });
  });

  it("leaves another scenario's video, and a lookalike hosted elsewhere, alone", async () => {
    const { fetch, calls } = linear([
      uploaded("other", "x", undefined, "Another scenario"),
      uploaded("fake", "x", "https://evil.example/video.mp4"),
    ]);
    await attachVideo(options, video, { fetch });
    expect(calls.some((c) => c.query.includes("attachmentDelete"))).toBe(false);
  });

  it("keeps the old video when storage refuses the upload", async () => {
    const { fetch, calls } = linear([uploaded("old", "other")], new Response(null, { status: 403 }));
    await expect(attachVideo(options, video, { fetch })).rejects.toThrow(/storage answered 403/);
    expect(calls.some((c) => /attachmentCreate|attachmentDelete/.test(c.query))).toBe(false);
  });
});

describe("publish --videos", () => {
  const key = { LINEAR_API_KEY: "lin_api_x", GITHUB_SERVER_URL: "https://github.com", GITHUB_REPOSITORY: "acme/app" };
  const withStorage = (status = 200) => {
    const nodes: object[] = [];
    const graphql = fakeLinear((call) => {
      if (call.query.includes("viewer")) return workspace;
      if (call.query.includes("fileUpload")) {
        return { data: { fileUpload: { success: true, uploadFile: { uploadUrl: "https://s/put", assetUrl: "https://uploads.linear.app/n", headers: [] } } } };
      }
      if (call.query.includes("attachments { nodes")) return { data: { issue: { attachments: { nodes } } } };
      const input = call.variables.input as { url?: string; metadata?: object } | undefined;
      if (call.query.includes("attachmentCreate")) nodes.push({ id: `n${nodes.length}`, url: input?.url, metadata: input?.metadata });
      return { data: { attachmentCreate: { success: true }, attachmentUpdate: { success: true } } };
    });
    const fetch = (async (input: RequestInfo | URL, init?: RequestInit) =>
      init?.method === "PUT" ? new Response(null, { status }) : graphql.fetch(input, init)) as typeof globalThis.fetch;
    return { fetch, calls: graphql.calls };
  };

  it("attaches each scenario's file, and skips scenarios without one", async () => {
    const { fetch, calls } = withStorage();
    const { deps, out } = cli(key, fetch);
    deps.exists = (file) => file.endsWith("refund.mp4");
    expect(await runCli(["publish", "run.json", "--videos", "reports/video"], deps)).toBe(0);
    expect(out).toContain("attached PAY-12: refund.mp4");
    expect(calls.filter((c) => c.query.includes("fileUpload"))).toHaveLength(1);
  });

  it("exits 1 when a video cannot be attached", async () => {
    const { fetch } = withStorage(403);
    const { deps, err } = cli(key, fetch);
    deps.exists = (file) => file.endsWith("refund.mp4");
    expect(await runCli(["publish", "run.json", "--videos", "reports/video"], deps)).toBe(1);
    expect(err.join("\n")).toMatch(/could not attach .*refund\.mp4: Linear's storage answered 403/);
  });

  it("lists the videos in a dry run, with no key", async () => {
    const { deps, out } = cli({ GITHUB_SERVER_URL: "https://github.com", GITHUB_REPOSITORY: "acme/app" });
    deps.exists = (file) => file.endsWith("refund.mp4");
    expect(await runCli(["publish", "run.json", "--videos", "reports/video", "--dry-run"], deps)).toBe(0);
    expect(out).toContain("would attach to PAY-12: refund.mp4");
  });
});
