/**
 * Aggregation as a derived view.
 *
 * Each test file owns its report. The single combined report people read is
 * built from those, explicitly, by a pure function over the directory. Nothing
 * about it is stateful: same files in, same report out.
 */
import { describe, expect, it } from "vitest";
import { mock } from "vitest-mock-extended";

import { aggregateReports } from "../src/aggregate-reports";
import { reportFileNameFor } from "../src/file-reports";
import type { Logger } from "../src/types/options";

function memFs(seed: Record<string, string> = {}) {
  const files = new Map<string, string>(Object.entries(seed));
  return {
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
  };
}

function shard(sourceFile: string, scenarios: string[], lastRunAtMs = 1000) {
  return JSON.stringify({
    projectRoot: "/repo",
    runId: sourceFile,
    startedAtMs: lastRunAtMs,
    finishedAtMs: lastRunAtMs,
    durationMs: 0,
    testCases: scenarios.map((scenario, i) => ({
      id: `${sourceFile}#${i}`,
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
    })),
  });
}

describe("aggregateReports", () => {
  it("combines every test file's report into one run", () => {
    const deps = memFs({
      "reports/by-file/src-beta.story-report.json": shard("src/beta.test.ts", ["beta behaves"]),
      "reports/by-file/src-alpha.story-report.json": shard("src/alpha.test.ts", ["alpha behaves"]),
    });

    const result = aggregateReports({ dir: "reports/by-file" }, deps);

    expect(result.run.testCases.map((tc) => tc.story.scenario)).toEqual([
      "alpha behaves",
      "beta behaves",
    ]);
    expect(result.files).toBe(2);
  });

  it("orders by source file so the same inputs always give the same report", () => {
    const seed = {
      "reports/by-file/z.story-report.json": shard("src/zeta.test.ts", ["z"]),
      "reports/by-file/a.story-report.json": shard("src/alpha.test.ts", ["a"]),
      "reports/by-file/m.story-report.json": shard("src/mid.test.ts", ["m"]),
    };
    const first = aggregateReports({ dir: "reports/by-file" }, memFs(seed));
    const second = aggregateReports({ dir: "reports/by-file" }, memFs(seed));

    expect(first.run.testCases.map((tc) => tc.sourceFile)).toEqual([
      "src/alpha.test.ts",
      "src/mid.test.ts",
      "src/zeta.test.ts",
    ]);
    expect(JSON.stringify(first.run)).toBe(JSON.stringify(second.run));
  });

  it("spans the runs behind it rather than claiming one moment", () => {
    const deps = memFs({
      "reports/by-file/a.story-report.json": shard("src/alpha.test.ts", ["a"], 1000),
      "reports/by-file/b.story-report.json": shard("src/beta.test.ts", ["b"], 9000),
    });

    const { run } = aggregateReports({ dir: "reports/by-file" }, deps);

    expect(run.startedAtMs).toBe(1000);
    expect(run.finishedAtMs).toBe(9000);
  });

  it("reports duplicate scenario identities instead of rendering them twice", () => {
    // Two files claiming one scenario id would make the aggregate depend on
    // read order and break deep links.
    const deps = memFs({
      "reports/by-file/a.story-report.json": shard("src/alpha.test.ts", ["shared"]),
      "reports/by-file/b.story-report.json": shard("src/alpha.test.ts", ["shared"]),
    });

    const result = aggregateReports({ dir: "reports/by-file" }, deps);

    expect(result.duplicateIds).toEqual(["src/alpha.test.ts#0"]);
    expect(deps.logger.warn).toHaveBeenCalled();
    expect(result.run.testCases).toHaveLength(1);
  });

  it("names a report it cannot read rather than quietly dropping it", () => {
    const deps = memFs({
      "reports/by-file/good.story-report.json": shard("src/alpha.test.ts", ["a"]),
      "reports/by-file/bad.story-report.json": "{not json",
    });

    const result = aggregateReports({ dir: "reports/by-file" }, deps);

    expect(result.unreadable).toEqual(["reports/by-file/bad.story-report.json"]);
    expect(result.run.testCases).toHaveLength(1);
    expect(deps.logger.warn).toHaveBeenCalled();
  });

  it("returns nothing when the directory holds no reports", () => {
    expect(aggregateReports({ dir: "reports/by-file" }, memFs())).toBeUndefined();
  });
});

describe("report filenames", () => {
  it("gives every source file a stable name of its own", () => {
    // Recovering from a collision only when the plain name happened to be taken
    // made ownership depend on history: delete the first owner and the second
    // starts writing a new file while its old one lingers forever. A name that
    // always carries the digest is stable whatever else exists.
    const a = reportFileNameFor("src/a/b.test.ts");
    const b = reportFileNameFor("src/a-b.test.ts");

    expect(a).not.toBe(b);
    // Still readable: you can tell which test file it belongs to.
    expect(a).toContain("b");
    expect(b).toContain("a-b");
    // Stable: the same path always gives the same name.
    expect(reportFileNameFor("src/a/b.test.ts")).toBe(a);
  });
});
