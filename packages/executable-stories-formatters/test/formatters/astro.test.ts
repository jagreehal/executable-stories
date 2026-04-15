/**
 * Tests for the Astro/Starlight formatter.
 */

import { describe, it, expect } from "vitest";
import { AstroFormatter } from "../../src/formatters/astro";
import { canonicalizeRun } from "../../src/converters/acl/index";
import {
  createRawRun,
  createMultipleTestCasesRun,
  createTestCase,
  createSkippedTestCase,
} from "../fixtures/raw-runs/basic";
import type { RawRun } from "../../src/types/raw";

describe("AstroFormatter", () => {
  const formatter = new AstroFormatter();

  describe("Starlight frontmatter", () => {
    it("produces --- delimited YAML frontmatter", () => {
      const run = canonicalizeRun(createRawRun());
      const result = formatter.format(run);

      expect(result).toMatch(/^---\n/);
      // There should be a closing ---
      const lines = result.split("\n");
      const closingIdx = lines.indexOf("---", 1);
      expect(closingIdx).toBeGreaterThan(0);
    });

    it("includes title in frontmatter", () => {
      const run = canonicalizeRun(createRawRun());
      const result = formatter.format(run);

      expect(result).toContain("title: User Stories");
    });

    it("includes description with scenario count", () => {
      const run = canonicalizeRun(createRawRun());
      const result = formatter.format(run);

      // Single scenario
      expect(result).toContain("description: 1 scenario —");
    });

    it("uses plural 'scenarios' for multiple test cases", () => {
      const rawMulti: RawRun = {
        ...createRawRun(),
        testCases: [createTestCase(), createTestCase()],
      };
      const run = canonicalizeRun(rawMulti);
      const result = formatter.format(run);

      expect(result).toContain("description: 2 scenarios —");
    });

    it("includes sidebar.badge with text and variant", () => {
      const run = canonicalizeRun(createRawRun());
      const result = formatter.format(run);

      expect(result).toContain("sidebar:");
      expect(result).toContain("  badge:");
      expect(result).toContain("    text:");
      expect(result).toContain("    variant:");
    });
  });

  describe("Badge logic", () => {
    it("returns Passed/success when all pass", () => {
      const run = canonicalizeRun(createRawRun());
      const badge = AstroFormatter.computeBadge(run.testCases);

      expect(badge).toEqual({ text: "Passed", variant: "success" });
    });

    it("returns Failed/danger when any fail", () => {
      const run = canonicalizeRun(createMultipleTestCasesRun());
      const badge = AstroFormatter.computeBadge(run.testCases);

      expect(badge).toEqual({ text: "Failed", variant: "danger" });
    });

    it("returns Skipped/caution when all skipped", () => {
      const rawSkipped: RawRun = {
        ...createRawRun(),
        testCases: [createSkippedTestCase()],
      };
      const run = canonicalizeRun(rawSkipped);
      const badge = AstroFormatter.computeBadge(run.testCases);

      expect(badge).toEqual({ text: "Skipped", variant: "caution" });
    });

    it("returns Passed/success when mix of passed and skipped", () => {
      const rawMixed: RawRun = {
        ...createRawRun(),
        testCases: [createTestCase({ status: "pass" }), createSkippedTestCase()],
      };
      const run = canonicalizeRun(rawMixed);
      const badge = AstroFormatter.computeBadge(run.testCases);

      // skipped + passed => Passed (only pure-skipped triggers Skipped badge)
      expect(badge).toEqual({ text: "Passed", variant: "success" });
    });

    it("returns Pending/caution when all pending", () => {
      const badge = AstroFormatter.computeBadge([{ status: "pending" }]);

      expect(badge).toEqual({ text: "Pending", variant: "caution" });
    });

    it("Failed takes priority over pending", () => {
      const badge = AstroFormatter.computeBadge([
        { status: "failed" },
        { status: "pending" },
      ]);

      expect(badge).toEqual({ text: "Failed", variant: "danger" });
    });
  });

  describe("Markdown body", () => {
    it("uses gherkin step style (no bullet prefix)", () => {
      const run = canonicalizeRun(createRawRun());
      const result = formatter.format(run);

      expect(result).toContain("**Given** user is on login page");
      expect(result).toContain("**When** user enters valid credentials");
      expect(result).toContain("**Then** user sees dashboard");
      // Should not have bullet prefix
      expect(result).not.toContain("- **Given**");
    });

    it("does not include metadata table", () => {
      const run = canonicalizeRun(createRawRun());
      const result = formatter.format(run);

      expect(result).not.toContain("| Key | Value |");
      expect(result).not.toContain("| Date |");
    });

    it("does not include summary table", () => {
      const run = canonicalizeRun(createRawRun());
      const result = formatter.format(run);

      expect(result).not.toContain("| Scenarios | Steps |");
    });

    it("does not include h1 title heading in body", () => {
      const run = canonicalizeRun(createRawRun());
      const result = formatter.format(run);

      // Should not have an h1 (Starlight renders its own from frontmatter)
      expect(result).not.toContain("# User Stories");
    });

    it("still includes scenario headings", () => {
      const run = canonicalizeRun(createRawRun());
      const result = formatter.format(run);

      expect(result).toContain("✅ User logs in successfully");
    });
  });

  describe("Options passthrough", () => {
    it("custom title propagates to frontmatter", () => {
      const customFormatter = new AstroFormatter({
        markdown: { title: "My Custom Stories" },
      });
      const run = canonicalizeRun(createRawRun());
      const result = customFormatter.format(run);

      expect(result).toContain("title: My Custom Stories");
    });

    it("custom title is reflected in badge description", () => {
      const customFormatter = new AstroFormatter({
        markdown: { title: "Auth Flows" },
      });
      const run = canonicalizeRun(createRawRun());
      const result = customFormatter.format(run);

      // description should not contain the old title
      expect(result).toContain("description: 1 scenario —");
    });
  });

  describe("computeBadge static method", () => {
    it("is accessible as a static method", () => {
      expect(typeof AstroFormatter.computeBadge).toBe("function");
    });

    it("handles empty test cases array", () => {
      const badge = AstroFormatter.computeBadge([]);

      expect(badge).toEqual({ text: "Passed", variant: "success" });
    });

    it("works with raw status picks", () => {
      const badge = AstroFormatter.computeBadge([
        { status: "passed" },
        { status: "passed" },
      ]);

      expect(badge).toEqual({ text: "Passed", variant: "success" });
    });
  });
});
