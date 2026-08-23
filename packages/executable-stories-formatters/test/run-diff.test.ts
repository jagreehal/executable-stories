import { describe, expect, it } from "vitest";

import { diffRuns } from "../src/compare/diff-runs";
import { createPrCommentSummary } from "../src/compare/pr-summary";
import {
  behaviourFingerprint,
  behaviourSimilarity,
} from "executable-stories-core/converters/acl/ids";
import { RunDiffChangelogFormatter } from "../src/formatters/run-diff-changelog";
import { RunDiffHtmlFormatter } from "../src/formatters/run-diff-html";
import { RunDiffMarkdownFormatter } from "../src/formatters/run-diff-markdown";
import { stubs } from "./stubs";

describe("run diff", () => {
  it("classifies added, removed, regressed, fixed, and changed scenarios", () => {
    const baseline = stubs.testRunResult({
      startedAtMs: 1000,
      finishedAtMs: 2000,
      testCases: [
        stubs.testCaseResult({
          id: "regressed",
          sourceFile: "src/auth.story.test.ts",
          sourceLine: 10,
          status: "passed",
          story: stubs.storyMeta({ scenario: "Regression case", docs: [] }),
          tags: ["auth"],
        }),
        stubs.testCaseResult({
          id: "fixed",
          sourceFile: "src/auth.story.test.ts",
          sourceLine: 20,
          status: "failed",
          errorMessage: "old error",
          story: stubs.storyMeta({ scenario: "Fixed case", docs: [] }),
          tags: ["auth"],
        }),
        stubs.testCaseResult({
          id: "removed",
          sourceFile: "src/legacy.story.test.ts",
          sourceLine: 30,
          status: "passed",
          story: stubs.storyMeta({ scenario: "Removed case", docs: [] }),
          tags: ["legacy"],
        }),
        stubs.testCaseResult({
          id: "changed",
          sourceFile: "src/docs.story.test.ts",
          sourceLine: 40,
          status: "passed",
          story: stubs.storyMeta({
            scenario: "Changed case",
            docs: [stubs.noteEntry({ text: "before" })],
          }),
          tags: ["docs"],
        }),
      ],
    });

    const current = stubs.testRunResult({
      startedAtMs: 3000,
      finishedAtMs: 4000,
      testCases: [
        stubs.testCaseResult({
          id: "regressed",
          sourceFile: "src/auth.story.test.ts",
          sourceLine: 10,
          status: "failed",
          errorMessage: "new failure",
          story: stubs.storyMeta({ scenario: "Regression case", docs: [] }),
          tags: ["auth"],
        }),
        stubs.testCaseResult({
          id: "fixed",
          sourceFile: "src/auth.story.test.ts",
          sourceLine: 20,
          status: "passed",
          story: stubs.storyMeta({ scenario: "Fixed case", docs: [] }),
          tags: ["auth"],
        }),
        stubs.testCaseResult({
          id: "added",
          sourceFile: "src/new.story.test.ts",
          sourceLine: 50,
          status: "passed",
          story: stubs.storyMeta({ scenario: "Added case", docs: [] }),
          tags: ["new"],
        }),
        stubs.testCaseResult({
          id: "changed",
          sourceFile: "src/docs.story.test.ts",
          sourceLine: 40,
          status: "passed",
          story: stubs.storyMeta({
            scenario: "Changed case",
            docs: [stubs.noteEntry({ text: "after" })],
          }),
          tags: ["docs", "review"],
        }),
      ],
    });

    const diff = diffRuns(baseline, current);

    expect(diff.summary).toMatchObject({
      added: 1,
      removed: 1,
      regressed: 1,
      fixed: 1,
      changed: 1,
      unchanged: 0,
    });

    expect(diff.scenarios.map((scenario) => scenario.kind)).toEqual([
      "regressed",
      "fixed",
      "added",
      "removed",
      "changed",
    ]);

    const changed = diff.scenarios.find((scenario) => scenario.id === "changed");
    expect(changed?.changedFields).toContain("docs");
    expect(changed?.changedFields).toContain("tags");
  });

  it("renders review-oriented markdown and html reports", () => {
    const baseline = stubs.testRunResult({
      startedAtMs: 1000,
      finishedAtMs: 2000,
      testCases: [
        stubs.testCaseResult({
          id: "same",
          sourceFile: "src/payments.story.test.ts",
          sourceLine: 12,
          status: "passed",
          story: stubs.storyMeta({ scenario: "Payment works", docs: [] }),
        }),
      ],
    });
    const current = stubs.testRunResult({
      startedAtMs: 3000,
      finishedAtMs: 4000,
      testCases: [
        stubs.testCaseResult({
          id: "same",
          sourceFile: "src/payments.story.test.ts",
          sourceLine: 12,
          status: "failed",
          errorMessage: "Expected success",
          story: stubs.storyMeta({ scenario: "Payment works", docs: [] }),
        }),
      ],
    });

    const diff = diffRuns(baseline, current);

    const markdown = new RunDiffMarkdownFormatter({ title: "Review Diff" }).format(diff);
    expect(markdown).toContain("# Review Diff");
    expect(markdown).toContain("## Review Priority");
    expect(markdown).toContain("## Regressed (1)");
    expect(markdown).toContain("`passed` -> `failed`");

    const html = new RunDiffHtmlFormatter({ title: "Review Diff" }).format(diff);
    expect(html).toContain("<title>Review Diff</title>");
    expect(html).toContain("Priority Review");
    expect(html).toContain('data-filter="regressed"');
    expect(html).toContain('class="active" data-filter="regressed"');
    expect(html).toContain("Payment works");
    expect(html).toContain("status");
  });

  it("renders a regression storyboard from step screenshots for status flips only", () => {
    const shotSteps = [
      { keyword: "When" as const, text: "pays by card", docs: [{ kind: "screenshot" as const, path: "data:image/png;base64,abc", alt: "Payment form", phase: "runtime" as const }] },
      { keyword: "Then" as const, text: "sees confirmation", docs: [{ kind: "screenshot" as const, path: "/tmp/local-only.png", phase: "runtime" as const }] },
    ];
    const baseline = stubs.testRunResult({
      startedAtMs: 1000,
      finishedAtMs: 2000,
      testCases: [
        stubs.testCaseResult({
          id: "flip",
          sourceFile: "src/pay.story.test.ts",
          sourceLine: 1,
          status: "passed",
          story: stubs.storyMeta({ scenario: "Pays by card", docs: [], steps: shotSteps }),
        }),
        stubs.testCaseResult({
          id: "steady",
          sourceFile: "src/pay.story.test.ts",
          sourceLine: 9,
          status: "passed",
          story: stubs.storyMeta({ scenario: "Steady case", docs: [stubs.noteEntry({ text: "before" })], steps: shotSteps }),
        }),
      ],
    });
    const current = stubs.testRunResult({
      startedAtMs: 3000,
      finishedAtMs: 4000,
      testCases: [
        stubs.testCaseResult({
          id: "flip",
          sourceFile: "src/pay.story.test.ts",
          sourceLine: 1,
          status: "failed",
          errorMessage: "boom",
          story: stubs.storyMeta({ scenario: "Pays by card", docs: [], steps: shotSteps }),
        }),
        stubs.testCaseResult({
          id: "steady",
          sourceFile: "src/pay.story.test.ts",
          sourceLine: 9,
          status: "passed",
          story: stubs.storyMeta({ scenario: "Steady case", docs: [stubs.noteEntry({ text: "after" })], steps: shotSteps }),
        }),
      ],
    });

    const html = new RunDiffHtmlFormatter({ title: "Review Diff" }).format(diffRuns(baseline, current));
    // The regressed scenario gets a filmstrip with the renderable frame only.
    expect(html).toContain('class="storyboard"');
    expect(html).toContain('src="data:image/png;base64,abc"');
    expect(html).not.toContain("local-only.png\" "); // local fs path contributes no frame
    // One storyboard: the changed-but-not-flipped scenario doesn't get one.
    expect(html.match(/class="storyboard"/g)).toHaveLength(1);
  });

  it("includes before/after DSL content in compare reports when steps or docs change", () => {
    const baseline = stubs.testRunResult({
      startedAtMs: 1000,
      finishedAtMs: 2000,
      testCases: [
        stubs.testCaseResult({
          id: "dsl-change",
          sourceFile: "src/docs.story.test.ts",
          sourceLine: 15,
          status: "passed",
          durationMs: 100,
          story: stubs.storyMeta({
            scenario: "DSL content changes",
            tags: [],
            suitePath: [],
            docs: [stubs.noteEntry({ text: "baseline note" })],
            steps: [
              stubs.step({ keyword: "Given", text: "a baseline step" }),
              stubs.step({ keyword: "Then", text: "the baseline result is shown" }),
            ],
          }),
        }),
      ],
    });

    const current = stubs.testRunResult({
      startedAtMs: 3000,
      finishedAtMs: 4000,
      testCases: [
        stubs.testCaseResult({
          id: "dsl-change",
          sourceFile: "src/docs.story.test.ts",
          sourceLine: 15,
          status: "passed",
          durationMs: 100,
          story: stubs.storyMeta({
            scenario: "DSL content changes",
            tags: [],
            suitePath: [],
            docs: [stubs.noteEntry({ text: "current note" })],
            steps: [
              stubs.step({ keyword: "Given", text: "an updated step" }),
              stubs.step({ keyword: "Then", text: "the updated result is shown" }),
            ],
          }),
        }),
      ],
    });

    const diff = diffRuns(baseline, current);

    const markdown = new RunDiffMarkdownFormatter({ title: "Review Diff" }).format(diff);
    expect(markdown).toContain("baseline note");
    expect(markdown).toContain("current note");
    expect(markdown).toContain("a baseline step");
    expect(markdown).toContain("an updated step");

    const html = new RunDiffHtmlFormatter({ title: "Review Diff" }).format(diff);
    expect(html).toContain("baseline note");
    expect(html).toContain("current note");
    expect(html).toContain("a baseline step");
    expect(html).toContain("an updated step");
  });

  it("includes step-level doc changes in compare reports", () => {
    const baseline = stubs.testRunResult({
      startedAtMs: 1000,
      finishedAtMs: 2000,
      testCases: [
        stubs.testCaseResult({
          id: "step-doc-change",
          sourceFile: "src/step-docs.story.test.ts",
          sourceLine: 25,
          status: "passed",
          durationMs: 100,
          story: stubs.storyMeta({
            scenario: "Step docs change",
            tags: [],
            suitePath: [],
            docs: [],
            steps: [
              stubs.step({
                keyword: "Given",
                text: "a user starts checkout",
                docs: [stubs.noteEntry({ text: "baseline step note" })],
              }),
            ],
          }),
        }),
      ],
    });

    const current = stubs.testRunResult({
      startedAtMs: 3000,
      finishedAtMs: 4000,
      testCases: [
        stubs.testCaseResult({
          id: "step-doc-change",
          sourceFile: "src/step-docs.story.test.ts",
          sourceLine: 25,
          status: "passed",
          durationMs: 100,
          story: stubs.storyMeta({
            scenario: "Step docs change",
            tags: [],
            suitePath: [],
            docs: [],
            steps: [
              stubs.step({
                keyword: "Given",
                text: "a user starts checkout",
                docs: [stubs.noteEntry({ text: "current step note" })],
              }),
            ],
          }),
        }),
      ],
    });

    const diff = diffRuns(baseline, current);

    const markdown = new RunDiffMarkdownFormatter({ title: "Review Diff" }).format(diff);
    expect(markdown).toContain("baseline step note");
    expect(markdown).toContain("current step note");

    const html = new RunDiffHtmlFormatter({ title: "Review Diff" }).format(diff);
    expect(html).toContain("baseline step note");
    expect(html).toContain("current step note");
  });

  it("preserves structured kv doc values in compare reports", () => {
    const baseline = stubs.testRunResult({
      startedAtMs: 1000,
      finishedAtMs: 2000,
      testCases: [
        stubs.testCaseResult({
          id: "kv-doc-change",
          sourceFile: "src/kv-docs.story.test.ts",
          sourceLine: 35,
          status: "passed",
          durationMs: 100,
          story: stubs.storyMeta({
            scenario: "Structured kv docs",
            tags: [],
            suitePath: [],
            docs: [
              { kind: "kv", label: "Payload", value: { id: 1, ok: true }, phase: "static" },
            ],
            steps: [],
          }),
        }),
      ],
    });

    const current = stubs.testRunResult({
      startedAtMs: 3000,
      finishedAtMs: 4000,
      testCases: [
        stubs.testCaseResult({
          id: "kv-doc-change",
          sourceFile: "src/kv-docs.story.test.ts",
          sourceLine: 35,
          status: "passed",
          durationMs: 100,
          story: stubs.storyMeta({
            scenario: "Structured kv docs",
            tags: [],
            suitePath: [],
            docs: [
              { kind: "kv", label: "Payload", value: { id: 2, ok: false }, phase: "static" },
            ],
            steps: [],
          }),
        }),
      ],
    });

    const diff = diffRuns(baseline, current);

    const markdown = new RunDiffMarkdownFormatter({ title: "Review Diff" }).format(diff);
    expect(markdown).toContain('"id":1');
    expect(markdown).toContain('"id":2');
    expect(markdown).not.toContain("[object Object]");

    const html = new RunDiffHtmlFormatter({ title: "Review Diff" }).format(diff);
    expect(html).toContain('&quot;id&quot;:1');
    expect(html).toContain('&quot;id&quot;:2');
    expect(html).not.toContain("[object Object]");
  });

  it("shows DSL content for added scenarios in compare reports", () => {
    const baseline = stubs.testRunResult({
      startedAtMs: 1000,
      finishedAtMs: 2000,
      testCases: [],
    });

    const current = stubs.testRunResult({
      startedAtMs: 3000,
      finishedAtMs: 4000,
      testCases: [
        stubs.testCaseResult({
          id: "added-story",
          sourceFile: "src/added.story.test.ts",
          sourceLine: 45,
          status: "passed",
          durationMs: 100,
          story: stubs.storyMeta({
            scenario: "Added story content",
            tags: [],
            suitePath: [],
            docs: [stubs.noteEntry({ text: "new story note" })],
            steps: [
              stubs.step({ keyword: "Given", text: "a new setup step" }),
              stubs.step({ keyword: "Then", text: "a new outcome is documented" }),
            ],
          }),
        }),
      ],
    });

    const diff = diffRuns(baseline, current);

    const markdown = new RunDiffMarkdownFormatter({ title: "Review Diff" }).format(diff);
    expect(markdown).toContain("new story note");
    expect(markdown).toContain("a new setup step");
    expect(markdown).toContain("a new outcome is documented");

    const html = new RunDiffHtmlFormatter({ title: "Review Diff" }).format(diff);
    expect(html).toContain("new story note");
    expect(html).toContain("a new setup step");
    expect(html).toContain("a new outcome is documented");
  });

  it("shows table doc content changes in compare reports", () => {
    const baseline = stubs.testRunResult({
      startedAtMs: 1000,
      finishedAtMs: 2000,
      testCases: [
        stubs.testCaseResult({
          id: "table-doc-change",
          sourceFile: "src/table-docs.story.test.ts",
          sourceLine: 55,
          status: "passed",
          durationMs: 100,
          story: stubs.storyMeta({
            scenario: "Table docs change",
            tags: [],
            suitePath: [],
            docs: [
              {
                kind: "table",
                label: "Users",
                columns: ["name", "role"],
                rows: [["alice", "admin"]],
                phase: "static",
              },
            ],
            steps: [],
          }),
        }),
      ],
    });

    const current = stubs.testRunResult({
      startedAtMs: 3000,
      finishedAtMs: 4000,
      testCases: [
        stubs.testCaseResult({
          id: "table-doc-change",
          sourceFile: "src/table-docs.story.test.ts",
          sourceLine: 55,
          status: "passed",
          durationMs: 100,
          story: stubs.storyMeta({
            scenario: "Table docs change",
            tags: [],
            suitePath: [],
            docs: [
              {
                kind: "table",
                label: "Users",
                columns: ["name", "role"],
                rows: [["bob", "viewer"]],
                phase: "static",
              },
            ],
            steps: [],
          }),
        }),
      ],
    });

    const diff = diffRuns(baseline, current);

    const markdown = new RunDiffMarkdownFormatter({ title: "Review Diff" }).format(diff);
    expect(markdown).toContain("alice");
    expect(markdown).toContain("admin");
    expect(markdown).toContain("bob");
    expect(markdown).toContain("viewer");

    const html = new RunDiffHtmlFormatter({ title: "Review Diff" }).format(diff);
    expect(html).toContain("alice");
    expect(html).toContain("admin");
    expect(html).toContain("bob");
    expect(html).toContain("viewer");
  });

  it("shows tags for added scenarios in compare reports", () => {
    const baseline = stubs.testRunResult({
      startedAtMs: 1000,
      finishedAtMs: 2000,
      testCases: [],
    });

    const current = stubs.testRunResult({
      startedAtMs: 3000,
      finishedAtMs: 4000,
      testCases: [
        stubs.testCaseResult({
          id: "added-tags",
          sourceFile: "src/added-tags.story.test.ts",
          sourceLine: 65,
          status: "passed",
          durationMs: 100,
          tags: ["smoke", "release"],
          story: stubs.storyMeta({
            scenario: "Added tagged story",
            tags: ["smoke", "release"],
            suitePath: [],
            docs: [],
            steps: [],
          }),
        }),
      ],
    });

    const diff = diffRuns(baseline, current);

    const markdown = new RunDiffMarkdownFormatter({ title: "Review Diff" }).format(diff);
    expect(markdown).toContain("smoke");
    expect(markdown).toContain("release");

    const html = new RunDiffHtmlFormatter({ title: "Review Diff" }).format(diff);
    expect(html).toContain("smoke");
    expect(html).toContain("release");
  });

  it("detects ticket-only story metadata changes", () => {
    const baseline = stubs.testRunResult({
      startedAtMs: 1000,
      finishedAtMs: 2000,
      testCases: [
        stubs.testCaseResult({
          id: "ticket-change",
          sourceFile: "src/tickets.story.test.ts",
          sourceLine: 75,
          status: "passed",
          durationMs: 100,
          story: stubs.storyMeta({
            scenario: "Ticket metadata changes",
            tags: [],
            suitePath: [],
            tickets: [{ id: "JIRA-101" }],
            docs: [],
            steps: [],
          }),
        }),
      ],
    });

    const current = stubs.testRunResult({
      startedAtMs: 3000,
      finishedAtMs: 4000,
      testCases: [
        stubs.testCaseResult({
          id: "ticket-change",
          sourceFile: "src/tickets.story.test.ts",
          sourceLine: 75,
          status: "passed",
          durationMs: 100,
          story: stubs.storyMeta({
            scenario: "Ticket metadata changes",
            tags: [],
            suitePath: [],
            tickets: [{ id: "JIRA-202" }],
            docs: [],
            steps: [],
          }),
        }),
      ],
    });

    const diff = diffRuns(baseline, current);
    const scenario = diff.scenarios.find((item) => item.id === "ticket-change");

    expect(scenario?.kind).toBe("changed");
    expect(scenario?.changedFields).toContain("tickets");

    const markdown = new RunDiffMarkdownFormatter({ title: "Review Diff" }).format(diff);
    expect(markdown).toContain("JIRA-101");
    expect(markdown).toContain("JIRA-202");

    const html = new RunDiffHtmlFormatter({ title: "Review Diff" }).format(diff);
    expect(html).toContain("JIRA-101");
    expect(html).toContain("JIRA-202");
  });

  it("shows mermaid doc code changes in compare reports", () => {
    const baseline = stubs.testRunResult({
      startedAtMs: 1000,
      finishedAtMs: 2000,
      testCases: [
        stubs.testCaseResult({
          id: "mermaid-doc-change",
          sourceFile: "src/mermaid.story.test.ts",
          sourceLine: 85,
          status: "passed",
          durationMs: 100,
          story: stubs.storyMeta({
            scenario: "Mermaid docs change",
            tags: [],
            tickets: [],
            suitePath: [],
            docs: [
              {
                kind: "mermaid",
                title: "Flow",
                code: `graph TD
A-->B`,
                phase: "static",
              },
            ],
            steps: [],
          }),
        }),
      ],
    });

    const current = stubs.testRunResult({
      startedAtMs: 3000,
      finishedAtMs: 4000,
      testCases: [
        stubs.testCaseResult({
          id: "mermaid-doc-change",
          sourceFile: "src/mermaid.story.test.ts",
          sourceLine: 85,
          status: "passed",
          durationMs: 100,
          story: stubs.storyMeta({
            scenario: "Mermaid docs change",
            tags: [],
            tickets: [],
            suitePath: [],
            docs: [
              {
                kind: "mermaid",
                title: "Flow",
                code: `graph TD
A-->C`,
                phase: "static",
              },
            ],
            steps: [],
          }),
        }),
      ],
    });

    const diff = diffRuns(baseline, current);

    const markdown = new RunDiffMarkdownFormatter({ title: "Review Diff" }).format(diff);
    expect(markdown).toContain("A-->B");
    expect(markdown).toContain("A-->C");

    const html = new RunDiffHtmlFormatter({ title: "Review Diff" }).format(diff);
    expect(html).toContain("A--&gt;B");
    expect(html).toContain("A--&gt;C");
  });

  it("shows code doc language changes in compare reports", () => {
    const baseline = stubs.testRunResult({
      startedAtMs: 1000,
      finishedAtMs: 2000,
      testCases: [
        stubs.testCaseResult({
          id: "code-lang-change",
          sourceFile: "src/code-lang.story.test.ts",
          sourceLine: 95,
          status: "passed",
          durationMs: 100,
          story: stubs.storyMeta({
            scenario: "Code language changes",
            tags: [],
            tickets: [],
            suitePath: [],
            docs: [
              {
                kind: "code",
                label: "Example",
                content: "const x = 1;",
                lang: "ts",
                phase: "static",
              },
            ],
            steps: [],
          }),
        }),
      ],
    });

    const current = stubs.testRunResult({
      startedAtMs: 3000,
      finishedAtMs: 4000,
      testCases: [
        stubs.testCaseResult({
          id: "code-lang-change",
          sourceFile: "src/code-lang.story.test.ts",
          sourceLine: 95,
          status: "passed",
          durationMs: 100,
          story: stubs.storyMeta({
            scenario: "Code language changes",
            tags: [],
            tickets: [],
            suitePath: [],
            docs: [
              {
                kind: "code",
                label: "Example",
                content: "const x = 1;",
                lang: "js",
                phase: "static",
              },
            ],
            steps: [],
          }),
        }),
      ],
    });

    const diff = diffRuns(baseline, current);

    const markdown = new RunDiffMarkdownFormatter({ title: "Review Diff" }).format(diff);
    expect(markdown).toContain("ts");
    expect(markdown).toContain("js");

    const html = new RunDiffHtmlFormatter({ title: "Review Diff" }).format(diff);
    expect(html).toContain("ts");
    expect(html).toContain("js");
  });

  it("shows screenshot path changes in compare reports", () => {
    const baseline = stubs.testRunResult({
      startedAtMs: 1000,
      finishedAtMs: 2000,
      testCases: [
        stubs.testCaseResult({
          id: "screenshot-change",
          sourceFile: "src/screenshot.story.test.ts",
          sourceLine: 105,
          status: "passed",
          durationMs: 100,
          story: stubs.storyMeta({
            scenario: "Screenshot changes",
            tags: [],
            tickets: [],
            suitePath: [],
            docs: [
              {
                kind: "screenshot",
                path: "/tmp/before.png",
                alt: "Checkout screen",
                phase: "static",
              },
            ],
            steps: [],
          }),
        }),
      ],
    });

    const current = stubs.testRunResult({
      startedAtMs: 3000,
      finishedAtMs: 4000,
      testCases: [
        stubs.testCaseResult({
          id: "screenshot-change",
          sourceFile: "src/screenshot.story.test.ts",
          sourceLine: 105,
          status: "passed",
          durationMs: 100,
          story: stubs.storyMeta({
            scenario: "Screenshot changes",
            tags: [],
            tickets: [],
            suitePath: [],
            docs: [
              {
                kind: "screenshot",
                path: "/tmp/after.png",
                alt: "Checkout screen",
                phase: "static",
              },
            ],
            steps: [],
          }),
        }),
      ],
    });

    const diff = diffRuns(baseline, current);

    const markdown = new RunDiffMarkdownFormatter({ title: "Review Diff" }).format(diff);
    expect(markdown).toContain("before.png");
    expect(markdown).toContain("after.png");

    const html = new RunDiffHtmlFormatter({ title: "Review Diff" }).format(diff);
    expect(html).toContain("before.png");
    expect(html).toContain("after.png");
  });

  it("tracks rich changed fields for added scenarios", () => {
    const baseline = stubs.testRunResult({
      startedAtMs: 1000,
      finishedAtMs: 2000,
      testCases: [],
    });

    const current = stubs.testRunResult({
      startedAtMs: 3000,
      finishedAtMs: 4000,
      testCases: [
        stubs.testCaseResult({
          id: "added-rich-fields",
          sourceFile: "src/added-rich.story.test.ts",
          sourceLine: 115,
          status: "passed",
          durationMs: 100,
          tags: ["smoke"],
          story: stubs.storyMeta({
            scenario: "Added rich story",
            tags: ["smoke"],
            tickets: [{ id: "JIRA-303" }],
            suitePath: [],
            docs: [stubs.noteEntry({ text: "new note" })],
            steps: [stubs.step({ keyword: "Given", text: "a new step" })],
          }),
        }),
      ],
    });

    const diff = diffRuns(baseline, current);
    const scenario = diff.scenarios.find((item) => item.id === "added-rich-fields");

    expect(scenario?.kind).toBe("added");
    expect(scenario?.changedFields).toContain("steps");
    expect(scenario?.changedFields).toContain("docs");
    expect(scenario?.changedFields).toContain("tags");
    expect(scenario?.changedFields).toContain("tickets");

    const markdown = new RunDiffMarkdownFormatter({ title: "Review Diff" }).format(diff);
    expect(markdown).toContain("`steps`");
    expect(markdown).toContain("`docs`");
    expect(markdown).toContain("`tags`");
    expect(markdown).toContain("`tickets`");
  });

  it("creates a PR-friendly summary that prioritizes regressions", () => {
    const baseline = stubs.testRunResult({
      startedAtMs: 1000,
      finishedAtMs: 2000,
      testCases: [
        stubs.testCaseResult({
          id: "regressed",
          sourceFile: "src/auth.story.test.ts",
          sourceLine: 10,
          status: "passed",
          story: stubs.storyMeta({ scenario: "Regression case", docs: [] }),
        }),
      ],
    });
    const current = stubs.testRunResult({
      startedAtMs: 3000,
      finishedAtMs: 4000,
      testCases: [
        stubs.testCaseResult({
          id: "regressed",
          sourceFile: "src/auth.story.test.ts",
          sourceLine: 10,
          status: "failed",
          errorMessage: "Expected failure",
          story: stubs.storyMeta({ scenario: "Regression case", docs: [] }),
        }),
      ],
    });

    const summary = createPrCommentSummary(diffRuns(baseline, current));

    expect(summary).toContain("## Executable Stories Review Summary");
    expect(summary).toContain("Priority signal: 1 regressed");
    expect(summary).toContain("Regressions detected");
  });
});

