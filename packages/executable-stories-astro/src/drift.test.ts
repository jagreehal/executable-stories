import { describe, it, expect } from "vitest";

import { extractDrift, type DriftEntryLike } from "./drift.js";

const entry = (
  id: string,
  status: DriftEntryLike["status"],
  source: string,
  title = id,
): DriftEntryLike => ({
  id,
  title,
  slug: id,
  status,
  source: { name: source, label: source },
});

describe("extractDrift", () => {
  it("joins scenarios across sources by id and floats mismatches first", () => {
    const report = extractDrift([
      entry("login", "passed", "staging"),
      entry("login", "passed", "production"),
      entry("checkout", "passed", "staging"),
      entry("checkout", "failed", "production"),
    ]);
    expect(report.sources.map((s) => s.name)).toEqual(["staging", "production"]);
    expect(report.driftedCount).toBe(1);
    expect(report.rows[0]).toMatchObject({ id: "checkout", drifted: true });
    expect(report.rows[1]).toMatchObject({ id: "login", drifted: false });
  });

  it("treats a scenario absent from one source as drift", () => {
    const report = extractDrift([
      entry("refund", "passed", "staging"),
      entry("login", "passed", "staging"),
      entry("login", "passed", "production"),
    ]);
    const refund = report.rows.find((r) => r.id === "refund");
    expect(refund?.drifted).toBe(true);
    expect(refund?.statuses["production"]).toBeUndefined();
  });

  it("keeps the worst status when one source reports a scenario twice", () => {
    const report = extractDrift([
      entry("login", "failed", "staging"),
      entry("login", "passed", "staging"),
    ]);
    expect(report.rows[0]?.statuses["staging"]).toBe("failed");
  });
});
