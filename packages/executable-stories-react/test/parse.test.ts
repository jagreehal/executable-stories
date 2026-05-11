import { describe, it, expect } from "vitest";
import { parseStoryReport } from "../src/schema/parse";
import { minimalReport, passingReport } from "./fixtures/sample-report";

describe("parseStoryReport", () => {
  it("returns ok=true for a minimal valid report", () => {
    const r = parseStoryReport(minimalReport);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.schemaVersion).toBe("1.0");
  });

  it("returns ok=true for a fully-shaped report", () => {
    const r = parseStoryReport(passingReport);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.features).toHaveLength(1);
  });

  it("returns INVALID_INPUT for null", () => {
    const r = parseStoryReport(null);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("INVALID_INPUT");
  });

  it("returns INVALID_INPUT for a string", () => {
    const r = parseStoryReport("not an object");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("INVALID_INPUT");
  });

  it("returns SCHEMA_VERSION_MISMATCH for v2", () => {
    const r = parseStoryReport({ ...minimalReport, schemaVersion: "2.0" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("SCHEMA_VERSION_MISMATCH");
  });

  it("returns VALIDATION_FAILED with issue list for missing required fields", () => {
    const r = parseStoryReport({ schemaVersion: "1.0" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("VALIDATION_FAILED");
      expect(r.error.issues?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it("returns VALIDATION_FAILED for an unknown DocEntry kind", () => {
    const bad = JSON.parse(JSON.stringify(passingReport));
    bad.features[0].scenarios[0].docEntries.push({ kind: "unknown", text: "x", phase: "static" });
    const r = parseStoryReport(bad);
    expect(r.ok).toBe(false);
  });
});
