/**
 * Tests for the NDJSON-to-TestRunResult parser.
 */

import { describe, it, expect } from "vitest";
import { parseNdjson, parseEnvelopes } from "../../src/converters/ndjson-parser";
import { CucumberMessagesFormatter } from "../../src/formatters/cucumber-messages/index";
import { HtmlFormatter } from "../../src/formatters/html/index";
import { canonicalizeRun } from "../../src/converters/acl/index";
import {
  createRawRun,
  createMultipleTestCasesRun,
  createMultiFileRun,
  createTestCase,
  createStory,
} from "../fixtures/raw-runs/basic";
import type { Envelope } from "../../src/types/cucumber-messages";

describe("parseNdjson", () => {
  const formatter = new CucumberMessagesFormatter();

  describe("basic parsing", () => {
    it("should parse NDJSON string into TestRunResult", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const ndjson = formatter.formatToString(run);

      const parsed = parseNdjson(ndjson);

      expect(parsed.testCases).toHaveLength(1);
      expect(parsed.testCases[0].story.scenario).toBe(
        "User logs in successfully"
      );
    });

    it("should reconstruct step keywords from GherkinDocument", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const ndjson = formatter.formatToString(run);

      const parsed = parseNdjson(ndjson);
      const steps = parsed.testCases[0].story.steps;

      expect(steps[0].keyword).toBe("Given");
      expect(steps[1].keyword).toBe("When");
      expect(steps[2].keyword).toBe("Then");
    });

    it("should reconstruct step text", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const ndjson = formatter.formatToString(run);

      const parsed = parseNdjson(ndjson);
      const steps = parsed.testCases[0].story.steps;

      expect(steps[0].text).toBe("user is on login page");
      expect(steps[1].text).toBe("user enters valid credentials");
      expect(steps[2].text).toBe("user sees dashboard");
    });

    it("should reconstruct tags", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const ndjson = formatter.formatToString(run);

      const parsed = parseNdjson(ndjson);

      expect(parsed.testCases[0].tags).toContain("auth");
      expect(parsed.testCases[0].tags).toContain("login");
    });

    it("should reconstruct source file", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const ndjson = formatter.formatToString(run);

      const parsed = parseNdjson(ndjson);

      expect(parsed.testCases[0].sourceFile).toBe("src/auth/login.test.ts");
    });
  });

  describe("status reconstruction", () => {
    it("should reconstruct passed status", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const ndjson = formatter.formatToString(run);

      const parsed = parseNdjson(ndjson);

      expect(parsed.testCases[0].status).toBe("passed");
    });

    it("should reconstruct failed status", () => {
      const raw = createMultipleTestCasesRun();
      const run = canonicalizeRun(raw);
      const ndjson = formatter.formatToString(run);

      const parsed = parseNdjson(ndjson);

      const failedTc = parsed.testCases.find((tc) => tc.status === "failed");
      expect(failedTc).toBeDefined();
    });

    it("should reconstruct skipped status", () => {
      const raw = createMultipleTestCasesRun();
      const run = canonicalizeRun(raw);
      const ndjson = formatter.formatToString(run);

      const parsed = parseNdjson(ndjson);

      const skippedTc = parsed.testCases.find((tc) => tc.status === "skipped");
      expect(skippedTc).toBeDefined();
    });

    it("should preserve error messages on failed steps", () => {
      const raw = createMultipleTestCasesRun();
      const run = canonicalizeRun(raw);
      const ndjson = formatter.formatToString(run);

      const parsed = parseNdjson(ndjson);

      const failedTc = parsed.testCases.find((tc) => tc.status === "failed");
      expect(failedTc?.errorMessage).toBeTruthy();
    });
  });

  describe("multiple scenarios", () => {
    it("should parse all test cases", () => {
      const raw = createMultipleTestCasesRun();
      const run = canonicalizeRun(raw);
      const ndjson = formatter.formatToString(run);

      const parsed = parseNdjson(ndjson);

      expect(parsed.testCases).toHaveLength(3);
    });

    it("should preserve scenario names", () => {
      const raw = createMultipleTestCasesRun();
      const run = canonicalizeRun(raw);
      const ndjson = formatter.formatToString(run);

      const parsed = parseNdjson(ndjson);
      const names = parsed.testCases.map((tc) => tc.story.scenario);

      expect(names).toContain("User logs in successfully");
      expect(names).toContain("User login fails with invalid password");
      expect(names).toContain("User can reset password");
    });
  });

  describe("multiple files", () => {
    it("should reconstruct test cases from multiple source files", () => {
      const raw = createMultiFileRun();
      const run = canonicalizeRun(raw);
      const ndjson = formatter.formatToString(run);

      const parsed = parseNdjson(ndjson);

      const sourceFiles = new Set(parsed.testCases.map((tc) => tc.sourceFile));
      expect(sourceFiles.size).toBe(3);
      expect(sourceFiles).toContain("src/auth/login.test.ts");
      expect(sourceFiles).toContain("src/auth/logout.test.ts");
      expect(sourceFiles).toContain("src/dashboard/stats.test.ts");
    });
  });

  describe("title path", () => {
    it("should reconstruct titlePath from feature name", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const ndjson = formatter.formatToString(run);

      const parsed = parseNdjson(ndjson);

      // Feature name from titlePath[0] + scenario name
      expect(parsed.testCases[0].titlePath.length).toBeGreaterThanOrEqual(1);
      expect(parsed.testCases[0].titlePath).toContain(
        "User logs in successfully"
      );
    });
  });

  describe("timestamps", () => {
    it("should reconstruct run timestamps", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const ndjson = formatter.formatToString(run);

      const parsed = parseNdjson(ndjson);

      expect(parsed.startedAtMs).toBe(run.startedAtMs);
      expect(parsed.finishedAtMs).toBe(run.finishedAtMs);
    });
  });

  describe("attachments", () => {
    it("should reconstruct attachments from envelope", () => {
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
      const ndjson = formatter.formatToString(run);

      const parsed = parseNdjson(ndjson);

      expect(parsed.testCases[0].attachments).toHaveLength(1);
      expect(parsed.testCases[0].attachments[0].body).toBe("Zm9v");
      expect(parsed.testCases[0].attachments[0].mediaType).toBe("image/png");
      expect(parsed.testCases[0].attachments[0].contentEncoding).toBe(
        "BASE64"
      );
    });
  });

  describe("without synthetics", () => {
    it("should fall back to pickle step types when no GherkinDocument", () => {
      const noSynthetics = new CucumberMessagesFormatter({
        includeSynthetics: false,
      });
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const ndjson = noSynthetics.formatToString(run);

      const parsed = parseNdjson(ndjson);

      // Keywords derived from pickle step types
      expect(parsed.testCases[0].story.steps[0].keyword).toBe("Given"); // Context → Given
      expect(parsed.testCases[0].story.steps[1].keyword).toBe("When");  // Action → When
      expect(parsed.testCases[0].story.steps[2].keyword).toBe("Then");  // Outcome → Then
    });
  });

  describe("parseEnvelopes", () => {
    it("should accept array of Envelope objects directly", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const envelopes = formatter.format(run);

      const parsed = parseEnvelopes(envelopes);

      expect(parsed.testCases).toHaveLength(1);
      expect(parsed.testCases[0].story.scenario).toBe(
        "User logs in successfully"
      );
    });
  });
});

