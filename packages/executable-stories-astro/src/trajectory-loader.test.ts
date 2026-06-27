import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { trajectoryLoader } from "./loader.js";
import type { RawRun, TrajectorySummary } from "executable-stories-core";

/** A raw run with N passing + M failing scenarios. */
function rawRun(pass: number, fail: number): RawRun {
  const mk = (i: number, status: "pass" | "fail") => ({
    title: `s${i}-${status}`,
    sourceFile: "src/x.story.test.ts",
    sourceLine: i + 1,
    status,
    story: { scenario: `s${i}-${status}`, steps: [{ keyword: "given" as const, text: "x", status }] },
  });
  return {
    schemaVersion: "1.0",
    projectRoot: "/repo",
    startedAtMs: 0,
    finishedAtMs: 1,
    testCases: [
      ...Array.from({ length: pass }, (_, i) => mk(i, "pass")),
      ...Array.from({ length: fail }, (_, i) => mk(pass + i, "fail")),
    ],
  } as unknown as RawRun;
}

/** Minimal in-memory loader context. */
function fakeCtx() {
  const store = new Map<string, Record<string, unknown>>();
  return {
    entries: store,
    ctx: {
      store: {
        clear: () => store.clear(),
        set: (e: { id: string; data: Record<string, unknown> }) => store.set(e.id, e.data),
      },
      logger: { info: () => {}, warn: () => {} },
      // no watcher — we drive re-syncs by re-running load()
    },
  };
}

describe("trajectoryLoader", () => {
  let file: string;
  beforeEach(() => {
    file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "es-traj-")), "raw-run.json");
  });
  afterEach(() => {
    fs.rmSync(path.dirname(file), { recursive: true, force: true });
  });

  it("folds runs across re-syncs, pinning the session baseline", async () => {
    const loader = trajectoryLoader({ source: file });

    // Run 1 — baseline: 1 passed, 2 failed.
    fs.writeFileSync(file, JSON.stringify(rawRun(1, 2)));
    const a = fakeCtx();
    await loader.load(a.ctx);
    let session = a.entries.get("session") as unknown as TrajectorySummary;
    expect(session.runCount).toBe(1);
    expect(session.current).toMatchObject({ passed: 1, failed: 2 });
    expect(session.session).toBeNull(); // no delta on first run

    // Run 2 — now 3 passed, 0 failed. Same loader instance keeps the baseline.
    fs.writeFileSync(file, JSON.stringify(rawRun(3, 0)));
    const b = fakeCtx();
    await loader.load(b.ctx);
    session = b.entries.get("session") as unknown as TrajectorySummary;
    expect(session.runCount).toBe(2);
    expect(session.current).toMatchObject({ passed: 3, failed: 0 });
    expect(session.session?.diff.passed).toBe(2); // 3 - 1 vs the pinned baseline
    expect(session.session?.diff.failed).toBe(-2); // 0 - 2
  });
});
