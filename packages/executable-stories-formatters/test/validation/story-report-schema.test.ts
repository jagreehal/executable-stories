/**
 * Schema validation tests for story-report-v1.json.
 *
 * Covers: minimal valid report, fully-populated report exercising every
 * DocEntry kind, and a representative set of invalid cases that the
 * schema must reject.
 */

import { describe, it, expect } from "vitest";
import { validateStoryReport } from "../../src/validation/story-report-validator";
import type { StoryReport } from "../../src/types/story-report";

const minimalValid: StoryReport = {
  schemaVersion: "1.0",
  runId: "run-1",
  startedAtMs: 1700000000000,
  finishedAtMs: 1700000001000,
  durationMs: 1000,
  projectRoot: "/Users/foo/project",
  summary: { total: 0, passed: 0, failed: 0, skipped: 0, pending: 0, durationMs: 0 },
  features: [],
};

const fullyPopulated: StoryReport = {
  schemaVersion: "1.0",
  runId: "run-2",
  startedAtMs: 1700000000000,
  finishedAtMs: 1700000005000,
  durationMs: 5000,
  projectRoot: "/Users/foo/project",
  packageVersion: "1.2.3",
  gitSha: "abc1234",
  ci: { name: "github-actions", branch: "main", commitSha: "abc1234", prNumber: "42" },
  coverage: { linesPct: 87.5, branchesPct: 80, functionsPct: 95, statementsPct: 88 },
  summary: { total: 3, passed: 1, failed: 1, skipped: 1, pending: 0, durationMs: 5000 },
  features: [
    {
      id: "feature-todos",
      title: "Todos",
      sourceFile: "src/todos.story.test.ts",
      summary: { total: 3, passed: 1, failed: 1, skipped: 1, pending: 0, durationMs: 5000 },
      scenarios: [
        {
          id: "feature-todos--add-a-todo",
          title: "Add a todo",
          status: "passed",
          durationMs: 1200,
          tags: ["smoke"],
          tickets: [{ id: "JIRA-1", url: "https://example.com/JIRA-1" }],
          sourceLine: 12,
          retry: 0,
          retries: 0,
          docEntries: [
            { kind: "note", text: "Validated against the happy path.", phase: "static" },
            { kind: "tag", names: ["smoke"], phase: "static" },
            { kind: "kv", label: "endpoint", value: "/api/todos", phase: "static" },
            {
              kind: "code",
              label: "Request",
              content: "{\n  \"title\": \"buy milk\"\n}",
              lang: "json",
              phase: "static",
            },
            {
              kind: "table",
              label: "Headers",
              columns: ["Name", "Value"],
              rows: [["Content-Type", "application/json"]],
              phase: "static",
            },
            { kind: "link", label: "Spec", url: "https://example.com/spec", phase: "static" },
            { kind: "section", title: "Background", markdown: "_Why this matters_", phase: "static" },
            { kind: "mermaid", code: "graph TD\nA-->B", title: "Flow", phase: "static" },
            { kind: "screenshot", path: "screenshots/added.png", alt: "Todo added", phase: "runtime" },
            { kind: "html", path: "reports/coverage.html", title: "Coverage", phase: "runtime" },
            { kind: "html", url: "https://dash.example.com/run/42", height: 600, phase: "runtime" },
            { kind: "html", content: "<h1>Chart</h1>", title: "Chart", height: "60vh", phase: "runtime" },
            { kind: "custom", type: "chart", data: { type: "bar", points: [1, 2, 3] }, phase: "runtime" },
          ],
          steps: [
            {
              id: "feature-todos--add-a-todo--step-0",
              index: 0,
              keyword: "Given",
              text: "the todo list is empty",
              status: "passed",
              durationMs: 100,
              docEntries: [],
            },
            {
              id: "feature-todos--add-a-todo--step-1",
              index: 1,
              keyword: "When",
              text: "the user adds 'buy milk'",
              status: "passed",
              durationMs: 800,
              mode: "normal",
              docEntries: [{ kind: "note", text: "Posts to /api/todos.", phase: "runtime" }],
            },
            {
              id: "feature-todos--add-a-todo--step-2",
              index: 2,
              keyword: "Then",
              text: "the todo list contains 'buy milk'",
              status: "passed",
              durationMs: 300,
              docEntries: [],
            },
          ],
          attachments: [
            {
              name: "added.png",
              mediaType: "image/png",
              body: "iVBORw0KGgo=",
              contentEncoding: "BASE64",
            },
          ],
        },
        {
          id: "feature-todos--remove-a-todo",
          title: "Remove a todo",
          status: "failed",
          durationMs: 1300,
          tags: [],
          errorMessage: "Expected list to be empty after removal",
          errorStack: "AssertionError: ...",
          retry: 1,
          retries: 2,
          docEntries: [],
          steps: [
            {
              id: "feature-todos--remove-a-todo--step-0",
              index: 0,
              keyword: "Given",
              text: "a todo exists",
              status: "passed",
              durationMs: 100,
              docEntries: [],
            },
            {
              id: "feature-todos--remove-a-todo--step-1",
              index: 1,
              keyword: "When",
              text: "the user deletes it",
              status: "failed",
              durationMs: 1200,
              errorMessage: "Expected list to be empty after removal",
              docEntries: [],
            },
          ],
          attachments: [],
        },
        {
          id: "feature-todos--filter-by-tag",
          title: "Filter by tag",
          status: "skipped",
          durationMs: 0,
          tags: ["wip"],
          retry: 0,
          retries: 0,
          docEntries: [],
          steps: [],
          attachments: [],
        },
      ],
    },
  ],
};

