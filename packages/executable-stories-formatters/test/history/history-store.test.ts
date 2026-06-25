import { describe, it, expect, vi } from "vitest";
import {
  loadHistory,
  saveHistory,
  updateHistory,
} from "../../src/history/history-store";
import type { HistoryStore } from "../../src/history/types";
import type { TestRunResult } from "executable-stories-core/types/test-result";

function makeStore(overrides: Partial<HistoryStore> = {}): HistoryStore {
  return {
    version: 1,
    maxRuns: 10,
    tests: {},
    lastUpdated: 0,
    ...overrides,
  };
}

function makeRun(
  testCases: Array<{
    id: string;
    scenario: string;
    status: "passed" | "failed";
    durationMs: number;
  }>,
): TestRunResult {
  return {
    testCases: testCases.map((tc) => ({
      id: tc.id,
      story: {
        scenario: tc.scenario,
        steps: [],
      },
      sourceFile: "test.ts",
      sourceLine: 1,
      status: tc.status,
      durationMs: tc.durationMs,
      attachments: [],
      stepResults: [],
      titlePath: [],
      retry: 0,
      retries: 0,
      tags: [],
    })),
    startedAtMs: 1000,
    finishedAtMs: 2000,
    durationMs: 1000,
    projectRoot: "/",
    runId: "run-1",
  } as unknown as TestRunResult;
}

describe("loadHistory", () => {
  it("returns empty store when file is missing", () => {
    const store = loadHistory(
      { filePath: "/missing.json" },
      { readFile: () => undefined, logger: { warn: vi.fn() } },
    );
    expect(store.version).toBe(1);
    expect(store.maxRuns).toBe(10);
    expect(store.tests).toEqual({});
    expect(store.lastUpdated).toBe(0);
  });

  it("returns valid store from JSON", () => {
    const existing: HistoryStore = {
      version: 1,
      maxRuns: 5,
      tests: {
        "test-1": {
          testId: "test-1",
          testName: "A test",
          sourceFile: "a.ts",
          entries: [
            {
              runId: "r1",
              timestamp: 100,
              status: "passed",
              durationMs: 50,
            },
          ],
        },
      },
      lastUpdated: 100,
    };

    const store = loadHistory(
      { filePath: "/store.json" },
      {
        readFile: () => JSON.stringify(existing),
        logger: { warn: vi.fn() },
      },
    );

    expect(store.version).toBe(1);
    expect(store.maxRuns).toBe(5);
    expect(store.tests["test-1"].testName).toBe("A test");
    expect(store.tests["test-1"].entries).toHaveLength(1);
  });

  it("returns empty store and warns for unknown version", () => {
    const warn = vi.fn();
    const store = loadHistory(
      { filePath: "/store.json" },
      {
        readFile: () => JSON.stringify({ version: 99, tests: {} }),
        logger: { warn },
      },
    );

    expect(store.version).toBe(1);
    expect(store.tests).toEqual({});
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("Unknown history version"),
    );
  });

  it("returns empty store and warns on parse error", () => {
    const warn = vi.fn();
    const store = loadHistory(
      { filePath: "/bad.json" },
      {
        readFile: () => "not valid json {{{",
        logger: { warn },
      },
    );

    expect(store.version).toBe(1);
    expect(store.tests).toEqual({});
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("Failed to parse"),
    );
  });

  it("returns empty store and warns when version=1 payload is malformed", () => {
    const warn = vi.fn();
    const store = loadHistory(
      { filePath: "/bad-shape.json" },
      {
        // version is valid but required keys are missing/invalid
        readFile: () => JSON.stringify({ version: 1, tests: null }),
        logger: { warn },
      },
    );

    expect(store).toEqual({
      version: 1,
      maxRuns: 10,
      tests: {},
      lastUpdated: 0,
    });
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("Malformed history store"),
    );
  });
});

describe("saveHistory", () => {
  it("writes pretty-printed JSON", () => {
    const writeFile = vi.fn();
    const store = makeStore({ lastUpdated: 123 });

    saveHistory({ filePath: "/out.json", store }, { writeFile });

    expect(writeFile).toHaveBeenCalledWith(
      "/out.json",
      JSON.stringify(store, null, 2),
    );
  });
});

describe("updateHistory", () => {
  it("appends entries per test", () => {
    const store = makeStore();
    const run = makeRun([
      { id: "t1", scenario: "Test 1", status: "passed", durationMs: 100 },
    ]);

    const updated = updateHistory({ store, run, maxRuns: 10 });

    expect(updated.tests["t1"]).toBeDefined();
    expect(updated.tests["t1"].entries).toHaveLength(1);
    expect(updated.tests["t1"].entries[0].status).toBe("passed");
    expect(updated.tests["t1"].entries[0].runId).toBe("run-1");
    expect(updated.lastUpdated).toBeGreaterThan(0);
  });

  it("trims per-test entries to maxRuns", () => {
    const existingEntries = Array.from({ length: 10 }, (_, i) => ({
      runId: `r${i}`,
      timestamp: i * 100,
      status: "passed" as const,
      durationMs: 50,
    }));
    const store = makeStore({
      tests: {
        t1: {
          testId: "t1",
          testName: "Test",
          sourceFile: "a.ts",
          entries: existingEntries,
        },
      },
    });
    const run = makeRun([
      { id: "t1", scenario: "Test", status: "failed", durationMs: 200 },
    ]);

    const updated = updateHistory({ store, run, maxRuns: 10 });

    expect(updated.tests["t1"].entries).toHaveLength(10);
    // The latest entry should be the new one
    expect(updated.tests["t1"].entries[9].status).toBe("failed");
    expect(updated.tests["t1"].entries[9].runId).toBe("run-1");
    // The first entry should have been trimmed (originally r0)
    expect(updated.tests["t1"].entries[0].runId).toBe("r1");
  });

  it("creates new TestHistory for unknown tests", () => {
    const store = makeStore({
      tests: {
        existing: {
          testId: "existing",
          testName: "Existing",
          sourceFile: "x.ts",
          entries: [],
        },
      },
    });
    const run = makeRun([
      { id: "new-test", scenario: "New", status: "passed", durationMs: 10 },
    ]);

    const updated = updateHistory({ store, run, maxRuns: 10 });

    expect(updated.tests["existing"]).toBeDefined();
    expect(updated.tests["new-test"]).toBeDefined();
    expect(updated.tests["new-test"].testName).toBe("New");
    expect(updated.tests["new-test"].entries).toHaveLength(1);
  });

  it("preserves existing tests not in current run", () => {
    const store = makeStore({
      tests: {
        old: {
          testId: "old",
          testName: "Old Test",
          sourceFile: "old.ts",
          entries: [
            {
              runId: "r-old",
              timestamp: 50,
              status: "passed",
              durationMs: 10,
            },
          ],
        },
      },
    });
    const run = makeRun([
      { id: "new", scenario: "New Test", status: "passed", durationMs: 10 },
    ]);

    const updated = updateHistory({ store, run, maxRuns: 10 });

    expect(updated.tests["old"]).toBeDefined();
    expect(updated.tests["old"].entries).toHaveLength(1);
    expect(updated.tests["new"]).toBeDefined();
  });
});
