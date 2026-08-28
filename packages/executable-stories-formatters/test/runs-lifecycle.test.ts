/**
 * Lifecycle for the per-file reports.
 *
 * The directory is plain and visible, so `ls` and `rm` already work on it.
 * What a listing cannot show is how old each file's results are, which is the
 * question behind "why does the combined report still say this passes".
 */
import { describe, expect, it } from "vitest";
import { mock } from "vitest-mock-extended";

import { runsStatus, runsReset } from "../src/runs-lifecycle";
import type { Logger } from "../src/types/options";

function memFs(seed: Record<string, string> = {}) {
  const files = new Map<string, string>(Object.entries(seed));
  return {
    files,
    deps: {
      logger: mock<Logger>(),
      readFile: (p: string) => {
        const found = files.get(p);
        if (found === undefined) throw new Error(`ENOENT: ${p}`);
        return found;
      },
      listDir: (dir: string) => {
        const prefix = `${dir}/`;
        const names = [...files.keys()]
          .filter((k) => k.startsWith(prefix))
          .map((k) => k.slice(prefix.length))
          .filter((rest) => !rest.includes("/"));
        return names.length > 0 ? names.sort() : undefined;
      },
      removeFile: (p: string) => {
        files.delete(p);
      },
    },
  };
}

function shard(sourceFile: string, scenarios: string[], lastRunAtMs: number) {
  return JSON.stringify({
    projectRoot: "/repo",
    runId: "r",
    startedAtMs: lastRunAtMs,
    finishedAtMs: lastRunAtMs,
    durationMs: 0,
    testCases: scenarios.map((scenario, i) => ({
      id: `${sourceFile}-${i}`,
      sourceFile,
      sourceLine: 1,
      status: "passed",
      durationMs: 1,
      attachments: [],
      stepResults: [],
      titlePath: [],
      retry: 0,
      retries: 0,
      tags: [],
      story: { scenario, steps: [] },
      lastRunAtMs,
      lastRunGitSha: "abc1234",
    })),
  });
}

const DAY = 86_400_000;
const NOW = 1_800_000_000_000;

describe("runs status", () => {
  it("says the directory is empty rather than pretending it has data", () => {
    const { deps } = memFs();
    const report = runsStatus({ outputDir: "reports", nowMs: NOW }, deps);

    expect(report.exists).toBe(false);
    expect(report.files).toHaveLength(0);
    expect(report.text).toMatch(/no per-file reports/i);
  });

  it("names each test file, its scenario count, and how stale it is", () => {
    const { deps } = memFs({
      "reports/by-file/src-alpha.story-report.json": shard(
        "src/alpha.test.ts",
        ["alpha behaves"],
        NOW - 12 * DAY,
      ),
      "reports/by-file/src-beta.story-report.json": shard(
        "src/beta.test.ts",
        ["beta behaves", "beta also behaves"],
        NOW,
      ),
    });

    const report = runsStatus({ outputDir: "reports", nowMs: NOW }, deps);

    expect(report.exists).toBe(true);
    expect(report.files.map((f) => f.sourceFile)).toEqual([
      "src/alpha.test.ts",
      "src/beta.test.ts",
    ]);
    expect(report.files[1]!.scenarios).toBe(2);
    expect(report.totalScenarios).toBe(3);

    // The point of the command: which results are old enough to distrust.
    expect(report.text).toContain("src/alpha.test.ts");
    expect(report.text).toContain("12 days ago");
    expect(report.text).toContain("just now");
  });

  it("reports a shard it cannot parse instead of hiding it", () => {
    const { deps } = memFs({ "reports/by-file/broken.json": "{not json" });
    const report = runsStatus({ outputDir: "reports", nowMs: NOW }, deps);

    expect(report.unreadable).toEqual(["reports/by-file/broken.json"]);
    expect(report.text).toMatch(/unreadable/i);
  });
});

describe("runs reset", () => {
  it("removes every shard and says what it removed", () => {
    const { files, deps } = memFs({
      "reports/by-file/src-alpha.story-report.json": shard("src/alpha.test.ts", ["a"], NOW),
      "reports/by-file/src-beta.story-report.json": shard("src/beta.test.ts", ["b"], NOW),
      "reports/by-file/.gitignore": "*\n",
      "reports/index.md": "# report",
    });

    const result = runsReset({ outputDir: "reports" }, deps);

    expect(result.removed).toBe(2);
    expect([...files.keys()]).not.toContain("reports/by-file/src-alpha.story-report.json");
    // The rendered report is the user's, not ours to delete.
    expect([...files.keys()]).toContain("reports/index.md");
    // And the directory stays ignored for the next run.
    expect([...files.keys()]).toContain("reports/by-file/.gitignore");
  });

  it("is safe to run when there is nothing accumulated", () => {
    const { deps } = memFs();
    expect(runsReset({ outputDir: "reports" }, deps).removed).toBe(0);
  });
});
