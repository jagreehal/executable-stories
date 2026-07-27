/**
 * Tests for the Cypress story API step callbacks.
 *
 * Since the Cypress story API requires Cypress browser globals,
 * we mock Cypress.currentTest and Cypress.spec to test in Vitest.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { StoryMeta, StoryStep } from "../types";

// Mock Cypress globals before importing story-api
const mockCurrentTest = {
  title: "test",
  titlePath: ["Suite", "test"],
};

const mockSpec = {
  relative: "cypress/e2e/test.cy.ts",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).Cypress = {
  currentTest: mockCurrentTest,
  spec: mockSpec,
};

// Import after setting up globals
const { story, doc, getAndClearMeta } = await import("../story-api");

function resetForTest(title: string, titlePath?: string[]) {
  mockCurrentTest.title = title;
  mockCurrentTest.titlePath = titlePath ?? ["Suite", title];
  // Clear previous meta
  getAndClearMeta();
}

describe("step callbacks", () => {
  beforeEach(() => {
    resetForTest("step callback test");
  });

  afterEach(() => {
    getAndClearMeta();
  });

  it("sync callback returns value and records wrapped + durationMs", () => {
    story.init();
    const result = story.given("two numbers", () => ({ a: 5, b: 3 }));

    expect(result).toEqual({ a: 5, b: 3 });

    const payload = getAndClearMeta();
    const meta = payload!.meta;
    expect(meta.steps).toHaveLength(1);
    expect(meta.steps[0].keyword).toBe("Given");
    expect(meta.steps[0].text).toBe("two numbers");
    expect(meta.steps[0].wrapped).toBe(true);
    expect(typeof meta.steps[0].durationMs).toBe("number");
    expect(meta.steps[0].durationMs).toBeGreaterThanOrEqual(0);
  });

  it("async callback returns value via await", async () => {
    story.init();
    const result = await story.when("I fetch data", async () => 42);

    expect(result).toBe(42);

    const payload = getAndClearMeta();
    const step = payload!.meta.steps[0];
    expect(step.keyword).toBe("When");
    expect(step.wrapped).toBe(true);
    expect(typeof step.durationMs).toBe("number");
  });

  it("void callback returns undefined", () => {
    story.init();
    const result = story.then("check passes", () => {
      expect(true).toBe(true);
    });

    expect(result).toBeUndefined();

    const payload = getAndClearMeta();
    expect(payload!.meta.steps[0].wrapped).toBe(true);
  });

  it("error in callback re-throws, step still recorded", () => {
    story.init();
    expect(() =>
      story.when("failing action", () => {
        throw new Error("boom");
      }),
    ).toThrow("boom");

    const payload = getAndClearMeta();
    const meta = payload!.meta;
    expect(meta.steps).toHaveLength(1);
    expect(meta.steps[0].keyword).toBe("When");
    expect(meta.steps[0].wrapped).toBe(true);
    expect(typeof meta.steps[0].durationMs).toBe("number");
  });

  it("backward compat: marker-only still works (no wrapped)", () => {
    story.init();
    story.given("a precondition");

    const payload = getAndClearMeta();
    const step = payload!.meta.steps[0];
    expect(step.keyword).toBe("Given");
    expect(step.wrapped).toBeUndefined();
    expect(step.durationMs).toBeUndefined();
  });

  it("html: inline content attaches a sandboxed html doc entry", () => {
    story.init();
    story.html({ content: "<h1>Report</h1>", title: "Coverage", height: 600 });

    const payload = getAndClearMeta();
    const docs = payload!.meta.docs;
    expect(docs).toContainEqual(
      expect.objectContaining({ kind: "html", content: "<h1>Report</h1>", title: "Coverage", height: 600 }),
    );
  });

  it("html: throws unless exactly one of path/url/content is set", () => {
    story.init();
    expect(() => story.html({})).toThrow(/exactly one/);
    expect(() => story.html({ path: "a.html", content: "<p>x</p>" })).toThrow(/exactly one/);
    getAndClearMeta();
  });

  it("backward compat: inline docs still work", () => {
    story.init();
    story.given("valid credentials", {
      note: "Session cookie is set",
    });

    const payload = getAndClearMeta();
    const step = payload!.meta.steps[0];
    expect(step.wrapped).toBeUndefined();
    expect(step.docs).toHaveLength(1);
    expect(step.docs![0].kind).toBe("note");
  });

  it("integration: mixed markers, callbacks, and docs in one scenario", () => {
    story.init();
    story.given("user is logged in");
    const data = story.when("user submits form", () => ({ id: 1 }));
    story.then("response is valid", () => { expect(data.id).toBe(1); });
    story.and("confirmation appears");

    const payload = getAndClearMeta();
    const steps = payload!.meta.steps;
    expect(steps).toHaveLength(4);
    expect(steps[0].wrapped).toBeUndefined();
    expect(steps[1].wrapped).toBe(true);
    expect(steps[2].wrapped).toBe(true);
    expect(steps[3].wrapped).toBeUndefined();
  });

  it("auto-converts repeated primary callback keywords to And", () => {
    story.init();

    story.given("first precondition", () => 1);
    story.given("second precondition", () => 2);
    story.when("first action", () => "a");
    story.when("second action", () => "b");
    story.then("first assertion", () => true);
    story.then("second assertion", () => true);

    const payload = getAndClearMeta();
    expect(payload!.meta.steps.map((step) => step.keyword)).toEqual([
      "Given",
      "And",
      "When",
      "And",
      "Then",
      "And",
    ]);
  });

  it("auto-converts repeated primary keywords across callback and marker styles", () => {
    story.init();

    story.given("first precondition", () => 1);
    story.given("second precondition marker-only");
    story.when("first action", () => "a");
    story.when("second action marker-only");
    story.then("first assertion", () => true);
    story.then("second assertion marker-only");

    const payload = getAndClearMeta();
    expect(payload!.meta.steps.map((step) => step.keyword)).toEqual([
      "Given",
      "And",
      "When",
      "And",
      "Then",
      "And",
    ]);
  });

  it("auto-converts repeated primary keywords for story.fn, including with markers", () => {
    story.init();

    story.fn("Given", "first precondition", () => 1);
    story.given("second precondition marker-only");
    story.fn("When", "first action", () => "a");
    story.when("second action marker-only");
    story.fn("Then", "first assertion", () => true);
    story.then("second assertion marker-only");

    const payload = getAndClearMeta();
    expect(payload!.meta.steps.map((step) => step.keyword)).toEqual([
      "Given",
      "And",
      "When",
      "And",
      "Then",
      "And",
    ]);
  });

  it("auto-converts repeated primary keywords when using story.fn only", () => {
    story.init();

    story.fn("Given", "first precondition", () => 1);
    story.fn("Given", "second precondition", () => 2);
    story.fn("When", "first action", () => "a");
    story.fn("When", "second action", () => "b");
    story.fn("Then", "first assertion", () => true);
    story.fn("Then", "second assertion", () => true);

    const payload = getAndClearMeta();
    expect(payload!.meta.steps.map((step) => step.keyword)).toEqual([
      "Given",
      "And",
      "When",
      "And",
      "Then",
      "And",
    ]);
  });
});

describe("doc methods return DocEntry", () => {
  beforeEach(() => {
    resetForTest("doc return test");
  });

  afterEach(() => {
    getAndClearMeta();
  });

  it("note() returns its DocEntry", () => {
    story.init();
    story.given("precondition");
    const entry = story.note("important note");

    expect(entry).toEqual({
      kind: "note",
      text: "important note",
      phase: "runtime",
    });
  });

  it("kv() returns its DocEntry", () => {
    story.init();
    story.given("precondition");
    const entry = story.kv({ label: "ID", value: "abc" });

    expect(entry).toEqual({
      kind: "kv",
      label: "ID",
      value: "abc",
      phase: "runtime",
    });
  });

  it("json() returns its DocEntry", () => {
    story.init();
    story.given("precondition");
    const entry = story.json({ label: "Data", value: { x: 1 } });

    expect(entry.kind).toBe("code");
    expect((entry as { lang?: string }).lang).toBe("json");
  });

  it("state() attaches to current step with label and returns its DocEntry", () => {
    story.init();
    story.when("the user completes checkout");
    const entry = story.state({ label: "order", value: { id: 1042, status: "paid" } });

    expect(entry).toEqual({
      kind: "state",
      label: "order",
      value: { id: 1042, status: "paid" },
      phase: "runtime",
    });

    const payload = getAndClearMeta();
    expect(payload!.meta.steps[0].docs).toEqual([entry]);
  });

  it("state() without label", () => {
    story.init();
    story.given("a cart");
    const entry = story.state({ value: { items: 3 } });

    expect(entry).toEqual({ kind: "state", value: { items: 3 }, phase: "runtime" });
  });

  it("state() before any step attaches to story-level", () => {
    story.init();
    story.state({ label: "initial", value: { users: 0 } });
    story.given("a step");

    const payload = getAndClearMeta();
    expect(payload!.meta.docs).toHaveLength(1);
    expect(payload!.meta.docs![0].kind).toBe("state");
    expect(payload!.meta.steps[0].docs).toHaveLength(0);
  });

  it("state() over 100KB warns but still records", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      story.init();
      story.given("a huge world");
      story.state({ label: "big", value: { blob: "x".repeat(150_000) } });

      expect(warnSpy).toHaveBeenCalledTimes(1);
      const message = warnSpy.mock.calls[0][0] as string;
      expect(message).toContain('[executable-stories] state "big" is ');
      expect(message).toContain("KB — consider capturing a projection");

      const payload = getAndClearMeta();
      expect(payload!.meta.steps[0].docs).toHaveLength(1);
      expect(payload!.meta.steps[0].docs![0].kind).toBe("state");
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("inline state docs on a step marker", () => {
    story.init();
    story.then("the order is confirmed", { state: { label: "order", value: { status: "confirmed" } } });

    const payload = getAndClearMeta();
    expect(payload!.meta.steps[0].docs).toEqual([
      { kind: "state", label: "order", value: { status: "confirmed" }, phase: "runtime" },
    ]);
  });

  it("note() with children attaches them and deduplicates", () => {
    story.init();
    story.given("precondition");

    const child1 = story.kv({ label: "A", value: 1 });
    const child2 = story.kv({ label: "B", value: 2 });
    const parent = story.note("parent note", [child1, child2]);

    expect(parent.children).toHaveLength(2);
    expect(parent.children).toEqual([child1, child2]);

    // Children should be deduplicated from step-level flat docs
    const payload = getAndClearMeta();
    const stepDocs = payload!.meta.steps[0].docs!;
    // stepDocs should contain only the parent (children removed from flat array)
    expect(stepDocs).toHaveLength(1);
    expect(stepDocs[0]).toBe(parent);
  });

  it("recursive children work (nested nesting)", () => {
    story.init();
    story.given("precondition");

    const grandchild = story.kv({ label: "Inner", value: "deep" });
    const child = story.note("mid-level", [grandchild]);
    const parent = story.section({ title: "Top", markdown: "root" }, [child]);

    expect(parent.children).toHaveLength(1);
    expect(parent.children![0]).toBe(child);
    expect(child.children).toHaveLength(1);
    expect(child.children![0]).toBe(grandchild);

    // Only parent should remain in step docs flat array
    const payload = getAndClearMeta();
    const stepDocs = payload!.meta.steps[0].docs!;
    expect(stepDocs).toHaveLength(1);
    expect(stepDocs[0]).toBe(parent);
  });

  it("children deduplication works at story-level (before any step)", () => {
    story.init();

    const child = story.kv({ label: "Key", value: "val" });
    const parent = story.note("story-level parent", [child]);

    const payload = getAndClearMeta();
    expect(payload!.meta.docs).toHaveLength(1);
    expect(payload!.meta.docs![0]).toBe(parent);
    expect(parent.children).toEqual([child]);
  });

  it("reparents children out of earlier steps when a later doc method nests them", () => {
    story.init();
    story.given("first step");
    const child = story.note("shared child");

    story.when("second step");
    const parent = story.note("parent note", [child]);

    const payload = getAndClearMeta();
    expect(payload!.meta.steps[0].docs).toEqual([]);
    expect(payload!.meta.steps[1].docs).toEqual([parent]);
    expect(parent.children).toEqual([child]);
  });
});

describe("step markers accept DocEntry[] children", () => {
  beforeEach(() => {
    resetForTest("step children test");
  });

  afterEach(() => {
    getAndClearMeta();
  });

  it("given() accepts DocEntry[] as second param", () => {
    story.init();

    // Create docs at story-level (before any step)
    const child1 = story.kv({ label: "User", value: "alice" });
    const child2 = story.note("note about user");

    // Now attach as children to a step
    story.given("a user exists", [child1, child2]);

    const payload = getAndClearMeta();
    const meta = payload!.meta;
    // The given step should have child1 and child2 as its docs
    const givenStep = meta.steps[0];
    expect(givenStep.keyword).toBe("Given");
    expect(givenStep.text).toBe("a user exists");
    expect(givenStep.docs).toContain(child1);
    expect(givenStep.docs).toContain(child2);

    // Children should be deduplicated from story-level docs
    expect(meta.docs ?? []).toHaveLength(0);
  });

  it("when() accepts DocEntry[] and deduplicates from earlier steps", () => {
    story.init();

    story.given("setup");
    const child = story.kv({ label: "Amount", value: "$50" });

    // child is on the Given step. Now pass it as children to When step.
    story.when("payment processed", [child]);

    const payload = getAndClearMeta();
    const meta = payload!.meta;
    // child should be removed from Given step docs
    expect(meta.steps[0].docs).toHaveLength(0);
    // child should be on When step
    expect(meta.steps[1].docs).toContain(child);
  });
});

describe("ticket normalization for objects", () => {
  beforeEach(() => {
    resetForTest("ticket test");
  });

  afterEach(() => {
    getAndClearMeta();
  });

  it("normalizes string ticket to { id } object", () => {
    story.init({ ticket: "JIRA-123" });

    const payload = getAndClearMeta();
    expect(payload!.meta.tickets).toEqual([{ id: "JIRA-123" }]);
  });

  it("normalizes object ticket with id and url", () => {
    story.init({
      ticket: { id: "PAY-1042", url: "https://jira.example.com/browse/PAY-1042" },
    });

    const payload = getAndClearMeta();
    expect(payload!.meta.tickets).toEqual([
      { id: "PAY-1042", url: "https://jira.example.com/browse/PAY-1042" },
    ]);
  });

  it("normalizes mixed array of strings and objects", () => {
    story.init({
      ticket: [
        "JIRA-123",
        { id: "PAY-1042", url: "https://jira.example.com/browse/PAY-1042" },
        "BUG-999",
      ],
    });

    const payload = getAndClearMeta();
    expect(payload!.meta.tickets).toEqual([
      { id: "JIRA-123" },
      { id: "PAY-1042", url: "https://jira.example.com/browse/PAY-1042" },
      { id: "BUG-999" },
    ]);
  });

  it("returns undefined when no ticket provided", () => {
    story.init();

    const payload = getAndClearMeta();
    expect(payload!.meta.tickets).toBeUndefined();
  });
});

describe("trace url template", () => {
  beforeEach(() => {
    resetForTest("trace docs");
  });

  afterEach(() => {
    getAndClearMeta();
  });

  it("adds trace docs when traceId exists in attached spans", () => {
    story.init({
      traceUrlTemplate: "https://grafana.example.com/explore?traceId={traceId}",
    });
    story.attachSpans([{ traceId: "trace-123", spanId: "span-1" }]);

    const payload = getAndClearMeta();
    expect(payload!.meta.meta).toEqual({ otel: { traceId: "trace-123" } });
    expect(payload!.meta.docs).toEqual([
      { kind: "kv", label: "Trace ID", value: "trace-123", phase: "runtime" },
      {
        kind: "link",
        label: "View Trace",
        url: "https://grafana.example.com/explore?traceId=trace-123",
        phase: "runtime",
      },
    ]);
  });

  it("extracts traceId from nested context.traceId", () => {
    story.init({ traceUrlTemplate: "https://example.com/{traceId}" });
    story.attachSpans([{ context: { traceId: "nested-trace" } } as unknown as Record<string, unknown>]);

    const payload = getAndClearMeta();
    expect(payload!.meta.meta).toEqual({ otel: { traceId: "nested-trace" } });
    expect(payload!.meta.docs?.[1]).toEqual({
      kind: "link",
      label: "View Trace",
      url: "https://example.com/nested-trace",
      phase: "runtime",
    });
  });

  it("does not add trace docs when no traceId is present", () => {
    story.init({ traceUrlTemplate: "https://example.com/{traceId}" });
    story.attachSpans([{ spanId: "span-1" }]);

    const payload = getAndClearMeta();
    expect(payload!.meta.meta).toBeUndefined();
    expect(payload!.meta.docs).toBeUndefined();
  });
});

describe("step modifiers", () => {
  beforeEach(() => {
    resetForTest("step modifiers");
  });

  afterEach(() => {
    getAndClearMeta();
  });

  it("records step modes for modifier variants", () => {
    story.init();
    story.given.skip("a skipped precondition");
    story.when.only("an only action");
    story.then.todo("a pending assertion");
    story.and.fails("a known failing step");
    story.but.concurrent("a concurrent constraint");

    const payload = getAndClearMeta();
    expect(payload!.meta.steps.map((step) => step.mode)).toEqual([
      "skip",
      "only",
      "todo",
      "fails",
      "concurrent",
    ]);
  });

  it("applies auto-And conversion with modifiers", () => {
    story.init();
    story.given("first precondition");
    story.given.skip("second precondition");
    story.when("first action");
    story.when.todo("second action");
    story.then("first assertion");
    story.then.fails("second assertion");

    const payload = getAndClearMeta();
    expect(payload!.meta.steps.map((step) => step.keyword)).toEqual([
      "Given",
      "And",
      "When",
      "And",
      "Then",
      "And",
    ]);
    expect(payload!.meta.steps.map((step) => step.mode)).toEqual([
      undefined,
      "skip",
      undefined,
      "todo",
      undefined,
      "fails",
    ]);
  });
});

describe("scenario modifiers", () => {
  afterEach(() => {
    getAndClearMeta();
    delete (globalThis as { it?: unknown }).it;
  });

  it("story.skip delegates to it.skip and initializes story context", () => {
    const calls: Array<{ title: string }> = [];
    const mockIt = ((title: string, body: () => void) => body()) as ((title: string, body: () => void) => void) & {
      skip?: (title: string, body: () => void) => void;
      only?: (title: string, body: () => void) => void;
    };
    mockIt.skip = (title, body) => {
      calls.push({ title });
      mockCurrentTest.title = title;
      mockCurrentTest.titlePath = ["Suite", title];
      body();
    };
    (globalThis as { it?: typeof mockIt }).it = mockIt;

    story.skip("skipped scenario", () => {
      story.given("a skipped setup");
    }, { tags: ["skip"] });

    const payload = getAndClearMeta();
    expect(calls).toEqual([{ title: "skipped scenario" }]);
    expect(payload!.meta.scenario).toBe("skipped scenario");
    expect(payload!.meta.tags).toEqual(["skip"]);
    expect(payload!.meta.steps[0].text).toBe("a skipped setup");
  });

  it("story.only delegates to it.only and initializes story context", () => {
    const calls: Array<{ title: string }> = [];
    const mockIt = ((title: string, body: () => void) => body()) as ((title: string, body: () => void) => void) & {
      skip?: (title: string, body: () => void) => void;
      only?: (title: string, body: () => void) => void;
    };
    mockIt.only = (title, body) => {
      calls.push({ title });
      mockCurrentTest.title = title;
      mockCurrentTest.titlePath = ["Suite", title];
      body();
    };
    (globalThis as { it?: typeof mockIt }).it = mockIt;

    story.only("focused scenario", () => {
      story.given("a focused setup");
    });

    const payload = getAndClearMeta();
    expect(calls).toEqual([{ title: "focused scenario" }]);
    expect(payload!.meta.scenario).toBe("focused scenario");
    expect(payload!.meta.steps[0].text).toBe("a focused setup");
  });

  it("throws if global it is unavailable", () => {
    expect(() => story.skip("broken", () => undefined)).toThrow(
      "Global it() is not available"
    );
  });
});

describe("doc.story", () => {
  beforeEach(() => {
    resetForTest("native test title");
  });

  afterEach(() => {
    getAndClearMeta();
  });

  it("overrides scenario title in plain test mode", () => {
    doc.story("Friendly scenario title");
    story.given("a plain test step");

    const payload = getAndClearMeta();
    expect(payload!.meta.scenario).toBe("Friendly scenario title");
    expect(payload!.meta.steps[0].text).toBe("a plain test step");
  });

  it("supports callback form as story replacement", () => {
    doc.story("Callback scenario", (s) => {
      s.given("a callback setup");
      s.when("an action happens");
      s.then("an assertion is documented");
    });

    const payload = getAndClearMeta();
    expect(payload!.meta.scenario).toBe("Callback scenario");
    expect(payload!.meta.steps.map((step) => step.keyword)).toEqual([
      "Given",
      "When",
      "Then",
    ]);
  });
});
