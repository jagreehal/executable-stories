/**
 * Tests for the Cucumber JSON formatter.
 */

import { describe, it, expect } from "vitest";
import { CucumberJsonFormatter } from "../../src/formatters/cucumber-json";
import { canonicalizeRun } from "../../src/converters/acl/index";
import {
  createRawRun,
  createMultipleTestCasesRun,
  createMultiFileRun,
  createTestCase,
  createStory,
} from "../fixtures/raw-runs/basic";

describe("CucumberJsonFormatter", () => {
  const formatter = new CucumberJsonFormatter();

  describe("format", () => {
    it("should produce valid Cucumber JSON structure", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);

      const feature = result[0];
      expect(feature.keyword).toBe("Feature");
      expect(feature.uri).toBe("src/auth/login.test.ts");
      expect(feature.elements).toHaveLength(1);
    });

    it("should include scenario with correct structure", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      const scenario = result[0].elements[0];
      expect(scenario.type).toBe("scenario");
      expect(scenario.keyword).toBe("Scenario");
      expect(scenario.name).toBe("User logs in successfully");
      expect(scenario.steps).toHaveLength(3);
    });

    it("should include steps with keywords and trailing space", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      const steps = result[0].elements[0].steps;
      expect(steps[0].keyword).toBe("Given ");
      expect(steps[0].name).toBe("user is on login page");
      expect(steps[1].keyword).toBe("When ");
      expect(steps[2].keyword).toBe("Then ");
    });

    it("should include step results", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      const steps = result[0].elements[0].steps;
      for (const step of steps) {
        expect(step.result).toBeDefined();
        expect(step.result.status).toBe("passed");
        expect(typeof step.result.duration).toBe("number");
      }
    });

    it("should include tags on scenario", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      const tags = result[0].elements[0].tags;
      expect(tags).toHaveLength(2);
      expect(tags[0].name).toBe("@auth");
      expect(tags[1].name).toBe("@login");
    });

    it("should include line numbers", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      const feature = result[0];
      expect(feature.line).toBe(1);

      const scenario = feature.elements[0];
      expect(scenario.line).toBeGreaterThan(1);

      for (const step of scenario.steps) {
        expect(step.line).toBeGreaterThan(scenario.line);
      }
    });
  });

  describe("formatToString", () => {
    it("should produce valid JSON string", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.formatToString(run);

      expect(() => JSON.parse(result)).not.toThrow();
    });

    it("should pretty-print when option is set", () => {
      const prettyFormatter = new CucumberJsonFormatter({ pretty: true });
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = prettyFormatter.formatToString(run);

      expect(result).toContain("\n");
      expect(result).toContain("  ");
    });
  });

  describe("multiple scenarios", () => {
    it("should include all scenarios in same feature", () => {
      const raw = createMultipleTestCasesRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toHaveLength(1);
      expect(result[0].elements).toHaveLength(3);
    });

    it("should include correct statuses for each scenario", () => {
      const raw = createMultipleTestCasesRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      const scenarios = result[0].elements;
      const statuses = scenarios.map(
        (s) => s.steps[s.steps.length - 1].result.status
      );

      expect(statuses).toContain("passed");
      expect(statuses).toContain("failed");
      expect(statuses).toContain("skipped");
    });
  });

  describe("multiple files", () => {
    it("should create separate features for each file", () => {
      const raw = createMultiFileRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result.length).toBe(3);

      const uris = result.map((f) => f.uri);
      expect(uris).toContain("src/auth/login.test.ts");
      expect(uris).toContain("src/auth/logout.test.ts");
      expect(uris).toContain("src/dashboard/stats.test.ts");
    });

    it("should generate unique feature IDs for files with the same basename", () => {
      const raw = createRawRun({
        testCases: [
          createTestCase({
            sourceFile: "src/auth/login.test.ts",
            titlePath: ["Auth", "Login works"],
            story: createStory({ scenario: "Login works" }),
          }),
          createTestCase({
            sourceFile: "src/admin/login.test.ts",
            titlePath: ["Admin", "Admin login works"],
            story: createStory({ scenario: "Admin login works" }),
          }),
        ],
      });
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toHaveLength(2);
      const ids = result.map((f) => f.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(2);
    });
  });

  describe("IDs", () => {
    it("should generate slugified feature ID from full path", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      // "src/auth/login.test.ts" -> "src-auth-logintest" (full path, extension removed)
      expect(result[0].id).toBe("src-auth-logintest");
    });

    it("should generate slugified scenario ID", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      const scenarioId = result[0].elements[0].id;
      expect(scenarioId).toBe("src-auth-logintest;user-logs-in-successfully");
    });
  });

  describe("error messages", () => {
    it("should include error message in failed step result", () => {
      const raw = createMultipleTestCasesRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      // Find the failed scenario
      const failedScenario = result[0].elements.find((s) =>
        s.steps.some((step) => step.result.status === "failed")
      );

      expect(failedScenario).toBeDefined();

      const failedStep = failedScenario!.steps.find(
        (s) => s.result.status === "failed"
      );

      expect(failedStep?.result.error_message).toBeTruthy();
    });
  });

  describe("attachments", () => {
    it("should attach embeddings to the last step for passing scenarios", () => {
      const raw = createRawRun({
        testCases: [
          createTestCase({
            attachments: [
              {
                name: "screenshot",
                mediaType: "image/png",
                body: "Zm9v",
                encoding: "BASE64",
              },
            ],
          }),
        ],
      });
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      const steps = result[0].elements[0].steps;
      const lastStep = steps[steps.length - 1];

      expect(lastStep.embeddings).toBeDefined();
      expect(lastStep.embeddings?.[0].data).toBe("Zm9v");
      expect(lastStep.embeddings?.[0].mime_type).toBe("image/png");
    });

    it("should attach embeddings to the failing step only when failure is not last", () => {
      const raw = createRawRun({
        testCases: [
          createTestCase({
            status: "fail",
            error: {
              message: "Failed while user enters invalid password",
            },
            story: createStory({
              steps: [
                { keyword: "Given", text: "user is on login page" },
                { keyword: "When", text: "user enters invalid password" },
                { keyword: "Then", text: "user sees error message" },
              ],
            }),
            attachments: [
              {
                name: "screenshot",
                mediaType: "image/png",
                body: "Zm9v",
                encoding: "BASE64",
              },
            ],
          }),
        ],
      });
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      const steps = result[0].elements[0].steps;
      const failedStep = steps[1];
      const lastStep = steps[steps.length - 1];

      expect(failedStep.embeddings).toBeDefined();
      expect(lastStep.embeddings).toBeUndefined();
    });

    it("should not include IDENTITY attachments in embeddings", () => {
      const raw = createRawRun({
        testCases: [
          createTestCase({
            attachments: [
              {
                name: "log",
                mediaType: "text/plain",
                body: "https://example.com/log.txt",
                encoding: "IDENTITY",
              },
            ],
          }),
        ],
      });
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      const steps = result[0].elements[0].steps;
      const lastStep = steps[steps.length - 1];

      expect(lastStep.embeddings).toBeUndefined();
    });
  });

  describe("duration", () => {
    it("should convert duration to nanoseconds", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      // Step durations should be 0 (from derived steps)
      const step = result[0].elements[0].steps[0];
      expect(step.result.duration).toBe(0);
    });
  });

  describe("keyword spacing option", () => {
    it("should not include trailing space when keywordSpacing is false", () => {
      const noSpaceFormatter = new CucumberJsonFormatter({
        keywordSpacing: false,
      });
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = noSpaceFormatter.format(run);

      expect(result[0].elements[0].steps[0].keyword).toBe("Given");
    });
  });
});
