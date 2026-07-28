import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, it, expect } from "vitest";

import {
  aggregateJourneyHistory,
  journeyRunHistory,
  matchMemberHistory,
  type HistoryEntryLike,
} from "./journey-history.js";

const e = (runId: string, timestamp: number, status: HistoryEntryLike["status"]): HistoryEntryLike => ({
  runId,
  timestamp,
  status,
});

describe("aggregateJourneyHistory", () => {
  it("fails a run when ANY member failed it, ordered oldest → newest", () => {
    const summary = aggregateJourneyHistory([
      [e("r1", 100, "passed"), e("r2", 200, "passed"), e("r3", 300, "passed")],
      [e("r1", 100, "passed"), e("r2", 200, "failed"), e("r3", 300, "passed")],
    ]);
    expect(summary?.runs.map((r) => r.status)).toEqual(["passed", "failed", "passed"]);
    expect(summary?.passed).toBe(2);
    expect(summary?.total).toBe(3);
  });

  it("ignores skipped/pending entries and needs two runs to report", () => {
    expect(aggregateJourneyHistory([[e("r1", 100, "passed")]])).toBeUndefined();
    expect(aggregateJourneyHistory([[e("r1", 100, "skipped"), e("r2", 200, "pending")]])).toBeUndefined();
  });

  it("classifies alternating results as flaky", () => {
    const summary = aggregateJourneyHistory([
      [e("r1", 1, "passed"), e("r2", 2, "failed"), e("r3", 3, "passed"), e("r4", 4, "failed")],
    ]);
    expect(summary?.level).toBe("flaky");
  });

  it("classifies a steady green streak as stable", () => {
    const summary = aggregateJourneyHistory([
      [e("r1", 1, "passed"), e("r2", 2, "passed"), e("r3", 3, "passed"), e("r4", 4, "passed")],
    ]);
    expect(summary?.level).toBe("stable");
  });
});

describe("matchMemberHistory", () => {
  const tests = {
    a: { testId: "a", testName: "Pays by card", sourceFile: "/repo/e2e/checkout.spec.ts", entries: [] },
    b: { testId: "b", testName: "Pays by card", sourceFile: "/repo/e2e/admin.spec.ts", entries: [] },
  };

  it("matches by title, narrowing by source file on a tie", () => {
    const member = { title: "Pays by card", feature: { sourceFile: "e2e/admin.spec.ts" } };
    expect(matchMemberHistory(member, tests)?.sourceFile).toBe("/repo/e2e/admin.spec.ts");
    expect(matchMemberHistory({ title: "Unknown" }, tests)).toBeUndefined();
  });
});

describe("journeyRunHistory", () => {
  it("reads a v1 store and aggregates matched members; tolerates missing/invalid files", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "es-history-"));
    const file = path.join(dir, "history.json");
    fs.writeFileSync(
      file,
      JSON.stringify({
        version: 1,
        maxRuns: 10,
        lastUpdated: 0,
        tests: {
          a: {
            testId: "a",
            testName: "Pays by card",
            sourceFile: "e2e/checkout.spec.ts",
            entries: [e("r1", 100, "passed"), e("r2", 200, "failed")],
          },
        },
      }),
    );
    const summary = journeyRunHistory({ historyFile: file, scenarios: [{ title: "Pays by card" }] });
    expect(summary).toMatchObject({ passed: 1, total: 2 });

    expect(journeyRunHistory({ historyFile: null, scenarios: [] })).toBeUndefined();
    expect(journeyRunHistory({ historyFile: path.join(dir, "missing.json"), scenarios: [] })).toBeUndefined();
    fs.writeFileSync(file, "{not json");
    expect(journeyRunHistory({ historyFile: file, scenarios: [{ title: "Pays by card" }] })).toBeUndefined();
  });

  it("drops malformed per-test values and entries instead of crashing", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "es-history-"));
    const file = path.join(dir, "history.json");
    fs.writeFileSync(
      file,
      JSON.stringify({
        version: 1,
        maxRuns: 10,
        lastUpdated: 0,
        tests: {
          x: null,
          y: { testName: 42, entries: [] },
          ok: {
            testId: "ok",
            testName: "Pays by card",
            entries: [null, e("r1", 100, "passed"), e("r2", 200, "failed")],
          },
        },
      }),
    );
    const summary = journeyRunHistory({ historyFile: file, scenarios: [{ title: "Pays by card" }] });
    expect(summary).toMatchObject({ passed: 1, total: 2 });
  });
});
