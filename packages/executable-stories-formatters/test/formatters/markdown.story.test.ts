import { describe, it, expect } from "vitest";
import { story } from "executable-stories-vitest";
import { MarkdownFormatter } from "../../src/formatters/markdown";
import { canonicalizeRun } from "../../src/converters/acl/index";
import {
  createRawRun,
  createFailingTestCase,
  createMultipleTestCasesRun,
  createTestCase,
  createStory,
} from "../fixtures/raw-runs/basic";

describe("Markdown Formatter", () => {
  const formatter = new MarkdownFormatter();

  it("renders a passing scenario with steps and metadata", ({ task }) => {
    story.init(task);

    story.given("a raw run with a passing login scenario");
    const raw = createRawRun();
    const run = canonicalizeRun(raw);

    story.when("formatted as markdown");
    const result = formatter.format(run);

    story.then("it includes the report title");
    expect(result).toContain("# User Stories");

    story.and("the scenario heading shows a pass icon");
    expect(result).toContain("### ✅ User logs in successfully");

    story.and("steps are rendered as bullet points with bold keywords");
    expect(result).toContain("- **Given** user is on login page");
    expect(result).toContain("- **When** user enters valid credentials");
    expect(result).toContain("- **Then** user sees dashboard");

    story.and("tags and tickets are included");
    expect(result).toContain("Tags: `auth`, `login`");
    expect(result).toContain("Tickets: `JIRA-123`");
  });

  it("renders inline documentation attached to steps", ({ task }) => {
    story.init(task);

    story.given("a scenario with note, code, and table docs on a step");
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

    story.when("formatted as markdown");
    const result = formatter.format(run);

    story.then("the note renders as a blockquote");
    expect(result).toContain("> Always start here");

    story.and("the code block renders with language annotation");
    expect(result).toContain("**Request**");
    expect(result).toContain("```http");
    expect(result).toContain("POST /login");

    story.and("the table renders with headers and data");
    expect(result).toContain("**Credentials**");
    expect(result).toContain("| user | pass |");
    expect(result).toContain("| alice | secret |");
  });

  it("shows failure details for failing scenarios", ({ task }) => {
    story.init(task);

    story.given("a run with a failing test case");
    const raw = createRawRun({ testCases: [createFailingTestCase()] });
    const run = canonicalizeRun(raw);

    story.when("formatted as markdown");
    const result = formatter.format(run);

    story.then("the scenario heading shows a fail icon");
    expect(result).toContain("❌");

    story.and("the error message is included in a code block");
    expect(result).toContain("**Failure**");
    expect(result).toContain("Expected error message to be visible");
  });

  it("renders mixed-status runs with correct icons per scenario", ({ task }) => {
    story.init(task);

    story.given("a run with passed, failed, and skipped scenarios");
    const raw = createMultipleTestCasesRun();
    const run = canonicalizeRun(raw);

    story.when("formatted as markdown");
    const result = formatter.format(run);

    story.then("each scenario has its correct status icon");
    expect(result).toContain("✅"); // passed
    expect(result).toContain("❌"); // failed
    expect(result).toContain("⏩"); // skipped
  });
});
