/**
 * Integration tests for Astro format output via ReportGenerator.
 */

import { describe, it, expect, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { ReportGenerator } from "../../src/index";
import { canonicalizeRun } from "../../src/converters/acl/index";
import {
  createTestCase,
  createRawRun,
  createMultipleTestCasesRun,
  createMultiFileRun,
} from "../fixtures/raw-runs/basic";

describe("Astro format integration", () => {
  const tempDirs: string[] = [];

  function makeTempDir(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "astro-integration-"));
    tempDirs.push(dir);
    return dir;
  }

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  describe("aggregated mode", () => {
    it("generates a single .md file", async () => {
      const tempDir = makeTempDir();

      const generator = new ReportGenerator({
        formats: ["astro"],
        outputDir: tempDir,
        outputName: "stories",
        output: { mode: "aggregated" },
      });

      const run = canonicalizeRun(createMultipleTestCasesRun());
      const result = await generator.generate(run);
      const astroPaths = result.get("astro");

      expect(astroPaths).toBeTruthy();
      expect(astroPaths).toHaveLength(1);
      expect(astroPaths![0]).toMatch(/\.md$/);
      expect(fs.existsSync(astroPaths![0])).toBe(true);
    });

    it("contains Starlight frontmatter", async () => {
      const tempDir = makeTempDir();

      const generator = new ReportGenerator({
        formats: ["astro"],
        outputDir: tempDir,
        outputName: "stories",
        output: { mode: "aggregated" },
      });

      const run = canonicalizeRun(createMultipleTestCasesRun());
      const result = await generator.generate(run);
      const astroPaths = result.get("astro");

      const content = fs.readFileSync(astroPaths![0], "utf8");

      // Frontmatter delimiters
      expect(content).toMatch(/^---\n/);
      const lines = content.split("\n");
      const closingIdx = lines.indexOf("---", 1);
      expect(closingIdx).toBeGreaterThan(0);

      // Required Starlight frontmatter keys
      expect(content).toContain("title:");
      expect(content).toContain("sidebar:");
      expect(content).toContain("badge:");
      expect(content).toContain("variant:");
    });

    it("has a Failed badge for a mixed run with failures", async () => {
      const tempDir = makeTempDir();

      const generator = new ReportGenerator({
        formats: ["astro"],
        outputDir: tempDir,
        outputName: "stories",
        output: { mode: "aggregated" },
      });

      const run = canonicalizeRun(createMultipleTestCasesRun());
      const result = await generator.generate(run);
      const astroPaths = result.get("astro");

      const content = fs.readFileSync(astroPaths![0], "utf8");

      expect(content).toContain("text: Failed");
      expect(content).toContain("variant: danger");
    });

    it("uses gherkin step style without bullet prefix", async () => {
      const tempDir = makeTempDir();

      const generator = new ReportGenerator({
        formats: ["astro"],
        outputDir: tempDir,
        outputName: "stories",
        output: { mode: "aggregated" },
      });

      const run = canonicalizeRun(createMultipleTestCasesRun());
      const result = await generator.generate(run);
      const astroPaths = result.get("astro");

      const content = fs.readFileSync(astroPaths![0], "utf8");

      // Gherkin step style: bold keyword without leading bullet
      expect(content).toContain("**Given**");
      expect(content).not.toContain("- **Given**");
    });

    it("does not include metadata table", async () => {
      const tempDir = makeTempDir();

      const generator = new ReportGenerator({
        formats: ["astro"],
        outputDir: tempDir,
        outputName: "stories",
        output: { mode: "aggregated" },
      });

      const run = canonicalizeRun(createMultipleTestCasesRun());
      const result = await generator.generate(run);
      const astroPaths = result.get("astro");

      const content = fs.readFileSync(astroPaths![0], "utf8");

      expect(content).not.toContain("| Key | Value |");
    });
  });

  describe("colocated mode", () => {
    it("generates multiple .md files — one per source file", async () => {
      const tempDir = makeTempDir();

      const generator = new ReportGenerator({
        formats: ["astro"],
        outputDir: tempDir,
        outputName: "stories",
        output: { mode: "colocated" },
      });

      const run = canonicalizeRun(createMultiFileRun());
      const result = await generator.generate(run);
      const astroPaths = result.get("astro");

      expect(astroPaths).toBeTruthy();
      // createMultiFileRun has 3 test cases across 3 source files
      expect(astroPaths!.length).toBeGreaterThan(1);
      for (const p of astroPaths!) {
        expect(p).toMatch(/\.md$/);
        expect(fs.existsSync(p)).toBe(true);
      }
    });

    it("each generated file has valid Starlight frontmatter", async () => {
      const tempDir = makeTempDir();

      const generator = new ReportGenerator({
        formats: ["astro"],
        outputDir: tempDir,
        outputName: "stories",
        output: { mode: "colocated" },
      });

      const run = canonicalizeRun(createMultiFileRun());
      const result = await generator.generate(run);
      const astroPaths = result.get("astro");

      expect(astroPaths).toBeTruthy();

      for (const p of astroPaths!) {
        const content = fs.readFileSync(p, "utf8");

        // Must open with frontmatter
        expect(content, `${p} should start with ---`).toMatch(/^---\n/);

        const lines = content.split("\n");
        const closingIdx = lines.indexOf("---", 1);
        expect(closingIdx, `${p} should have closing ---`).toBeGreaterThan(0);

        // Must have required Starlight keys
        expect(content, `${p} should have title:`).toContain("title:");
        expect(content, `${p} should have sidebar:`).toContain("sidebar:");
        expect(content, `${p} should have badge:`).toContain("badge:");
        expect(content, `${p} should have variant:`).toContain("variant:");
      }
    });

    it("flat style writes one cleanly-named page per file, titled by its suite", async () => {
      const tempDir = makeTempDir();
      const generator = new ReportGenerator({
        formats: ["astro"],
        outputDir: tempDir,
        outputName: "index",
        output: { mode: "colocated", colocatedStyle: "flat" },
      });

      const run = canonicalizeRun(createMultiFileRun());
      const paths = (await generator.generate(run)).get("astro")!;

      // Flat: files sit directly under outputDir, named by their clean stem —
      // no mirrored subdirs, no ".index" infix.
      const names = paths.map((p) => path.basename(p)).sort();
      expect(names).toEqual(["login.md", "logout.md", "stats.md"]);
      for (const p of paths) {
        expect(path.dirname(p)).toBe(tempDir);
      }

      // Per-file title comes from the suite/describe, not the static fallback.
      const logout = fs.readFileSync(paths.find((p) => p.endsWith("logout.md"))!, "utf8");
      expect(logout).toContain("title: Authentication");
      expect(logout).not.toContain("title: User Stories");
    });

    it("aggregated mode keeps the configured title across all files", async () => {
      const tempDir = makeTempDir();
      const generator = new ReportGenerator({
        formats: ["astro"],
        outputDir: tempDir,
        outputName: "index",
        output: { mode: "aggregated" },
      });

      const run = canonicalizeRun(createMultiFileRun());
      const paths = (await generator.generate(run)).get("astro")!;
      expect(fs.readFileSync(paths[0], "utf8")).toContain("title: User Stories");
    });
  });

  describe("asset copy mode", () => {
    it("copies assets into the Astro site public directory when output is nested under src/content/docs", async () => {
      const tempDir = makeTempDir();
      const outputDir = path.join(tempDir, "src/content/docs/stories");
      fs.mkdirSync(outputDir, { recursive: true });
      fs.writeFileSync(path.join(outputDir, "screenshot.png"), "PNG_DATA");

      const assetsDir = path.join(tempDir, "public/stories/assets");
      const generator = new ReportGenerator({
        formats: ["astro"],
        outputDir,
        outputName: "stories",
        output: { mode: "aggregated" },
        assetMode: "copy",
        astro: {
          assetsDir,
          assetsBaseUrl: "/stories/assets",
        },
      });

      const run = canonicalizeRun(
        createRawRun({
          testCases: [
            createTestCase({
              story: {
                scenario: "User logs in successfully",
                steps: [
                  { keyword: "Given", text: "user is on login page" },
                  { keyword: "When", text: "user enters valid credentials" },
                  { keyword: "Then", text: "user sees dashboard" },
                ],
                tags: ["auth", "login"],
                tickets: [{ id: "JIRA-123" }],
                suitePath: ["Authentication"],
                docs: [
                  {
                    kind: "screenshot",
                    path: "./screenshot.png",
                    alt: "Login screenshot",
                    phase: "runtime",
                  },
                ],
              },
            }),
          ],
        }),
      );

      const result = await generator.generate(run);
      const astroPaths = result.get("astro");
      const content = fs.readFileSync(astroPaths![0], "utf8");

      expect(content).toContain("/stories/assets/");
      expect(fs.existsSync(path.join(tempDir, "public", "stories", "assets"))).toBe(true);
    });
  });
});
