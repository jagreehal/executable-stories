/**
 * Tests for the Playwright story API.
 *
 * These tests verify that the story API correctly builds StoryMeta
 * and attaches it to testInfo.annotations for the reporter to consume.
 */
import { test, expect } from "@playwright/test";
import { story } from "../story-api";
import type { StoryMeta } from "../types";

/**
 * Helper to get story meta from testInfo annotations.
 */
function getStoryMeta(testInfo: { annotations: Array<{ type: string; description?: string }> }): StoryMeta | undefined {
  const annotation = testInfo.annotations.find((a) => a.type === "story-meta");
  if (!annotation?.description) return undefined;
  return JSON.parse(annotation.description);
}

test.describe("story.init()", () => {
  test("creates StoryMeta from testInfo.title", async ({}, testInfo) => {
    story.init(testInfo);

    const meta = getStoryMeta(testInfo);
    expect(meta).toBeDefined();
    expect(meta!.scenario).toBe("creates StoryMeta from testInfo.title");
    expect(meta!.steps).toEqual([]);
  });

  test("accepts options with tags", async ({}, testInfo) => {
    story.init(testInfo, { tags: ["admin", "security"] });

    const meta = getStoryMeta(testInfo);
    expect(meta!.tags).toEqual(["admin", "security"]);
  });

  test("accepts options with single ticket", async ({}, testInfo) => {
    story.init(testInfo, { ticket: "JIRA-123" });

    const meta = getStoryMeta(testInfo);
    expect(meta!.tickets).toEqual(["JIRA-123"]);
  });

  test("accepts options with multiple tickets", async ({}, testInfo) => {
    story.init(testInfo, { ticket: ["JIRA-123", "JIRA-456"] });

    const meta = getStoryMeta(testInfo);
    expect(meta!.tickets).toEqual(["JIRA-123", "JIRA-456"]);
  });

  test("accepts options with meta", async ({}, testInfo) => {
    story.init(testInfo, { meta: { priority: "high", team: "platform" } });

    const meta = getStoryMeta(testInfo);
    expect(meta!.meta).toEqual({ priority: "high", team: "platform" });
  });
});

test.describe("story step markers", () => {
  test("adds Given step", async ({}, testInfo) => {
    story.init(testInfo);
    story.given("two numbers 5 and 3");

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps).toHaveLength(1);
    expect(meta!.steps[0]).toMatchObject({
      keyword: "Given",
      text: "two numbers 5 and 3",
      docs: [],
    });
  });

  test("adds When step", async ({}, testInfo) => {
    story.init(testInfo);
    story.when("I add them together");

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps).toHaveLength(1);
    expect(meta!.steps[0]).toMatchObject({
      keyword: "When",
      text: "I add them together",
      docs: [],
    });
  });

  test("adds Then step", async ({}, testInfo) => {
    story.init(testInfo);
    story.then("the result is 8");

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps).toHaveLength(1);
    expect(meta!.steps[0]).toMatchObject({
      keyword: "Then",
      text: "the result is 8",
      docs: [],
    });
  });

  test("adds And step", async ({}, testInfo) => {
    story.init(testInfo);
    story.and("another condition");

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps[0].keyword).toBe("And");
  });

  test("adds But step", async ({}, testInfo) => {
    story.init(testInfo);
    story.but("not this condition");

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps[0].keyword).toBe("But");
  });

  test("builds full Given/When/Then sequence", async ({}, testInfo) => {
    story.init(testInfo);

    story.given("two numbers 5 and 3");
    story.when("I add them together");
    story.then("the result is 8");

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps).toHaveLength(3);
    expect(meta!.steps.map((s) => s.keyword)).toEqual(["Given", "When", "Then"]);
    expect(meta!.steps.map((s) => s.text)).toEqual([
      "two numbers 5 and 3",
      "I add them together",
      "the result is 8",
    ]);
  });
});

