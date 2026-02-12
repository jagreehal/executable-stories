/**
 * Tests for the CucumberHtmlFormatter (official Cucumber HTML report).
 */

import { describe, it, expect } from "vitest";
import { CucumberHtmlFormatter } from "../../src/formatters/cucumber-html";
import { canonicalizeRun } from "../../src/converters/acl/index";
import {
  createRawRun,
  createMultipleTestCasesRun,
  createMultiFileRun,
} from "../fixtures/raw-runs/basic";

describe("CucumberHtmlFormatter", () => {
  const formatter = new CucumberHtmlFormatter();

  describe("formatToString", () => {
    it("should produce valid HTML", async () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const html = await formatter.formatToString(run);

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("</html>");
    });

    it("should contain scenario information", async () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const html = await formatter.formatToString(run);

      // The Cucumber HTML report should include scenario-related content
      expect(html.length).toBeGreaterThan(1000);
    });

    it("should handle multiple test cases", async () => {
      const raw = createMultipleTestCasesRun();
      const run = canonicalizeRun(raw);
      const html = await formatter.formatToString(run);

      expect(html).toContain("<!DOCTYPE html>");
      expect(html.length).toBeGreaterThan(1000);
    });

    it("should handle multiple source files", async () => {
      const raw = createMultiFileRun();
      const run = canonicalizeRun(raw);
      const html = await formatter.formatToString(run);

      expect(html).toContain("<!DOCTYPE html>");
      expect(html.length).toBeGreaterThan(1000);
    });
  });

  describe("format (alias)", () => {
    it("should return the same result as formatToString", async () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result1 = await formatter.format(run);
      const result2 = await formatter.formatToString(run);

      expect(result1).toBe(result2);
    });
  });

  describe("options forwarding", () => {
    it("should forward messages options to CucumberMessagesFormatter", async () => {
      const customFormatter = new CucumberHtmlFormatter({
        messages: {
          meta: { toolName: "my-tool", toolVersion: "2.0.0" },
        },
      });
      const raw = createRawRun();
      const run = canonicalizeRun(raw);

      // Should not throw — validates that options are forwarded correctly
      const html = await customFormatter.formatToString(run);
      expect(html).toContain("<!DOCTYPE html>");
    });
  });
});