describe("behaviour identity (rename / move)", () => {
  const steps = (...texts: string[]) =>
    texts.map((text, i) =>
      stubs.step({ keyword: i === 0 ? "Given" : i === texts.length - 1 ? "Then" : "When", text })
    );

  const story = (scenario: string, stepTexts: string[]) =>
    stubs.storyMeta({
      scenario,
      tags: [],
      tickets: [],
      suitePath: [],
      docs: [],
      steps: steps(...stepTexts),
    });

  // A renamed test gets a new derived id (id = hash(file + title)), so without identity
  // re-matching a pure rename shows up as a false removed + added — which fails the release
  // gate. These tests pin the conservative re-identification that defuses that.

  it("classifies a renamed scenario (same content, new title) as `renamed`, not removed+added", () => {
    const content = ["a registered user exists", "they sign in", "the dashboard is shown"];
    const baseline = stubs.testRunResult({
      testCases: [
        stubs.testCaseResult({
          id: "id-before",
          sourceFile: "src/auth.story.test.ts",
          sourceLine: 10,
          status: "passed",
          story: story("User logs in", content),
        }),
      ],
    });
    const current = stubs.testRunResult({
      testCases: [
        stubs.testCaseResult({
          id: "id-after",
          sourceFile: "src/auth.story.test.ts",
          sourceLine: 10,
          status: "passed",
          story: story("User signs in successfully", content),
        }),
      ],
    });

    const diff = diffRuns(baseline, current);

    expect(diff.summary).toMatchObject({ renamed: 1, moved: 0, added: 0, removed: 0 });
    const renamed = diff.scenarios.find((s) => s.kind === "renamed");
    expect(renamed?.previousId).toBe("id-before");
    expect(renamed?.id).toBe("id-after");
    expect(renamed?.matchedBy).toBe("fingerprint");
    expect(renamed?.matchConfidence).toBe(1);
  });

  it("classifies a moved scenario (same content + title, new file) as `moved`", () => {
    const content = ["a paid order", "a refund is requested", "money is returned"];
    const baseline = stubs.testRunResult({
      testCases: [
        stubs.testCaseResult({
          id: "id-old-file",
          sourceFile: "src/legacy/payments.story.test.ts",
          sourceLine: 5,
          status: "passed",
          story: story("Refund is processed", content),
        }),
      ],
    });
    const current = stubs.testRunResult({
      testCases: [
        stubs.testCaseResult({
          id: "id-new-file",
          sourceFile: "src/billing/refunds.story.test.ts",
          sourceLine: 5,
          status: "passed",
          story: story("Refund is processed", content),
        }),
      ],
    });

    const diff = diffRuns(baseline, current);

    expect(diff.summary).toMatchObject({ moved: 1, renamed: 0, added: 0, removed: 0 });
    expect(diff.scenarios.find((s) => s.kind === "moved")?.matchedBy).toBe("fingerprint");
  });

  it("uses guarded fuzzy matching to detect a rename that also edited a step", () => {
    const baseline = stubs.testRunResult({
      testCases: [
        stubs.testCaseResult({
          id: "fuzzy-before",
          sourceFile: "src/refunds.story.test.ts",
          sourceLine: 8,
          status: "passed",
          story: story("Refund is processed", [
            "a paid order",
            "a refund is requested",
            "money is returned",
          ]),
        }),
      ],
    });
    const current = stubs.testRunResult({
      testCases: [
        stubs.testCaseResult({
          id: "fuzzy-after",
          sourceFile: "src/refunds.story.test.ts",
          sourceLine: 8,
          status: "passed",
          story: story("Refund is processed quickly", [
            "a paid order",
            "a refund is requested",
            "money is returned promptly",
          ]),
        }),
      ],
    });

    const diff = diffRuns(baseline, current);

    expect(diff.summary).toMatchObject({ renamed: 1, added: 0, removed: 0 });
    const renamed = diff.scenarios.find((s) => s.kind === "renamed");
    expect(renamed?.matchedBy).toBe("similarity");
    expect(renamed?.matchConfidence ?? 0).toBeGreaterThanOrEqual(0.75);
  });

  it("does NOT pair unrelated add/remove (stays added + removed)", () => {
    const baseline = stubs.testRunResult({
      testCases: [
        stubs.testCaseResult({
          id: "gone",
          sourceFile: "src/auth.story.test.ts",
          sourceLine: 3,
          status: "passed",
          story: story("Login works", ["a user", "they log in", "the dashboard appears"]),
        }),
      ],
    });
    const current = stubs.testRunResult({
      testCases: [
        stubs.testCaseResult({
          id: "fresh",
          sourceFile: "src/export.story.test.ts",
          sourceLine: 3,
          status: "passed",
          story: story("Export CSV", ["a report", "the user exports it", "a file downloads"]),
        }),
      ],
    });

    const diff = diffRuns(baseline, current);

    expect(diff.summary).toMatchObject({ added: 1, removed: 1, renamed: 0, moved: 0 });
  });

  it("a rename produces zero removals/additions — so a removal-gate does not fire", () => {
    const content = ["an order exists", "it is cancelled", "stock is restored"];
    const baseline = stubs.testRunResult({
      testCases: [
        stubs.testCaseResult({
          id: "before",
          sourceFile: "src/orders.story.test.ts",
          sourceLine: 1,
          status: "passed",
          story: story("Cancelling an order restocks", content),
        }),
      ],
    });
    const current = stubs.testRunResult({
      testCases: [
        stubs.testCaseResult({
          id: "after",
          sourceFile: "src/orders.story.test.ts",
          sourceLine: 1,
          status: "passed",
          story: story("Order cancellation restores stock", content),
        }),
      ],
    });

    const diff = diffRuns(baseline, current);

    // The release gate fails on summary.removed > 0 / summary.added > 0.
    expect(diff.summary.removed).toBe(0);
    expect(diff.summary.added).toBe(0);
  });

  it("fingerprint is title- and file-independent; empty for content-less scenarios", () => {
    const a = {
      scenario: "User logs in",
      sourceFile: "src/auth.test.ts",
      steps: [{ keyword: "Given", text: "a user" }, { keyword: "Then", text: "they are in" }],
    };
    const b = {
      scenario: "Completely different title",
      sourceFile: "src/elsewhere.test.ts",
      steps: [{ keyword: "given", text: "A USER!" }, { keyword: "then", text: "they  are in" }],
    };
    expect(behaviourFingerprint(a)).toBe(behaviourFingerprint(b));
    expect(behaviourFingerprint({ scenario: "x", sourceFile: "y", steps: [] })).toBe("");
    // No step content on either side → no signal, similarity is 0 (conservative).
    expect(
      behaviourSimilarity(
        { scenario: "Removed case", sourceFile: "a", steps: [] },
        { scenario: "Added case", sourceFile: "b", steps: [] }
      )
    ).toBe(0);
  });
});

