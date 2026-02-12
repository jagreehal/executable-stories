/**
 * Tests for the ACL canonicalize function.
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { canonicalizeRun } from "../../src/converters/acl/index";
import { validateCanonicalRun } from "../../src/converters/acl/validate";
import {
  createRawRun,
  createTestCase,
  createPassingTestCase,
  createFailingTestCase,
  createSkippedTestCase,
  createMultipleTestCasesRun,
} from "../fixtures/raw-runs/basic";

describe("canonicalizeRun", () => {
  it("should transform a basic raw run to canonical format", () => {
    const raw = createRawRun();
    const result = canonicalizeRun(raw);

    expect(result.testCases).toHaveLength(1);
    expect(result.projectRoot).toBe("/project");
    expect(result.runId).toBeTruthy();
    expect(result.startedAtMs).toBe(1704067200000);
    expect(result.finishedAtMs).toBe(1704067201000);
    expect(result.durationMs).toBe(1000);
    expect(result.packageVersion).toBe("1.0.0");
    expect(result.gitSha).toBe("abc1234");
  });

  it("should pass validation for basic run", () => {
    const raw = createRawRun();
    const result = canonicalizeRun(raw);
    const validation = validateCanonicalRun(result);

    expect(validation.valid).toBe(true);
    expect(validation.errors).toEqual([]);
  });

  it("should generate deterministic IDs", () => {
    const raw = createRawRun();
    const result1 = canonicalizeRun(raw);
    const result2 = canonicalizeRun(raw);

    expect(result1.testCases[0].id).toBe(result2.testCases[0].id);
    expect(result1.runId).toBe(result2.runId);
  });

  describe("status normalization", () => {
    it("should normalize 'pass' to 'passed'", () => {
      const raw = createRawRun({ testCases: [createPassingTestCase()] });
      const result = canonicalizeRun(raw);

      expect(result.testCases[0].status).toBe("passed");
    });

    it("should normalize 'fail' to 'failed'", () => {
      const raw = createRawRun({ testCases: [createFailingTestCase()] });
      const result = canonicalizeRun(raw);

      expect(result.testCases[0].status).toBe("failed");
    });

    it("should normalize 'skip' to 'skipped'", () => {
      const raw = createRawRun({ testCases: [createSkippedTestCase()] });
      const result = canonicalizeRun(raw);

      expect(result.testCases[0].status).toBe("skipped");
    });

    it("should normalize 'todo' to 'pending'", () => {
      const raw = createRawRun({
        testCases: [createTestCase({ status: "todo" })],
      });
      const result = canonicalizeRun(raw);

      expect(result.testCases[0].status).toBe("pending");
    });
  });

  describe("step results derivation", () => {
    it("should derive all steps as passed for passing scenario", () => {
      const raw = createRawRun({ testCases: [createPassingTestCase()] });
      const result = canonicalizeRun(raw);

      const tc = result.testCases[0];
      expect(tc.stepResults).toHaveLength(3);
      expect(tc.stepResults.every((sr) => sr.status === "passed")).toBe(true);
    });

    it("should derive all steps as skipped for skipped scenario", () => {
      const raw = createRawRun({ testCases: [createSkippedTestCase()] });
      const result = canonicalizeRun(raw);

      const tc = result.testCases[0];
      expect(tc.stepResults).toHaveLength(3);
      expect(tc.stepResults.every((sr) => sr.status === "skipped")).toBe(true);
    });

    it("should derive step failure for failed scenario", () => {
      const raw = createRawRun({ testCases: [createFailingTestCase()] });
      const result = canonicalizeRun(raw);

      const tc = result.testCases[0];
      expect(tc.stepResults).toHaveLength(3);

      // First two steps should be passed
      expect(tc.stepResults[0].status).toBe("passed");
      expect(tc.stepResults[1].status).toBe("passed");

      // Last step should be failed (default heuristic)
      expect(tc.stepResults[2].status).toBe("failed");
      expect(tc.stepResults[2].errorMessage).toBeTruthy();
    });
  });

  describe("tags normalization", () => {
    it("should extract tags from story", () => {
      const raw = createRawRun();
      const result = canonicalizeRun(raw);

      expect(result.testCases[0].tags).toEqual(["auth", "login"]);
    });

    it("should deduplicate and sort tags", () => {
      const raw = createRawRun({
        testCases: [
          createTestCase({
            story: {
              scenario: "Test",
              steps: [],
              tags: ["z-tag", "a-tag", "z-tag", "m-tag"],
            },
          }),
        ],
      });
      const result = canonicalizeRun(raw);

      expect(result.testCases[0].tags).toEqual(["a-tag", "m-tag", "z-tag"]);
    });
  });

  describe("title path extraction", () => {
    it("should use suitePath from story", () => {
      const raw = createRawRun();
      const result = canonicalizeRun(raw);

      expect(result.testCases[0].titlePath).toEqual(["Authentication"]);
    });

    it("should fall back to titlePath from raw when no suitePath", () => {
      const raw = createRawRun({
        testCases: [
          createTestCase({
            titlePath: ["Parent", "Child", "Test Name"],
            story: {
              scenario: "Test Name",
              steps: [],
              suitePath: undefined,
            },
          }),
        ],
      });
      const result = canonicalizeRun(raw);

      // Should exclude test name (last element)
      expect(result.testCases[0].titlePath).toEqual(["Parent", "Child"]);
    });
  });

  describe("defaults", () => {
    it("should use current time when timestamps not provided", () => {
      const before = Date.now();
      const raw = createRawRun({
        startedAtMs: undefined,
        finishedAtMs: undefined,
      });
      const result = canonicalizeRun(raw);
      const after = Date.now();

      expect(result.startedAtMs).toBeGreaterThanOrEqual(before);
      expect(result.startedAtMs).toBeLessThanOrEqual(after);
    });

    it("should default durationMs to 0", () => {
      const raw = createRawRun({
        testCases: [createTestCase({ durationMs: undefined })],
      });
      const result = canonicalizeRun(raw);

      expect(result.testCases[0].durationMs).toBe(0);
    });

    it("should default sourceLine to 1", () => {
      const raw = createRawRun({
        testCases: [createTestCase({ sourceLine: undefined })],
      });
      const result = canonicalizeRun(raw);

      expect(result.testCases[0].sourceLine).toBe(1);
    });

    it("should default retry fields to 0", () => {
      const raw = createRawRun({
        testCases: [
          createTestCase({ retry: undefined, retries: undefined }),
        ],
      });
      const result = canonicalizeRun(raw);

      expect(result.testCases[0].retry).toBe(0);
      expect(result.testCases[0].retries).toBe(0);
    });
  });

  describe("error handling", () => {
    it("should extract error message and stack", () => {
      const raw = createRawRun({ testCases: [createFailingTestCase()] });
      const result = canonicalizeRun(raw);

      const tc = result.testCases[0];
      expect(tc.errorMessage).toBe("Expected error message to be visible");
      expect(tc.errorStack).toContain("login.test.ts:15:5");
    });
  });

  describe("attachments", () => {
    it("should resolve relative attachment paths from projectRoot", () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "formatters-"));
      const attachmentsDir = path.join(tempDir, "attachments");
      fs.mkdirSync(attachmentsDir, { recursive: true });
      const filePath = path.join(attachmentsDir, "log.txt");
      fs.writeFileSync(filePath, "hello", "utf8");

      try {
        const raw = createRawRun({
          projectRoot: tempDir,
          testCases: [
            createTestCase({
              attachments: [
                {
                  name: "log",
                  mediaType: "text/plain",
                  path: "attachments/log.txt",
                },
              ],
            }),
          ],
        });

        const result = canonicalizeRun(raw);
        const attachment = result.testCases[0].attachments[0];

        expect(attachment.contentEncoding).toBe("BASE64");
        expect(attachment.body).toBe(Buffer.from("hello").toString("base64"));
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe("multiple test cases", () => {
    it("should process all test cases", () => {
      const raw = createMultipleTestCasesRun();
      const result = canonicalizeRun(raw);

      expect(result.testCases).toHaveLength(3);
    });

    it("should validate run with multiple test cases", () => {
      const raw = createMultipleTestCasesRun();
      const result = canonicalizeRun(raw);
      const validation = validateCanonicalRun(result);

      expect(validation.valid).toBe(true);
    });
  });

  describe("filtering", () => {
    it("should skip test cases without story", () => {
      const raw = createRawRun({
        testCases: [
          createTestCase(),
          { ...createTestCase(), story: undefined, title: "No story" },
        ],
      });
      const result = canonicalizeRun(raw);

      expect(result.testCases).toHaveLength(1);
    });
  });
});
