import { execFileSync, spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";
import { generateTestCaseId } from "executable-stories-core/converters/acl/ids";

const testDir = dirname(fileURLToPath(import.meta.url));
const packageDir = resolve(testDir, "..");
const exampleJson = resolve(packageDir, "schemas/examples/minimal.json");
const packagedCliPath = resolve(packageDir, "dist/cli.js");
const validConfigPath = resolve(testDir, "fixtures/config/valid.config.js");

function ensurePackagedCliBuilt(): void {
  // If turbo has already built dist, trust it — do NOT rebuild. Calling
  // pnpm build here triggers tsup with clean: true, which wipes the dist
  // and races with parallel test/lint/type-check tasks across the monorepo.
  if (fs.existsSync(packagedCliPath)) return;
  execFileSync("pnpm", ["build"], {
    cwd: packageDir,
    stdio: "pipe",
  });
}

describe("packaged CLI", () => {
  it(
    "prints a migration message for the removed `serve` subcommand",
    () => {
      ensurePackagedCliBuilt();

      const result = spawnSync("node", [packagedCliPath, "serve"], {
        cwd: packageDir,
        encoding: "utf8",
      });

      expect(result.status).toBe(4);
      expect(result.stderr).toContain('"serve" subcommand was removed');
      expect(result.stderr).toContain("executable-stories dev");
      // Not the generic unknown-subcommand path.
      expect(result.stderr).not.toContain("Unknown subcommand");
    },
    30000
  );

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
    120_000
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
      ).toThrowError(/compare supports only "html", "markdown", and "changelog" formats/);
    },
    120_000
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

  describe("gate-release", () => {
    let tmpDir: string | undefined;

    afterEach(() => {
      if (tmpDir) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
        tmpDir = undefined;
      }
    });

    it(
      "applies release policy exceptions by exact scenario id",
      () => {
        ensurePackagedCliBuilt();

        tmpDir = fs.mkdtempSync(join(os.tmpdir(), "es-gate-release-"));
        const sourceFile = "src/release.story.test.ts";
        const omittedScenario = "Feature B ships";
        const wrongScenario = "Feature C ships";
        const omittedId = generateTestCaseId(sourceFile, omittedScenario);
        const wrongId = generateTestCaseId(sourceFile, wrongScenario);
        const devRun = {
          schemaVersion: 1,
          projectRoot: tmpDir,
          startedAtMs: 1706745600000,
          finishedAtMs: 1706745610000,
          testCases: [
            {
              title: "Feature A ships",
              sourceFile,
              sourceLine: 1,
              status: "pass",
              story: { scenario: "Feature A ships", steps: [{ keyword: "Given", text: "A is tested" }] },
            },
            {
              title: omittedScenario,
              sourceFile,
              sourceLine: 10,
              status: "pass",
              story: { scenario: omittedScenario, steps: [{ keyword: "Given", text: "B is tested" }] },
            },
          ],
        };
        const rcRun = {
          ...devRun,
          finishedAtMs: 1706745620000,
          testCases: [devRun.testCases[0]],
        };
        const devPath = join(tmpDir, "dev.json");
        const rcPath = join(tmpDir, "rc.json");
        const wrongPolicyPath = join(tmpDir, "wrong-policy.json");
        const correctPolicyPath = join(tmpDir, "correct-policy.json");
        fs.writeFileSync(devPath, JSON.stringify(devRun), "utf8");
        fs.writeFileSync(rcPath, JSON.stringify(rcRun), "utf8");
        fs.writeFileSync(wrongPolicyPath, JSON.stringify({ allowedOmissions: [wrongId] }), "utf8");
        fs.writeFileSync(correctPolicyPath, JSON.stringify({ allowedOmissions: [omittedId] }), "utf8");

        const wrong = spawnSync(
          "node",
          [
            packagedCliPath,
            "gate-release",
            devPath,
            rcPath,
            "--format",
            "markdown",
            "--output-dir",
            tmpDir,
            "--release-policy",
            wrongPolicyPath,
          ],
          { cwd: packageDir, encoding: "utf8" },
        );
        expect(wrong.status).toBe(6);

        const correct = spawnSync(
          "node",
          [
            packagedCliPath,
            "gate-release",
            devPath,
            rcPath,
            "--format",
            "markdown",
            "--output-dir",
            tmpDir,
            "--release-policy",
            correctPolicyPath,
          ],
          { cwd: packageDir, encoding: "utf8" },
        );
        expect(correct.status).toBe(0);
      },
      60_000,
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
      "produces a self-contained React report (assets embedded) under --asset-mode copy",
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

        // The `html` report renders via executable-stories-react and is
        // self-contained: the attachment is embedded as a data URI by the report
        // components, so there is nothing to extract — `--asset-mode copy` makes
        // no assets/ dir and the original absolute path never leaks into the HTML.
        const assetsDir = join(reportsDir, "assets");
        expect(fs.existsSync(assetsDir)).toBe(false);

        const html = fs.readFileSync(htmlPath, "utf8");
        expect(html).toContain("data:video/webm");
        expect(html).not.toContain(videoPath);
      },
      60_000
    );
  });

  describe("compare gates", () => {
    let tmpDir: string | undefined;

    afterEach(() => {
      if (tmpDir) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
        tmpDir = undefined;
      }
    });

    it(
      "exits with compare gate code when regressions are present and --fail-on-regression is set",
      () => {
        ensurePackagedCliBuilt();
        tmpDir = fs.mkdtempSync(join(os.tmpdir(), "es-compare-gate-regression-"));

        const baseline = {
          schemaVersion: 1,
          projectRoot: tmpDir,
          testCases: [{ title: "scenario A", status: "pass" }],
        };
        const current = {
          schemaVersion: 1,
          projectRoot: tmpDir,
          testCases: [{ title: "scenario A", status: "fail" }],
        };
        const baselinePath = join(tmpDir, "baseline.json");
        const currentPath = join(tmpDir, "current.json");
        fs.writeFileSync(baselinePath, JSON.stringify(baseline), "utf8");
        fs.writeFileSync(currentPath, JSON.stringify(current), "utf8");

        const result = spawnSync(
          "node",
          [
            packagedCliPath,
            "compare",
            baselinePath,
            currentPath,
            "--format",
            "markdown",
            "--output-dir",
            tmpDir,
            "--fail-on-regression",
          ],
          { cwd: packageDir, encoding: "utf8" },
        );

        expect(result.status).toBe(5);
        expect(result.stderr).toContain("Compare gate failed");
      },
      120_000
    );

    it(
      "exits with compare gate code when added failing scenarios are present and --fail-on-added-failures is set",
      () => {
        ensurePackagedCliBuilt();
        tmpDir = fs.mkdtempSync(join(os.tmpdir(), "es-compare-gate-added-failures-"));

        const baseline = {
          schemaVersion: 1,
          projectRoot: tmpDir,
          testCases: [{ title: "scenario A", status: "pass" }],
        };
        const current = {
          schemaVersion: 1,
          projectRoot: tmpDir,
          testCases: [
            { title: "scenario A", status: "pass" },
            { title: "scenario B", status: "fail" },
          ],
        };
        const baselinePath = join(tmpDir, "baseline.json");
        const currentPath = join(tmpDir, "current.json");
        fs.writeFileSync(baselinePath, JSON.stringify(baseline), "utf8");
        fs.writeFileSync(currentPath, JSON.stringify(current), "utf8");

        const result = spawnSync(
          "node",
          [
            packagedCliPath,
            "compare",
            baselinePath,
            currentPath,
            "--format",
            "markdown",
            "--output-dir",
            tmpDir,
            "--fail-on-added-failures",
          ],
          { cwd: packageDir, encoding: "utf8" },
        );

        expect(result.status).toBe(5);
        expect(result.stderr).toContain("Compare gate failed");
      },
      120_000
    );

    it(
      "passes when regressions do not exceed --max-regressions threshold",
      () => {
        ensurePackagedCliBuilt();
        tmpDir = fs.mkdtempSync(join(os.tmpdir(), "es-compare-gate-threshold-"));

        const baseline = {
          schemaVersion: 1,
          projectRoot: tmpDir,
          testCases: [{ title: "scenario A", status: "pass" }],
        };
        const current = {
          schemaVersion: 1,
          projectRoot: tmpDir,
          testCases: [{ title: "scenario A", status: "fail" }],
        };
        const baselinePath = join(tmpDir, "baseline.json");
        const currentPath = join(tmpDir, "current.json");
        fs.writeFileSync(baselinePath, JSON.stringify(baseline), "utf8");
        fs.writeFileSync(currentPath, JSON.stringify(current), "utf8");

        const result = spawnSync(
          "node",
          [
            packagedCliPath,
            "compare",
            baselinePath,
            currentPath,
            "--format",
            "markdown",
            "--output-dir",
            tmpDir,
            "--max-regressions",
            "1",
          ],
          { cwd: packageDir, encoding: "utf8" },
        );

        expect(result.status).toBe(0);
      },
      120_000
    );

    it(
      "fails with usage exit code for invalid --max-regressions value",
      () => {
        ensurePackagedCliBuilt();
        tmpDir = fs.mkdtempSync(join(os.tmpdir(), "es-compare-gate-invalid-threshold-"));

        const baseline = {
          schemaVersion: 1,
          projectRoot: tmpDir,
          testCases: [{ title: "scenario A", status: "pass" }],
        };
        const current = {
          schemaVersion: 1,
          projectRoot: tmpDir,
          testCases: [{ title: "scenario A", status: "pass" }],
        };
        const baselinePath = join(tmpDir, "baseline.json");
        const currentPath = join(tmpDir, "current.json");
        fs.writeFileSync(baselinePath, JSON.stringify(baseline), "utf8");
        fs.writeFileSync(currentPath, JSON.stringify(current), "utf8");

        const result = spawnSync(
          "node",
          [
            packagedCliPath,
            "compare",
            baselinePath,
            currentPath,
            "--format",
            "markdown",
            "--max-regressions",
            "-1",
          ],
          { cwd: packageDir, encoding: "utf8" },
        );

        expect(result.status).toBe(4);
        expect(result.stderr).toContain("--max-regressions");
      },
      120_000
    );

    it(
      "fails compare gate when combined conditions are enabled",
      () => {
        ensurePackagedCliBuilt();
        tmpDir = fs.mkdtempSync(join(os.tmpdir(), "es-compare-gate-combined-"));

        const baseline = {
          schemaVersion: 1,
          projectRoot: tmpDir,
          testCases: [{ title: "scenario A", status: "pass" }],
        };
        const current = {
          schemaVersion: 1,
          projectRoot: tmpDir,
          testCases: [
            { title: "scenario A", status: "fail" }, // regressed
            { title: "scenario B", status: "fail" }, // added failing
          ],
        };
        const baselinePath = join(tmpDir, "baseline.json");
        const currentPath = join(tmpDir, "current.json");
        fs.writeFileSync(baselinePath, JSON.stringify(baseline), "utf8");
        fs.writeFileSync(currentPath, JSON.stringify(current), "utf8");

        const result = spawnSync(
          "node",
          [
            packagedCliPath,
            "compare",
            baselinePath,
            currentPath,
            "--format",
            "markdown",
            "--fail-on-regression",
            "--fail-on-added-failures",
            "--max-regressions",
            "0",
          ],
          { cwd: packageDir, encoding: "utf8" },
        );

        expect(result.status).toBe(5);
        expect(result.stderr).toContain("Compare gate failed");
      },
      120_000
    );
  });
});

