/**
 * Feature declarations: what a file's scenarios are for, ahead of the examples.
 */

import { describe, it, expect } from "vitest";
import { canonicalizeRun } from "executable-stories-core/converters/acl/canonicalize";
import { toStoryReport } from "executable-stories-core/converters/story-report";
import type { RawRun } from "executable-stories-core/types/raw";
import { MarkdownFormatter } from "../src/formatters/markdown";

function runWith(features: RawRun["features"]): RawRun {
  return {
    projectRoot: "/project",
    startedAtMs: 1704067200000,
    finishedAtMs: 1704067201000,
    features,
    testCases: [
      {
        title: "Passwords shorter than 12 characters are rejected",
        sourceFile: "/project/src/passwords.story.test.ts",
        status: "pass",
        story: {
          scenario: "Passwords shorter than 12 characters are rejected",
          steps: [
            { keyword: "Given", text: "Simona is setting a password" },
            { keyword: "When", text: "she submits shorty" },
            { keyword: "Then", text: "the password is rejected" },
          ],
        },
      },
    ],
  };
}

const declaration = {
  sourceFile: "/project/src/passwords.story.test.ts",
  title: "Employees can secure their passwords",
  kind: "ability" as const,
  narrative: "    Weak passwords are how most accounts get taken over.\n    So the form rejects them outright.",
  glossary: [
    { term: "password strength", definition: "A score from weak to strong." },
  ],
};

describe("canonicalizeRun", () => {
  it("keeps a declaration that names its source file", () => {
    const result = canonicalizeRun(runWith([declaration]));

    expect(result.features).toEqual([
      { ...declaration, kind: "ability" },
    ]);
  });

  it("defaults the kind to feature", () => {
    const result = canonicalizeRun(
      runWith([{ sourceFile: "/project/a.test.ts", title: "Checkout" }]),
    );

    expect(result.features?.[0]?.kind).toBe("feature");
  });

  it("applies a declaration's tags to every scenario in its file", () => {
    // The tags exist so a file-wide tag is written once. If they stopped at
    // the declaration, every persona view filtering on them would come back
    // empty while the report still showed the tag.
    const raw = runWith([{ ...declaration, tags: ["capability:passwords"] }]);
    raw.testCases[0]!.story!.tags = ["security"];
    raw.testCases.push({
      title: "Elsewhere",
      sourceFile: "/project/src/other.story.test.ts",
      status: "pass",
      story: { scenario: "Elsewhere", steps: [{ keyword: "Given", text: "another file" }] },
    });

    const result = canonicalizeRun(raw);

    expect(result.testCases[0]!.tags).toEqual(["capability:passwords", "security"]);
    // A file with no declaration of its own inherits nothing.
    expect(result.testCases[1]!.tags).toEqual([]);
  });

  it("drops a declaration with nothing to attach it to", () => {
    const result = canonicalizeRun(runWith([{ title: "Orphaned" }]));

    expect(result.features).toBeUndefined();
  });

  it("keeps the last declaration when a file declares twice", () => {
    const result = canonicalizeRun(
      runWith([
        { sourceFile: "/project/a.test.ts", title: "First" },
        { sourceFile: "/project/a.test.ts", title: "Second" },
      ]),
    );

    expect(result.features).toHaveLength(1);
    expect(result.features?.[0]?.title).toBe("Second");
  });
});

describe("toStoryReport", () => {
  it("titles the feature from the declaration instead of the file name", () => {
    const report = toStoryReport(canonicalizeRun(runWith([declaration])));
    const feature = report.features[0]!;

    expect(feature.title).toBe("Employees can secure their passwords");
    expect(feature.kind).toBe("ability");
    expect(feature.glossary).toEqual(declaration.glossary);
    expect(feature.scenarios).toHaveLength(1);
  });

  it("falls back to the derived title when nothing was declared", () => {
    const report = toStoryReport(canonicalizeRun(runWith(undefined)));
    const feature = report.features[0]!;

    expect(feature.kind).toBeUndefined();
    expect(feature.title).not.toBe("Employees can secure their passwords");
  });
});

describe("MarkdownFormatter", () => {
  it("introduces the feature before its scenarios", () => {
    const output = new MarkdownFormatter().format(
      canonicalizeRun(runWith([declaration])),
    );

    expect(output).toContain("## Ability: Employees can secure their passwords");
    expect(output).toContain("Weak passwords are how most accounts get taken over.");
    expect(output).toContain("- **password strength** — A score from weak to strong.");
  });

  it("dedents a narrative written inline in a test file", () => {
    const output = new MarkdownFormatter().format(
      canonicalizeRun(runWith([declaration])),
    );

    // Four leading spaces would render the paragraph as a code block.
    expect(output).not.toContain("    Weak passwords");
  });

  it("labels a business need as one", () => {
    const output = new MarkdownFormatter().format(
      canonicalizeRun(
        runWith([
          {
            sourceFile: "/project/src/passwords.story.test.ts",
            title: "Security",
            kind: "business-need",
          },
        ]),
      ),
    );

    expect(output).toContain("## Business Need: Security");
  });
});
