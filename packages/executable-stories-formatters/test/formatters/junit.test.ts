/**
 * Tests for the JUnit XML formatter.
 */

import { describe, it, expect } from "vitest";
import { JUnitFormatter } from "../../src/formatters/junit-xml";
import { canonicalizeRun } from "../../src/converters/acl/index";
import {
  createRawRun,
  createMultipleTestCasesRun,
  createFailingTestCase,
  createSkippedTestCase,
  createPassingTestCase,
  createTestCase,
  createStory,
} from "../fixtures/raw-runs/basic";

describe("JUnitFormatter", () => {
  const formatter = new JUnitFormatter();

  describe("format", () => {
    it("should produce valid XML with declaration", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    });

    it("should include testsuites root element", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toContain("<testsuites");
      expect(result).toContain("</testsuites>");
    });

    it("should include testsuite elements", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toContain("<testsuite");
      expect(result).toContain('name="src/auth/login.test.ts"');
    });

    it("should include testcase elements", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toContain("<testcase");
      expect(result).toContain('name="User logs in successfully"');
    });

    it("should include suite name attribute", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toContain('name="Test Suite"');
    });

    it("should use custom suite name", () => {
      const customFormatter = new JUnitFormatter({
        suiteName: "My Tests",
      });
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = customFormatter.format(run);

      expect(result).toContain('name="My Tests"');
    });
  });

  describe("test counts", () => {
    it("should include test counts on testsuites", () => {
      const raw = createMultipleTestCasesRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toContain('tests="3"');
      expect(result).toContain('failures="1"');
      expect(result).toContain('skipped="1"');
    });

    it("should include test counts on testsuite", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toContain('tests="1"');
    });
  });

  describe("time attributes", () => {
    it("should include time attribute on testsuites", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      // Duration is 1000ms = 1.000s
      expect(result).toMatch(/time="[\d.]+"/);
    });

    it("should include time attribute on testcase", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toMatch(/<testcase[^>]+time="[\d.]+"/);
    });
  });

  describe("failure handling", () => {
    it("should include failure element for failed tests", () => {
      const raw = createRawRun({ testCases: [createFailingTestCase()] });
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toContain("<failure");
      expect(result).toContain("</failure>");
    });

    it("should include error message in failure", () => {
      const raw = createRawRun({ testCases: [createFailingTestCase()] });
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toContain("Expected error message to be visible");
    });
  });

  describe("skipped handling", () => {
    it("should include skipped element for skipped tests", () => {
      const raw = createRawRun({ testCases: [createSkippedTestCase()] });
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toContain("<skipped");
    });
  });

  describe("system-out", () => {
    it("should include system-out with steps by default", () => {
      const raw = createRawRun({ testCases: [createFailingTestCase()] });
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toContain("<system-out>");
      expect(result).toContain("Given user is on login page");
    });

    it("should include system-out for passing tests when includeOutput is true", () => {
      const raw = createRawRun({ testCases: [createPassingTestCase()] });
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toContain("<system-out>");
      expect(result).toContain("Given user is on login page");
    });

    it("should not include system-out when includeOutput is false", () => {
      const noOutputFormatter = new JUnitFormatter({ includeOutput: false });
      const raw = createRawRun({ testCases: [createFailingTestCase()] });
      const run = canonicalizeRun(raw);
      const result = noOutputFormatter.format(run);

      expect(result).not.toContain("<system-out>");
    });

    it("should escape CDATA terminator in step output", () => {
      const raw = createRawRun({
        testCases: [
          createTestCase({
            story: createStory({
              steps: [
                { keyword: "Given", text: "user sees ]]> in log" },
              ],
            }),
          }),
        ],
      });
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toContain("<system-out>");
      // ]]> should be escaped as ]]&gt; in XML
      expect(result).toContain("]]&gt;");
      // Raw ]]> should not appear in content
      expect(result).not.toContain("user sees ]]>");
    });
  });

  describe("classname", () => {
    it("should use titlePath for classname", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toContain('classname="Authentication"');
    });

    it("should normalize Windows-style sourceFile paths for classname", () => {
      const raw = createRawRun({
        testCases: [
          createTestCase({
            sourceFile: "C:\\\\project\\\\tests\\\\login.test.ts",
            titlePath: [],
            story: createStory({ suitePath: [] }),
          }),
        ],
      });
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).not.toContain("\\\\");
      expect(result).toContain('classname="C:.project.tests.login.test"');
    });
  });

  describe("XML escaping", () => {
    it("should escape special XML characters", () => {
      const raw = createRawRun();
      // Modify scenario name to include special characters
      raw.testCases[0].story!.scenario = 'Test with <special> & "characters"';
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toContain("&lt;special&gt;");
      expect(result).toContain("&amp;");
      expect(result).toContain("&quot;");
    });
  });

  describe("pretty printing", () => {
    it("should pretty-print by default", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toContain("\n");
      expect(result).toContain("  <testsuite");
    });

    it("should not pretty-print when pretty is false", () => {
      const compactFormatter = new JUnitFormatter({ pretty: false });
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = compactFormatter.format(run);

      expect(result).not.toMatch(/\n\s+<testsuite/);
    });
  });
});