describe("RunDiffChangelogFormatter", () => {
  const bddStory = (scenario: string) =>
    stubs.storyMeta({
      scenario,
      docs: [],
      steps: [
        stubs.step({ keyword: "Given", text: "a signed-in customer" }),
        stubs.step({ keyword: "When", text: "they redeem a gift card" }),
        stubs.step({ keyword: "Then", text: "the balance covers the order" }),
      ],
    });

  it("groups scenarios into release-notes sections with run metadata", () => {
    const baseline = stubs.testRunResult({
      startedAtMs: Date.UTC(2026, 5, 30),
      packageVersion: "1.2.0",
      gitSha: "aaaa1111bbbb2222",
      testCases: [
        stubs.testCaseResult({
          id: "broke",
          sourceFile: "src/auth.story.test.ts",
          status: "passed",
          story: stubs.storyMeta({ scenario: "Login works", docs: [] }),
        }),
        stubs.testCaseResult({
          id: "repaired",
          sourceFile: "src/auth.story.test.ts",
          status: "failed",
          errorMessage: "old error",
          story: stubs.storyMeta({ scenario: "Password reset", docs: [] }),
        }),
        stubs.testCaseResult({
          id: "dropped",
          sourceFile: "src/legacy.story.test.ts",
          status: "passed",
          story: stubs.storyMeta({ scenario: "Legacy export", docs: [] }),
        }),
      ],
    });
    const current = stubs.testRunResult({
      startedAtMs: Date.UTC(2026, 6, 8),
      packageVersion: "1.3.0",
      gitSha: "cccc3333dddd4444",
      testCases: [
        stubs.testCaseResult({
          id: "broke",
          sourceFile: "src/auth.story.test.ts",
          status: "failed",
          errorMessage: "Expected dashboard, saw error page\nstack...",
          story: stubs.storyMeta({ scenario: "Login works", docs: [] }),
        }),
        stubs.testCaseResult({
          id: "repaired",
          sourceFile: "src/auth.story.test.ts",
          status: "passed",
          story: stubs.storyMeta({ scenario: "Password reset", docs: [] }),
        }),
        stubs.testCaseResult({
          id: "brand-new",
          sourceFile: "src/gift-cards.story.test.ts",
          status: "passed",
          story: bddStory("Gift card covers the whole order"),
        }),
      ],
    });

    const changelog = new RunDiffChangelogFormatter().format(diffRuns(baseline, current));

    expect(changelog).toContain("# Behavior Changelog");
    expect(changelog).toContain("1.2.0 · `aaaa1111` · 2026-06-30 → 1.3.0 · `cccc3333` · 2026-07-08");
    expect(changelog).toContain("## New behavior (1)");
    expect(changelog).toContain("**Gift card covers the whole order** (`src/gift-cards.story.test.ts`)");
    // New behavior reads as a specification, not a test name.
    expect(changelog).toContain("  - _Given_ a signed-in customer");
    expect(changelog).toContain("  - _Then_ the balance covers the order");
    expect(changelog).toContain("## Fixed (1)");
    expect(changelog).toContain("## Broken (1)");
    expect(changelog).toContain("**Login works** (`src/auth.story.test.ts`) — Expected dashboard, saw error page");
    expect(changelog).toContain("## Removed (1)");
    expect(changelog).toContain("**Legacy export**");
    expect(changelog).toContain("_0 unchanged scenarios._");
  });

  it("says so when nothing changed between runs", () => {
    const run = stubs.testRunResult({
      testCases: [
        stubs.testCaseResult({
          id: "same",
          sourceFile: "src/auth.story.test.ts",
          status: "passed",
          story: stubs.storyMeta({ scenario: "Login works", docs: [] }),
        }),
      ],
    });

    const changelog = new RunDiffChangelogFormatter().format(diffRuns(run, run));

    expect(changelog).toContain("No behavior changes between these runs.");
    expect(changelog).toContain("_1 unchanged scenario._");
  });

  it("renders renames as old → new", () => {
    const content = ["a registered user exists", "they sign in", "the dashboard is shown"];
    const steps = content.map((text, i) =>
      stubs.step({ keyword: i === 0 ? "Given" : i === content.length - 1 ? "Then" : "When", text })
    );
    const meta = (scenario: string) =>
      stubs.storyMeta({ scenario, tags: [], tickets: [], suitePath: [], docs: [], steps });
    const baseline = stubs.testRunResult({
      testCases: [
        stubs.testCaseResult({
          id: "id-before",
          sourceFile: "src/auth.story.test.ts",
          status: "passed",
          story: meta("User logs in"),
        }),
      ],
    });
    const current = stubs.testRunResult({
      testCases: [
        stubs.testCaseResult({
          id: "id-after",
          sourceFile: "src/auth.story.test.ts",
          status: "passed",
          story: meta("User signs in successfully"),
        }),
      ],
    });

    const changelog = new RunDiffChangelogFormatter().format(diffRuns(baseline, current));

    expect(changelog).toContain("## Renamed or moved (1)");
    expect(changelog).toContain("- User logs in → **User signs in successfully**");
  });
});

