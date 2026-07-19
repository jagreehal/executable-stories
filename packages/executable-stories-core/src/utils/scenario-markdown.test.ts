import { describe, expect, it } from "vitest";

import type { ReportScenario } from "../types/story-report.js";
import { docEntryToMarkdown, scenarioToMarkdown } from "./scenario-markdown.js";

function scenario(overrides: Partial<ReportScenario> = {}): ReportScenario {
  return {
    id: "checkout--caps-the-discount",
    title: "Caps the discount at 30 percent",
    status: "passed",
    durationMs: 12,
    tags: ["pricing"],
    retry: 0,
    retries: 0,
    docEntries: [],
    steps: [],
    attachments: [],
    ...overrides,
  };
}

const STEPS: ReportScenario["steps"] = [
  { id: "s1", index: 0, keyword: "Given", text: "a cart with 3 items", status: "passed", durationMs: 1, docEntries: [] },
  {
    id: "s2",
    index: 1,
    keyword: "Then",
    text: "the discount is capped",
    status: "failed",
    durationMs: 2,
    errorMessage: "boom",
    docEntries: [{ kind: "kv", label: "cap", value: 30, phase: "runtime" }],
  },
];

describe("scenarioToMarkdown — full variant (the .md twin)", () => {
  it("renders an h1, caller metadata, steps, failure, and docs", () => {
    const md = scenarioToMarkdown(
      scenario({ status: "failed", errorMessage: "expected 30 got 40", steps: STEPS }),
      { meta: ["- Status: failed", "- Feature: Checkout (`src/checkout.story.test.ts`)"] },
    );
    expect(md).toMatch(/^# Caps the discount at 30 percent\n/);
    expect(md).toContain("- Feature: Checkout (`src/checkout.story.test.ts`)");
    expect(md).toContain("## Steps");
    expect(md).toContain("1. **Given** a cart with 3 items\n");
    expect(md).toContain("2. **Then** the discount is capped — **failed**");
    // Step-level error and docs only appear in the full variant.
    expect(md).toContain("   > boom");
    expect(md).toContain("   **cap:** 30");
    expect(md).toContain("## Failure");
    expect(md).toContain("expected 30 got 40");
  });

  it("renders every doc kind the report model carries", () => {
    const md = scenarioToMarkdown(
      scenario({
        docEntries: [
          { kind: "code", label: "Request", content: '{"total": 100}', lang: "json", phase: "runtime" },
          { kind: "table", label: "Cases", columns: ["in", "out"], rows: [["40", "30"]], phase: "runtime" },
          { kind: "link", label: "ADR", url: "https://example.com/adr-7", phase: "static" },
          { kind: "mermaid", code: "graph TD; A-->B", phase: "static" },
          { kind: "section", title: "Design notes", markdown: "The cap is **policy**.", phase: "static" },
        ],
      }),
    );
    expect(md).toContain("## Docs");
    expect(md).toContain('**Request**\n\n```json\n{"total": 100}\n```');
    expect(md).toContain("| in | out |\n| --- | --- |\n| 40 | 30 |");
    expect(md).toContain("[ADR](https://example.com/adr-7)");
    expect(md).toContain("```mermaid\ngraph TD; A-->B\n```");
    expect(md).toContain("### Design notes\n\nThe cap is **policy**.");
  });
});

describe("scenarioToMarkdown — compact variant (the report's copy button)", () => {
  it("renders an h2 with the status inline, steps, and the failure fence", () => {
    const md = scenarioToMarkdown(
      scenario({ status: "failed", errorMessage: "expected 30 got 40", steps: STEPS }),
      { variant: "compact" },
    );
    expect(md).toMatch(/^## Caps the discount at 30 percent _\(failed\)_\n/);
    expect(md).toContain("1. **Given** a cart with 3 items");
    expect(md).toContain("2. **Then** the discount is capped — **failed**");
    expect(md).toContain("```\nexpected 30 got 40\n```");
  });

  it("omits the sections that make a standalone document, so it stays paste-sized", () => {
    const md = scenarioToMarkdown(
      scenario({
        steps: STEPS,
        docEntries: [{ kind: "note", text: "a long design note", phase: "static" }],
      }),
      { variant: "compact", meta: ["- Status: passed"] },
    );
    expect(md).not.toContain("## Steps");
    expect(md).not.toContain("## Docs");
    expect(md).not.toContain("a long design note");
    // Step-level docs/errors are full-variant only.
    expect(md).not.toContain("**cap:** 30");
    expect(md).not.toContain("> boom");
    // `meta` is ignored outside the full variant.
    expect(md).not.toContain("- Status: passed");
  });
});

describe("docEntryToMarkdown", () => {
  it("preserves inline html in a fence and links url embeds", () => {
    expect(docEntryToMarkdown({ kind: "html", title: "Widget", content: "<div>93%</div>", phase: "runtime" })).toEqual([
      "**Widget**",
      "",
      "```html",
      "<div>93%</div>",
      "```",
    ]);
    expect(docEntryToMarkdown({ kind: "html", title: "Dash", url: "https://x.test/d", phase: "static" })).toEqual([
      "[Dash](https://x.test/d)",
    ]);
  });

  it("escapes pipes and newlines in table cells so rows stay valid", () => {
    const lines = docEntryToMarkdown({
      kind: "table",
      label: "T",
      columns: ["a|b"],
      rows: [["one\ntwo"]],
      phase: "runtime",
    });
    expect(lines).toContain("| a\\|b |");
    expect(lines).toContain("| one two |");
  });

  it("renders nested children under their parent", () => {
    const lines = docEntryToMarkdown({
      kind: "note",
      text: "parent",
      phase: "static",
      children: [{ kind: "note", text: "child", phase: "static" }],
    });
    expect(lines).toEqual(["parent", "", "child"]);
  });
});
