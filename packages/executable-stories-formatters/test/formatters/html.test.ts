/**
 * Tests for the HTML formatter.
 */

import { describe, it, expect } from "vitest";
import { HtmlFormatter } from "../../src/formatters/html/index";
import { canonicalizeRun } from "../../src/converters/acl/index";
import {
  createRawRun,
  createMultipleTestCasesRun,
  createTestCase,
} from "../fixtures/raw-runs/basic";

describe("HtmlFormatter", () => {
  const formatter = new HtmlFormatter();

  describe("format", () => {
    it("should produce valid HTML document", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toContain("<!DOCTYPE html>");
      expect(result).toContain("<html");
      expect(result).toContain("</html>");
    });

    it("should include title", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toContain("<title>Test Results</title>");
    });

    it("should include custom title", () => {
      const customFormatter = new HtmlFormatter({ title: "My Report" });
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = customFormatter.format(run);

      expect(result).toContain("<title>My Report</title>");
    });

    it("should include CSS styles", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toContain("<style>");
      expect(result).toContain("--background");
      expect(result).toContain("</style>");
    });

    it("should include JavaScript for interactivity", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toContain("<script>");
      expect(result).toContain("toggleTheme");
      expect(result).toContain("</script>");
    });

    it("should include search input by default", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toContain('class="search-input"');
    });

    it("should not include search when searchable is false", () => {
      const noSearchFormatter = new HtmlFormatter({ searchable: false });
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = noSearchFormatter.format(run);

      expect(result).not.toContain('class="search-input"');
    });
  });

  describe("summary cards", () => {
    it("should include summary cards with counts", () => {
      const raw = createMultipleTestCasesRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toContain('class="summary-card"');
      expect(result).toContain('class="label">Total</div>');
      expect(result).toContain('class="label">Passed</div>');
      expect(result).toContain('class="label">Failed</div>');
      expect(result).toContain('class="label">Skipped</div>');
    });
  });

  describe("features", () => {
    it("should include feature sections", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toContain('class="feature"');
      expect(result).toContain('class="feature-header"');
      expect(result).toContain('class="feature-content"');
    });

    it("should show file path", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toContain("src/auth/login.test.ts");
    });

    it("should make feature headers keyboard-accessible", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      // Feature header should have tabindex and role for keyboard accessibility
      expect(result).toContain('class="feature-header"');
      expect(result).toContain('tabindex="0"');
      expect(result).toContain('role="button"');
    });

    it("should make scenario headers keyboard-accessible", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      // Scenario header should have tabindex and role for keyboard accessibility
      expect(result).toContain('class="scenario-header"');
      expect(result).toMatch(/scenario-header[^>]*tabindex="0"/);
      expect(result).toMatch(/scenario-header[^>]*role="button"/);
    });

    it("should keep aria-expanded in sync on collapse/expand", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toContain("toggleCollapse");
      expect(result).toContain("setAttribute('aria-expanded'");
    });
  });

  describe("scenarios", () => {
    it("should include scenario sections", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toContain('class="scenario"');
      expect(result).toContain('class="scenario-header"');
      expect(result).toContain("User logs in successfully");
    });

    it("should include tags", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toContain('class="tag"');
      expect(result).toContain("auth");
      expect(result).toContain("login");
    });
  });

  describe("steps", () => {
    it("should include step list", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toContain('class="steps"');
      expect(result).toContain('class="step"');
      expect(result).toContain("Given");
      expect(result).toContain("user is on login page");
    });

    it("should include step status", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toContain('class="step-status');
    });
  });

  describe("attachments", () => {
    it("should render non-image base64 attachments as data URLs", () => {
      const raw = createRawRun({
        testCases: [
          createTestCase({
            attachments: [
              {
                name: "log.txt",
                mediaType: "text/plain",
                body: "bG9n", // "log" base64
                encoding: "BASE64",
              },
            ],
          }),
        ],
      });
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toContain('href="data:text/plain;base64,bG9n"');
    });

    it("should render base64 image as data URL when embedScreenshots is false", () => {
      const noEmbedFormatter = new HtmlFormatter({ embedScreenshots: false });
      const raw = createRawRun({
        testCases: [
          createTestCase({
            attachments: [
              {
                name: "screenshot.png",
                mediaType: "image/png",
                body: "Zm9v",
                encoding: "BASE64",
              },
            ],
          }),
        ],
      });
      const run = canonicalizeRun(raw);
      const result = noEmbedFormatter.format(run);

      expect(result).toContain('href="data:image/png;base64,Zm9v"');
    });
  });

  describe("theme support", () => {
    it("should include data-theme attribute", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toContain('data-theme="light"');
    });

    it("should include theme toggle button", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toContain('class="theme-toggle"');
    });

    it("should not include theme toggle when darkMode is false", () => {
      const noDarkModeFormatter = new HtmlFormatter({ darkMode: false });
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = noDarkModeFormatter.format(run);

      expect(result).not.toContain('class="theme-toggle"');
    });

    it("should not include theme script when darkMode is false", () => {
      const noDarkModeFormatter = new HtmlFormatter({ darkMode: false });
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = noDarkModeFormatter.format(run);

      expect(result).not.toContain("toggleTheme");
      expect(result).not.toContain("initTheme()");
    });
  });

  describe("tag filter bar", () => {
    it("should include tag filter bar when tags exist", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toContain('class="tag-bar"');
      expect(result).toContain('class="tag-pill"');
      expect(result).toContain("Filter by tag");
    });

    it("should not include tag filter bar when no tags", () => {
      const raw = createRawRun({
        testCases: [
          createTestCase({
            story: {
              scenario: "No tags scenario",
              steps: [{ keyword: "Given", text: "something" }],
              tags: [],
              suitePath: [],
            },
          }),
        ],
      });
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).not.toContain('class="tag-bar"');
      expect(result).not.toContain('class="tag-pill"');
    });

    it("should include filter results counter", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toContain('class="filter-results"');
      expect(result).toContain('class="visible-count"');
      expect(result).toContain('class="total-count"');
    });

    it("should include tag filter JavaScript", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toContain("initTagFilter");
      expect(result).toContain("activeTags");
      expect(result).toContain("applyAllFilters");
    });

    it("should include status filter JavaScript", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toContain("initStatusFilter");
      expect(result).toContain("activeStatus");
    });

    it("should include keyboard shortcut JavaScript", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toContain("initKeyboardShortcuts");
    });

    it("should render unique sorted tags as pills", () => {
      const raw = createMultipleTestCasesRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      // Tags from fixtures: "auth", "login", "password-reset" (sorted)
      expect(result).toContain('data-tag="auth"');
      expect(result).toContain('data-tag="login"');
      expect(result).toContain('data-tag="password-reset"');
    });
  });

  describe("meta info", () => {
    it("should include run metadata", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toContain('class="meta-info"');
      expect(result).toContain("Started:");
      expect(result).toContain("Duration:");
      expect(result).toContain("Version:");
    });
  });
});
