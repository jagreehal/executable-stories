import { describe, expect, it, vi } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { regenerateArtifacts, startWatch } from "../src/watch";

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
    const indexPath = path.join(outDir, "index.scenarios-index.json");
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
