/**
 * Tests for the Jest story API: init, steps, doc methods, flush.
 * Runs inside Jest so expect.getState() provides currentTestName and testPath.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { tmpdir } from "node:os";
import { describe, it, expect, beforeAll, afterEach } from "@jest/globals";
import * as executableStories from "../index";
import { story, _internal } from "../story-api";

const testOutputDir = path.join(
  tmpdir(),
  `jest-executable-stories-test-${Date.now()}`
);
const workerDir = path.join(testOutputDir, "worker-0");

function readFlushedReports(): Array<{ testFilePath: string; scenarios: unknown[] }> {
  if (!fs.existsSync(workerDir)) return [];
  const files = fs.readdirSync(workerDir).filter((f) => f.endsWith(".json"));
  const reports: Array<{ testFilePath: string; scenarios: unknown[] }> = [];
  for (const file of files) {
    const raw = fs.readFileSync(path.join(workerDir, file), "utf8");
    const parsed = JSON.parse(raw) as { testFilePath: string; scenarios: unknown[] };
    if (parsed?.testFilePath && Array.isArray(parsed.scenarios)) reports.push(parsed);
  }
  return reports;
}

function getLastScenario(): { scenario: string; steps: unknown[]; docs?: unknown[]; tags?: string[]; tickets?: string[]; meta?: unknown } | null {
  const reports = readFlushedReports();
  if (reports.length === 0) return null;
  const lastReport = reports[reports.length - 1];
  const scenarios = lastReport.scenarios as Array<{ scenario: string; steps: unknown[]; docs?: unknown[]; tags?: string[]; tickets?: string[]; meta?: unknown }>;
  return scenarios.length > 0 ? scenarios[scenarios.length - 1] : null;
}

describe("story API", () => {
  describe("public API surface", () => {
    it("exports top-level step helpers", () => {
      expect(typeof executableStories.given).toBe("function");
      expect(typeof executableStories.when).toBe("function");
      expect(typeof executableStories.then).toBe("function");
      expect(typeof executableStories.and).toBe("function");
      expect(typeof executableStories.but).toBe("function");
    });
  });

  beforeAll(() => {
    process.env.JEST_STORY_DOCS_DIR = testOutputDir;
    process.env.JEST_WORKER_ID = "0";
    if (!fs.existsSync(workerDir)) fs.mkdirSync(workerDir, { recursive: true });
  });

  afterEach(() => {
    _internal.clearContext();
    _internal.flushStories();
  });

  describe("story.init()", () => {
    it("registers scenario with current test name and writes on flush", () => {
      story.init();
      _internal.flushStories();

      const s = getLastScenario();
      expect(s).not.toBeNull();
      expect(s!.scenario).toContain("registers scenario with current test name and writes on flush");
      expect(s!.steps).toEqual([]);
    });

    it("accepts options with tags", () => {
      story.init({ tags: ["admin", "security"] });
      _internal.flushStories();

      const s = getLastScenario();
      expect(s!.tags).toEqual(["admin", "security"]);
    });

    it("accepts options with single ticket", () => {
      story.init({ ticket: "JIRA-123" });
      _internal.flushStories();

      const s = getLastScenario();
      expect(s!.tickets).toEqual(["JIRA-123"]);
    });

    it("accepts options with multiple tickets", () => {
      story.init({ ticket: ["JIRA-123", "JIRA-456"] });
      _internal.flushStories();

      const s = getLastScenario();
      expect(s!.tickets).toEqual(["JIRA-123", "JIRA-456"]);
    });

    it("accepts options with meta", () => {
      story.init({ meta: { priority: "high", team: "platform" } });
      _internal.flushStories();

      const s = getLastScenario();
      expect(s!.meta).toEqual({ priority: "high", team: "platform" });
    });
  });

  describe("getContext()", () => {
    it("throws if init was not called", () => {
      expect(() => story.given("some precondition")).toThrow(/story\.init\(\) must be called/);
    });
  });

  describe("steps", () => {
    it("given/when/then add steps with correct keywords", () => {
      story.init();
      story.given("two numbers 5 and 3");
      story.when("they are added");
      story.then("the result is 8");
      _internal.flushStories();

      const s = getLastScenario();
      expect(s!.steps).toHaveLength(3);
      expect((s!.steps as Array<{ keyword: string; text: string }>).map((st) => ({ k: st.keyword, t: st.text }))).toEqual([
        { k: "Given", t: "two numbers 5 and 3" },
        { k: "When", t: "they are added" },
        { k: "Then", t: "the result is 8" },
      ]);
    });

    it("and/but store correct keywords", () => {
      story.init();
      story.given("first");
      story.given("second");
      story.when("action");
      story.then("result");
      story.but("not the other");
      _internal.flushStories();

      const s = getLastScenario();
      const steps = s!.steps as Array<{ keyword: string; text: string }>;
      expect(steps.map((st) => st.keyword)).toEqual(["Given", "And", "When", "Then", "But"]);
    });
  });

  describe("doc methods", () => {
    it("note adds story-level doc", () => {
      story.init();
      story.note("A note for the story");
      _internal.flushStories();

      const s = getLastScenario();
      expect(s!.docs).toBeDefined();
      expect(s!.docs).toContainEqual(expect.objectContaining({ kind: "note", text: "A note for the story" }));
    });

    it("tag adds story-level doc", () => {
      story.init();
      story.tag(["smoke", "regression"]);
      _internal.flushStories();

      const s = getLastScenario();
      expect(s!.docs).toContainEqual(expect.objectContaining({ kind: "tag", names: ["smoke", "regression"] }));
    });

    it("kv adds story-level doc", () => {
      story.init();
      story.kv({ label: "Environment", value: "staging" });
      _internal.flushStories();

      const s = getLastScenario();
      expect(s!.docs).toContainEqual(expect.objectContaining({ kind: "kv", label: "Environment", value: "staging" }));
    });

    it("json adds story-level doc", () => {
      story.init();
      story.json({ label: "Config", value: { foo: 1 } });
      _internal.flushStories();

      const s = getLastScenario();
      expect(s!.docs).toBeDefined();
      const jsonEntry = (s!.docs as unknown[]).find((d: unknown) => (d as { kind: string }).kind === "code");
      expect(jsonEntry).toBeDefined();
      expect(jsonEntry).toMatchObject({ label: "Config", lang: "json" });
    });

    it("code adds story-level doc", () => {
      story.init();
      story.code({ label: "Snippet", content: "const x = 1;", lang: "ts" });
      _internal.flushStories();

      const s = getLastScenario();
      expect(s!.docs).toContainEqual(
        expect.objectContaining({ kind: "code", label: "Snippet", content: "const x = 1;", lang: "ts" })
      );
    });

    it("table adds story-level doc", () => {
      story.init();
      story.table({ label: "Matrix", columns: ["A", "B"], rows: [["1", "2"], ["3", "4"]] });
      _internal.flushStories();

      const s = getLastScenario();
      expect(s!.docs).toContainEqual(
        expect.objectContaining({
          kind: "table",
          label: "Matrix",
          columns: ["A", "B"],
          rows: [["1", "2"], ["3", "4"]],
        })
      );
    });

    it("link adds story-level doc", () => {
      story.init();
      story.link({ label: "Spec", url: "https://example.com/spec" });
      _internal.flushStories();

      const s = getLastScenario();
      expect(s!.docs).toContainEqual(
        expect.objectContaining({ kind: "link", label: "Spec", url: "https://example.com/spec" })
      );
    });

    it("section adds story-level doc", () => {
      story.init();
      story.section({ title: "Details", markdown: "Some **markdown**." });
      _internal.flushStories();

      const s = getLastScenario();
      expect(s!.docs).toContainEqual(
        expect.objectContaining({ kind: "section", title: "Details", markdown: "Some **markdown**." })
      );
    });

    it("mermaid adds story-level doc", () => {
      story.init();
      story.mermaid({ code: "graph LR; A-->B", title: "Flow" });
      _internal.flushStories();

      const s = getLastScenario();
      expect(s!.docs).toContainEqual(
        expect.objectContaining({ kind: "mermaid", code: "graph LR; A-->B", title: "Flow" })
      );
    });

    it("screenshot adds story-level doc", () => {
      story.init();
      story.screenshot({ path: "/tmp/screen.png", alt: "UI" });
      _internal.flushStories();

      const s = getLastScenario();
      expect(s!.docs).toContainEqual(
        expect.objectContaining({ kind: "screenshot", path: "/tmp/screen.png", alt: "UI" })
      );
    });

    it("custom adds story-level doc", () => {
      story.init();
      story.custom({ type: "my-type", data: { foo: "bar" } });
      _internal.flushStories();

      const s = getLastScenario();
      expect(s!.docs).toContainEqual(
        expect.objectContaining({ kind: "custom", type: "my-type", data: { foo: "bar" } })
      );
    });
  });

  describe("story.fn() - step wrapper", () => {
    it("wraps a sync function as a step with wrapped: true", () => {
      story.init();
      const result = story.fn("Given", "two numbers", () => ({ a: 5, b: 3 }));
      _internal.flushStories();

      expect(result).toEqual({ a: 5, b: 3 });

      const s = getLastScenario();
      expect(s!.steps).toHaveLength(1);
      const step = (s!.steps as Array<{ keyword: string; text: string; wrapped?: boolean }>)[0];
      expect(step.keyword).toBe("Given");
      expect(step.text).toBe("two numbers");
      expect(step.wrapped).toBe(true);
    });

    it("wraps an async function", async () => {
      story.init();
      const result = await story.fn("When", "compute", async () => 5 + 3);
      _internal.flushStories();

      expect(result).toBe(8);
      const s = getLastScenario();
      const step = (s!.steps as Array<{ keyword: string; wrapped?: boolean }>)[0];
      expect(step.keyword).toBe("When");
      expect(step.wrapped).toBe(true);
    });

    it("records durationMs on the step", () => {
      story.init();
      story.fn("Given", "setup", () => {});
      _internal.flushStories();

      const s = getLastScenario();
      const step = (s!.steps as Array<{ durationMs?: number }>)[0];
      expect(typeof step.durationMs).toBe("number");
      expect(step.durationMs).toBeGreaterThanOrEqual(0);
    });

    it("re-throws errors from the wrapped function", () => {
      story.init();
      expect(() => story.fn("When", "boom", () => { throw new Error("kaboom"); })).toThrow("kaboom");
      _internal.flushStories();

      const s = getLastScenario();
      expect(s!.steps).toHaveLength(1);
    });

    it("integrates markers and fn in a full scenario", () => {
      story.init();
      story.given("user is logged in");
      const data = story.fn("When", "submit form", () => ({ id: 1 }));
      story.fn("Then", "response is valid", () => { expect(data.id).toBe(1); });
      _internal.flushStories();

      const s = getLastScenario();
      const steps = s!.steps as Array<{ wrapped?: boolean }>;
      expect(steps).toHaveLength(3);
      expect(steps[0].wrapped).toBeUndefined();
      expect(steps[1].wrapped).toBe(true);
      expect(steps[2].wrapped).toBe(true);
    });

    it("auto-converts repeated primary keywords for story.fn, including with markers", () => {
      story.init();

      story.fn("Given", "first precondition", () => 1);
      story.given("second precondition marker-only");
      story.fn("When", "first action", () => "a");
      story.when("second action marker-only");
      story.fn("Then", "first assertion", () => true);
      story.then("second assertion marker-only");
      _internal.flushStories();

      const s = getLastScenario();
      const steps = s!.steps as Array<{ keyword: string }>;
      expect(steps.map((step) => step.keyword)).toEqual([
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
      _internal.flushStories();

      const s = getLastScenario();
      const steps = s!.steps as Array<{ keyword: string }>;
      expect(steps.map((step) => step.keyword)).toEqual([
        "Given",
        "And",
        "When",
        "And",
        "Then",
        "And",
      ]);
    });
  });

  describe("story.expect() - Then wrapper", () => {
    it("wraps assertion as a Then step with wrapped: true", () => {
      story.init();
      story.expect("result is correct", () => { expect(8).toBe(8); });
      _internal.flushStories();

      const s = getLastScenario();
      expect(s!.steps).toHaveLength(1);
      const step = (s!.steps as Array<{ keyword: string; wrapped?: boolean }>)[0];
      expect(step.keyword).toBe("Then");
      expect(step.wrapped).toBe(true);
    });

    it("re-throws assertion errors", () => {
      story.init();
      expect(() => story.expect("wrong", () => { expect(1).toBe(2); })).toThrow();
      _internal.flushStories();

      const s = getLastScenario();
      expect(s!.steps).toHaveLength(1);
    });

    it("records durationMs", () => {
      story.init();
      story.expect("fast check", () => { expect(true).toBe(true); });
      _internal.flushStories();

      const s = getLastScenario();
      const step = (s!.steps as Array<{ durationMs?: number }>)[0];
      expect(typeof step.durationMs).toBe("number");
    });
  });

  describe("step callbacks", () => {
    it("sync callback returns value and records wrapped + durationMs", () => {
      story.init();
      const result = story.given("two numbers", () => ({ a: 5, b: 3 }));
      _internal.flushStories();

      expect(result).toEqual({ a: 5, b: 3 });

      const s = getLastScenario();
      const step = (s!.steps as Array<{ keyword: string; text: string; wrapped?: boolean; durationMs?: number }>)[0];
      expect(step.keyword).toBe("Given");
      expect(step.text).toBe("two numbers");
      expect(step.wrapped).toBe(true);
      expect(typeof step.durationMs).toBe("number");
    });

    it("async callback returns value via await", async () => {
      story.init();
      const result = await story.when("I fetch data", async () => 42);
      _internal.flushStories();

      expect(result).toBe(42);

      const s = getLastScenario();
      const step = (s!.steps as Array<{ keyword: string; wrapped?: boolean; durationMs?: number }>)[0];
      expect(step.keyword).toBe("When");
      expect(step.wrapped).toBe(true);
      expect(typeof step.durationMs).toBe("number");
    });

    it("void callback returns undefined", () => {
      story.init();
      const result = story.then("check passes", () => {
        expect(true).toBe(true);
      });
      _internal.flushStories();

      expect(result).toBeUndefined();

      const s = getLastScenario();
      const step = (s!.steps as Array<{ wrapped?: boolean }>)[0];
      expect(step.wrapped).toBe(true);
    });

    it("error in callback re-throws, step still recorded", () => {
      story.init();
      expect(() =>
        story.when("failing action", () => {
          throw new Error("boom");
        }),
      ).toThrow("boom");
      _internal.flushStories();

      const s = getLastScenario();
      expect(s!.steps).toHaveLength(1);
      const step = (s!.steps as Array<{ keyword: string; wrapped?: boolean; durationMs?: number }>)[0];
      expect(step.keyword).toBe("When");
      expect(step.wrapped).toBe(true);
      expect(typeof step.durationMs).toBe("number");
    });

    it("backward compat: marker-only still works (no wrapped)", () => {
      story.init();
      story.given("a precondition");
      _internal.flushStories();

      const s = getLastScenario();
      const step = (s!.steps as Array<{ wrapped?: boolean; durationMs?: number }>)[0];
      expect(step.wrapped).toBeUndefined();
      expect(step.durationMs).toBeUndefined();
    });

    it("backward compat: inline docs still work", () => {
      story.init();
      story.given("valid credentials", {
        note: "Session cookie is set",
      });
      _internal.flushStories();

      const s = getLastScenario();
      const step = (s!.steps as Array<{ wrapped?: boolean; docs?: Array<{ kind: string }> }>)[0];
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
      _internal.flushStories();

      const s = getLastScenario();
      const steps = s!.steps as Array<{ wrapped?: boolean }>;
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
      _internal.flushStories();

      const s = getLastScenario();
      const steps = s!.steps as Array<{ keyword: string }>;
      expect(steps.map((step) => step.keyword)).toEqual([
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
      _internal.flushStories();

      const s = getLastScenario();
      const steps = s!.steps as Array<{ keyword: string }>;
      expect(steps.map((step) => step.keyword)).toEqual([
        "Given",
        "And",
        "When",
        "And",
        "Then",
        "And",
      ]);
    });
  });
});
