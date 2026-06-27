/**
 * Tests for the Evidence-Driven Review domain and markdown formatter.
 */

import { describe, expect, it } from "vitest";

import { buildReview, gradeEvidence } from "../src/review/build-review";
import {
  deriveAudience,
  deriveChangeType,
  isReviewableSource,
  isTestFile,
} from "../src/review/conventions";
import { ReviewMarkdownFormatter } from "../src/formatters/review-markdown";
import { ReviewHtmlFormatter } from "../src/formatters/review-html";
import type { Attachment } from "executable-stories-core/types/test-result";
import type { ChangedFile } from "../src/types/review";
import { stubs } from "./stubs";

const screenshot: Attachment = {
  name: "screenshot",
  mediaType: "image/png",
  body: "base64data",
  contentEncoding: "BASE64",
};

describe("review conventions", () => {
  describe("deriveAudience", () => {
    it("treats e2e and spec files as stakeholder", () => {
      expect(deriveAudience("src/cart/checkout.e2e.test.ts", [])).toBe("stakeholder");
      expect(deriveAudience("e2e/login.test.ts", [])).toBe("stakeholder");
      expect(deriveAudience("tests/checkout.story.spec.ts", [])).toBe("stakeholder");
    });

    it("treats colocated unit/integration files as engineer", () => {
      expect(deriveAudience("src/cart/totals.test.ts", [])).toBe("engineer");
      expect(deriveAudience("src/cart/totals.int.test.ts", [])).toBe("engineer");
    });

    it("lets an explicit audience tag override the convention", () => {
      expect(deriveAudience("src/cart/totals.test.ts", ["audience:stakeholder"])).toBe(
        "stakeholder"
      );
      expect(deriveAudience("src/cart/checkout.e2e.test.ts", ["audience:engineer"])).toBe(
        "engineer"
      );
    });
  });

  describe("deriveChangeType", () => {
    it("reads a change:* tag", () => {
      expect(deriveChangeType(["auth", "change:bugfix"])).toBe("bugfix");
      expect(deriveChangeType(["change:refactor"])).toBe("refactor");
    });

    it("defaults to unknown and ignores invalid change types", () => {
      expect(deriveChangeType(["auth"])).toBe("unknown");
      expect(deriveChangeType(["change:nonsense"])).toBe("unknown");
    });
  });

  describe("file classification", () => {
    it("recognises test files", () => {
      expect(isTestFile("src/cart/totals.test.ts")).toBe(true);
      expect(isTestFile("src/cart/checkout.e2e.test.ts")).toBe(true);
      expect(isTestFile("src/cart/totals.ts")).toBe(false);
    });

    it("treats only non-test code as reviewable source", () => {
      expect(isReviewableSource("src/cart/totals.ts")).toBe(true);
      expect(isReviewableSource("src/cart/totals.test.ts")).toBe(false);
      expect(isReviewableSource("src/cart/types.d.ts")).toBe(false);
      expect(isReviewableSource("README.md")).toBe(false);
      expect(isReviewableSource("pnpm-lock.yaml")).toBe(false);
    });
  });
});

