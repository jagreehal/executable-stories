import { describe, it, expect, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { ReportGenerator } from "../../src/index";
import { canonicalizeRun } from "executable-stories-core/converters/acl/canonicalize";
import { createRawRun, createTestCase } from "../fixtures/raw-runs/basic";

describe("markdown asset bundling", () => {
  const tempDirs: string[] = [];

  function makeTempDir(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "markdown-assets-"));
    tempDirs.push(dir);
    return dir;
  }

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  /** One scenario whose only doc entry is a video sitting outside the report dir. */
  function runWithVideo(videoPath: string) {
    return canonicalizeRun(
      createRawRun({
        testCases: [
          createTestCase({
            story: {
              scenario: "The agent replies with a legal move",
              steps: [{ keyword: "Then", text: "an orange disc appears" }],
              docs: [
                {
                  kind: "video",
                  path: videoPath,
                  caption: "Recorded walkthrough",
                  phase: "runtime",
                },
              ],
            },
          }),
        ],
      }),
    );
  }

  async function generate(outputDir: string, assetMode: "none" | "copy") {
    const generator = new ReportGenerator({
      formats: ["markdown"],
      outputDir,
      outputName: "stories",
      output: { mode: "aggregated" },
      assetMode,
    });
    const paths = (await generator.generate(runWithVideo("../runs/video.webm"))).get(
      "markdown",
    )!;
    return fs.readFileSync(paths[0], "utf8");
  }

  function seed(): { outputDir: string; tempDir: string } {
    const tempDir = makeTempDir();
    const outputDir = path.join(tempDir, "docs");
    fs.mkdirSync(path.join(tempDir, "runs"), { recursive: true });
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(path.join(tempDir, "runs", "video.webm"), "WEBM_DATA");
    return { outputDir, tempDir };
  }

  it("copies referenced media beside the report and rewrites the path", async () => {
    const { outputDir } = seed();

    const content = await generate(outputDir, "copy");

    // Copied names carry a content hash, so two runs' videos cannot collide.
    const copied = fs.readdirSync(path.join(outputDir, "assets"));
    expect(copied).toHaveLength(1);
    expect(copied[0]).toMatch(/^video-[\da-f]+\.webm$/);
    expect(content).toContain(`assets/${copied[0]}`);
    expect(content).not.toContain("../runs/video.webm");
    expect(fs.readFileSync(path.join(outputDir, "assets", copied[0]), "utf8")).toBe(
      "WEBM_DATA",
    );
  });

  it("leaves the path alone when bundling is off", async () => {
    const { outputDir } = seed();

    const content = await generate(outputDir, "none");

    expect(content).toContain("../runs/video.webm");
    expect(fs.existsSync(path.join(outputDir, "assets"))).toBe(false);
  });
});
