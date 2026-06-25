/**
 * Unit tests for toStoryReport + StoryReportJsonFormatter.
 *
 * Verifies grouping, ID generation, summary computation, doc-entry passthrough,
 * relative path normalization, and that every emitted report validates against
 * the published JSON Schema.
 */

import { describe, it, expect } from "vitest";
import { toStoryReport } from "executable-stories-core/converters/story-report";
import { StoryReportJsonFormatter } from "../../src/formatters/story-report-json";
import { validateStoryReport } from "../../src/validation/story-report-validator";
import type { TestCaseResult, TestRunResult } from "executable-stories-core/types/test-result";

function makeTestCase(overrides: Partial<TestCaseResult> = {}): TestCaseResult {
  return {
    id: "case-1",
    story: { scenario: "A scenario", steps: [] },
    sourceFile: "/repo/src/foo.test.ts",
    sourceLine: 1,
    status: "passed",
    durationMs: 100,
    attachments: [],
    stepResults: [],
    titlePath: [],
    retry: 0,
    retries: 0,
    tags: [],
    ...overrides,
  };
}

function makeRun(testCases: TestCaseResult[], overrides: Partial<TestRunResult> = {}): TestRunResult {
  return {
    testCases,
    startedAtMs: 1000,
    finishedAtMs: 2000,
    durationMs: 1000,
    projectRoot: "/repo",
    runId: "run-x",
    ...overrides,
  };
}

