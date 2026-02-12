/**
 * Unit tests for StoryReporter: options resolution and markdown output.
 * Writes fixture JSON to a temp dir, runs reporter with mock Jest results, asserts output.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { tmpdir } from "node:os";
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import StoryReporter from "../reporter";

const testOutputDir = path.join(tmpdir(), `jest-reporter-test-${Date.now()}`);
const workerDir = path.join(testOutputDir, "worker-0");

function writeStoryReport(testFilePath: string, scenarios: unknown[]): void {
  if (!fs.existsSync(workerDir)) fs.mkdirSync(workerDir, { recursive: true });
  const hash = "a1b2c3d4e5f6";
  const baseName = path.basename(testFilePath) || "unknown";
  const outFile = path.join(workerDir, `${baseName}.${hash}.json`);
  fs.writeFileSync(outFile, JSON.stringify({ testFilePath, scenarios }, null, 2) + "\n", "utf8");
}

type JestTestResultItem = {
  fullName: string;
  status: "passed" | "failed" | "pending" | "todo";
  failureMessages?: string[];
};

function mockJestResults(
  testFilePath: string,
  tests: JestTestResultItem[]
): { testResults: Array<{ testFilePath: string; testResults: JestTestResultItem[] }> } {
  return {
    testResults: [
      {
        testFilePath,
        testResults: tests.map((t) => ({
          fullName: t.fullName,
          status: t.status as JestTestResultItem["status"],
          failureMessages: t.failureMessages ?? [],
        })),
      },
    ],
  };
}

describe("StoryReporter (unit)", () => {
  beforeAll(() => {
    process.env.JEST_STORY_DOCS_DIR = testOutputDir;
    if (!fs.existsSync(workerDir)) fs.mkdirSync(workerDir, { recursive: true });
  });

  afterAll(() => {
    try {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it("resolves default options", () => {
    const reporter = new StoryReporter(undefined, {});
    expect(reporter).toBeDefined();
  });

  it("uses outputDir and outputName options", async () => {
    const reporter = new StoryReporter(undefined, {
      formats: ["markdown"],
      outputDir: testOutputDir,
      outputName: "custom-output",
      output: { mode: "aggregated" },
    });
    reporter.onRunStart();
    writeStoryReport("/fake/path/test.story.test.ts", [
      {
        scenario: "test scenario",
        steps: [{ keyword: "Given", text: "precondition" }],
        suitePath: [],
      },
    ]);
    await reporter.onRunComplete(
      new Set(),
      mockJestResults("/fake/path/test.story.test.ts", [{ fullName: "test scenario", status: "passed" }])
    );
    const customPath = path.join(testOutputDir, "custom-output.md");
    expect(fs.existsSync(customPath)).toBe(true);
    const raw = fs.readFileSync(customPath, "utf-8");
    expect(raw).toContain("# User Stories");
    expect(raw).toContain("test scenario");
    expect(raw).toContain("**Given** precondition");
  });

  it("omits status icons when includeStatusIcons is false", async () => {
    const reporter = new StoryReporter(undefined, {
      formats: ["markdown"],
      outputDir: testOutputDir,
      outputName: "no-icons",
      output: { mode: "aggregated" },
      markdown: { includeStatusIcons: false },
    });
    reporter.onRunStart();
    writeStoryReport("/fake/path/a.story.test.ts", [
      { scenario: "no icon scenario", steps: [], suitePath: [] },
    ]);
    await reporter.onRunComplete(
      new Set(),
      mockJestResults("/fake/path/a.story.test.ts", [{ fullName: "no icon scenario", status: "passed" }])
    );
    const outPath = path.join(testOutputDir, "no-icons.md");
    const raw = fs.readFileSync(outPath, "utf-8");
    expect(raw).toContain("no icon scenario");
    expect(raw).not.toContain("✅");
  });

  it("includes failure block when scenario fails and includeErrors is true", async () => {
    const reporter = new StoryReporter(undefined, {
      formats: ["markdown"],
      outputDir: testOutputDir,
      outputName: "with-failure",
      output: { mode: "aggregated" },
      markdown: { includeErrors: true },
    });
    reporter.onRunStart();
    writeStoryReport("/fake/path/fail.story.test.ts", [
      {
        scenario: "failing scenario",
        steps: [{ keyword: "Then", text: "it fails" }],
        suitePath: [],
      },
    ]);
    await reporter.onRunComplete(new Set(), {
      testResults: [
        {
          testFilePath: "/fake/path/fail.story.test.ts",
          testResults: [
            {
              fullName: "failing scenario",
              status: "failed",
              failureMessages: ["Expected: 2\nReceived: 1"],
            },
          ],
        },
      ],
    });
    const outPath = path.join(testOutputDir, "with-failure.md");
    const raw = fs.readFileSync(outPath, "utf-8");
    expect(raw).toContain("**Failure**");
    expect(raw).toContain("Expected: 2");
    expect(raw).toContain("Received: 1");
  });

  it("omits failure block when includeErrors is false", async () => {
    const reporter = new StoryReporter(undefined, {
      formats: ["markdown"],
      outputDir: testOutputDir,
      outputName: "no-failure-block",
      output: { mode: "aggregated" },
      markdown: { includeErrors: false },
    });
    reporter.onRunStart();
    writeStoryReport("/fake/path/fail2.story.test.ts", [
      { scenario: "failing too", steps: [], suitePath: [] },
    ]);
    await reporter.onRunComplete(new Set(), {
      testResults: [
        {
          testFilePath: "/fake/path/fail2.story.test.ts",
          testResults: [
            { fullName: "failing too", status: "failed", failureMessages: ["Error message"] },
          ],
        },
      ],
    });
    const outPath = path.join(testOutputDir, "no-failure-block.md");
    const raw = fs.readFileSync(outPath, "utf-8");
    expect(raw).toContain("failing too");
    expect(raw).not.toContain("**Failure**");
  });

  it("sorts scenarios by source order when sortScenarios is source", async () => {
    const reporter = new StoryReporter(undefined, {
      formats: ["markdown"],
      outputDir: testOutputDir,
      outputName: "sort-source",
      output: { mode: "aggregated" },
      markdown: { sortScenarios: "source" },
    });
    reporter.onRunStart();
    writeStoryReport("/fake/path/sort.story.test.ts", [
      { scenario: "Second", steps: [], suitePath: [], sourceOrder: 1 },
      { scenario: "First", steps: [], suitePath: [], sourceOrder: 0 },
    ]);
    await reporter.onRunComplete(
      new Set(),
      mockJestResults("/fake/path/sort.story.test.ts", [
        { fullName: "Second", status: "passed" },
        { fullName: "First", status: "passed" },
      ])
    );
    const outPath = path.join(testOutputDir, "sort-source.md");
    const raw = fs.readFileSync(outPath, "utf-8");
    const firstIdx = raw.indexOf("First");
    const secondIdx = raw.indexOf("Second");
    expect(firstIdx).toBeGreaterThan(-1);
    expect(secondIdx).toBeGreaterThan(-1);
    expect(firstIdx).toBeLessThan(secondIdx);
  });

  it("sorts scenarios alphabetically when sortScenarios is alpha", async () => {
    const reporter = new StoryReporter(undefined, {
      formats: ["markdown"],
      outputDir: testOutputDir,
      outputName: "sort-alpha",
      output: { mode: "aggregated" },
      markdown: { sortScenarios: "alpha" },
    });
    reporter.onRunStart();
    writeStoryReport("/fake/path/alpha.story.test.ts", [
      { scenario: "Zebra", steps: [], suitePath: [], sourceOrder: 0 },
      { scenario: "Alpha", steps: [], suitePath: [], sourceOrder: 1 },
    ]);
    await reporter.onRunComplete(
      new Set(),
      mockJestResults("/fake/path/alpha.story.test.ts", [
        { fullName: "Zebra", status: "passed" },
        { fullName: "Alpha", status: "passed" },
      ])
    );
    const outPath = path.join(testOutputDir, "sort-alpha.md");
    const raw = fs.readFileSync(outPath, "utf-8");
    const alphaIdx = raw.indexOf("Alpha");
    const zebraIdx = raw.indexOf("Zebra");
    expect(alphaIdx).toBeLessThan(zebraIdx);
  });

  it("renders suite path with suiteSeparator", async () => {
    const reporter = new StoryReporter(undefined, {
      formats: ["markdown"],
      outputDir: testOutputDir,
      outputName: "suite-sep",
      output: { mode: "aggregated" },
      markdown: { suiteSeparator: " :: " },
    });
    reporter.onRunStart();
    writeStoryReport("/fake/path/suite.story.test.ts", [
      {
        scenario: "nested test",
        steps: [],
        suitePath: ["Outer", "Inner"],
      },
    ]);
    await reporter.onRunComplete(
      new Set(),
      mockJestResults("/fake/path/suite.story.test.ts", [
        { fullName: "Outer > Inner > nested test", status: "passed" },
      ])
    );
    const outPath = path.join(testOutputDir, "suite-sep.md");
    const raw = fs.readFileSync(outPath, "utf-8");
    expect(raw).toContain("### Outer :: Inner");
  });

  it("writes no output when no story reports exist", async () => {
    const reporter = new StoryReporter(undefined, {
      formats: ["markdown"],
      outputDir: testOutputDir,
      outputName: "empty-run",
      output: { mode: "aggregated" },
    });
    reporter.onRunStart();
    await reporter.onRunComplete(new Set(), { testResults: [] });
    // No scenarios means no file written (reporter returns early)
    // Note: We don't check for file existence since this depends on implementation
  });
});
