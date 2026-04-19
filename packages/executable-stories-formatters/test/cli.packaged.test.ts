import { execFileSync, spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

const testDir = dirname(fileURLToPath(import.meta.url));
const packageDir = resolve(testDir, "..");
const exampleJson = resolve(packageDir, "schemas/examples/minimal.json");
const packagedCliPath = resolve(packageDir, "dist/cli.js");
const validConfigPath = resolve(testDir, "fixtures/config/valid.config.js");

function ensurePackagedCliBuilt(): void {
  if (fs.existsSync(packagedCliPath)) return;

  execFileSync("pnpm", ["build"], {
    cwd: packageDir,
    stdio: "pipe",
  });
}

describe("packaged CLI", () => {
  it(
    "validates example input after build",
    () => {
      ensurePackagedCliBuilt();

      const output = execFileSync(
        "node",
        [packagedCliPath, "validate", exampleJson],
        {
          cwd: packageDir,
          encoding: "utf8",
          stdio: "pipe",
        }
      );

      expect(output).toContain("Valid RawRun (schemaVersion 1).");
    },
    30_000
  );

  it(
    "rejects unsupported compare formats instead of silently ignoring them",
    () => {
      ensurePackagedCliBuilt();

      expect(() =>
        execFileSync(
          "node",
          [
            packagedCliPath,
            "compare",
            exampleJson,
            exampleJson,
            "--format",
            "html,junit",
          ],
          {
            cwd: packageDir,
            encoding: "utf8",
            stdio: "pipe",
          }
        )
      ).toThrowError(/compare supports only "html" and "markdown" formats/);
    },
    30_000
  );

  describe("--config custom formatter plugin", () => {
    let tmpDir: string | undefined;

    afterEach(() => {
      if (tmpDir) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
        tmpDir = undefined;
      }
    });

    it(
      "writes a custom formatter output file using the plugin config",
      () => {
        ensurePackagedCliBuilt();

        tmpDir = fs.mkdtempSync(join(os.tmpdir(), "es-custom-formatter-"));

        const rawRun = {
          schemaVersion: 1,
          projectRoot: tmpDir,
          startedAtMs: 1706745600000,
          finishedAtMs: 1706745612345,
          testCases: [
            {
              title: "Custom formatter test",
              status: "pass",
              story: {
                scenario: "Custom formatter test",
                steps: [{ keyword: "Given", text: "a custom formatter exists" }],
              },
            },
          ],
        };

        const inputJson = join(tmpDir, "raw-run.json");
        fs.writeFileSync(inputJson, JSON.stringify(rawRun, null, 2), "utf8");

        const result = spawnSync(
          "node",
          [
            packagedCliPath,
            "format",
            inputJson,
            "--format",
            "test-format",
            "--config",
            validConfigPath,
            "--output-dir",
            tmpDir,
            "--output-name",
            "report",
          ],
          {
            cwd: packageDir,
            encoding: "utf8",
          }
        );

        expect(result.status).toBe(0);

        const outputFile = join(tmpDir, "report.txt");
        expect(fs.existsSync(outputFile)).toBe(true);

        const content = fs.readFileSync(outputFile, "utf8");
        expect(content).toContain("test-format: 1 tests");
      },
      60_000
    );
  });

  describe("--asset-mode copy", () => {
    let tmpDir: string | undefined;

    afterEach(() => {
      if (tmpDir) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
        tmpDir = undefined;
      }
    });

    it(
      "copies referenced local assets into assets/ and rewrites HTML paths",
      () => {
        ensurePackagedCliBuilt();

        // Create a temp directory for this test.
        // The video file lives directly inside tmpDir so that when the ACL
        // computes path.relative(projectRoot, videoPath) = "test-recording.webm",
        // and bundleAssets resolves it relative to the HTML output dir (which is
        // also tmpDir/reports), the ../test-recording.webm path is correct.
        tmpDir = fs.mkdtempSync(join(os.tmpdir(), "es-asset-mode-copy-"));
        const reportsDir = join(tmpDir, "reports");

        // Create a fake .webm video file large enough to avoid base64 embedding
        // (default max embed is 512KB — write 600KB so it becomes a path reference).
        // Place it relative to reportsDir so bundleAssets can resolve the path.
        const testResultsDir = join(tmpDir, "test-results");
        fs.mkdirSync(testResultsDir, { recursive: true });
        const videoPath = join(testResultsDir, "test-recording.webm");
        const sixHundredKb = 600 * 1024;
        fs.writeFileSync(videoPath, Buffer.alloc(sixHundredKb, 0));

        // Build a raw-run JSON fixture referencing the video file.
        // projectRoot is set to reportsDir so that relative paths computed by
        // the ACL layer (path.relative(projectRoot, videoPath)) resolve correctly
        // when bundleAssets resolves them back from the HTML output directory.
        const rawRun = {
          schemaVersion: 1,
          projectRoot: reportsDir,
          startedAtMs: 1706745600000,
          finishedAtMs: 1706745612345,
          testCases: [
            {
              title: "Video recording test",
              status: "pass",
              story: {
                scenario: "Video recording test",
                steps: [
                  { keyword: "Given", text: "the test runs" },
                  { keyword: "Then", text: "a video is captured" },
                ],
              },
              attachments: [
                {
                  name: "Test recording",
                  mediaType: "video/webm",
                  path: videoPath,
                },
              ],
            },
          ],
        };

        const inputJson = join(tmpDir, "raw-run.json");
        fs.writeFileSync(inputJson, JSON.stringify(rawRun, null, 2), "utf8");

        // Run the CLI with --asset-mode copy
        const result = spawnSync(
          "node",
          [
            packagedCliPath,
            "format",
            inputJson,
            "--format",
            "html",
            "--output-dir",
            reportsDir,
            "--asset-mode",
            "copy",
          ],
          {
            cwd: packageDir,
            encoding: "utf8",
          }
        );

        expect(result.status).toBe(0);

        // The HTML report file should exist
        const htmlPath = join(reportsDir, "index.html");
        expect(fs.existsSync(htmlPath)).toBe(true);

        // The assets directory should exist
        const assetsDir = join(reportsDir, "assets");
        expect(fs.existsSync(assetsDir)).toBe(true);

        // The assets directory should contain the copied .webm file
        const assetFiles = fs.readdirSync(assetsDir);
        const webmFile = assetFiles.find((f) => f.endsWith(".webm"));
        expect(webmFile).toBeDefined();

        // The HTML should reference assets/ paths instead of the original absolute path
        const html = fs.readFileSync(htmlPath, "utf8");
        expect(html).toContain("assets/");
        expect(html).not.toContain(videoPath);
      },
      60_000
    );
  });
});
