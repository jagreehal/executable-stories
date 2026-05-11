import { describe, it, expect } from "vitest";
import { filterReport, listFailures, normalizeQuery } from "../src/interactive/filter";
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
