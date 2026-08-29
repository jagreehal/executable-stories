import { describe, expect, it, vi } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { regenerateArtifacts, regenerateRun, startWatch } from "../src/watch";

describe("regenerateArtifacts", () => {
  it("generates agent artifacts from a raw-run file, carrying covers", async () => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "es-watch-"));
    const files = await regenerateArtifacts({
      input: "schemas/examples/go.json",
      outputDir: outDir,
      outputName: "index",
      formats: ["scenario-index-json", "behavior-manifest-json"],
    });

    expect(files).toHaveLength(2);
    const indexPath = path.join(outDir, "index.scenario-index.json");
    expect(fs.existsSync(indexPath)).toBe(true);
    const index = JSON.parse(fs.readFileSync(indexPath, "utf8")) as {
      scenarios: Array<{ covers: string[] }>;
    };
    expect(index.scenarios[0]).toHaveProperty("covers");
  });
});

describe("startWatch", () => {
  it("does an initial build and debounces change bursts into one regenerate", async () => {
    vi.useFakeTimers();
    try {
      const regenerate = vi.fn<(input: string) => Promise<string[]>>().mockResolvedValue([]);
      let listener: () => void = () => {};

      const handle = startWatch(
        {
          input: "raw-run.json",
          outputDir: "reports",
          outputName: "index",
          formats: ["scenario-index-json"],
          debounceMs: 100,
        },
        {
          watch: (_path, l) => {
            listener = l;
            return { close: () => {} };
          },
          regenerate,
          log: () => {},
        },
      );

      // Initial build fires after the debounce window.
      await vi.advanceTimersByTimeAsync(100);
      expect(regenerate).toHaveBeenCalledTimes(1);

      // Two rapid change events coalesce into a single regenerate.
      listener();
      listener();
      await vi.advanceTimersByTimeAsync(100);
      expect(regenerate).toHaveBeenCalledTimes(2);

      handle.close();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("regenerateRun", () => {
  it("returns the run it actually rendered, not just the file it was handed", async () => {
    // Callers use this run to diff against and to report on. After a filtered
    // run it must describe the report on disk, which covers the whole suite,
    // rather than the fraction this invocation read in.
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "es-watch-run-"));
    const inputDir = fs.mkdtempSync(path.join(os.tmpdir(), "es-watch-in-"));

    const runFile = (name: string, sourceFile: string, scenario: string) => {
      const file = path.join(inputDir, name);
      fs.writeFileSync(
        file,
        JSON.stringify({
          schemaVersion: 1,
          projectRoot: "/repo",
          startedAtMs: 1,
          finishedAtMs: 2,
          testCases: [
            {
              title: scenario,
              sourceFile,
              sourceLine: 1,
              status: "pass",
              story: { scenario, steps: [{ keyword: "given", text: "a" }] },
            },
          ],
        }),
      );
      return file;
    };

    const options = {
      outputDir: outDir,
      outputName: "index",
      formats: ["markdown" as const],
    };

    await regenerateRun({
      ...options,
      input: runFile("alpha.json", "src/alpha.test.ts", "alpha behaves"),
    });
    const { run } = await regenerateRun({
      ...options,
      input: runFile("beta.json", "src/beta.test.ts", "beta behaves"),
    });

    expect(run.testCases.map((tc) => tc.story.scenario).sort()).toEqual([
      "alpha behaves",
      "beta behaves",
    ]);
  });
});
