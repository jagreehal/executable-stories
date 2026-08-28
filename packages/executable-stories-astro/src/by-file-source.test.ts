import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { loadAllStoryEntries } from "./loader.js";
import { storyNavItems } from "./sidebar-nav.js";
import { readRunsFromSources } from "./trajectory-loader.js";

/**
 * A source pointing at the formatter's per-file report directory. Each report is
 * a canonical run covering one source file, so the site sees the whole suite even
 * when the last test run only touched part of it.
 */
let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "es-astro-by-file-"));
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

function writeReport(name: string, sourceFile: string, scenario: string): void {
  const run = {
    projectRoot: "/repo",
    runId: name,
    startedAtMs: 1000,
    finishedAtMs: 2000,
    durationMs: 1000,
    testCases: [
      {
        id: `${name}-1`,
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
      },
    ],
  };
  fs.writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(run));
}

describe("a source pointing at a by-file report directory", () => {
  it("loads the scenarios of every report, not just one file", () => {
    writeReport("alpha", "src/alpha.test.ts", "alpha behaves");
    writeReport("beta", "src/beta.test.ts", "beta behaves");

    const { entries, readableSources } = loadAllStoryEntries(
      { source: dir, inputType: "canonical" },
      (abs) => JSON.parse(fs.readFileSync(abs, "utf8")) as unknown,
    );

    expect(readableSources).toBe(1);
    expect(entries.map((e) => e.title).sort()).toEqual([
      "alpha behaves",
      "beta behaves",
    ]);
  });

  it("still reads a source that names a single run file", () => {
    writeReport("alpha", "src/alpha.test.ts", "alpha behaves");

    const { entries } = loadAllStoryEntries(
      { source: path.join(dir, "alpha.json"), inputType: "canonical" },
      (abs) => JSON.parse(fs.readFileSync(abs, "utf8")) as unknown,
    );

    expect(entries.map((e) => e.title)).toEqual(["alpha behaves"]);
  });
});

describe("input type for a directory source", () => {
  it("reads per-file reports as canonical without being told", () => {
    // These reports hold canonical runs. Read as raw, "passed" is not a raw
    // status, so normalisation turns every passing scenario into skipped — a
    // total, silent corruption of the site.
    writeReport("alpha", "src/alpha.test.ts", "alpha behaves");

    const { entries } = loadAllStoryEntries({ source: dir }, (abs) =>
      JSON.parse(fs.readFileSync(abs, "utf8")) as unknown,
    );

    expect(entries).toHaveLength(1);
    expect(entries[0]!.status).toBe("passed");
  });

  it("still honours an explicit inputType on a directory", () => {
    writeReport("alpha", "src/alpha.test.ts", "alpha behaves");
    const { entries } = loadAllStoryEntries(
      { source: dir, inputType: "canonical" },
      (abs) => JSON.parse(fs.readFileSync(abs, "utf8")) as unknown,
    );
    expect(entries[0]!.status).toBe("passed");
  });
});

describe("everything that reads a source handles a directory", () => {
  it("builds the sidebar from a directory of per-file reports", () => {
    writeReport("alpha", "src/alpha.test.ts", "alpha behaves");
    writeReport("beta", "src/beta.test.ts", "beta behaves");

    const items = storyNavItems({ source: dir });
    const rendered = JSON.stringify(items);

    // Reading the directory as one JSON file silently fell back to a plain
    // link, so the scaffold's default source produced no nav at all.
    expect(rendered).toContain("alpha behaves");
    expect(rendered).toContain("beta behaves");
  });

  it("reads a directory of per-file reports into runs for the trajectory", () => {
    writeReport("alpha", "src/alpha.test.ts", "alpha behaves");
    writeReport("beta", "src/beta.test.ts", "beta behaves");

    const runs = readRunsFromSources({ source: dir }, (abs: string) => {
      try {
        return JSON.parse(fs.readFileSync(abs, "utf8")) as unknown;
      } catch {
        return null;
      }
    });

    // Reading the directory as one JSON file produced no run at all, so the
    // trajectory stayed empty for the scaffold's default source.
    expect(runs).toHaveLength(2);
  });
});