test.describe("story step aliases", () => {
  test("arrange is alias for Given", async ({}, testInfo) => {
    story.init(testInfo);
    story.arrange("setup state");

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps[0].keyword).toBe("Given");
  });

  test("act is alias for When", async ({}, testInfo) => {
    story.init(testInfo);
    story.act("perform action");

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps[0].keyword).toBe("When");
  });

  test("assert is alias for Then", async ({}, testInfo) => {
    story.init(testInfo);
    story.assert("verify result");

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps[0].keyword).toBe("Then");
  });

  test("setup/context are aliases for Given", async ({}, testInfo) => {
    story.init(testInfo);
    story.setup("initial state");
    story.context("additional context");

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps[0].keyword).toBe("Given");
    expect(meta!.steps[1].keyword).toBe("Given");
  });

  test("execute/action are aliases for When", async ({}, testInfo) => {
    story.init(testInfo);
    story.execute("run operation");
    story.action("perform action");

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps[0].keyword).toBe("When");
    expect(meta!.steps[1].keyword).toBe("When");
  });

  test("verify is alias for Then", async ({}, testInfo) => {
    story.init(testInfo);
    story.verify("check outcome");

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps[0].keyword).toBe("Then");
  });
});

test.describe("step with inline docs", () => {
  test("adds json inline doc", async ({}, testInfo) => {
    story.init(testInfo);
    story.given("valid credentials", {
      json: { label: "Credentials", value: { email: "test@example.com", password: "***" } },
    });

    const meta = getStoryMeta(testInfo);
    const step = meta!.steps[0];
    expect(step.docs).toHaveLength(1);
    expect(step.docs![0].kind).toBe("code");
    const codeEntry = step.docs![0] as { kind: "code"; label: string; lang: string; content: string };
    expect(codeEntry.label).toBe("Credentials");
    expect(codeEntry.lang).toBe("json");
    expect(JSON.parse(codeEntry.content)).toEqual({
      email: "test@example.com",
      password: "***",
    });
  });

  test("adds note inline doc", async ({}, testInfo) => {
    story.init(testInfo);
    story.then("user is authenticated", {
      note: "Session cookie is set",
    });

    const meta = getStoryMeta(testInfo);
    const step = meta!.steps[0];
    expect(step.docs).toHaveLength(1);
    expect(step.docs![0]).toEqual({
      kind: "note",
      text: "Session cookie is set",
      phase: "runtime",
    });
  });

  test("adds multiple inline docs", async ({}, testInfo) => {
    story.init(testInfo);
    story.given("order data", {
      json: { label: "Order", value: { id: 123 } },
      note: "Order ID is auto-generated",
      tag: "order",
    });

    const meta = getStoryMeta(testInfo);
    const step = meta!.steps[0];
    expect(step.docs).toHaveLength(3);
    expect(step.docs!.map((d) => d.kind)).toContain("code");
    expect(step.docs!.map((d) => d.kind)).toContain("note");
    expect(step.docs!.map((d) => d.kind)).toContain("tag");
  });

  test("adds table inline doc", async ({}, testInfo) => {
    story.init(testInfo);
    story.then("items are listed", {
      table: {
        label: "Items",
        columns: ["Item", "Qty"],
        rows: [["Widget", "1"], ["Gadget", "2"]],
      },
    });

    const meta = getStoryMeta(testInfo);
    const step = meta!.steps[0];
    expect(step.docs).toHaveLength(1);
    expect(step.docs![0].kind).toBe("table");
  });

  test("adds kv inline docs", async ({}, testInfo) => {
    story.init(testInfo);
    story.when("payment processed", {
      kv: { "Payment ID": "pay_123", Amount: "$99.99" },
    });

    const meta = getStoryMeta(testInfo);
    const step = meta!.steps[0];
    expect(step.docs).toHaveLength(2);
    expect(step.docs!.every((d) => d.kind === "kv")).toBe(true);
  });

  test("adds link inline doc", async ({}, testInfo) => {
    story.init(testInfo);
    story.given("API endpoint", {
      link: { label: "API Docs", url: "https://docs.example.com" },
    });

    const meta = getStoryMeta(testInfo);
    const step = meta!.steps[0];
    expect(step.docs).toHaveLength(1);
    expect(step.docs![0]).toEqual({
      kind: "link",
      label: "API Docs",
      url: "https://docs.example.com",
      phase: "runtime",
    });
  });
});