describe("large state snapshot notice", () => {
  let tmpDir: string | undefined;

  afterEach(() => {
    if (tmpDir) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
      tmpDir = undefined;
    }
  });

  it(
    "validate prints a non-fatal stderr notice for state snapshots over 100KB and still exits 0",
    () => {
      ensurePackagedCliBuilt();

      tmpDir = fs.mkdtempSync(join(os.tmpdir(), "es-state-notice-"));
      const rawRun = {
        schemaVersion: 1,
        projectRoot: tmpDir,
        testCases: [
          {
            title: "Big basket",
            status: "pass",
            story: {
              scenario: "Big basket",
              steps: [
                {
                  keyword: "Given",
                  text: "a huge basket",
                  docs: [
                    { kind: "state", label: "Basket", value: { blob: "x".repeat(120_000) }, phase: "runtime" },
                    { kind: "state", label: "Small", value: { ok: true }, phase: "runtime" },
                  ],
                },
              ],
            },
          },
        ],
      };
      const runPath = join(tmpDir, "raw-run.json");
      fs.writeFileSync(runPath, JSON.stringify(rawRun), "utf8");

      const result = spawnSync("node", [packagedCliPath, "validate", runPath], {
        cwd: packageDir,
        encoding: "utf8",
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("Valid RawRun (schemaVersion 1).");
      expect(result.stderr).toContain('notice: scenario "Big basket" state "Basket" is');
      expect(result.stderr).toContain("large snapshots slow reports");
      // The small snapshot stays quiet.
      expect(result.stderr).not.toContain('state "Small"');
    },
    120_000
  );
});