describe("gradeEvidence", () => {
  it("grades a non-passing test as none", () => {
    const tc = stubs.testCaseResult({ status: "failed" });
    expect(gradeEvidence(tc, "engineer").strength).toBe("none");
  });

  it("grades a plain passing unit test as weak", () => {
    const tc = stubs.testCaseResult({
      status: "passed",
      sourceFile: "src/cart/totals.test.ts",
      attachments: [],
      story: stubs.storyMeta({ docs: [], otelSpans: undefined }),
    });
    expect(gradeEvidence(tc, "engineer").strength).toBe("weak");
  });

  it("grades an integration test as moderate", () => {
    const tc = stubs.testCaseResult({
      status: "passed",
      sourceFile: "src/cart/totals.int.test.ts",
      attachments: [],
      story: stubs.storyMeta({ docs: [], otelSpans: undefined }),
    });
    expect(gradeEvidence(tc, "engineer").strength).toBe("moderate");
  });

  it("grades a high mutation score as strong", () => {
    const tc = stubs.testCaseResult({
      status: "passed",
      sourceFile: "src/cart/totals.test.ts",
      attachments: [],
      story: stubs.storyMeta({ docs: [], otelSpans: undefined }),
      evidence: { mutationScorePct: 88 },
    });
    const result = gradeEvidence(tc, "engineer");
    expect(result.strength).toBe("strong");
    expect(result.reasons.join(" ")).toContain("mutation score 88%");
  });

  it("grades failing-first verification as strong", () => {
    const tc = stubs.testCaseResult({
      status: "passed",
      sourceFile: "src/cart/totals.test.ts",
      attachments: [],
      story: stubs.storyMeta({ docs: [], otelSpans: undefined }),
      evidence: { failingFirstVerified: true },
    });
    expect(gradeEvidence(tc, "engineer").strength).toBe("strong");
  });

  it("grades a stakeholder claim with a screenshot as strong", () => {
    const tc = stubs.testCaseResult({
      status: "passed",
      sourceFile: "src/cart/checkout.e2e.test.ts",
      attachments: [screenshot],
      story: stubs.storyMeta({ docs: [], otelSpans: undefined }),
    });
    expect(gradeEvidence(tc, "stakeholder").strength).toBe("strong");
  });

  it("grades an engineer claim with only a screenshot as moderate", () => {
    const tc = stubs.testCaseResult({
      status: "passed",
      sourceFile: "src/cart/totals.test.ts",
      attachments: [screenshot],
      story: stubs.storyMeta({ docs: [], otelSpans: undefined }),
    });
    expect(gradeEvidence(tc, "engineer").strength).toBe("moderate");
  });
});

/** A run exercising all three bands: covered (strong), weak, and uncovered. */
function bandedRun() {
  return stubs.testRunResult({
    testCases: [
      stubs.testCaseResult({
        id: "checkout",
        status: "passed",
        sourceFile: "src/cart/checkout.e2e.test.ts",
        attachments: [screenshot],
        tags: ["change:feature"],
        story: stubs.storyMeta({
          scenario: "Checkout blocks a suspended user",
          tickets: [
            { id: "GEO-101", url: "https://jira.example.com/browse/GEO-101" },
            { id: "GEO-204" },
          ],
          docs: [
            {
              kind: "section",
              phase: "static",
              title: "Why",
              markdown: "Suspended users were able to pay; this closes the gap.",
            },
          ],
          otelSpans: [{ spanId: "s1", name: "place-order", status: "ok" }],
        }),
      }),
      stubs.testCaseResult({
        id: "totals",
        status: "passed",
        sourceFile: "src/cart/totals.test.ts",
        attachments: [],
        tags: ["change:refactor"],
        story: stubs.storyMeta({ scenario: "Totals sum line items", docs: [], otelSpans: undefined }),
      }),
    ],
  });
}

const changedFiles: ChangedFile[] = [
  { path: "src/cart/checkout.ts", changeKind: "modified" },
  { path: "src/cart/totals.ts", changeKind: "modified" },
  { path: "src/cart/discount.ts", changeKind: "added" },
  { path: "README.md", changeKind: "modified" },
];