test.describe("standalone doc methods", () => {
  test("story.note() after step attaches to step", async ({}, testInfo) => {
    story.init(testInfo);
    story.given("precondition");
    story.note("This is important");

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps[0].docs).toHaveLength(1);
    expect(meta!.steps[0].docs![0].kind).toBe("note");
  });

  test("story.note() before steps attaches to story-level", async ({}, testInfo) => {
    story.init(testInfo);
    story.note("This test requires a running database");
    story.given("database is seeded");

    const meta = getStoryMeta(testInfo);
    expect(meta!.docs).toHaveLength(1);
    expect(meta!.docs![0]).toEqual({
      kind: "note",
      text: "This test requires a running database",
      phase: "runtime",
    });
    expect(meta!.steps[0].docs).toHaveLength(0);
  });

  test("story.link() before steps attaches to story-level", async ({}, testInfo) => {
    story.init(testInfo);
    story.link({ label: "API Docs", url: "https://docs.example.com/api" });
    story.given("API is available");

    const meta = getStoryMeta(testInfo);
    expect(meta!.docs).toHaveLength(1);
    expect(meta!.docs![0].kind).toBe("link");
  });

  test("story.kv() attaches to current step", async ({}, testInfo) => {
    story.init(testInfo);
    story.when("payment is processed");
    story.kv({ label: "Payment ID", value: "pay_abc123" });
    story.kv({ label: "Amount", value: "$99.99" });

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps[0].docs).toHaveLength(2);
    expect(meta!.steps[0].docs!.every((d) => d.kind === "kv")).toBe(true);
  });

  test("story.json() attaches to current step", async ({}, testInfo) => {
    story.init(testInfo);
    story.given("an order exists");
    story.json({ label: "Order", value: { id: 123, items: ["widget", "gadget"] } });

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps[0].docs).toHaveLength(1);
    expect(meta!.steps[0].docs![0].kind).toBe("code");
    const entry = meta!.steps[0].docs![0] as { kind: "code"; lang: string };
    expect(entry.lang).toBe("json");
  });

  test("story.table() attaches to current step", async ({}, testInfo) => {
    story.init(testInfo);
    story.then("order is confirmed");
    story.table({
      label: "Order Summary",
      columns: ["Item", "Qty", "Price"],
      rows: [["Widget", "1", "$49.99"], ["Gadget", "1", "$50.00"]],
    });

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps[0].docs).toHaveLength(1);
    expect(meta!.steps[0].docs![0].kind).toBe("table");
  });

  test("story.code() attaches to current step", async ({}, testInfo) => {
    story.init(testInfo);
    story.given("a config file");
    story.code({ label: "Config", content: "port: 3000\nhost: localhost", lang: "yaml" });

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps[0].docs).toHaveLength(1);
    const entry = meta!.steps[0].docs![0] as { kind: "code"; lang: string; content: string };
    expect(entry.kind).toBe("code");
    expect(entry.lang).toBe("yaml");
    expect(entry.content).toBe("port: 3000\nhost: localhost");
  });

  test("story.mermaid() attaches to current step", async ({}, testInfo) => {
    story.init(testInfo);
    story.when("workflow executes");
    story.mermaid({ code: "graph LR\n  A-->B-->C", title: "Workflow" });

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps[0].docs).toHaveLength(1);
    expect(meta!.steps[0].docs![0].kind).toBe("mermaid");
  });

  test("story.screenshot() attaches to current step", async ({}, testInfo) => {
    story.init(testInfo);
    story.then("page renders correctly");
    story.screenshot({ path: "/screenshots/result.png", alt: "Final result" });

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps[0].docs).toHaveLength(1);
    expect(meta!.steps[0].docs![0]).toEqual({
      kind: "screenshot",
      path: "/screenshots/result.png",
      alt: "Final result",
      phase: "runtime",
    });
  });

  test("story.tag() attaches to current step", async ({}, testInfo) => {
    story.init(testInfo);
    story.given("admin user");
    story.tag(["admin", "elevated"]);

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps[0].docs).toHaveLength(1);
    expect(meta!.steps[0].docs![0]).toEqual({
      kind: "tag",
      names: ["admin", "elevated"],
      phase: "runtime",
    });
  });

  test("story.custom() attaches to current step", async ({}, testInfo) => {
    story.init(testInfo);
    story.given("custom data");
    story.custom({ type: "myType", data: { foo: "bar" } });

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps[0].docs).toHaveLength(1);
    expect(meta!.steps[0].docs![0]).toEqual({
      kind: "custom",
      type: "myType",
      data: { foo: "bar" },
      phase: "runtime",
    });
  });

  test("story.section() attaches to current step", async ({}, testInfo) => {
    story.init(testInfo);
    story.given("complex setup");
    story.section({ title: "Details", markdown: "This is **markdown** content" });

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps[0].docs).toHaveLength(1);
    expect(meta!.steps[0].docs![0]).toEqual({
      kind: "section",
      title: "Details",
      markdown: "This is **markdown** content",
      phase: "runtime",
    });
  });
});

