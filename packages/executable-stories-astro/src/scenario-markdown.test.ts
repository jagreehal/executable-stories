import { describe, expect, it } from "vitest";

import type { StoryEntryData } from "./loader.js";
import { scenarioToMarkdown, storiesLlmsTxt } from "./scenario-markdown.js";

function story(overrides: Partial<StoryEntryData> = {}): StoryEntryData {
  return {
    id: "feature-checkout--caps-the-discount",
    title: "Caps the discount at 30 percent",
    status: "passed",
    durationMs: 12,
    tags: ["pricing"],
    retry: 0,
    retries: 0,
    docEntries: [],
    steps: [],
    attachments: [],
    entryId: "default::src/checkout.story.test.ts#feature-checkout--caps-the-discount",
    slug: "caps-the-discount-at-30-percent",
    feature: { id: "f1", title: "Checkout", sourceFile: "src/checkout.story.test.ts" },
    source: { name: "default", label: "Stories" },
    run: { runId: "r1", finishedAtMs: 2000, gitSha: "abc123" },
    ...overrides,
  };
}

// The scenario BODY (steps, failure, doc kinds) is rendered by the shared core
// serializer and covered by its tests. These cover what this module owns: the
// metadata header assembled from the collection entry, and the llms.txt index.
describe("scenarioToMarkdown metadata header", () => {
  it("renders the entry fields that don't exist on a canonical scenario", () => {
    const md = scenarioToMarkdown(story());
    expect(md).toMatch(/^# Caps the discount at 30 percent\n/);
    expect(md).toContain("- Status: passed");
    expect(md).toContain("- Feature: Checkout (`src/checkout.story.test.ts`)");
    expect(md).toContain("- Tags: `@pricing`");
    expect(md).toContain("- Duration: 12ms");
    expect(md).toContain("- Commit: abc123");
  });

  it("marks a planned scenario and flags sample data, so an agent never mistakes it for real results", () => {
    expect(scenarioToMarkdown(story({ status: "pending", planned: true }))).toContain("- Status: pending (planned)");
    expect(scenarioToMarkdown(story({ sample: true }))).toContain("sample data");
  });

  it("delegates the body to the shared serializer (steps render identically)", () => {
    const md = scenarioToMarkdown(
      story({
        steps: [
          { id: "s1", index: 0, keyword: "Given", text: "a saved card", status: "passed", durationMs: 1, docEntries: [] },
        ],
      }),
    );
    expect(md).toContain("## Steps");
    expect(md).toContain("1. **Given** a saved card");
  });
});

describe("storiesLlmsTxt", () => {
  it("emits llms.txt format: H1, summary blockquote, one section per feature", () => {
    const txt = storiesLlmsTxt([
      story(),
      story({
        id: "feature-auth--logs-in",
        title: "Logs in",
        slug: "logs-in",
        status: "failed",
        feature: { id: "f2", title: "Auth", sourceFile: "src/auth.story.test.ts" },
      }),
    ]);
    expect(txt).toMatch(/^# Stories\n/);
    expect(txt).toContain(
      "> Living documentation generated from executable stories: 2 scenarios across 2 features (1 passed, 1 failed, 0 skipped, 0 pending)",
    );
    expect(txt).toContain("## Checkout");
    expect(txt).toContain("- [Caps the discount at 30 percent](/stories/caps-the-discount-at-30-percent.md): passed");
    expect(txt).toContain("## Auth");
    expect(txt).toContain("- [Logs in](/stories/logs-in.md): failed");
  });

  it("honours a custom routeBase in the twin links", () => {
    const txt = storiesLlmsTxt([story()], { routeBase: "/scenarios/" });
    expect(txt).toContain("(/scenarios/caps-the-discount-at-30-percent.md)");
  });
});