describe("buildReview", () => {
  it("bands changed source files by evidence strength", () => {
    const review = buildReview(bandedRun(), { changedFiles });

    // README.md is not reviewable source, so only 3 files are considered.
    expect(review.summary.changedSourceFiles).toBe(3);
    expect(review.summary.covered).toBe(1);
    expect(review.summary.weaklyCovered).toBe(1);
    expect(review.summary.uncovered).toBe(1);

    const byPath = Object.fromEntries(review.changedFiles.map((f) => [f.path, f.band]));
    expect(byPath["src/cart/checkout.ts"]).toBe("covered");
    expect(byPath["src/cart/totals.ts"]).toBe("weak");
    expect(byPath["src/cart/discount.ts"]).toBe("uncovered");
    expect(byPath["README.md"]).toBeUndefined();
  });

  it("sorts changed files uncovered → weak → covered", () => {
    const review = buildReview(bandedRun(), { changedFiles });
    expect(review.changedFiles.map((f) => f.band)).toEqual([
      "uncovered",
      "weak",
      "covered",
    ]);
  });

  it("derives audience, change-type, and intent on each claim", () => {
    const review = buildReview(bandedRun(), { changedFiles });
    const checkout = review.claims.find((c) => c.id === "checkout")!;
    expect(checkout.audience).toBe("stakeholder");
    expect(checkout.changeType).toBe("feature");
    expect(checkout.strength).toBe("strong");
    expect(checkout.intent).toContain("Suspended users");
    expect(checkout.coversFiles).toEqual(["src/cart/checkout.ts"]);
  });

  it("degrades to claims-only when no diff context is supplied", () => {
    const review = buildReview(bandedRun());
    expect(review.summary.changedSourceFiles).toBe(0);
    expect(review.claims).toHaveLength(2);
    expect(review.changedFiles).toHaveLength(0);
  });
});

describe("ReviewMarkdownFormatter", () => {
  const formatter = new ReviewMarkdownFormatter();

  it("leads with the uncovered-change band", () => {
    const md = formatter.format(buildReview(bandedRun(), { changedFiles }));
    expect(md).toContain("## 🔴 Changed code with no evidence (1)");
    expect(md).toContain("`src/cart/discount.ts`");
  });

  it("renders audience sections with strength badges and intent", () => {
    const md = formatter.format(buildReview(bandedRun(), { changedFiles }));
    expect(md).toContain("## Stakeholder behaviour (1)");
    expect(md).toContain("## Engineer changes (1)");
    expect(md).toContain("🟢 strong");
    expect(md).toContain("Why: Suspended users were able to pay");
  });

  it("notes when no diff context is available", () => {
    const md = formatter.format(buildReview(bandedRun()));
    expect(md).toContain("showing claims and evidence only");
  });

  it("renders tickets on each claim as provenance", () => {
    const md = formatter.format(buildReview(bandedRun(), { changedFiles }));
    expect(md).toContain(
      "- Tickets: [GEO-101](https://jira.example.com/browse/GEO-101), `GEO-204`"
    );
  });
});

describe("ReviewHtmlFormatter", () => {
  const formatter = new ReviewHtmlFormatter();

  it("produces a standalone HTML document with the title", () => {
    const html = formatter.format(buildReview(bandedRun(), { changedFiles }));
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("<title>Evidence Review</title>");
  });

  it("renders banded changed files and strength badges", () => {
    const html = formatter.format(buildReview(bandedRun(), { changedFiles }));
    expect(html).toContain('data-band="uncovered"');
    expect(html).toContain("src/cart/discount.ts");
    expect(html).toContain("strength-strong");
    expect(html).toContain('data-audience="stakeholder"');
  });

  it("renders ticket pills and includes tickets in search metadata", () => {
    const html = formatter.format(buildReview(bandedRun(), { changedFiles }));
    expect(html).toContain(
      '<a class="ticket-pill" href="https://jira.example.com/browse/GEO-101" target="_blank" rel="noopener noreferrer">GEO-101</a>'
    );
    expect(html).toContain('<span class="ticket-pill">GEO-204</span>');
    expect(html).toContain("geo-101 geo-204");
  });

  it("escapes scenario text", () => {
    const run = stubs.testRunResult({
      testCases: [
        stubs.testCaseResult({
          status: "passed",
          sourceFile: "src/x.test.ts",
          story: stubs.storyMeta({ scenario: "Handle <script> & co", docs: [], otelSpans: undefined }),
        }),
      ],
    });
    const html = formatter.format(buildReview(run));
    expect(html).toContain("Handle &lt;script&gt; &amp; co");
    expect(html).not.toContain("Handle <script>");
  });
});