test.describe("story.fn() - step wrapper", () => {
  test("wraps a sync function as a step with wrapped: true", async ({}, testInfo) => {
    story.init(testInfo);
    const result = story.fn("Given", "two numbers", () => ({ a: 5, b: 3 }));

    expect(result).toEqual({ a: 5, b: 3 });

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps).toHaveLength(1);
    const step = meta!.steps[0] as { keyword: string; text: string; wrapped?: boolean };
    expect(step.keyword).toBe("Given");
    expect(step.text).toBe("two numbers");
    expect(step.wrapped).toBe(true);
  });

  test("wraps an async function", async ({}, testInfo) => {
    story.init(testInfo);
    const result = await story.fn("When", "compute", async () => 5 + 3);

    expect(result).toBe(8);
    const meta = getStoryMeta(testInfo);
    const step = meta!.steps[0] as { keyword: string; wrapped?: boolean };
    expect(step.keyword).toBe("When");
    expect(step.wrapped).toBe(true);
  });

  test("records durationMs on the step", async ({}, testInfo) => {
    story.init(testInfo);
    story.fn("Given", "setup", () => {});

    const meta = getStoryMeta(testInfo);
    const step = meta!.steps[0] as { durationMs?: number };
    expect(typeof step.durationMs).toBe("number");
    expect(step.durationMs).toBeGreaterThanOrEqual(0);
  });

  test("re-throws errors from the wrapped function", async ({}, testInfo) => {
    story.init(testInfo);
    expect(() => story.fn("When", "boom", () => { throw new Error("kaboom"); })).toThrow("kaboom");

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps).toHaveLength(1);
  });

  test("syncs annotation after fn completes", async ({}, testInfo) => {
    story.init(testInfo);
    story.fn("Given", "step one", () => {});

    // Verify annotation was synced (meta in annotation should include the step)
    const annotation = testInfo.annotations.find((a) => a.type === "story-meta");
    const meta = JSON.parse(annotation!.description!);
    expect(meta.steps).toHaveLength(1);
    expect(meta.steps[0].wrapped).toBe(true);
    expect(typeof meta.steps[0].durationMs).toBe("number");
  });

  test("integrates markers and fn in a full scenario", async ({}, testInfo) => {
    story.init(testInfo);
    story.given("user is logged in");
    const data = story.fn("When", "submit form", () => ({ id: 1 }));
    story.fn("Then", "response is valid", () => { expect(data.id).toBe(1); });

    const meta = getStoryMeta(testInfo);
    const steps = meta!.steps as Array<{ wrapped?: boolean }>;
    expect(steps).toHaveLength(3);
    expect(steps[0].wrapped).toBeUndefined();
    expect(steps[1].wrapped).toBe(true);
    expect(steps[2].wrapped).toBe(true);
  });
});

test.describe("story.expect() - Then wrapper", () => {
  test("wraps assertion as a Then step with wrapped: true", async ({}, testInfo) => {
    story.init(testInfo);
    story.expect("result is correct", () => { expect(8).toBe(8); });

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps).toHaveLength(1);
    const step = meta!.steps[0] as { keyword: string; wrapped?: boolean };
    expect(step.keyword).toBe("Then");
    expect(step.wrapped).toBe(true);
  });

  test("re-throws assertion errors", async ({}, testInfo) => {
    story.init(testInfo);
    expect(() => story.expect("wrong", () => { expect(1).toBe(2); })).toThrow();

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps).toHaveLength(1);
  });

  test("records durationMs", async ({}, testInfo) => {
    story.init(testInfo);
    story.expect("fast check", () => { expect(true).toBe(true); });

    const meta = getStoryMeta(testInfo);
    const step = meta!.steps[0] as { durationMs?: number };
    expect(typeof step.durationMs).toBe("number");
  });
});

test.describe("describe and nested describe behavior", () => {
  test.describe("Calculator", () => {
    test.describe("Basic Operations", () => {
      test("extracts suitePath from nested describes", async ({}, testInfo) => {
        story.init(testInfo);
        story.given("two numbers");
        story.when("added");
        story.then("result is correct");

        const meta = getStoryMeta(testInfo);
        expect(meta!.scenario).toBe("extracts suitePath from nested describes");
        // titlePath in Playwright is [projectName, ...describes, testTitle]
        // suitePath should be the describes without project and test name
        expect(meta!.suitePath).toBeDefined();
        expect(meta!.suitePath).toContain("Calculator");
        expect(meta!.suitePath).toContain("Basic Operations");
      });
    });
  });
});