describe("diff report URL state", () => {
  it("keeps the filter and search in the fragment", () => {
    const run = stubs.testRunResult({
      testCases: [
        stubs.testCaseResult({ id: "a", sourceFile: "src/a.story.test.ts", status: "passed" }),
      ],
    });
    const html = new RunDiffHtmlFormatter().format(diffRuns(run, run));

    // The fragment, not the query string: this file is opened from disk.
    expect(html).toContain("location.hash");
    expect(html).toContain("params.set('kind', activeFilter)");
    expect(html).toContain("params.set('q', input.value)");
    expect(html).toContain("readUrl();");
  });
});

describe("partial current run", () => {
  const scenario = (id: string, sourceFile: string) =>
    stubs.testCaseResult({
      id,
      sourceFile,
      status: "passed",
      story: stubs.storyMeta({ scenario: id, docs: [] }),
    });

  // Baseline covers two files; the current run only ran auth, and inside auth
  // one scenario really was deleted.
  const baseline = stubs.testRunResult({
    testCases: [
      scenario("auth-kept", "src/auth.story.test.ts"),
      scenario("auth-deleted", "src/auth.story.test.ts"),
      scenario("billing-untouched", "src/billing.story.test.ts"),
    ],
  });
  const current = stubs.testRunResult({
    testCases: [scenario("auth-kept", "src/auth.story.test.ts")],
  });

  it("reports every unseen scenario as removed by default", () => {
    const diff = diffRuns(baseline, current);

    expect(diff.summary).toMatchObject({ removed: 2, notRun: 0 });
  });

  it("only judges files the partial run covered", () => {
    const diff = diffRuns(baseline, current, { partialCurrent: true });

    expect(diff.summary).toMatchObject({ removed: 1, notRun: 1 });
    expect(diff.scenarios.find((s) => s.kind === "removed")?.id).toBe("auth-deleted");
    expect(diff.scenarios.some((s) => s.id === "billing-untouched")).toBe(false);
  });

  it("says how many scenarios it left out", () => {
    const diff = diffRuns(baseline, current, { partialCurrent: true });

    expect(new RunDiffMarkdownFormatter().format(diff)).toContain(
      "Partial run: 1 baseline scenario(s)"
    );
    expect(createPrCommentSummary(diff)).toContain("Partial run: 1 baseline scenario(s)");
    expect(new RunDiffHtmlFormatter().format(diff)).toContain("Not run");
  });
});
