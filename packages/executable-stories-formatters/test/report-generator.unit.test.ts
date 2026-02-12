/**
 * Unit tests for ReportGenerator.
 *
 * Uses vitest-mock-extended for typed mocks and stubs for test data.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { mock } from "vitest-mock-extended";
import type { Logger, WriteFile } from "../src/types/options";
import { ReportGenerator, canonicalizeRun, type GenerateDeps } from "../src/index";
import { stubs } from "./stubs";

// ============================================================================
// Test Setup
// ============================================================================

function createMockDeps(): GenerateDeps {
  return {
    logger: mock<Logger>(),
    writeFile: vi.fn().mockResolvedValue(undefined) as WriteFile,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("ReportGenerator", () => {
  beforeEach(() => {
    stubs.setFakerSeed(42);
  });

  describe("generate()", () => {
    it("writes aggregated file when mode is aggregated", async () => {
      // Arrange
      const deps = createMockDeps();
      const generator = new ReportGenerator(
        {
          formats: ["markdown"],
          outputDir: "reports",
          outputName: "test-results",
          output: { mode: "aggregated" },
        },
        deps
      );

      const rawRun = stubs.rawRun();
      const run = canonicalizeRun(rawRun);

      // Act
      const result = await generator.generate(run);

      // Assert
      expect(result.get("markdown")).toHaveLength(1);
      expect(result.get("markdown")![0]).toBe("reports/test-results.md");
      expect(deps.writeFile).toHaveBeenCalledTimes(1);
      expect(deps.writeFile).toHaveBeenCalledWith(
        "reports/test-results.md",
        expect.stringContaining("# User Stories")
      );
    });

    it("writes colocated mirrored files when mode is colocated mirrored", async () => {
      // Arrange
      const deps = createMockDeps();
      const generator = new ReportGenerator(
        {
          formats: ["markdown"],
          outputDir: "reports",
          outputName: "executable-stories",
          output: { mode: "colocated", colocatedStyle: "mirrored" },
        },
        deps
      );

      const rawRun = stubs.rawRun({
        testCases: [
          stubs.rawTestCase({ sourceFile: "src/auth/login.test.ts" }),
          stubs.rawTestCase({ sourceFile: "src/dashboard/stats.test.ts" }),
        ],
      });
      const run = canonicalizeRun(rawRun);

      // Act
      const result = await generator.generate(run);

      // Assert
      const paths = result.get("markdown")!;
      expect(paths).toHaveLength(2);
      expect(paths).toContain("reports/src/auth/login.executable-stories.md");
      expect(paths).toContain("reports/src/dashboard/stats.executable-stories.md");
    });

    it("writes colocated adjacent files when mode is colocated adjacent", async () => {
      // Arrange
      const deps = createMockDeps();
      const generator = new ReportGenerator(
        {
          formats: ["markdown"],
          outputDir: "reports", // Should be ignored for adjacent mode
          outputName: "docs",
          output: { mode: "colocated", colocatedStyle: "adjacent" },
        },
        deps
      );

      const rawRun = stubs.rawRun({
        testCases: [
          stubs.rawTestCase({ sourceFile: "src/auth/login.test.ts" }),
        ],
      });
      const run = canonicalizeRun(rawRun);

      // Act
      const result = await generator.generate(run);

      // Assert
      const paths = result.get("markdown")!;
      expect(paths).toHaveLength(1);
      expect(paths[0]).toBe("src/auth/login.docs.md");
    });

    it("filters test cases by include glob", async () => {
      const deps = createMockDeps();
      const generator = new ReportGenerator(
        {
          formats: ["markdown"],
          outputDir: "reports",
          outputName: "test-results",
          include: ["**/auth/**"],
          output: { mode: "aggregated" },
        },
        deps
      );

      const rawRun = stubs.rawRun({
        testCases: [
          stubs.rawTestCase({ sourceFile: "src/auth/login.test.ts" }),
          stubs.rawTestCase({ sourceFile: "src/dashboard/stats.test.ts" }),
          stubs.rawTestCase({ sourceFile: "src/auth/logout.test.ts" }),
        ],
      });
      const run = canonicalizeRun(rawRun);

      await generator.generate(run);

      expect(deps.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Filtered 1 test case(s) by include/exclude globs (2 included)")
      );
      const markdownCall = (deps.writeFile as ReturnType<typeof vi.fn>).mock.calls.find(
        (c: [string, string]) => c[0].endsWith(".md")
      );
      expect(markdownCall).toBeDefined();
      expect(markdownCall![1]).toContain("login");
      expect(markdownCall![1]).toContain("logout");
      expect(markdownCall![1]).not.toContain("stats");
    });

    it("filters test cases by exclude glob", async () => {
      const deps = createMockDeps();
      const generator = new ReportGenerator(
        {
          formats: ["markdown"],
          outputDir: "reports",
          outputName: "test-results",
          exclude: ["**/utils/**"],
          output: { mode: "aggregated" },
        },
        deps
      );

      const rawRun = stubs.rawRun({
        testCases: [
          stubs.rawTestCase({ sourceFile: "src/features/auth/login.test.ts" }),
          stubs.rawTestCase({ sourceFile: "src/utils/helper.test.ts" }),
        ],
      });
      const run = canonicalizeRun(rawRun);

      await generator.generate(run);

      expect(deps.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Filtered 1 test case(s) by include/exclude globs (1 included)")
      );
      const markdownCall = (deps.writeFile as ReturnType<typeof vi.fn>).mock.calls.find(
        (c: [string, string]) => c[0].endsWith(".md")
      );
      expect(markdownCall![1]).toContain("login");
      expect(markdownCall![1]).not.toContain("helper");
    });

    it("generates multiple formats", async () => {
      // Arrange
      const deps = createMockDeps();
      const generator = new ReportGenerator(
        {
          formats: ["markdown", "html", "junit"],
          outputDir: "reports",
          outputName: "test-results",
          output: { mode: "aggregated" },
        },
        deps
      );

      const run = canonicalizeRun(stubs.rawRun());

      // Act
      const result = await generator.generate(run);

      // Assert
      expect(result.size).toBe(3);
      expect(result.get("markdown")).toHaveLength(1);
      expect(result.get("html")).toHaveLength(1);
      expect(result.get("junit")).toHaveLength(1);
      expect(deps.writeFile).toHaveBeenCalledTimes(3);
    });

    it("uses correct file extensions for each format", async () => {
      // Arrange
      const deps = createMockDeps();
      const generator = new ReportGenerator(
        {
          formats: ["markdown", "html", "junit", "cucumber-json"],
          outputDir: "reports",
          outputName: "test-results",
          output: { mode: "aggregated" },
        },
        deps
      );

      const run = canonicalizeRun(stubs.rawRun());

      // Act
      const result = await generator.generate(run);

      // Assert
      expect(result.get("markdown")![0]).toMatch(/\.md$/);
      expect(result.get("html")![0]).toMatch(/\.html$/);
      expect(result.get("junit")![0]).toMatch(/\.junit\.xml$/);
      expect(result.get("cucumber-json")![0]).toMatch(/\.cucumber\.json$/);
    });

    it("warns when colocated mode but test case missing sourceFile", async () => {
      // Arrange
      const deps = createMockDeps();
      const generator = new ReportGenerator(
        {
          formats: ["markdown"],
          outputDir: "reports",
          outputName: "docs",
          output: { mode: "colocated" },
        },
        deps
      );

      const rawRun = stubs.rawRun({
        testCases: [
          stubs.rawTestCase({ sourceFile: undefined }), // Missing sourceFile
        ],
      });
      const run = canonicalizeRun(rawRun);

      // Act
      await generator.generate(run);

      // Assert
      expect(deps.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("missing sourceFile")
      );
    });

    it("falls back to aggregated when sourceFile is missing in colocated mode", async () => {
      // Arrange
      const deps = createMockDeps();
      const generator = new ReportGenerator(
        {
          formats: ["markdown"],
          outputDir: "reports",
          outputName: "test-results",
          output: { mode: "colocated" },
        },
        deps
      );

      const rawRun = stubs.rawRun({
        testCases: [
          stubs.rawTestCase({ sourceFile: undefined }),
        ],
      });
      const run = canonicalizeRun(rawRun);

      // Act
      const result = await generator.generate(run);

      // Assert
      // Should write to aggregated path since sourceFile is unknown
      const paths = result.get("markdown")!;
      expect(paths).toHaveLength(1);
      expect(paths[0]).toBe("reports/test-results.md");
    });
  });

  describe("rule matching", () => {
    it("uses first matching rule", async () => {
      // Arrange
      const deps = createMockDeps();
      const generator = new ReportGenerator(
        {
          formats: ["markdown"],
          outputDir: "reports",
          outputName: "default",
          output: {
            mode: "aggregated",
            rules: [
              { match: "**/*.stories.*", mode: "colocated", outputName: "story-docs" },
              { match: "**/*", mode: "aggregated", outputName: "all-tests" },
            ],
          },
        },
        deps
      );

      const rawRun = stubs.rawRun({
        testCases: [
          stubs.rawTestCase({ sourceFile: "src/Button.stories.test.ts" }),
        ],
      });
      const run = canonicalizeRun(rawRun);

      // Act
      const result = await generator.generate(run);

      // Assert
      const paths = result.get("markdown")!;
      expect(paths).toHaveLength(1);
      expect(paths[0]).toContain("story-docs");
    });

    it("matches glob patterns correctly", async () => {
      // Arrange
      const deps = createMockDeps();
      const generator = new ReportGenerator(
        {
          formats: ["markdown"],
          outputDir: "reports",
          outputName: "default",
          output: {
            mode: "aggregated",
            rules: [
              { match: "src/features/**/*.test.ts", mode: "colocated", outputName: "feature-docs" },
            ],
          },
        },
        deps
      );

      const rawRun = stubs.rawRun({
        testCases: [
          stubs.rawTestCase({ sourceFile: "src/features/auth/login.test.ts" }),
          stubs.rawTestCase({ sourceFile: "src/utils/helper.test.ts" }),
        ],
      });
      const run = canonicalizeRun(rawRun);

      // Act
      const result = await generator.generate(run);

      // Assert
      const paths = result.get("markdown")!;
      // Only the feature file should match the rule
      expect(paths.some(p => p.includes("feature-docs"))).toBe(true);
    });

    it("warns when rule sets both adjacent style and outputDir", async () => {
      // Arrange
      const deps = createMockDeps();
      const generator = new ReportGenerator(
        {
          formats: ["markdown"],
          outputDir: "reports",
          outputName: "docs",
          output: {
            mode: "aggregated",
            rules: [
              {
                match: "**/*.test.ts",
                mode: "colocated",
                colocatedStyle: "adjacent",
                outputDir: "custom-dir", // Should warn
              },
            ],
          },
        },
        deps
      );

      const rawRun = stubs.rawRun({
        testCases: [stubs.rawTestCase({ sourceFile: "src/test.test.ts" })],
      });
      const run = canonicalizeRun(rawRun);

      // Act
      await generator.generate(run);

      // Assert
      expect(deps.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("adjacent")
      );
    });
  });

  describe("path normalization", () => {
    it("normalizes Windows paths to posix", async () => {
      // Arrange
      const deps = createMockDeps();
      const generator = new ReportGenerator(
        {
          formats: ["markdown"],
          outputDir: "reports",
          outputName: "docs",
          output: { mode: "colocated", colocatedStyle: "mirrored" },
        },
        deps
      );

      // Simulate Windows-style path (already relative)
      const rawRun = stubs.rawRun({
        testCases: [
          stubs.rawTestCase({ sourceFile: "src\\auth\\login.test.ts" }),
        ],
      });
      const run = canonicalizeRun(rawRun);

      // Act
      const result = await generator.generate(run);

      // Assert
      const paths = result.get("markdown")!;
      expect(paths).toHaveLength(1);
      // Path should use forward slashes
      expect(paths[0]).not.toContain("\\");
    });

    it("strips test extensions when generating colocated names", async () => {
      // Arrange
      const deps = createMockDeps();
      const generator = new ReportGenerator(
        {
          formats: ["markdown"],
          outputDir: "reports",
          outputName: "docs",
          output: { mode: "colocated", colocatedStyle: "mirrored" },
        },
        deps
      );

      const testCases = [
        stubs.rawTestCase({ sourceFile: "src/button.test.ts" }),
        stubs.rawTestCase({ sourceFile: "src/input.spec.tsx" }),
        stubs.rawTestCase({ sourceFile: "src/form.story.test.ts" }),
      ];

      const rawRun = stubs.rawRun({ testCases });
      const run = canonicalizeRun(rawRun);

      // Act
      const result = await generator.generate(run);

      // Assert
      const paths = result.get("markdown")!;
      expect(paths.some(p => p.includes("button.docs.md"))).toBe(true);
      expect(paths.some(p => p.includes("input.docs.md"))).toBe(true);
      expect(paths.some(p => p.includes("form.story.docs.md"))).toBe(true);
      // Should not have double extensions
      expect(paths.every(p => !p.includes(".test.docs.md"))).toBe(true);
    });
  });

  describe("default options", () => {
    it("uses sensible defaults when no options provided", async () => {
      // Arrange
      const deps = createMockDeps();
      const generator = new ReportGenerator({}, deps);

      const run = canonicalizeRun(stubs.rawRun());

      // Act
      const result = await generator.generate(run);

      // Assert
      // Default format is cucumber-json
      expect(result.has("cucumber-json")).toBe(true);
      expect(result.get("cucumber-json")![0]).toBe("reports/test-results.cucumber.json");
    });
  });
});

describe("createReportGenerator factory", () => {
  it("creates a generator with injected dependencies", async () => {
    // This test verifies the factory function works
    const { createReportGenerator, canonicalizeRun } = await import("../src/index.js");

    const mockWriteFile = vi.fn().mockResolvedValue(undefined);
    const mockLogger = { warn: vi.fn() };

    const generator = createReportGenerator(
      { formats: ["markdown"], output: { mode: "aggregated" } },
      { writeFile: mockWriteFile, logger: mockLogger }
    );

    stubs.setFakerSeed(123);
    const run = canonicalizeRun(stubs.rawRun());

    await generator.generate(run);

    expect(mockWriteFile).toHaveBeenCalled();
  });
});