describe("StoryReport JSON Schema (v1)", () => {
  it("accepts a minimal valid report", () => {
    const result = validateStoryReport(minimalValid);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it("accepts a fully populated report exercising every DocEntry kind", () => {
    const result = validateStoryReport(fullyPopulated);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it("rejects a report missing schemaVersion", () => {
    const { schemaVersion: _omitted, ...rest } = minimalValid;
    const result = validateStoryReport(rest);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("schemaVersion"))).toBe(true);
  });

  it("rejects a 2.x schemaVersion (major must match)", () => {
    const result = validateStoryReport({ ...minimalValid, schemaVersion: "2.0" });
    expect(result.valid).toBe(false);
  });

  it("rejects unknown top-level properties", () => {
    const result = validateStoryReport({ ...minimalValid, extra: true });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("extra"))).toBe(true);
  });

  it("rejects an invalid test status", () => {
    const bad = structuredClone(fullyPopulated);
    (bad.features[0]!.scenarios[0] as unknown as { status: string }).status = "errored";
    const result = validateStoryReport(bad);
    expect(result.valid).toBe(false);
  });

  it("rejects an invalid step keyword", () => {
    const bad = structuredClone(fullyPopulated);
    (bad.features[0]!.scenarios[0]!.steps[0] as unknown as { keyword: string }).keyword = "Suppose";
    const result = validateStoryReport(bad);
    expect(result.valid).toBe(false);
  });

  it("rejects an html DocEntry with no source", () => {
    const bad = structuredClone(fullyPopulated);
    bad.features[0]!.scenarios[0]!.docEntries.push({
      kind: "html",
      title: "No source",
      phase: "runtime",
    } as never);
    const result = validateStoryReport(bad);
    expect(result.valid).toBe(false);
  });

  it("rejects an html DocEntry with two sources", () => {
    const bad = structuredClone(fullyPopulated);
    bad.features[0]!.scenarios[0]!.docEntries.push({
      kind: "html",
      path: "reports/coverage.html",
      url: "https://example.com",
      phase: "runtime",
    } as never);
    const result = validateStoryReport(bad);
    expect(result.valid).toBe(false);
  });

  it("rejects an unknown DocEntry kind", () => {
    const bad = structuredClone(fullyPopulated);
    bad.features[0]!.scenarios[0]!.docEntries.push({
      kind: "unknown-kind",
      foo: "bar",
    } as never);
    const result = validateStoryReport(bad);
    expect(result.valid).toBe(false);
  });
});
