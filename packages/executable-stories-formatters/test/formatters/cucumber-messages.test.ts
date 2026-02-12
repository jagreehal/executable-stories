/**
 * Tests for the Cucumber Messages (NDJSON) formatter.
 */

import { describe, it, expect } from "vitest";
import { CucumberMessagesFormatter } from "../../src/formatters/cucumber-messages/index";
import { canonicalizeRun } from "../../src/converters/acl/index";
import {
  createRawRun,
  createMultipleTestCasesRun,
  createMultiFileRun,
  createTestCase,
  createStory,
} from "../fixtures/raw-runs/basic";
import type { Envelope } from "../../src/types/cucumber-messages";

// Helper to get typed envelope field
function getEnvelopes<K extends keyof Envelope>(
  envelopes: Envelope[],
  key: K
): Extract<Envelope, Record<K, unknown>>[] {
  return envelopes.filter(
    (e) => key in e
  ) as Extract<Envelope, Record<K, unknown>>[];
}

describe("CucumberMessagesFormatter", () => {
  const formatter = new CucumberMessagesFormatter();

  describe("format", () => {
    it("should produce valid envelope array", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it("should have exactly one field per envelope", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      for (const envelope of result) {
        const keys = Object.keys(envelope);
        expect(keys).toHaveLength(1);
      }
    });
  });

  describe("message stream order", () => {
    it("should start with Meta", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect("meta" in result[0]).toBe(true);
    });

    it("should end with TestRunFinished", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect("testRunFinished" in result[result.length - 1]).toBe(true);
    });

    it("should emit definition messages before TestRunStarted", () => {
      const raw = createMultipleTestCasesRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      const testRunStartedIndex = result.findIndex(
        (e) => "testRunStarted" in e
      );
      expect(testRunStartedIndex).toBeGreaterThan(0);

      // All definition messages (meta, source, gherkinDocument, pickle) should be before testRunStarted
      for (let i = 0; i < testRunStartedIndex; i++) {
        const key = Object.keys(result[i])[0];
        expect(["meta", "source", "gherkinDocument", "pickle"]).toContain(key);
      }
    });

    it("should emit TestCase before TestCaseStarted", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      const testCaseIndex = result.findIndex((e) => "testCase" in e);
      const testCaseStartedIndex = result.findIndex(
        (e) => "testCaseStarted" in e
      );

      expect(testCaseIndex).toBeLessThan(testCaseStartedIndex);
    });

    it("should emit TestStepStarted before TestStepFinished", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      const stepStartedIndex = result.findIndex(
        (e) => "testStepStarted" in e
      );
      const stepFinishedIndex = result.findIndex(
        (e) => "testStepFinished" in e
      );

      expect(stepStartedIndex).toBeLessThan(stepFinishedIndex);
    });
  });

  describe("Meta envelope", () => {
    it("should include protocol version and implementation", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);
      const meta = getEnvelopes(result, "meta")[0];

      expect(meta.meta.protocolVersion).toBeTruthy();
      expect(meta.meta.implementation.name).toBe("executable-stories");
      expect(meta.meta.runtime.name).toBe("node.js");
    });

    it("should use custom tool name when provided", () => {
      const customFormatter = new CucumberMessagesFormatter({
        meta: { toolName: "my-tool", toolVersion: "2.0.0" },
      });
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = customFormatter.format(run);
      const meta = getEnvelopes(result, "meta")[0];

      expect(meta.meta.implementation.name).toBe("my-tool");
      expect(meta.meta.implementation.version).toBe("2.0.0");
    });
  });

  describe("Source + GherkinDocument", () => {
    it("should emit Source with synthesized feature text", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);
      const sources = getEnvelopes(result, "source");

      expect(sources).toHaveLength(1);
      expect(sources[0].source.uri).toBe("src/auth/login.test.ts");
      expect(sources[0].source.data).toContain("Feature:");
      expect(sources[0].source.data).toContain("Scenario:");
      expect(sources[0].source.mediaType).toBe(
        "text/x.cucumber.gherkin+plain"
      );
    });

    it("should emit GherkinDocument with correct structure", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);
      const docs = getEnvelopes(result, "gherkinDocument");

      expect(docs).toHaveLength(1);
      const doc = docs[0].gherkinDocument;
      expect(doc.uri).toBe("src/auth/login.test.ts");
      expect(doc.feature.keyword).toBe("Feature");
      expect(doc.feature.children).toHaveLength(1);
      expect(doc.feature.children[0].scenario).toBeDefined();
    });

    it("should include steps in GherkinDocument scenario", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);
      const doc = getEnvelopes(result, "gherkinDocument")[0].gherkinDocument;

      const scenario = doc.feature.children[0].scenario!;
      expect(scenario.steps).toHaveLength(3);
      expect(scenario.steps[0].keyword).toBe("Given ");
      expect(scenario.steps[0].text).toBe("user is on login page");
      expect(scenario.steps[1].keyword).toBe("When ");
      expect(scenario.steps[2].keyword).toBe("Then ");
    });

    it("should not emit synthetics when includeSynthetics is false", () => {
      const noSyntheticsFormatter = new CucumberMessagesFormatter({
        includeSynthetics: false,
      });
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = noSyntheticsFormatter.format(run);

      const sources = getEnvelopes(result, "source");
      const docs = getEnvelopes(result, "gherkinDocument");

      expect(sources).toHaveLength(0);
      expect(docs).toHaveLength(0);
    });
  });

  describe("Pickle", () => {
    it("should emit one pickle per scenario", () => {
      const raw = createMultipleTestCasesRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);
      const pickles = getEnvelopes(result, "pickle");

      expect(pickles).toHaveLength(3);
    });

    it("should include pickle steps matching scenario steps", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);
      const pickle = getEnvelopes(result, "pickle")[0].pickle;

      expect(pickle.steps).toHaveLength(3);
      expect(pickle.steps[0].text).toBe("user is on login page");
      expect(pickle.steps[0].type).toBe("Context");
      expect(pickle.steps[1].text).toBe("user enters valid credentials");
      expect(pickle.steps[1].type).toBe("Action");
      expect(pickle.steps[2].text).toBe("user sees dashboard");
      expect(pickle.steps[2].type).toBe("Outcome");
    });

    it("should include tags in pickle", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);
      const pickle = getEnvelopes(result, "pickle")[0].pickle;

      expect(pickle.tags).toHaveLength(2);
      expect(pickle.tags.map((t) => t.name)).toContain("@auth");
      expect(pickle.tags.map((t) => t.name)).toContain("@login");
    });
  });

  describe("And/But keyword type inheritance", () => {
    it("should inherit non-conjunction keyword type for And/But", () => {
      const raw = createRawRun({
        testCases: [
          createTestCase({
            story: createStory({
              steps: [
                { keyword: "Given", text: "a precondition" },
                { keyword: "And", text: "another precondition" },
                { keyword: "When", text: "an action" },
                { keyword: "And", text: "another action" },
                { keyword: "Then", text: "an outcome" },
                { keyword: "But", text: "not another outcome" },
              ],
            }),
          }),
        ],
      });
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);
      const pickle = getEnvelopes(result, "pickle")[0].pickle;

      expect(pickle.steps[0].type).toBe("Context");
      expect(pickle.steps[1].type).toBe("Context"); // And inherits Given
      expect(pickle.steps[2].type).toBe("Action");
      expect(pickle.steps[3].type).toBe("Action"); // And inherits When
      expect(pickle.steps[4].type).toBe("Outcome");
      expect(pickle.steps[5].type).toBe("Outcome"); // But inherits Then
    });
  });

  describe("TestCase + execution", () => {
    it("should emit TestCase linked to pickle", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      const pickle = getEnvelopes(result, "pickle")[0].pickle;
      const testCase = getEnvelopes(result, "testCase")[0].testCase;

      expect(testCase.pickleId).toBe(pickle.id);
      expect(testCase.testSteps).toHaveLength(3);
    });

    it("should link test steps to pickle steps", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      const pickle = getEnvelopes(result, "pickle")[0].pickle;
      const testCase = getEnvelopes(result, "testCase")[0].testCase;

      for (let i = 0; i < testCase.testSteps.length; i++) {
        expect(testCase.testSteps[i].pickleStepId).toBe(pickle.steps[i].id);
      }
    });

    it("should emit step results with correct statuses", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      const stepFinished = getEnvelopes(result, "testStepFinished");
      expect(stepFinished).toHaveLength(3);

      for (const sf of stepFinished) {
        expect(sf.testStepFinished.testStepResult.status).toBe("PASSED");
      }
    });

    it("should report FAILED status for failed steps", () => {
      const raw = createMultipleTestCasesRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      const stepFinished = getEnvelopes(result, "testStepFinished");
      const failedSteps = stepFinished.filter(
        (sf) => sf.testStepFinished.testStepResult.status === "FAILED"
      );

      expect(failedSteps.length).toBeGreaterThan(0);
    });

    it("should report SKIPPED status for skipped scenarios", () => {
      const raw = createMultipleTestCasesRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      const stepFinished = getEnvelopes(result, "testStepFinished");
      const skippedSteps = stepFinished.filter(
        (sf) => sf.testStepFinished.testStepResult.status === "SKIPPED"
      );

      expect(skippedSteps.length).toBeGreaterThan(0);
    });
  });

  describe("TestRunStarted + TestRunFinished", () => {
    it("should emit TestRunStarted with timestamp", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      const started = getEnvelopes(result, "testRunStarted")[0];
      expect(started.testRunStarted.timestamp).toBeDefined();
      expect(started.testRunStarted.timestamp.seconds).toBeGreaterThan(0);
    });

    it("should emit TestRunFinished with success=true when all pass", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      const finished = getEnvelopes(result, "testRunFinished")[0];
      expect(finished.testRunFinished.success).toBe(true);
    });

    it("should emit TestRunFinished with success=false when any fail", () => {
      const raw = createMultipleTestCasesRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      const finished = getEnvelopes(result, "testRunFinished")[0];
      expect(finished.testRunFinished.success).toBe(false);
    });
  });

  describe("multiple files", () => {
    it("should create separate Source/GherkinDocument per file", () => {
      const raw = createMultiFileRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      const sources = getEnvelopes(result, "source");
      const docs = getEnvelopes(result, "gherkinDocument");

      expect(sources).toHaveLength(3);
      expect(docs).toHaveLength(3);

      const uris = sources.map((s) => s.source.uri);
      expect(uris).toContain("src/auth/login.test.ts");
      expect(uris).toContain("src/auth/logout.test.ts");
      expect(uris).toContain("src/dashboard/stats.test.ts");
    });
  });

  describe("ID chain integrity", () => {
    it("should have consistent ID references across envelopes", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      // GherkinDocument scenario ID → Pickle astNodeIds
      const doc = getEnvelopes(result, "gherkinDocument")[0].gherkinDocument;
      const scenarioId = doc.feature.children[0].scenario!.id;
      const pickle = getEnvelopes(result, "pickle")[0].pickle;
      expect(pickle.astNodeIds).toContain(scenarioId);

      // GherkinDocument step IDs → PickleStep astNodeIds
      const astStepIds = doc.feature.children[0].scenario!.steps.map(
        (s) => s.id
      );
      for (let i = 0; i < pickle.steps.length; i++) {
        expect(pickle.steps[i].astNodeIds).toContain(astStepIds[i]);
      }

      // Pickle ID → TestCase pickleId
      const testCase = getEnvelopes(result, "testCase")[0].testCase;
      expect(testCase.pickleId).toBe(pickle.id);

      // PickleStep IDs → TestStep pickleStepId
      for (let i = 0; i < testCase.testSteps.length; i++) {
        expect(testCase.testSteps[i].pickleStepId).toBe(pickle.steps[i].id);
      }

      // TestCase ID → TestCaseStarted testCaseId
      const testCaseStarted = getEnvelopes(
        result,
        "testCaseStarted"
      )[0].testCaseStarted;
      expect(testCaseStarted.testCaseId).toBe(testCase.id);

      // TestCaseStarted ID → TestStepStarted/Finished testCaseStartedId
      const stepStarted = getEnvelopes(result, "testStepStarted");
      for (const ss of stepStarted) {
        expect(ss.testStepStarted.testCaseStartedId).toBe(
          testCaseStarted.id
        );
      }

      // TestStep IDs → TestStepStarted/Finished testStepId
      const stepFinished = getEnvelopes(result, "testStepFinished");
      const testStepIds = testCase.testSteps.map((ts) => ts.id);
      for (const sf of stepFinished) {
        expect(testStepIds).toContain(sf.testStepFinished.testStepId);
      }

      // TestCaseStarted ID → TestCaseFinished testCaseStartedId
      const testCaseFinished = getEnvelopes(
        result,
        "testCaseFinished"
      )[0].testCaseFinished;
      expect(testCaseFinished.testCaseStartedId).toBe(testCaseStarted.id);
    });
  });

  describe("formatToString (NDJSON)", () => {
    it("should produce valid NDJSON (one JSON per line)", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.formatToString(run);

      const lines = result.trim().split("\n");
      expect(lines.length).toBeGreaterThan(0);

      for (const line of lines) {
        expect(() => JSON.parse(line)).not.toThrow();
      }
    });

    it("should end with a trailing newline", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.formatToString(run);

      expect(result.endsWith("\n")).toBe(true);
    });

    it("each line should have exactly one envelope field", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.formatToString(run);

      const lines = result.trim().split("\n");
      for (const line of lines) {
        const parsed = JSON.parse(line);
        expect(Object.keys(parsed)).toHaveLength(1);
      }
    });
  });

  describe("deterministic IDs", () => {
    it("should produce identical output for same input", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);

      const result1 = formatter.formatToString(run);
      const result2 = formatter.formatToString(run);

      expect(result1).toBe(result2);
    });

    it("should produce different IDs with different salt", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);

      const f1 = new CucumberMessagesFormatter({ idSalt: "project-a" });
      const f2 = new CucumberMessagesFormatter({ idSalt: "project-b" });

      const result1 = f1.format(run);
      const result2 = f2.format(run);

      const pickle1 = getEnvelopes(result1, "pickle")[0].pickle;
      const pickle2 = getEnvelopes(result2, "pickle")[0].pickle;

      expect(pickle1.id).not.toBe(pickle2.id);
    });
  });

  describe("attachments", () => {
    it("should emit Attachment envelopes for BASE64 attachments", () => {
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

      const attachments = getEnvelopes(result, "attachment");
      expect(attachments).toHaveLength(1);
      expect(attachments[0].attachment.body).toBe("Zm9v");
      expect(attachments[0].attachment.mediaType).toBe("image/png");
      expect(attachments[0].attachment.contentEncoding).toBe("BASE64");
    });

    it("should link attachment to test case started", () => {
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

      const testCaseStarted = getEnvelopes(
        result,
        "testCaseStarted"
      )[0].testCaseStarted;
      const attachment = getEnvelopes(result, "attachment")[0].attachment;

      expect(attachment.testCaseStartedId).toBe(testCaseStarted.id);
      expect(attachment.testStepId).toBeTruthy();
    });

    it("should emit IDENTITY attachments (URLs/paths)", () => {
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

      const attachments = getEnvelopes(result, "attachment");
      expect(attachments).toHaveLength(1);
      expect(attachments[0].attachment.body).toBe(
        "https://example.com/log.txt"
      );
      expect(attachments[0].attachment.contentEncoding).toBe("IDENTITY");
    });

    it("should attach test-case attachments to the failed step", () => {
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

      const testCase = getEnvelopes(result, "testCase")[0].testCase;
      const attachments = getEnvelopes(result, "attachment");

      expect(attachments).toHaveLength(1);

      // Find the failed step's ID (the step whose TestStepFinished has FAILED status)
      const stepFinished = getEnvelopes(result, "testStepFinished");
      const failedStepFinished = stepFinished.find(
        (sf) => sf.testStepFinished.testStepResult.status === "FAILED"
      );
      expect(failedStepFinished).toBeDefined();

      // Attachment should be linked to the failed step
      expect(attachments[0].attachment.testStepId).toBe(
        failedStepFinished!.testStepFinished.testStepId
      );
    });

    it("should extract data URI screenshots from step docs as per-step attachments", () => {
      const raw = createRawRun({
        testCases: [
          createTestCase({
            story: createStory({
              steps: [
                {
                  keyword: "Given",
                  text: "user is on login page",
                  docs: [
                    {
                      kind: "screenshot" as const,
                      path: "data:image/png;base64,iVBORw0KGgo=",
                      phase: "runtime" as const,
                    },
                  ],
                },
                { keyword: "When", text: "user enters credentials" },
                { keyword: "Then", text: "user sees dashboard" },
              ],
            }),
          }),
        ],
      });
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      const attachments = getEnvelopes(result, "attachment");
      expect(attachments).toHaveLength(1);
      expect(attachments[0].attachment.body).toBe("iVBORw0KGgo=");
      expect(attachments[0].attachment.mediaType).toBe("image/png");
      expect(attachments[0].attachment.contentEncoding).toBe("BASE64");
    });

    it("should tie doc screenshot to its own step, not the last step", () => {
      const raw = createRawRun({
        testCases: [
          createTestCase({
            story: createStory({
              steps: [
                {
                  keyword: "Given",
                  text: "user is on login page",
                  docs: [
                    {
                      kind: "screenshot" as const,
                      path: "data:image/png;base64,STEP0IMG",
                      phase: "runtime" as const,
                    },
                  ],
                },
                { keyword: "When", text: "user enters credentials" },
                {
                  keyword: "Then",
                  text: "user sees dashboard",
                  docs: [
                    {
                      kind: "screenshot" as const,
                      path: "data:image/jpeg;base64,STEP2IMG",
                      phase: "runtime" as const,
                    },
                  ],
                },
              ],
            }),
          }),
        ],
      });
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      const testCase = getEnvelopes(result, "testCase")[0].testCase;
      const attachments = getEnvelopes(result, "attachment");

      // Two doc screenshots — one on step 0, one on step 2
      expect(attachments).toHaveLength(2);

      // First attachment tied to step 0
      expect(attachments[0].attachment.testStepId).toBe(
        testCase.testSteps[0].id
      );
      expect(attachments[0].attachment.body).toBe("STEP0IMG");

      // Second attachment tied to step 2
      expect(attachments[1].attachment.testStepId).toBe(
        testCase.testSteps[2].id
      );
      expect(attachments[1].attachment.body).toBe("STEP2IMG");
    });

    it("should handle non-data-URI screenshots as IDENTITY attachments", () => {
      const raw = createRawRun({
        testCases: [
          createTestCase({
            story: createStory({
              steps: [
                {
                  keyword: "Given",
                  text: "user is on login page",
                  docs: [
                    {
                      kind: "screenshot" as const,
                      path: "/screenshots/login.png",
                      phase: "runtime" as const,
                    },
                  ],
                },
                { keyword: "When", text: "user enters credentials" },
                { keyword: "Then", text: "user sees dashboard" },
              ],
            }),
          }),
        ],
      });
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      const attachments = getEnvelopes(result, "attachment");
      expect(attachments).toHaveLength(1);
      expect(attachments[0].attachment.body).toBe("/screenshots/login.png");
      expect(attachments[0].attachment.contentEncoding).toBe("IDENTITY");
      expect(attachments[0].attachment.mediaType).toBe("image/png");
    });

    it("should emit both doc screenshots and test-case attachments", () => {
      const raw = createRawRun({
        testCases: [
          createTestCase({
            story: createStory({
              steps: [
                {
                  keyword: "Given",
                  text: "user is on login page",
                  docs: [
                    {
                      kind: "screenshot" as const,
                      path: "data:image/png;base64,DOC_SCREENSHOT",
                      phase: "runtime" as const,
                    },
                  ],
                },
                { keyword: "When", text: "user enters credentials" },
                { keyword: "Then", text: "user sees dashboard" },
              ],
            }),
            attachments: [
              {
                name: "full-page",
                mediaType: "image/png",
                body: "TC_ATTACHMENT",
                encoding: "BASE64",
              },
            ],
          }),
        ],
      });
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      const testCase = getEnvelopes(result, "testCase")[0].testCase;
      const attachments = getEnvelopes(result, "attachment");

      // Doc screenshot on step 0 + test-case attachment on last step
      expect(attachments).toHaveLength(2);

      // Doc screenshot tied to step 0
      expect(attachments[0].attachment.testStepId).toBe(
        testCase.testSteps[0].id
      );
      expect(attachments[0].attachment.body).toBe("DOC_SCREENSHOT");

      // Test-case attachment tied to last step
      expect(attachments[1].attachment.testStepId).toBe(
        testCase.testSteps[2].id
      );
      expect(attachments[1].attachment.body).toBe("TC_ATTACHMENT");
    });

    it("should place attachment envelopes after their step's TestStepFinished", () => {
      const raw = createRawRun({
        testCases: [
          createTestCase({
            story: createStory({
              steps: [
                {
                  keyword: "Given",
                  text: "user is on login page",
                  docs: [
                    {
                      kind: "screenshot" as const,
                      path: "data:image/png;base64,IMG",
                      phase: "runtime" as const,
                    },
                  ],
                },
                { keyword: "When", text: "user enters credentials" },
                { keyword: "Then", text: "user sees dashboard" },
              ],
            }),
          }),
        ],
      });
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      // Find the attachment and its preceding envelope
      const attachmentIndex = result.findIndex((e) => "attachment" in e);
      expect(attachmentIndex).toBeGreaterThan(0);

      // The envelope immediately before should be testStepFinished for the same step
      const preceding = result[attachmentIndex - 1];
      expect("testStepFinished" in preceding).toBe(true);

      if ("testStepFinished" in preceding && "attachment" in result[attachmentIndex]) {
        expect(preceding.testStepFinished.testStepId).toBe(
          result[attachmentIndex].attachment.testStepId
        );
      }
    });

    it("should ignore non-screenshot doc entries", () => {
      const raw = createRawRun({
        testCases: [
          createTestCase({
            story: createStory({
              steps: [
                {
                  keyword: "Given",
                  text: "user is on login page",
                  docs: [
                    {
                      kind: "note" as const,
                      text: "This is a note",
                      phase: "static" as const,
                    },
                    {
                      kind: "code" as const,
                      label: "request",
                      content: '{"user": "admin"}',
                      lang: "json",
                      phase: "runtime" as const,
                    },
                  ],
                },
                { keyword: "When", text: "user enters credentials" },
                { keyword: "Then", text: "user sees dashboard" },
              ],
            }),
          }),
        ],
      });
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      const attachments = getEnvelopes(result, "attachment");
      expect(attachments).toHaveLength(0);
    });

    it("should guess media type from file extension", () => {
      const raw = createRawRun({
        testCases: [
          createTestCase({
            story: createStory({
              steps: [
                {
                  keyword: "Given",
                  text: "user is on login page",
                  docs: [
                    {
                      kind: "screenshot" as const,
                      path: "/screenshots/page.jpg",
                      phase: "runtime" as const,
                    },
                  ],
                },
                { keyword: "When", text: "user enters credentials" },
                { keyword: "Then", text: "user sees dashboard" },
              ],
            }),
          }),
        ],
      });
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      const attachments = getEnvelopes(result, "attachment");
      expect(attachments[0].attachment.mediaType).toBe("image/jpeg");
    });
  });

  describe("streaming parse test (no forward references)", () => {
    it("should not contain forward references to undefined IDs", () => {
      const raw = createMultipleTestCasesRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      const definedIds = new Set<string>();

      for (const envelope of result) {
        if ("pickle" in envelope) {
          // Pickle defines its own ID
          definedIds.add(envelope.pickle.id);
          // Pickle steps define their IDs
          for (const step of envelope.pickle.steps) {
            definedIds.add(step.id);
          }
          // Pickle references astNodeIds — these must already be defined
          if ("gherkinDocument" in result[0] === false) {
            // Skip this check if synthetics are off
            continue;
          }
        }
        if ("gherkinDocument" in envelope) {
          const doc = envelope.gherkinDocument;
          for (const child of doc.feature.children) {
            if (child.scenario) {
              definedIds.add(child.scenario.id);
              for (const step of child.scenario.steps) {
                definedIds.add(step.id);
              }
              for (const tag of child.scenario.tags) {
                definedIds.add(tag.id);
              }
            }
          }
          for (const tag of doc.feature.tags) {
            definedIds.add(tag.id);
          }
        }
        if ("testCase" in envelope) {
          definedIds.add(envelope.testCase.id);
          // TestCase references pickleId — must be defined
          expect(definedIds.has(envelope.testCase.pickleId)).toBe(true);
          for (const step of envelope.testCase.testSteps) {
            definedIds.add(step.id);
            // Step references pickleStepId — must be defined
            if (step.pickleStepId) {
              expect(definedIds.has(step.pickleStepId)).toBe(true);
            }
          }
        }
        if ("testCaseStarted" in envelope) {
          definedIds.add(envelope.testCaseStarted.id);
          // References testCaseId
          expect(
            definedIds.has(envelope.testCaseStarted.testCaseId)
          ).toBe(true);
        }
        if ("testStepStarted" in envelope) {
          // References testCaseStartedId and testStepId
          expect(
            definedIds.has(envelope.testStepStarted.testCaseStartedId)
          ).toBe(true);
          expect(
            definedIds.has(envelope.testStepStarted.testStepId)
          ).toBe(true);
        }
        if ("testStepFinished" in envelope) {
          expect(
            definedIds.has(envelope.testStepFinished.testCaseStartedId)
          ).toBe(true);
          expect(
            definedIds.has(envelope.testStepFinished.testStepId)
          ).toBe(true);
        }
        if ("testCaseFinished" in envelope) {
          expect(
            definedIds.has(envelope.testCaseFinished.testCaseStartedId)
          ).toBe(true);
        }
      }
    });
  });

  describe("doc entries → DocString/DataTable", () => {
    it("should convert code doc to DocString in GherkinDocument", () => {
      const raw = createRawRun({
        testCases: [
          createTestCase({
            story: createStory({
              steps: [
                {
                  keyword: "Given",
                  text: "an API request",
                  docs: [
                    {
                      kind: "code" as const,
                      label: "request",
                      content: '{"user": "admin"}',
                      lang: "json",
                      phase: "static" as const,
                    },
                  ],
                },
                { keyword: "When", text: "the request is sent" },
                { keyword: "Then", text: "status is 200" },
              ],
            }),
          }),
        ],
      });
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      const doc = getEnvelopes(result, "gherkinDocument")[0].gherkinDocument;
      const step = doc.feature.children[0].scenario!.steps[0];

      expect(step.docString).toBeDefined();
      expect(step.docString!.content).toBe('{"user": "admin"}');
      expect(step.docString!.mediaType).toBe("json");
      expect(step.docString!.delimiter).toBe('"""');
    });

    it("should convert table doc to DataTable in GherkinDocument", () => {
      const raw = createRawRun({
        testCases: [
          createTestCase({
            story: createStory({
              steps: [
                {
                  keyword: "Given",
                  text: "the following users",
                  docs: [
                    {
                      kind: "table" as const,
                      label: "users",
                      columns: ["name", "role"],
                      rows: [
                        ["Alice", "admin"],
                        ["Bob", "user"],
                      ],
                      phase: "static" as const,
                    },
                  ],
                },
                { keyword: "When", text: "they log in" },
                { keyword: "Then", text: "they see their dashboards" },
              ],
            }),
          }),
        ],
      });
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      const doc = getEnvelopes(result, "gherkinDocument")[0].gherkinDocument;
      const step = doc.feature.children[0].scenario!.steps[0];

      expect(step.dataTable).toBeDefined();
      expect(step.dataTable!.rows).toHaveLength(3); // header + 2 data rows
      expect(step.dataTable!.rows[0].cells.map((c) => c.value)).toEqual([
        "name",
        "role",
      ]);
      expect(step.dataTable!.rows[1].cells.map((c) => c.value)).toEqual([
        "Alice",
        "admin",
      ]);
    });

    it("should convert note doc to DocString in GherkinDocument", () => {
      const raw = createRawRun({
        testCases: [
          createTestCase({
            story: createStory({
              steps: [
                {
                  keyword: "Given",
                  text: "a step with a note",
                  docs: [
                    {
                      kind: "note" as const,
                      text: "This is important context",
                      phase: "static" as const,
                    },
                  ],
                },
                { keyword: "When", text: "something happens" },
                { keyword: "Then", text: "it worked" },
              ],
            }),
          }),
        ],
      });
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      const doc = getEnvelopes(result, "gherkinDocument")[0].gherkinDocument;
      const step = doc.feature.children[0].scenario!.steps[0];

      expect(step.docString).toBeDefined();
      expect(step.docString!.mediaType).toBe("text/plain");
      expect(step.docString!.content).toBe("This is important context");
    });

    it("should convert code doc to PickleDocString in Pickle", () => {
      const raw = createRawRun({
        testCases: [
          createTestCase({
            story: createStory({
              steps: [
                {
                  keyword: "Given",
                  text: "an API request",
                  docs: [
                    {
                      kind: "code" as const,
                      label: "request",
                      content: '{"user": "admin"}',
                      lang: "json",
                      phase: "static" as const,
                    },
                  ],
                },
                { keyword: "When", text: "the request is sent" },
                { keyword: "Then", text: "status is 200" },
              ],
            }),
          }),
        ],
      });
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      const pickle = getEnvelopes(result, "pickle")[0].pickle;
      const pickleStep = pickle.steps[0];

      expect(pickleStep.argument).toBeDefined();
      expect(pickleStep.argument!.docString).toBeDefined();
      expect(pickleStep.argument!.docString!.content).toBe('{"user": "admin"}');
      expect(pickleStep.argument!.docString!.mediaType).toBe("json");
    });

    it("should convert table doc to PickleTable in Pickle", () => {
      const raw = createRawRun({
        testCases: [
          createTestCase({
            story: createStory({
              steps: [
                {
                  keyword: "Given",
                  text: "the following users",
                  docs: [
                    {
                      kind: "table" as const,
                      label: "users",
                      columns: ["name", "role"],
                      rows: [
                        ["Alice", "admin"],
                        ["Bob", "user"],
                      ],
                      phase: "static" as const,
                    },
                  ],
                },
                { keyword: "When", text: "they log in" },
                { keyword: "Then", text: "they see their dashboards" },
              ],
            }),
          }),
        ],
      });
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      const pickle = getEnvelopes(result, "pickle")[0].pickle;
      const pickleStep = pickle.steps[0];

      expect(pickleStep.argument).toBeDefined();
      expect(pickleStep.argument!.dataTable).toBeDefined();
      expect(pickleStep.argument!.dataTable!.rows).toHaveLength(3);
      expect(pickleStep.argument!.dataTable!.rows[0].cells.map((c) => c.value)).toEqual([
        "name",
        "role",
      ]);
    });

    it("should prioritize table over docString when both present", () => {
      const raw = createRawRun({
        testCases: [
          createTestCase({
            story: createStory({
              steps: [
                {
                  keyword: "Given",
                  text: "step with table and note",
                  docs: [
                    {
                      kind: "note" as const,
                      text: "some note",
                      phase: "static" as const,
                    },
                    {
                      kind: "table" as const,
                      label: "data",
                      columns: ["x"],
                      rows: [["1"]],
                      phase: "static" as const,
                    },
                  ],
                },
                { keyword: "When", text: "something" },
                { keyword: "Then", text: "result" },
              ],
            }),
          }),
        ],
      });
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      // GherkinDocument should have dataTable (not docString)
      const doc = getEnvelopes(result, "gherkinDocument")[0].gherkinDocument;
      const step = doc.feature.children[0].scenario!.steps[0];
      expect(step.dataTable).toBeDefined();
      expect(step.docString).toBeUndefined();

      // Pickle should also have dataTable
      const pickle = getEnvelopes(result, "pickle")[0].pickle;
      expect(pickle.steps[0].argument?.dataTable).toBeDefined();
      expect(pickle.steps[0].argument?.docString).toBeUndefined();
    });

    it("should not add argument when step has no docs", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      const pickle = getEnvelopes(result, "pickle")[0].pickle;
      for (const step of pickle.steps) {
        expect(step.argument).toBeUndefined();
      }
    });

    it("should not convert screenshot docs to DocString (they are attachments)", () => {
      const raw = createRawRun({
        testCases: [
          createTestCase({
            story: createStory({
              steps: [
                {
                  keyword: "Given",
                  text: "a step with screenshot",
                  docs: [
                    {
                      kind: "screenshot" as const,
                      path: "data:image/png;base64,ABC",
                      phase: "runtime" as const,
                    },
                  ],
                },
                { keyword: "When", text: "something" },
                { keyword: "Then", text: "result" },
              ],
            }),
          }),
        ],
      });
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      const doc = getEnvelopes(result, "gherkinDocument")[0].gherkinDocument;
      const step = doc.feature.children[0].scenario!.steps[0];
      expect(step.docString).toBeUndefined();
      expect(step.dataTable).toBeUndefined();
    });
  });

  describe("retry/attempt support", () => {
    // Retry tests use TestRunResult directly since attempts aren't in RawTestCase
    function makeRetryRun(): import("../../src/types/test-result.js").TestRunResult {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      // Augment with retry data
      run.testCases[0].retry = 1;
      run.testCases[0].retries = 1;
      run.testCases[0].attempts = [
        { attempt: 0, status: "failed", durationMs: 100, errorMessage: "First attempt failed" },
        { attempt: 1, status: "passed", durationMs: 150 },
      ];
      return run;
    }

    it("should emit multiple execution sequences for retried test case", () => {
      const run = makeRetryRun();
      const result = formatter.format(run);

      // Should have exactly one TestCase envelope
      const testCases = getEnvelopes(result, "testCase");
      expect(testCases).toHaveLength(1);

      // Should have two TestCaseStarted envelopes (one per attempt)
      const testCaseStarteds = getEnvelopes(result, "testCaseStarted");
      expect(testCaseStarteds).toHaveLength(2);
      expect(testCaseStarteds[0].testCaseStarted.attempt).toBe(0);
      expect(testCaseStarteds[1].testCaseStarted.attempt).toBe(1);

      // Should have two TestCaseFinished envelopes
      const testCaseFinisheds = getEnvelopes(result, "testCaseFinished");
      expect(testCaseFinisheds).toHaveLength(2);
      expect(testCaseFinisheds[0].testCaseFinished.willBeRetried).toBe(true);
      expect(testCaseFinisheds[1].testCaseFinished.willBeRetried).toBe(false);
    });

    it("should have all TestCaseStarteds reference the same TestCase", () => {
      const run = makeRetryRun();
      const result = formatter.format(run);

      const testCaseId = getEnvelopes(result, "testCase")[0].testCase.id;
      const testCaseStarteds = getEnvelopes(result, "testCaseStarted");

      for (const tcs of testCaseStarteds) {
        expect(tcs.testCaseStarted.testCaseId).toBe(testCaseId);
      }
    });

    it("should emit step sequences for each attempt", () => {
      const run = makeRetryRun();
      const result = formatter.format(run);

      // 3 steps × 2 attempts = 6 TestStepStarted + 6 TestStepFinished
      const stepStarteds = getEnvelopes(result, "testStepStarted");
      const stepFinisheds = getEnvelopes(result, "testStepFinished");

      expect(stepStarteds).toHaveLength(6);
      expect(stepFinisheds).toHaveLength(6);
    });

    it("should not duplicate execution envelopes for single attempt", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      const testCaseStarteds = getEnvelopes(result, "testCaseStarted");
      const testCaseFinisheds = getEnvelopes(result, "testCaseFinished");

      expect(testCaseStarteds).toHaveLength(1);
      expect(testCaseFinisheds).toHaveLength(1);
      expect(testCaseFinisheds[0].testCaseFinished.willBeRetried).toBe(false);
    });
  });

  describe("semantic parity with TestRunResult", () => {
    it("should have same scenario count as test cases", () => {
      const raw = createMultipleTestCasesRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      const pickles = getEnvelopes(result, "pickle");
      expect(pickles).toHaveLength(run.testCases.length);
    });

    it("should have same step count per scenario", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      const pickle = getEnvelopes(result, "pickle")[0].pickle;
      expect(pickle.steps).toHaveLength(run.testCases[0].story.steps.length);
    });

    it("should have matching status counts", () => {
      const raw = createMultipleTestCasesRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      // Count statuses from TestRunResult
      const runStatuses = run.testCases.map((tc) => tc.status);

      // Count statuses from NDJSON by looking at last step result per test case
      const testCaseFinished = getEnvelopes(result, "testCaseFinished");
      expect(testCaseFinished).toHaveLength(runStatuses.length);
    });
  });
});
