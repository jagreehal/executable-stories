import { describe, it, expect } from "vitest";

import { summaryLine } from "../src/summary-line";

const counts = { passed: 3, failed: 0, skipped: 0, pending: 0 };

describe("summaryLine", () => {
  it("describes the report that was written", () => {
    expect(summaryLine(counts, ["reports/index.md"], 120)).toBe(
      "✔ 3 scenarios (3 passed) → reports/index.md in 120ms"
    );
  });

  it("says how much of the report this run actually produced", () => {
    // A filtered run writes a report covering the whole suite. Reporting only
    // the total would imply this run verified all of it.
    const line = summaryLine(counts, ["reports/index.md"], 120, { ranCount: 1 });
    expect(line).toContain("3 scenarios");
    expect(line).toContain("1 from this run");
    expect(line).toContain("2 carried over");
  });

  it("stays quiet when the run covered the whole report", () => {
    const line = summaryLine(counts, ["reports/index.md"], 120, { ranCount: 3 });
    expect(line).not.toContain("carried over");
  });
});

describe("ranCount, counted against the rendered report", () => {
  it("still discloses when this run's scenarios were filtered out of the report", () => {
    // The run produced scenarios that output filters excluded, so none of what
    // it verified reaches the report. Counting the raw input would make ran
    // equal total and hide the disclaimer, implying the report was verified now.
    const line = summaryLine(counts, ["reports/index.md"], 120, { ranCount: 0 });
    expect(line).toContain("0 from this run");
    expect(line).toContain("3 carried over");
  });
});

describe("unasserted claims", () => {
  it("names the scenarios that passed without asserting anything", () => {
    // The cheapest credibility signal there is: a green scenario that checked
    // nothing. Silence here is how it stays invisible.
    const line = summaryLine(counts, ["reports/index.md"], 120, {
      unasserted: 2,
    });
    expect(line).toContain("2 scenarios asserted nothing");
  });

  it("says nothing when every scenario asserted something", () => {
    const line = summaryLine(counts, ["reports/index.md"], 120, {
      unasserted: 0,
    });
    expect(line).not.toContain("asserted nothing");
  });

  it("says nothing when no adapter could observe assertions", () => {
    // Go, Rust, pytest, JUnit 5 and xUnit have no counter to read. A silent
    // line is honest; "0 scenarios asserted nothing" would be a claim we cannot
    // make.
    const line = summaryLine(counts, ["reports/index.md"], 120);
    expect(line).not.toContain("asserted nothing");
  });
});
