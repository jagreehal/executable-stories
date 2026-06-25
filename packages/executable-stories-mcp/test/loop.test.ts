import { afterEach, describe, expect, it } from "vitest";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { ReportScenario, StoryReport } from "executable-stories-formatters";

import { getLoopStatus, runChanged, runScenarios } from "../src/index.js";

/** A spawn stub that always exits 0 (or with the given code). */
const fakeSpawn = (code = 0) =>
  ((_c, _a, _o) => {
    const child = new EventEmitter() as NodeJS.EventEmitter & {
      stdout: EventEmitter;
      stderr: EventEmitter;
    };
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    queueMicrotask(() => child.emit("close", code));
    return child;
  }) as typeof import("node:child_process").spawn;

const scenario = (id: string, status: ReportScenario["status"], covers?: string[]): ReportScenario => ({
  id,
  title: id,
  status,
  durationMs: 1,
  tags: [],
  ...(covers ? { covers } : {}),
  retry: 0,
  retries: 0,
  docEntries: [],
  steps: [],
  attachments: [],
});

const report = (runId: string, scenarios: ReportScenario[]): StoryReport => {
  const c = { total: 0, passed: 0, failed: 0, skipped: 0, pending: 0 };
  for (const s of scenarios) {
    c.total++;
    c[s.status as "passed" | "failed" | "skipped" | "pending"]++;
  }
  return {
    schemaVersion: "1.0",
    runId,
    startedAtMs: 0,
    finishedAtMs: 0,
    durationMs: 0,
    projectRoot: "/repo",
    summary: { ...c, durationMs: 0 },
    features: [{ id: "f", title: "F", sourceFile: "src/calc.story.test.ts", summary: { ...c, durationMs: 0 }, scenarios }],
  };
};

describe("getLoopStatus", () => {
  let tmp: string | undefined;
  afterEach(() => {
    if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
    tmp = undefined;
  });
  const statePath = () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "es-loop-"));
    return path.join(tmp, "trajectory.json");
  };

  it("is not done while a scenario is failing", () => {
    const status = getLoopStatus(report("r1", [scenario("a", "passed"), scenario("b", "failed")]), {
      statePath: statePath(),
    });
    expect(status.done).toBe(false);
    expect(status.failingCount).toBe(1);
    expect(status.failing[0].id).toBe("b");
    expect(status.regressed).toBeNull();
    expect(status.trajectory.current.failed).toBe(1);
  });

  it("is done when nothing fails and (with a baseline) nothing regressed", () => {
    const status = getLoopStatus(report("r2", [scenario("a", "passed"), scenario("b", "passed")]), {
      baseline: report("base", [scenario("a", "passed"), scenario("b", "passed")]),
      statePath: statePath(),
    });
    expect(status.done).toBe(true);
    expect(status.regressedCount).toBe(0);
  });

  it("surfaces regressions vs a baseline and blocks done", () => {
    const status = getLoopStatus(report("r3", [scenario("a", "failed")]), {
      baseline: report("base", [scenario("a", "passed")]),
      statePath: statePath(),
    });
    expect(status.regressedCount).toBe(1);
    expect(status.regressed?.[0].id).toBe("a");
    expect(status.done).toBe(false);
  });
});

describe("runScenarios / runChanged", () => {
  it("runs each requested scenario in sequence", async () => {
    const r = report("r", [scenario("a", "failed"), scenario("b", "failed")]);
    const outcomes = await runScenarios({
      report: r,
      reportPath: "unused.json",
      idsOrTitles: ["a", "b"],
      framework: "vitest",
      refreshReport: false,
      spawnFn: fakeSpawn(0),
    });
    expect(outcomes).toHaveLength(2);
    expect(outcomes.every((o) => o.ok === true)).toBe(true);
    expect(outcomes.map((o) => o.scenario?.id)).toEqual(["a", "b"]);
  });

  it("reports a not-found scenario without throwing", async () => {
    const r = report("r", [scenario("a", "failed")]);
    const outcomes = await runScenarios({
      report: r,
      reportPath: "unused.json",
      idsOrTitles: ["nope"],
      refreshReport: false,
      spawnFn: fakeSpawn(0),
    });
    expect(outcomes[0].scenario).toBeNull();
    expect(outcomes[0].error).toMatch(/not found/i);
  });

  it("runChanged runs only the scenarios covering the changed paths", async () => {
    const r = report("r", [
      scenario("covered", "failed", ["src/auth/**"]),
      scenario("other", "failed", ["src/billing/**"]),
    ]);
    const result = await runChanged({
      report: r,
      reportPath: "unused.json",
      paths: ["src/auth/login.ts"],
      framework: "vitest",
      refreshReport: false,
      spawnFn: fakeSpawn(0),
    });
    expect(result.matched.map((s) => s.id)).toEqual(["covered"]);
    expect(result.outcomes).toHaveLength(1);
    expect(result.outcomes[0].scenario?.id).toBe("covered");
  });
});
