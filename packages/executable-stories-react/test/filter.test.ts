import { describe, it, expect } from "vitest";
import { failedScenarios, filterReport, listFailures, normalizeQuery } from "../src/interactive/filter";
import { mixedReport, passingReport } from "./fixtures/sample-report";

describe("normalizeQuery", () => {
  it("trims and lowercases", () => {
    expect(normalizeQuery("  Hello  ")).toBe("hello");
  });
});

describe("filterReport", () => {
  it("returns the original report for an empty query", () => {
    expect(filterReport(passingReport, "")).toBe(passingReport);
    expect(filterReport(passingReport, "   ")).toBe(passingReport);
  });

  it("filters by scenario title (case-insensitive)", () => {
    const r = filterReport(mixedReport, "delete");
    expect(r.features).toHaveLength(1);
    expect(r.features[0]!.scenarios.map((s) => s.title)).toEqual(["Delete"]);
  });

  it("filters by tag", () => {
    const r = filterReport(mixedReport, "wip");
    expect(r.features).toHaveLength(1);
    expect(r.features[0]!.title).toBe("Auth");
  });

  it("filters by step text", () => {
    const r = filterReport(mixedReport, "user deletes");
    expect(r.features).toHaveLength(1);
    expect(r.features[0]!.scenarios[0]!.title).toBe("Delete");
  });

  // What people paste into the search box comes from somewhere else: a ticket
  // from Jira, a string out of a stack trace, a path from a PR diff.
  it("filters by ticket id", () => {
    const r = filterReport(mixedReport, "shop-77");
    expect(r.features).toHaveLength(1);
    expect(r.features[0]!.scenarios[0]!.title).toBe("Login");
  });

  it("filters by error message text", () => {
    const r = filterReport(mixedReport, "empty after deletion");
    expect(r.features).toHaveLength(1);
    expect(r.features[0]!.scenarios.map((s) => s.title)).toEqual(["Delete"]);
  });

  it("filters by the feature's source file path", () => {
    const r = filterReport(mixedReport, "auth.story.test.ts");
    expect(r.features).toHaveLength(1);
    expect(r.features[0]!.title).toBe("Auth");
  });

  it("drops features whose scenarios all fail to match", () => {
    const r = filterReport(mixedReport, "no-such-thing");
    expect(r.features).toHaveLength(0);
    expect(r.summary.total).toBe(0);
  });

  it("recomputes summaries to reflect the filtered set", () => {
    const r = filterReport(mixedReport, "delete");
    expect(r.summary).toEqual({ total: 1, passed: 0, failed: 1, skipped: 0, pending: 0, durationMs: 1200 });
    expect(r.features[0]!.summary.failed).toBe(1);
  });
});

describe("failedScenarios", () => {
  it("returns the failing scenarios themselves, not just refs", () => {
    const failing = failedScenarios(mixedReport);
    expect(failing.map((s) => s.id)).toEqual(["feature-todos--delete"]);
    expect(failing[0]!.steps).toHaveLength(1);
  });

  it("returns an empty array when nothing failed", () => {
    expect(failedScenarios(passingReport)).toEqual([]);
  });
});

describe("listFailures", () => {
  it("returns one entry per failed scenario", () => {
    const failures = listFailures(mixedReport);
    expect(failures).toHaveLength(1);
    expect(failures[0]!.scenarioTitle).toBe("Delete");
    expect(failures[0]!.errorMessage).toContain("Expected list");
  });

  it("returns an empty array when nothing failed", () => {
    expect(listFailures(passingReport)).toEqual([]);
  });
});
