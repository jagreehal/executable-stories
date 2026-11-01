import { describe, expect, it, vi } from "vitest";

import {
  defaultScope,
  publishRun,
  readRun,
  runLabel,
  scenariosByTicket,
  ticketScenario,
  stableTicketUrl,
  summarise,
  type TicketStatus,
  type TrackerClient,
  TICKET_KEY,
} from "./index";

/** A raw run as the Vitest reporter writes it: two stories on PAY-12, one also on OPS-3. */
const rawRun = JSON.stringify({
  projectRoot: "/repo",
  startedAtMs: 1_000,
  finishedAtMs: 2_000,
  ci: { name: "GitHub Actions", branch: "main", commitSha: "abc1234def", url: "https://ci.example/run/7" },
  testCases: [
    {
      title: "Refund a card payment",
      sourceFile: "src/refunds.story.test.ts",
      status: "pass",
      story: { scenario: "Refund a card payment", steps: [], tickets: [{ id: "PAY-12" }] },
    },
    {
      title: "Refund more than was paid",
      sourceFile: "src/refunds.story.test.ts",
      status: "fail",
      story: {
        scenario: "Refund more than was paid",
        steps: [],
        tickets: [{ id: "PAY-12" }, { id: "OPS-3", url: "https://other.example/OPS-3" }],
      },
    },
    {
      title: "No ticket",
      sourceFile: "src/refunds.story.test.ts",
      status: "pass",
      story: { scenario: "No ticket", steps: [] },
    },
  ],
});

const ownsKeys = (ticket: { id: string; url?: string }) =>
  TICKET_KEY.test(ticket.id) && !ticket.url?.startsWith("https://other.example");

describe("readRun", () => {
  it("reads a raw run and a StoryReport alike", () => {
    const fromRaw = readRun(rawRun);
    // Order is core's to decide; what matters is every scenario arrived.
    expect(fromRaw.features[0]?.scenarios.map((scenario) => scenario.title).sort()).toEqual([
      "No ticket",
      "Refund a card payment",
      "Refund more than was paid",
    ]);
    expect(readRun(JSON.stringify(fromRaw)).runId).toBe(fromRaw.runId);
  });

  it("says what it expected when the file is something else", () => {
    expect(() => readRun("{}")).toThrow("Not a run");
  });
});

describe("scenariosByTicket", () => {
  it("groups scenarios under each ticket they name, for the tickets the tracker owns", () => {
    const byTicket = scenariosByTicket(readRun(rawRun), ownsKeys);
    expect([...byTicket.keys()]).toEqual(["PAY-12"]);
    expect(byTicket.get("PAY-12")?.map((scenario) => scenario.status)).toEqual(["passed", "failed"]);
  });
});

describe("ticketScenario", () => {
  const step = (keyword: "Given" | "When" | "Then", text: string, status: "passed" | "failed" | "skipped", extra = {}) => ({
    id: text,
    index: 0,
    keyword,
    text,
    status,
    durationMs: 1,
    docEntries: [],
    ...extra,
  });
  const scenario = (status: "passed" | "failed", steps: ReturnType<typeof step>[], errorMessage?: string) => ({
    id: "s",
    title: "Refund a card payment",
    status,
    durationMs: 3,
    tags: [],
    retry: 0,
    retries: 0,
    docEntries: [],
    steps,
    attachments: [],
    ...(errorMessage ? { errorMessage } : {}),
  });

  it("carries the story's steps, the failing step and the error's first line", () => {
    const failed = ticketScenario(
      "Refunds",
      scenario("failed", [
        step("Given", "a settled card payment", "passed", { assertions: 1 }),
        step("When", "the customer refunds more than was paid", "failed", {
          assertions: 1,
          errorMessage: "expected 409 to be 200\n    at refund.story.test.ts:12",
        }),
        step("Then", "the refund is refused", "skipped"),
      ]),
    );
    expect(failed.steps.map((each) => `${each.keyword} ${each.text}: ${each.status}`)).toEqual([
      "Given a settled card payment: passed",
      "When the customer refunds more than was paid: failed",
      "Then the refund is refused: skipped",
    ]);
    expect(failed.failure).toEqual({
      step: "When the customer refunds more than was paid",
      message: "expected 409 to be 200",
    });
  });

  it("counts assertions when every step was observed, 0 when none ran, null when it cannot tell", () => {
    const observed = (counts: (number | undefined)[]) =>
      ticketScenario(
        "f",
        scenario(
          "passed",
          counts.map((count, index) => step("Then", `step ${index}`, "passed", count === undefined ? {} : { assertions: count })),
        ),
      ).assertions;
    expect(observed([2, 1])).toBe(3);
    expect(observed([0, 0])).toBe(0);
    expect(observed([2, undefined])).toBeNull();
    expect(observed([])).toBeNull();
  });
});

describe("summarise", () => {
  it("counts outcomes in a fixed order, resolved only when every one passed", () => {
    const scenario = (status: "passed" | "failed" | "skipped") => ({
      feature: "f",
      title: "t",
      status,
      steps: [],
      assertions: null,
    });
    expect(summarise([scenario("failed"), scenario("passed"), scenario("skipped")])).toMatchObject({
      text: "1 passed, 1 failed, 1 skipped",
      resolved: false,
    });
    expect(summarise([scenario("passed")]).resolved).toBe(true);
    expect(summarise([]).resolved).toBe(false);
  });
});

describe("runLabel and stableTicketUrl", () => {
  it("names the run by CI, branch and commit unless given a scope", () => {
    const report = readRun(rawRun);
    expect(runLabel(report)).toBe("GitHub Actions main @ abc1234");
    expect(runLabel(report, "nightly")).toBe("nightly");
  });

  it("gives every run of one scope on one ticket the same link", () => {
    expect(stableTicketUrl("https://github.com/acme/app", "PAY-12", "CI main")).toBe(
      "https://github.com/acme/app?executable-stories-ticket=PAY-12&executable-stories-scope=CI+main",
    );
  });
});

describe("defaultScope", () => {
  it("names CI evidence by repository and branch, the way every writer does", () => {
    expect(defaultScope({ repository: "acme/app", branch: "main" })).toBe("CI acme/app main");
    expect(defaultScope({ branch: "main" })).toBe("CI main");
    expect(defaultScope({})).toBe("Local");
  });
});

describe("publishRun", () => {
  const client = (postStatus: (status: TicketStatus) => Promise<void>): TrackerClient => ({
    name: "Fake",
    owns: (ticket) => TICKET_KEY.test(ticket.id),
    postStatus,
  });

  it("posts one status per ticket, and reports a refused ticket without stopping", async () => {
    const posted = vi.fn(async (status: TicketStatus) => {
      if (status.ticket === "OPS-3") throw new Error("Entity not found");
    });
    const result = await publishRun({
      report: readRun(rawRun),
      client: client(posted),
      scope: "CI main",
      link: "https://github.com/acme/app",
    });
    expect(result.posted).toEqual(["PAY-12"]);
    expect(result.failed).toEqual([{ ticket: "OPS-3", error: "Entity not found" }]);
    expect(posted.mock.calls[0]?.[0]).toMatchObject({
      ticket: "PAY-12",
      scope: "CI main",
      title: "CI main: 1 passed, 1 failed",
      resolved: false,
      runUrl: "https://ci.example/run/7",
    });
  });
});