describe("DocString/DataTable round-trip", () => {
  const formatter = new CucumberMessagesFormatter();

  it("should reconstruct code doc from DocString", () => {
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
    const ndjson = formatter.formatToString(run);
    const parsed = parseNdjson(ndjson);

    const step = parsed.testCases[0].story.steps[0];
    expect(step.docs).toBeDefined();
    expect(step.docs!.length).toBeGreaterThanOrEqual(1);

    const codeDocs = step.docs!.filter((d) => d.kind === "code");
    expect(codeDocs).toHaveLength(1);
    expect((codeDocs[0] as any).content).toBe('{"user": "admin"}');
    expect((codeDocs[0] as any).lang).toBe("json");
  });

  it("should reconstruct table doc from DataTable", () => {
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
    const ndjson = formatter.formatToString(run);
    const parsed = parseNdjson(ndjson);

    const step = parsed.testCases[0].story.steps[0];
    expect(step.docs).toBeDefined();

    const tableDocs = step.docs!.filter((d) => d.kind === "table");
    expect(tableDocs).toHaveLength(1);

    const table = tableDocs[0] as any;
    expect(table.columns).toEqual(["name", "role"]);
    expect(table.rows).toEqual([
      ["Alice", "admin"],
      ["Bob", "user"],
    ]);
  });

  it("should reconstruct note doc from text/plain DocString", () => {
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
                    text: "Important context",
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
    const ndjson = formatter.formatToString(run);
    const parsed = parseNdjson(ndjson);

    const step = parsed.testCases[0].story.steps[0];
    expect(step.docs).toBeDefined();

    const noteDocs = step.docs!.filter((d) => d.kind === "note");
    expect(noteDocs).toHaveLength(1);
    expect((noteDocs[0] as any).text).toBe("Important context");
  });

  it("should reconstruct section doc from text/markdown DocString", () => {
    const raw = createRawRun({
      testCases: [
        createTestCase({
          story: createStory({
            steps: [
              {
                keyword: "Given",
                text: "step with markdown",
                docs: [
                  {
                    kind: "section" as const,
                    title: "Details",
                    markdown: "# Heading\n\nSome **bold** text",
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
    const ndjson = formatter.formatToString(run);
    const parsed = parseNdjson(ndjson);

    const step = parsed.testCases[0].story.steps[0];
    expect(step.docs).toBeDefined();

    const sectionDocs = step.docs!.filter((d) => d.kind === "section");
    expect(sectionDocs).toHaveLength(1);
    expect((sectionDocs[0] as any).markdown).toBe(
      "# Heading\n\nSome **bold** text"
    );
  });

  it("should not add docs when step has no argument", () => {
    const raw = createRawRun();
    const run = canonicalizeRun(raw);
    const ndjson = formatter.formatToString(run);
    const parsed = parseNdjson(ndjson);

    for (const step of parsed.testCases[0].story.steps) {
      expect(step.docs).toBeUndefined();
    }
  });
});

describe("retry/attempt round-trip", () => {
  const formatter = new CucumberMessagesFormatter();

  function makeRetryRun(): import("../../src/types/test-result.js").TestRunResult {
    const raw = createRawRun();
    const run = canonicalizeRun(raw);
    run.testCases[0].retry = 1;
    run.testCases[0].retries = 1;
    run.testCases[0].attempts = [
      { attempt: 0, status: "failed", durationMs: 100, errorMessage: "First attempt failed" },
      { attempt: 1, status: "passed", durationMs: 150 },
    ];
    return run;
  }

  it("should reconstruct retries from multiple execution sequences", () => {
    const run = makeRetryRun();
    const ndjson = formatter.formatToString(run);
    const parsed = parseNdjson(ndjson);

    expect(parsed.testCases).toHaveLength(1);
    const tc = parsed.testCases[0];

    // Should use final attempt's status
    expect(tc.status).toBe("passed");

    // Should track retry info
    expect(tc.retry).toBe(1);
    expect(tc.retries).toBe(1);

    // Should have attempts array
    expect(tc.attempts).toBeDefined();
    expect(tc.attempts).toHaveLength(2);
    expect(tc.attempts![0].attempt).toBe(0);
    expect(tc.attempts![0].status).toBe("failed");
    expect(tc.attempts![1].attempt).toBe(1);
    expect(tc.attempts![1].status).toBe("passed");
  });

  it("should not add attempts for non-retried test case", () => {
    const raw = createRawRun();
    const run = canonicalizeRun(raw);
    const ndjson = formatter.formatToString(run);
    const parsed = parseNdjson(ndjson);

    expect(parsed.testCases[0].attempts).toBeUndefined();
    expect(parsed.testCases[0].retries).toBe(0);
  });

  it("should only emit one TestCaseResult per test case with retries", () => {
    const raw = createRawRun();
    const run = canonicalizeRun(raw);
    run.testCases[0].retry = 2;
    run.testCases[0].retries = 2;
    run.testCases[0].attempts = [
      { attempt: 0, status: "failed", durationMs: 50, errorMessage: "First" },
      { attempt: 1, status: "failed", durationMs: 75, errorMessage: "Second" },
      { attempt: 2, status: "passed", durationMs: 100 },
    ];

    const ndjson = formatter.formatToString(run);
    const parsed = parseNdjson(ndjson);

    // Only one TestCaseResult, not three
    expect(parsed.testCases).toHaveLength(1);
    expect(parsed.testCases[0].status).toBe("passed");
    expect(parsed.testCases[0].attempts).toHaveLength(3);
  });
});

describe("round-trip: TestRunResult → NDJSON → TestRunResult → HTML", () => {
  const messagesFormatter = new CucumberMessagesFormatter();
  const htmlFormatter = new HtmlFormatter();

  it("should produce HTML from round-tripped data", () => {
    const raw = createMultipleTestCasesRun();
    const originalRun = canonicalizeRun(raw);

    // TestRunResult → NDJSON
    const ndjson = messagesFormatter.formatToString(originalRun);

    // NDJSON → TestRunResult
    const parsedRun = parseNdjson(ndjson);

    // TestRunResult → HTML
    const html = htmlFormatter.format(parsedRun);

    expect(html).toContain("<!DOCTYPE html>");
  });

  describe("semantic parity", () => {
    it("should preserve scenario count", () => {
      const raw = createMultipleTestCasesRun();
      const originalRun = canonicalizeRun(raw);
      const ndjson = messagesFormatter.formatToString(originalRun);
      const parsedRun = parseNdjson(ndjson);

      expect(parsedRun.testCases.length).toBe(originalRun.testCases.length);
    });

    it("should preserve scenario names", () => {
      const raw = createMultipleTestCasesRun();
      const originalRun = canonicalizeRun(raw);
      const ndjson = messagesFormatter.formatToString(originalRun);
      const parsedRun = parseNdjson(ndjson);

      const originalNames = originalRun.testCases
        .map((tc) => tc.story.scenario)
        .sort();
      const parsedNames = parsedRun.testCases
        .map((tc) => tc.story.scenario)
        .sort();

      expect(parsedNames).toEqual(originalNames);
    });

    it("should preserve status counts", () => {
      const raw = createMultipleTestCasesRun();
      const originalRun = canonicalizeRun(raw);
      const ndjson = messagesFormatter.formatToString(originalRun);
      const parsedRun = parseNdjson(ndjson);

      const countStatuses = (tcs: { status: string }[]) => {
        const counts: Record<string, number> = {};
        for (const tc of tcs) {
          counts[tc.status] = (counts[tc.status] ?? 0) + 1;
        }
        return counts;
      };

      expect(countStatuses(parsedRun.testCases)).toEqual(
        countStatuses(originalRun.testCases)
      );
    });

    it("should preserve step counts per scenario", () => {
      const raw = createMultipleTestCasesRun();
      const originalRun = canonicalizeRun(raw);
      const ndjson = messagesFormatter.formatToString(originalRun);
      const parsedRun = parseNdjson(ndjson);

      for (let i = 0; i < originalRun.testCases.length; i++) {
        const originalName = originalRun.testCases[i].story.scenario;
        const parsedTc = parsedRun.testCases.find(
          (tc) => tc.story.scenario === originalName
        );
        expect(parsedTc).toBeDefined();
        expect(parsedTc!.story.steps.length).toBe(
          originalRun.testCases[i].story.steps.length
        );
      }
    });

    it("should preserve step text", () => {
      const raw = createRawRun();
      const originalRun = canonicalizeRun(raw);
      const ndjson = messagesFormatter.formatToString(originalRun);
      const parsedRun = parseNdjson(ndjson);

      const originalTexts = originalRun.testCases[0].story.steps.map(
        (s) => s.text
      );
      const parsedTexts = parsedRun.testCases[0].story.steps.map(
        (s) => s.text
      );

      expect(parsedTexts).toEqual(originalTexts);
    });

    it("should preserve source file grouping", () => {
      const raw = createMultiFileRun();
      const originalRun = canonicalizeRun(raw);
      const ndjson = messagesFormatter.formatToString(originalRun);
      const parsedRun = parseNdjson(ndjson);

      const originalFiles = new Set(
        originalRun.testCases.map((tc) => tc.sourceFile)
      );
      const parsedFiles = new Set(
        parsedRun.testCases.map((tc) => tc.sourceFile)
      );

      expect(parsedFiles).toEqual(originalFiles);
    });

    it("should preserve attachment counts", () => {
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
              {
                name: "log",
                mediaType: "text/plain",
                body: "c29tZSBsb2c=",
                encoding: "BASE64",
              },
            ],
          }),
        ],
      });
      const originalRun = canonicalizeRun(raw);
      const ndjson = messagesFormatter.formatToString(originalRun);
      const parsedRun = parseNdjson(ndjson);

      expect(parsedRun.testCases[0].attachments.length).toBe(
        originalRun.testCases[0].attachments.length
      );
    });

    it("should render round-tripped HTML with correct scenario titles", () => {
      const raw = createMultipleTestCasesRun();
      const originalRun = canonicalizeRun(raw);
      const ndjson = messagesFormatter.formatToString(originalRun);
      const parsedRun = parseNdjson(ndjson);
      const html = htmlFormatter.format(parsedRun);

      // HTML should contain all scenario names
      for (const tc of originalRun.testCases) {
        expect(html).toContain(tc.story.scenario);
      }
    });

    it("should render round-tripped HTML with at least one step text", () => {
      const raw = createRawRun();
      const originalRun = canonicalizeRun(raw);
      const ndjson = messagesFormatter.formatToString(originalRun);
      const parsedRun = parseNdjson(ndjson);
      const html = htmlFormatter.format(parsedRun);

      // Should contain at least one step text from the original
      const hasStep = originalRun.testCases[0].story.steps.some((s) =>
        html.includes(s.text)
      );
      expect(hasStep).toBe(true);
    });
  });
});
