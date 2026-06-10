/**
 * Tests for the Markdown formatter.
 */

import { describe, it, expect } from "vitest";
import { MarkdownFormatter } from "../../src/formatters/markdown";
import { canonicalizeRun } from "../../src/converters/acl/index";
import {
  createRawRun,
  createMultipleTestCasesRun,
  createMultiFileRun,
  createFailingTestCase,
  createTestCase,
  createStory,
} from "../fixtures/raw-runs/basic";

describe("MarkdownFormatter", () => {
  const formatter = new MarkdownFormatter();

  describe("format", () => {
    it("should produce markdown with title", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toContain("# User Stories");
    });

    it("should include metadata table by default", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toContain("| Key | Value |");
      expect(result).toContain("| Date |");
      expect(result).toContain("| Version | 1.0.0 |");
      expect(result).toContain("| Git SHA | abc1234 |");
    });

    it("should include scenario heading with status icon", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toContain("### ✅ User logs in successfully");
    });

    it("should include tags", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toContain("Tags: `auth`, `login`");
    });

    it("should include tickets", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toContain("Tickets: `JIRA-123`");
    });

    it("should include steps as bullets", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toContain("- **Given** user is on login page");
      expect(result).toContain("- **When** user enters valid credentials");
      expect(result).toContain("- **Then** user sees dashboard");
    });

    it("should render step docs (note, code, table)", () => {
      const raw = createRawRun({
        testCases: [
          createTestCase({
            story: createStory({
              steps: [
                {
                  keyword: "Given",
                  text: "user is on login page",
                  docs: [
                    { kind: "note", text: "Always start here", phase: "static" },
                    {
                      kind: "code",
                      label: "Request",
                      content: "POST /login",
                      lang: "http",
                      phase: "static",
                    },
                    {
                      kind: "table",
                      label: "Credentials",
                      columns: ["user", "pass"],
                      rows: [["alice", "secret"]],
                      phase: "static",
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

      expect(result).toContain("> Always start here");
      expect(result).toContain("**Request**");
      expect(result).toContain("```http");
      expect(result).toContain("POST /login");
      expect(result).toContain("**Credentials**");
      expect(result).toContain("| user | pass |");
      expect(result).toContain("| alice | secret |");
    });

    it("should render video doc entries as inline <video> with caption", () => {
      const raw = createRawRun({
        testCases: [
          createTestCase({
            story: createStory({
              steps: [
                {
                  keyword: "When",
                  text: "they complete the transfer",
                  docs: [
                    {
                      kind: "video",
                      path: "attachments/abc/walkthrough.webm",
                      caption: "Recorded walkthrough",
                      poster: "attachments/abc/poster.png",
                      phase: "runtime",
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

      expect(result).toContain("<video controls preload=\"metadata\"");
      expect(result).toContain("poster=\"attachments/abc/poster.png\"");
      expect(result).toContain("<source src=\"attachments/abc/walkthrough.webm\" />");
      expect(result).toContain("*Recorded walkthrough*");
    });

    it("should render html doc entries as links (path/url) and details (content)", () => {
      const raw = createRawRun({
        testCases: [
          createTestCase({
            story: createStory({
              steps: [
                {
                  keyword: "Then",
                  text: "the reports are generated",
                  docs: [
                    { kind: "html", path: "reports/coverage.html", title: "Coverage", phase: "runtime" },
                    { kind: "html", url: "https://dash.example.com/run/42", phase: "runtime" },
                    { kind: "html", content: "<h1>Chart</h1>", title: "Chart", phase: "runtime" },
                  ],
                },
              ],
            }),
          }),
        ],
      });
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toContain("[Coverage](reports/coverage.html)");
      expect(result).toContain("[Embedded HTML](https://dash.example.com/run/42)");
      expect(result).toContain("<details>");
      expect(result).toContain("<summary>Chart</summary>");
      expect(result).toContain("```html");
      expect(result).toContain("<h1>Chart</h1>");
      // Markdown never embeds a live iframe — that's HTML-report-only.
      expect(result).not.toContain("<iframe");
    });
  });

  describe("status icons", () => {
    it("should show passed icon for passing tests", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toContain("✅");
    });

    it("should show failed icon for failing tests", () => {
      const raw = createRawRun({ testCases: [createFailingTestCase()] });
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toContain("❌");
    });

    it("should not show icons when includeStatusIcons is false", () => {
      const noIconFormatter = new MarkdownFormatter({
        includeStatusIcons: false,
      });
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = noIconFormatter.format(run);

      expect(result).not.toContain("✅");
      expect(result).toContain("### User logs in successfully");
    });

    it("should show pending icon for pending tests", () => {
      const raw = createRawRun({
        testCases: [
          createTestCase({
            status: "pending",
          }),
        ],
      });
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toContain("📝");
    });
  });

  describe("errors", () => {
    it("should include error details for failed tests", () => {
      const raw = createRawRun({ testCases: [createFailingTestCase()] });
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toContain("**Failure**");
      expect(result).toContain("```text");
      expect(result).toContain("Expected error message to be visible");
    });

    it("should not include errors when includeErrors is false", () => {
      const noErrorFormatter = new MarkdownFormatter({ includeErrors: false });
      const raw = createRawRun({ testCases: [createFailingTestCase()] });
      const run = canonicalizeRun(raw);
      const result = noErrorFormatter.format(run);

      expect(result).not.toContain("**Failure**");
    });

    it("should preserve timeout/interrupted outcome metadata", () => {
      const timeoutRaw = createRawRun({
        testCases: [createTestCase({ status: "timeout" })],
      });
      const timeoutRun = canonicalizeRun(timeoutRaw);
      const timeoutResult = formatter.format(timeoutRun);
      expect(timeoutResult).toContain("Outcome: `timeout`");

      const interruptedRaw = createRawRun({
        testCases: [createTestCase({ status: "interrupted" })],
      });
      const interruptedRun = canonicalizeRun(interruptedRaw);
      const interruptedResult = formatter.format(interruptedRun);
      expect(interruptedResult).toContain("Outcome: `interrupted`");
    });
  });

  describe("grouping", () => {
    it("should group by file by default", () => {
      const raw = createMultiFileRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toContain("## src/auth/login.test.ts");
      expect(result).toContain("## src/auth/logout.test.ts");
      expect(result).toContain("## src/dashboard/stats.test.ts");
    });

    it("should not show file headers when groupBy is none", () => {
      const flatFormatter = new MarkdownFormatter({ groupBy: "none" });
      const raw = createMultiFileRun();
      const run = canonicalizeRun(raw);
      const result = flatFormatter.format(run);

      expect(result).not.toContain("## src/");
    });
  });

  describe("step style", () => {
    it("should use bullets by default", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toContain("- **Given**");
    });

    it("should use gherkin style when configured", () => {
      const gherkinFormatter = new MarkdownFormatter({ stepStyle: "gherkin" });
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = gherkinFormatter.format(run);

      expect(result).toContain("**Given** user is on login page");
      expect(result).not.toContain("- **Given**");
    });
  });

  describe("heading level", () => {
    it("should use ### for scenarios by default", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toContain("### ✅ User logs in successfully");
    });

    it("should use custom heading level", () => {
      const h4Formatter = new MarkdownFormatter({ scenarioHeadingLevel: 4 });
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = h4Formatter.format(run);

      expect(result).toContain("#### ✅ User logs in successfully");
    });
  });

  describe("title", () => {
    it("should use custom title", () => {
      const customFormatter = new MarkdownFormatter({ title: "Test Report" });
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = customFormatter.format(run);

      expect(result).toContain("# Test Report");
    });
  });

  describe("metadata", () => {
    it("should not include metadata when includeMetadata is false", () => {
      const noMetaFormatter = new MarkdownFormatter({
        includeMetadata: false,
      });
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const result = noMetaFormatter.format(run);

      expect(result).not.toContain("| Key | Value |");
    });
  });

  describe("multiple scenarios", () => {
    it("should include all scenarios", () => {
      const raw = createMultipleTestCasesRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toContain("User logs in successfully");
      expect(result).toContain("User login fails with invalid password");
      expect(result).toContain("User can reset password");
    });

    it("should show correct icons for each status", () => {
      const raw = createMultipleTestCasesRun();
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toContain("✅"); // passed
      expect(result).toContain("❌"); // failed
      expect(result).toContain("⏩"); // skipped
    });
  });

  describe("children rendering", () => {
    it("should render children indented under a parent doc entry", () => {
      const raw = createRawRun({
        testCases: [
          createTestCase({
            story: createStory({
              steps: [
                {
                  keyword: "Given",
                  text: "payment is processed",
                  docs: [
                    {
                      kind: "note",
                      text: "Payment processed",
                      phase: "static" as const,
                      children: [
                        {
                          kind: "kv" as const,
                          label: "Amount",
                          value: "$49",
                          phase: "static" as const,
                        },
                        {
                          kind: "kv" as const,
                          label: "Currency",
                          value: "USD",
                          phase: "static" as const,
                        },
                      ],
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

      // Parent note should be present
      expect(result).toContain("> Payment processed");
      // Children should be indented under the parent
      expect(result).toContain("  - **Amount:** $49");
      expect(result).toContain("  - **Currency:** USD");
    });

    it("should render nested children with increasing indent", () => {
      const raw = createRawRun({
        testCases: [
          createTestCase({
            story: createStory({
              steps: [
                {
                  keyword: "Given",
                  text: "order details",
                  docs: [
                    {
                      kind: "note",
                      text: "Order summary",
                      phase: "static" as const,
                      children: [
                        {
                          kind: "note" as const,
                          text: "Line items",
                          phase: "static" as const,
                          children: [
                            {
                              kind: "kv" as const,
                              label: "Item",
                              value: "Widget",
                              phase: "static" as const,
                            },
                          ],
                        },
                      ],
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

      expect(result).toContain("> Order summary");
      expect(result).toContain("  > Line items");
      expect(result).toContain("    - **Item:** Widget");
    });
  });

  describe("ticket rendering", () => {
    it("should render ticket with explicit url as a link", () => {
      const raw = createRawRun({
        testCases: [
          createTestCase({
            story: createStory({
              tickets: [{ id: "PROJ-42", url: "https://tracker.example.com/PROJ-42" }],
            }),
          }),
        ],
      });
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toContain("[PROJ-42](https://tracker.example.com/PROJ-42)");
    });

    it("should prefer explicit url over ticketUrlTemplate", () => {
      const templateFormatter = new MarkdownFormatter({
        ticketUrlTemplate: "https://jira.example.com/browse/{ticket}",
      });
      const raw = createRawRun({
        testCases: [
          createTestCase({
            story: createStory({
              tickets: [{ id: "PROJ-42", url: "https://custom.example.com/PROJ-42" }],
            }),
          }),
        ],
      });
      const run = canonicalizeRun(raw);
      const result = templateFormatter.format(run);

      // Explicit url should win over template
      expect(result).toContain("[PROJ-42](https://custom.example.com/PROJ-42)");
      expect(result).not.toContain("jira.example.com");
    });

    it("should use ticketUrlTemplate when no explicit url", () => {
      const templateFormatter = new MarkdownFormatter({
        ticketUrlTemplate: "https://jira.example.com/browse/{ticket}",
      });
      const raw = createRawRun({
        testCases: [
          createTestCase({
            story: createStory({
              tickets: [{ id: "PROJ-42" }],
            }),
          }),
        ],
      });
      const run = canonicalizeRun(raw);
      const result = templateFormatter.format(run);

      expect(result).toContain("[PROJ-42](https://jira.example.com/browse/PROJ-42)");
    });

    it("should render ticket as inline code when no url and no template", () => {
      const raw = createRawRun({
        testCases: [
          createTestCase({
            story: createStory({
              tickets: [{ id: "PROJ-42" }],
            }),
          }),
        ],
      });
      const run = canonicalizeRun(raw);
      const result = formatter.format(run);

      expect(result).toContain("`PROJ-42`");
    });
  });
});