describe("toStoryReport", () => {
  it("produces a report that validates against the v1 schema (empty run)", () => {
    const report = toStoryReport(makeRun([]));
    const v = validateStoryReport(report);
    expect(v.errors).toEqual([]);
    expect(v.valid).toBe(true);
    expect(report.schemaVersion).toBe("1.0");
    expect(report.features).toEqual([]);
    expect(report.summary).toEqual({ total: 0, passed: 0, failed: 0, skipped: 0, pending: 0, durationMs: 0 });
  });

  it("groups test cases by sourceFile and pre-computes summaries at every level", () => {
    const run = makeRun([
      makeTestCase({ id: "1", story: { scenario: "Adds a todo", steps: [] }, sourceFile: "/repo/src/todos.test.ts", durationMs: 100, status: "passed" }),
      makeTestCase({ id: "2", story: { scenario: "Deletes a todo", steps: [] }, sourceFile: "/repo/src/todos.test.ts", durationMs: 200, status: "failed", errorMessage: "boom" }),
      makeTestCase({ id: "3", story: { scenario: "Login works", steps: [] }, sourceFile: "/repo/src/auth.test.ts", durationMs: 50, status: "passed" }),
    ]);

    const report = toStoryReport(run);
    expect(validateStoryReport(report).errors).toEqual([]);
    expect(report.features).toHaveLength(2);

    const todos = report.features.find((f) => f.sourceFile === "src/todos.test.ts")!;
    expect(todos.sourceFile).toBe("src/todos.test.ts");
    expect(todos.scenarios).toHaveLength(2);
    expect(todos.summary).toEqual({ total: 2, passed: 1, failed: 1, skipped: 0, pending: 0, durationMs: 300 });

    const auth = report.features.find((f) => f.sourceFile === "src/auth.test.ts")!;
    expect(auth.scenarios).toHaveLength(1);
    expect(auth.summary).toEqual({ total: 1, passed: 1, failed: 0, skipped: 0, pending: 0, durationMs: 50 });

    expect(report.summary).toEqual({ total: 3, passed: 2, failed: 1, skipped: 0, pending: 0, durationMs: 350 });
  });

  it("generates stable, slug-based IDs for features, scenarios, and steps", () => {
    const run = makeRun([
      makeTestCase({
        id: "1",
        story: {
          scenario: "Adds A Todo!",
          steps: [
            { keyword: "Given", text: "no todos exist" },
            { keyword: "When", text: "the user adds 'buy milk'" },
            { keyword: "Then", text: "the list contains 'buy milk'" },
          ],
        },
        sourceFile: "/repo/src/Todos.story.test.ts",
        stepResults: [
          { index: 0, status: "passed", durationMs: 10 },
          { index: 1, status: "passed", durationMs: 20 },
          { index: 2, status: "passed", durationMs: 30 },
        ],
      }),
    ]);

    const report = toStoryReport(run);
    const feature = report.features[0]!;
    expect(feature.id).toBe("feature-src-todos-story-test");
    const scenario = feature.scenarios[0]!;
    expect(scenario.id).toBe(`${feature.id}--adds-a-todo`);
    expect(scenario.steps.map((s) => s.id)).toEqual([
      `${scenario.id}--step-0`,
      `${scenario.id}--step-1`,
      `${scenario.id}--step-2`,
    ]);
  });

  it("uses titlePath[0] as feature title when present, file basename otherwise", () => {
    const run = makeRun([
      makeTestCase({ id: "1", titlePath: ["Todos suite", "creates one"], sourceFile: "/repo/src/x.test.ts" }),
      makeTestCase({ id: "2", titlePath: [], sourceFile: "/repo/src/y.test.ts" }),
    ]);
    const report = toStoryReport(run);
    const x = report.features.find((f) => f.sourceFile === "src/x.test.ts")!;
    const y = report.features.find((f) => f.sourceFile === "src/y.test.ts")!;
    expect(x.title).toBe("Todos suite");
    expect(y.title).toBe("y");
  });

  it("preserves doc entries at story level and step level", () => {
    const run = makeRun([
      makeTestCase({
        id: "1",
        story: {
          scenario: "Has docs",
          docs: [
            { kind: "note", text: "intro", phase: "static" },
            { kind: "section", title: "Notes", markdown: "# heading", phase: "static" },
          ],
          steps: [
            {
              keyword: "Given",
              text: "step zero",
              docs: [{ kind: "kv", label: "k", value: 42, phase: "static" }],
            },
          ],
        },
        stepResults: [{ index: 0, status: "passed", durationMs: 1 }],
      }),
    ]);
    const report = toStoryReport(run);
    expect(validateStoryReport(report).errors).toEqual([]);
    const scenario = report.features[0]!.scenarios[0]!;
    expect(scenario.docEntries.map((d) => d.kind)).toEqual(["note", "section"]);
    expect(scenario.steps[0]!.docEntries.map((d) => d.kind)).toEqual(["kv"]);
  });

  it("copies html doc entries with only their defined fields and passes validation", () => {
    const run = makeRun([
      makeTestCase({
        id: "1",
        story: {
          scenario: "Has html docs",
          docs: [
            { kind: "html", path: "reports/coverage.html", title: "Coverage", phase: "runtime" },
            { kind: "html", url: "https://dash.example.com/run/42", height: 600, phase: "runtime" },
            { kind: "html", content: "<h1>Chart</h1>", height: "60vh", phase: "runtime" },
          ],
          steps: [],
        },
        stepResults: [],
      }),
    ]);
    const report = toStoryReport(run);
    expect(validateStoryReport(report).errors).toEqual([]);
    const docs = report.features[0]!.scenarios[0]!.docEntries;
    expect(docs).toEqual([
      { kind: "html", path: "reports/coverage.html", title: "Coverage", phase: "runtime" },
      { kind: "html", url: "https://dash.example.com/run/42", height: 600, phase: "runtime" },
      { kind: "html", content: "<h1>Chart</h1>", height: "60vh", phase: "runtime" },
    ]);
  });

  it("attaches errorMessage and errorStack at the scenario level for failures", () => {
    const run = makeRun([
      makeTestCase({ id: "1", status: "failed", errorMessage: "expected x", errorStack: "trace" }),
    ]);
    const report = toStoryReport(run);
    const s = report.features[0]!.scenarios[0]!;
    expect(s.errorMessage).toBe("expected x");
    expect(s.errorStack).toBe("trace");
  });

  it("preserves tickets, retries, and tags", () => {
    const run = makeRun([
      makeTestCase({
        id: "1",
        tags: ["smoke", "regression"],
        retry: 1,
        retries: 2,
        story: { scenario: "with tickets", steps: [], tickets: [{ id: "JIRA-1", url: "https://x/JIRA-1" }, { id: "JIRA-2" }] },
      }),
    ]);
    const report = toStoryReport(run);
    const s = report.features[0]!.scenarios[0]!;
    expect(s.tags).toEqual(["smoke", "regression"]);
    expect(s.retry).toBe(1);
    expect(s.retries).toBe(2);
    expect(s.tickets).toEqual([{ id: "JIRA-1", url: "https://x/JIRA-1" }, { id: "JIRA-2" }]);
  });

  it("dedupes feature and scenario IDs that would collide", () => {
    const run = makeRun([
      makeTestCase({ id: "a", story: { scenario: "Same Title", steps: [] }, sourceFile: "/repo/src/foo.test.ts" }),
      makeTestCase({ id: "b", story: { scenario: "Same Title", steps: [] }, sourceFile: "/repo/src/foo.test.ts" }),
    ]);
    const report = toStoryReport(run);
    const ids = report.features[0]!.scenarios.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("StoryReportJsonFormatter", () => {
  it("emits valid JSON that parses back to a schema-valid StoryReport", () => {
    const run = makeRun([makeTestCase({ id: "1" })]);
    const formatter = new StoryReportJsonFormatter();
    const json = formatter.format(run);
    const parsed = JSON.parse(json);
    expect(validateStoryReport(parsed).errors).toEqual([]);
  });

  it("respects pretty: false (no whitespace)", () => {
    const run = makeRun([makeTestCase({ id: "1" })]);
    const compact = new StoryReportJsonFormatter({ pretty: false }).format(run);
    expect(compact).not.toMatch(/\n/);
  });
});
