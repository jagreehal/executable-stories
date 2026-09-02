import { describe, it, expect } from "vitest";
import { diffSinceVisit, snapshotOf, type VisitSnapshot } from "../src/interactive/last-visit";
import { mixedReport, passingReport } from "./fixtures/sample-report";

const visit = (over: Partial<VisitSnapshot> = {}): VisitSnapshot => ({
  runId: "run-earlier",
  atMs: 1699999000000,
  statuses: { "feature-todos--add": "passed", "feature-todos--delete": "passed", "feature-auth--login": "skipped" },
  ...over,
});

describe("snapshotOf", () => {
  it("records the run and every scenario's status", () => {
    const snap = snapshotOf(mixedReport, 1700000009000);
    expect(snap.runId).toBe("run-3");
    expect(snap.atMs).toBe(1700000009000);
    expect(snap.statuses["feature-todos--delete"]).toBe("failed");
  });
});

describe("diffSinceVisit", () => {
  it("says nothing on a first visit", () => {
    expect(diffSinceVisit(null, mixedReport)).toBeNull();
  });

  it("says nothing when the reader already saw this run", () => {
    expect(diffSinceVisit(visit({ runId: mixedReport.runId }), mixedReport)).toBeNull();
  });

  it("reports what broke since the reader was last here", () => {
    const delta = diffSinceVisit(visit(), mixedReport)!;
    expect(delta.newlyFailing.map((s) => s.title)).toEqual(["Delete"]);
    expect(delta.newlyPassing).toEqual([]);
    expect(delta.sinceMs).toBe(1699999000000);
  });

  it("reports what was fixed since the reader was last here", () => {
    const delta = diffSinceVisit(
      visit({ statuses: { "feature-todos--add-a-todo": "failed" } }),
      passingReport,
    )!;
    expect(delta.newlyPassing.map((s) => s.title)).toEqual(["Add a todo"]);
  });

  it("counts scenarios the reader has never seen as added, not as changes", () => {
    const delta = diffSinceVisit(visit({ statuses: {} }), mixedReport)!;
    expect(delta.added).toHaveLength(3);
    expect(delta.newlyFailing).toEqual([]);
  });

  it("is null when the run changed but nothing the reader saw did", () => {
    const seen = visit({ statuses: snapshotOf(mixedReport, 0).statuses });
    expect(diffSinceVisit(seen, mixedReport)).toBeNull();
  });
});
