/**
 * Markdown for `gh ... --attach`.
 *
 * A screenshot or clip captured by a run lives on the machine that ran it. Post
 * that markdown to a pull request and the reference is broken, so the formatter
 * replaces a local path with an "unavailable" line rather than shipping a dead
 * image. That was the only honest option until GitHub CLI 2.99 added `--attach`,
 * which uploads the file and rewrites the local reference in the body it posts.
 *
 * With `attachImages` the formatter writes the ordinary markdown reference and
 * lets gh do the rewriting, which is what puts the evidence from a run in front
 * of a reviewer without an orphan branch or a `contents: write` token.
 */
import { describe, expect, it } from "vitest";

import { MarkdownFormatter } from "../src/formatters/markdown";
import { buildGhAttachCommand } from "../src/attach-images";
import { stubs } from "./stubs";

function runWithLocalEvidence() {
  return stubs.testRunResult({
    testCases: [
      stubs.testCaseResult({
        sourceFile: "src/checkout.story.test.ts",
        story: stubs.storyMeta({
          scenario: "Checkout shows the receipt",
          steps: [
            {
              keyword: "Then",
              text: "the receipt is on screen",
              docs: [
                { kind: "screenshot", phase: "runtime", path: "/tmp/run/receipt.png", alt: "The receipt" },
                { kind: "video", phase: "runtime", path: "/tmp/run/checkout.mp4", caption: "Full checkout" },
              ],
            },
          ],
        }),
        stepResults: [{ index: 0, status: "passed", durationMs: 1 }],
      }),
    ],
  });
}

describe("markdown for gh --attach", () => {
  it("keeps the local path as a markdown reference when attachImages is on", () => {
    const md = new MarkdownFormatter({ attachImages: true }).format(runWithLocalEvidence());

    expect(md).toContain("![The receipt](/tmp/run/receipt.png)");
    expect(md).toContain("![Full checkout](/tmp/run/checkout.mp4)");
    expect(md).not.toContain("unavailable");
  });

  it("still refuses to write a dead reference by default", () => {
    const md = new MarkdownFormatter().format(runWithLocalEvidence());

    expect(md).toContain("Screenshot unavailable");
    expect(md).toContain("Video unavailable");
    expect(md).not.toContain("![The receipt](/tmp/run/receipt.png)");
  });

  it("builds the gh command with one --attach per local asset", () => {
    const command = buildGhAttachCommand({
      run: runWithLocalEvidence(),
      bodyFile: "reports/index.md",
      pr: 42,
    });

    expect(command).toContain("gh pr comment 42");
    expect(command).toContain("--body-file reports/index.md");
    expect(command).toContain("--attach '/tmp/run/receipt.png'");
    expect(command).toContain("--attach '/tmp/run/checkout.mp4'");
  });

  it("names no pull request when none was given, so the caller picks the target", () => {
    const command = buildGhAttachCommand({
      run: runWithLocalEvidence(),
      bodyFile: "reports/index.md",
    });

    expect(command).toContain("gh pr comment <number>");
  });

  it("returns nothing when the run points at no local file", () => {
    const command = buildGhAttachCommand({
      run: stubs.testRunResult({
        testCases: [
          stubs.testCaseResult({
            story: stubs.storyMeta({
              scenario: "No evidence",
              steps: [{ keyword: "Then", text: "nothing was captured" }],
            }),
            stepResults: [{ index: 0, status: "passed", durationMs: 1 }],
          }),
        ],
      }),
      bodyFile: "reports/index.md",
    });

    expect(command).toBeUndefined();
  });
});
