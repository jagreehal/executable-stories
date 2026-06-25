import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { canonicalizeRun, toStoryReport, type RawRun, type StoryReport } from "executable-stories-formatters";

import {
  advanceTrajectory,
  emptyTrajectoryState,
  reportTrajectorySummary,
} from "../src/trajectory.js";
import {
  getTrajectory,
  loadStoryReport,
  refreshReportFromRawRun,
  summarizeReport,
} from "../src/index.js";

const counts = (over: Partial<Record<"total" | "passed" | "failed" | "skipped" | "pending", number>>) => ({
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  pending: 0,
  ...over,
});

const snapshot = (runId: string, c: ReturnType<typeof counts>) => ({
  runId,
  finishedAtMs: 0,
  counts: c,
});

describe("trajectory (pure)", () => {
  it("pins the baseline on the first run and reports null deltas until ≥2 runs", () => {
    const s1 = advanceTrajectory(emptyTrajectoryState, snapshot("run-1", counts({ total: 2, passed: 1, failed: 1 })));
    expect(s1.runCount).toBe(1);
    expect(s1.baseline?.runId).toBe("run-1");
    const summary = reportTrajectorySummary(s1);
    expect(summary.session).toBeNull();
    expect(summary.iteration).toBeNull();
    expect(summary.current).toMatchObject({ passed: 1, failed: 1 });
  });

  it("is idempotent on runId — re-reading the same run does not advance the loop", () => {
    const s1 = advanceTrajectory(emptyTrajectoryState, snapshot("run-1", counts({ failed: 2 })));
    const s2 = advanceTrajectory(s1, snapshot("run-1", counts({ failed: 2 })));
    expect(s2).toBe(s1);
    expect(s2.runCount).toBe(1);
  });

  it("computes session and iteration deltas across distinct runs", () => {
    let state = advanceTrajectory(emptyTrajectoryState, snapshot("run-1", counts({ total: 3, passed: 1, failed: 2 })));
    state = advanceTrajectory(state, snapshot("run-2", counts({ total: 3, passed: 2, failed: 1 })));
    state = advanceTrajectory(state, snapshot("run-3", counts({ total: 3, passed: 3, failed: 0 })));
    expect(state.runCount).toBe(3);

    const summary = reportTrajectorySummary(state);
    // session: run-3 vs run-1 baseline → +2 passed, -2 failed
    expect(summary.session?.diff).toMatchObject({ passed: 2, failed: -2 });
    // iteration: run-3 vs run-2 → +1 passed, -1 failed
    expect(summary.iteration?.diff).toMatchObject({ passed: 1, failed: -1 });
  });
});

describe("getTrajectory (persisted)", () => {
  let tmp: string | undefined;
  afterEach(() => {
    if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
    tmp = undefined;
  });

  const reportWith = (runId: string, passed: number, failed: number): StoryReport => ({
    schemaVersion: "1.0",
    runId,
    startedAtMs: 0,
    finishedAtMs: 0,
    durationMs: 0,
    projectRoot: "/repo",
    summary: { ...counts({ total: passed + failed, passed, failed }), durationMs: 0 },
    features: [],
  });

  it("advances only on a new runId and computes the session delta", () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "es-traj-"));
    const statePath = path.join(tmp, "trajectory.json");

    const first = getTrajectory(reportWith("run-1", 1, 2), { statePath });
    expect(first.runCount).toBe(1);
    expect(first.session).toBeNull();

    // Same runId again → idempotent.
    const again = getTrajectory(reportWith("run-1", 1, 2), { statePath });
    expect(again.runCount).toBe(1);

    // New run with two fixes.
    const next = getTrajectory(reportWith("run-2", 3, 0), { statePath });
    expect(next.runCount).toBe(2);
    expect(next.session?.diff).toMatchObject({ passed: 2, failed: -2 });
  });

  it("reset re-pins the baseline to the current run", () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "es-traj-"));
    const statePath = path.join(tmp, "trajectory.json");
    getTrajectory(reportWith("run-1", 0, 3), { statePath });
    const afterReset = getTrajectory(reportWith("run-2", 1, 2), { statePath, reset: true });
    expect(afterReset.runCount).toBe(1);
    expect(afterReset.session).toBeNull();
  });
});

describe("refreshReportFromRawRun", () => {
  let tmp: string | undefined;
  afterEach(() => {
    if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
    tmp = undefined;
  });

  // Build a RawRun through the SAME pipeline the report uses, so scenario ids
  // line up deterministically without hand-guessing them.
  const rawWith = (status: "pass" | "fail"): RawRun => ({
    projectRoot: "/repo",
    testCases: [
      {
        title: "adds two numbers",
        sourceFile: "src/calc.story.test.ts",
        status,
        story: { scenario: "adds two numbers", steps: [] },
      },
    ],
  });

  it("merges the run result back into the report (fail → pass) and recomputes summaries", () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "es-refresh-"));
    const reportPath = path.join(tmp, "index.story-report.json");
    const rawRunPath = path.join(tmp, "raw-run.json");

    // Report on disk starts failing.
    const failing = toStoryReport(canonicalizeRun(rawWith("fail")));
    fs.writeFileSync(reportPath, JSON.stringify(failing));
    expect(failing.summary).toMatchObject({ failed: 1, passed: 0 });

    // Focused run emits a passing raw run for the same scenario.
    fs.writeFileSync(rawRunPath, JSON.stringify(rawWith("pass")));

    const result = refreshReportFromRawRun({ rawRunPath, reportPath });
    expect(result.reportRefreshed).toBe(true);
    expect(result.updatedScenarioIds).toHaveLength(1);

    const refreshed = loadStoryReport(reportPath);
    expect(summarizeReport(refreshed)).toMatchObject({ passed: 1, failed: 0 });
    expect(refreshed.features[0].scenarios[0].status).toBe("passed");
  });

  it("leaves the report intact when no raw run is present", () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "es-refresh-"));
    const reportPath = path.join(tmp, "index.story-report.json");
    const before = toStoryReport(canonicalizeRun(rawWith("fail")));
    fs.writeFileSync(reportPath, JSON.stringify(before));

    const result = refreshReportFromRawRun({
      rawRunPath: path.join(tmp, "does-not-exist.json"),
      reportPath,
    });
    expect(result.reportRefreshed).toBe(false);
    expect(result.reason).toMatch(/No raw run/);
    // Report unchanged.
    expect(summarizeReport(loadStoryReport(reportPath))).toMatchObject({ failed: 1 });
  });
});
