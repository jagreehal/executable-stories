/**
 * Unasserted claims have to be visible in the prose.
 *
 * The point of the report is that you can read it. A claim nothing checked
 * renders identically to a proven one unless the document says otherwise, which
 * is how "p99 stays under 50ms" ends up in the docs backed by nothing.
 */
import { describe, expect, it } from "vitest";
import { canonicalizeRun } from "executable-stories-core/converters/acl/canonicalize";
import { MarkdownFormatter } from "../../src/formatters/markdown";
import { createRawRun, createRawTestCase, createStoryMeta } from "../stubs";

function render(steps: Array<Record<string, unknown>>): string {
  const run = canonicalizeRun(
    createRawRun({
      testCases: [
        createRawTestCase({
          story: createStoryMeta({ scenario: "adds two numbers", steps: steps as never }),
        }),
      ],
    })
  );
  return new MarkdownFormatter().format(run);
}

describe("markdown: claims nothing checked", () => {
  it("marks a Then that asserted nothing", () => {
    const md = render([
      { keyword: "Given", text: "two numbers 5 and 3", assertions: 0 },
      { keyword: "Then", text: "the result is 8", assertions: 0 },
    ]);
    expect(md).toContain("the result is 8 _(no assertion)_");
  });

  it("leaves a Then that asserted something unmarked", () => {
    const md = render([
      { keyword: "Given", text: "two numbers 5 and 3", assertions: 0 },
      { keyword: "Then", text: "the result is 8", assertions: 1 },
    ]);
    expect(md).toContain("the result is 8");
    expect(md).not.toContain("_(no assertion)_");
  });

  it("does not mark setup steps, which are not expected to assert", () => {
    const md = render([
      { keyword: "Given", text: "two numbers 5 and 3", assertions: 0 },
      { keyword: "When", text: "they are added", assertions: 0 },
      { keyword: "Then", text: "the result is 8", assertions: 1 },
    ]);
    expect(md).not.toContain("_(no assertion)_");
  });

  it("does not mark steps from an adapter that cannot observe assertions", () => {
    const md = render([
      { keyword: "Given", text: "two numbers 5 and 3" },
      { keyword: "Then", text: "the result is 8" },
    ]);
    expect(md).not.toContain("_(no assertion)_");
  });

  it("leaves a claim step alone when a sibling claim step asserted", () => {
    // Marker style credits a trailing assertion to the step it follows, so a
    // scenario that declares two claims and checks once would otherwise flag
    // the first. Measured against a real suite that fired on 146 steps while
    // only 4 scenarios genuinely checked nothing, so the mark follows the same
    // scenario-level rule the grade and the CLI summary use.
    const md = render([
      { keyword: "Given", text: "two numbers 5 and 3", assertions: 0 },
      { keyword: "Then", text: "the result is 8", assertions: 0 },
      { keyword: "And", text: "the result is positive", assertions: 1 },
    ]);
    expect(md).not.toContain("_(no assertion)_");
  });

  it("marks an And that continues an unchecked Then", () => {
    const md = render([
      { keyword: "Given", text: "a warm cache", assertions: 0 },
      { keyword: "Then", text: "p99 stays under 50ms", assertions: 0 },
      { keyword: "And", text: "no requests are dropped", assertions: 0 },
    ]);
    expect(md).toContain("no requests are dropped _(no assertion)_");
  });
});
