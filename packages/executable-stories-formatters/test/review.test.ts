/**
 * Tests for the Evidence-Driven Review domain and markdown formatter.
 */

import { describe, expect, it } from "vitest";

import { buildReview, codeDiffDiagnostics, gradeEvidence } from "../src/review/build-review";
import { createAnchor, parseUnifiedDiff } from "../src/review/diff-anchor";
import { assembleCodeDiff } from "../src/review/code-diff-sidecar";
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
import { stubs, totalsPatch } from "./stubs";

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

/** A run containing the one scenario the shared totalsPatch annotations cite. */
function runWithScenario(id: string) {
  return stubs.testRunResult({
    testCases: [
      stubs.testCaseResult({
        id,
        status: "passed",
        story: stubs.storyMeta({ scenario: "Quantity multiplies the line total" }),
      }),
    ],
  });
}

/** Anchor on totalsPatch's changed run (del + 2 adds). */
function anchorOnTotalsPatch() {
  const files = parseUnifiedDiff(totalsPatch);
  return createAnchor({ file: files[0], hunkIndex: 0, lineIndex: 2 });
}

describe("buildReview code diff evidence", () => {
  it("emits no code diff evidence when the context supplies none", () => {
    expect(buildReview(stubs.testRunResult()).codeDiffs).toEqual([]);
  });

  it("parses the patch, anchors the annotation, and resolves cited scenarios", () => {
    const run = runWithScenario("tc-1");
    const review = buildReview(run, {
      changedFiles: [],
      baseRef: "main",
      headRef: "feat/x",
      codeDiffs: [
        {
          title: "Quantity-aware totals",
          patch: totalsPatch,
          annotations: [
            {
              anchor: anchorOnTotalsPatch(),
              text: "Totals now multiply by quantity and add tax.",
              label: "Core calculation",
              scenarioIds: ["tc-1", "tc-missing"],
            },
          ],
        },
      ],
    });

    expect(review.codeDiffs).toHaveLength(1);
    const evidence = review.codeDiffs[0];
    expect(evidence.title).toBe("Quantity-aware totals");
    expect(evidence.baseLabel).toBe("main");
    expect(evidence.headLabel).toBe("feat/x");
    expect(evidence.files[0].newPath).toBe("src/cart/totals.ts");

    const [annotation] = evidence.annotations;
    expect(annotation.resolution.state).toBe("anchored");
    expect(annotation.resolution.fuzz).toBe(0);
    expect(annotation.scenarios).toEqual([
      {
        id: "tc-1",
        resolved: true,
        scenario: "Quantity multiplies the line total",
        status: "passed",
      },
      { id: "tc-missing", resolved: false },
    ]);
  });

  it("surfaces an orphaned annotation when the anchored lines were rewritten", () => {
    const anchor = anchorOnTotalsPatch();
    const rewritten = totalsPatch
      .replace("+    sum += item.price * item.quantity;", "+    sum += lineTotal(item);")
      .replace("+    sum += item.tax;", "+    sum += taxFor(item);");
    const review = buildReview(runWithScenario("tc-1"), {
      changedFiles: [],
      codeDiffs: [
        {
          title: "Regenerated",
          patch: rewritten,
          annotations: [{ anchor, text: "Now stale.", scenarioIds: ["tc-1"] }],
        },
      ],
    });
    const [annotation] = review.codeDiffs[0].annotations;
    expect(annotation.resolution).toEqual({ state: "orphaned" });
    // Scenario refs still resolve — the prose and its evidence stay visible.
    expect(annotation.scenarios[0].resolved).toBe(true);
  });

  it("prefers explicit comparison labels over refs", () => {
    const review = buildReview(runWithScenario("tc-1"), {
      changedFiles: [],
      baseRef: "abc123",
      codeDiffs: [
        { title: "T", patch: totalsPatch, baseLabel: "v1.2.0", annotations: [] },
      ],
    });
    expect(review.codeDiffs[0].baseLabel).toBe("v1.2.0");
    expect(review.codeDiffs[0].headLabel).toBeUndefined();
  });
});

describe("assembleCodeDiff (sidecar authoring seam)", () => {
  it("locates a unique match and builds a full-run content anchor", () => {
    const { input, warnings } = assembleCodeDiff({
      sidecar: {
        title: "Totals",
        annotations: [
          {
            file: "src/cart/totals.ts",
            match: "item.tax",
            text: "Tax joins the total.",
            scenarioIds: ["tc-1"],
          },
        ],
      },
      patch: totalsPatch,
    });
    expect(warnings).toEqual([]);
    const anchor = input.annotations[0].anchor;
    expect(anchor).toBeDefined();
    // Anchor covers the whole contiguous changed run, not just the matched line.
    expect(anchor!.changed.map((l) => l.kind)).toEqual(["del", "add", "add"]);
    expect(anchor!.file).toBe("src/cart/totals.ts");
  });

  it("warns on a missed match but keeps the annotation, explicitly orphaned", () => {
    const { input, warnings } = assembleCodeDiff({
      sidecar: {
        title: "Totals",
        annotations: [
          {
            file: "src/cart/totals.ts",
            match: "does not exist",
            text: "Stale prose.",
          },
        ],
      },
      patch: totalsPatch,
    });
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("no changed line");
    expect(input.annotations[0].anchor).toBeUndefined();
    expect(input.annotations[0].unresolved).toBe("orphaned");
    const review = buildReview(stubs.testRunResult(), {
      changedFiles: [],
      codeDiffs: [input],
    });
    expect(review.codeDiffs[0].annotations[0].resolution.state).toBe("orphaned");
    expect(review.codeDiffs[0].annotations[0].anchorHash).toBeUndefined();
  });

  it("warns when the file is not in the patch", () => {
    const { warnings } = assembleCodeDiff({
      sidecar: {
        title: "T",
        annotations: [{ file: "src/other.ts", match: "x", text: "t" }],
      },
      patch: totalsPatch,
    });
    expect(warnings[0]).toContain('file "src/other.ts" is not in the patch');
  });

  it("marks a non-unique match ambiguous, matching its warning", () => {
    const { input, warnings } = assembleCodeDiff({
      sidecar: {
        title: "T",
        annotations: [{ file: "src/cart/totals.ts", match: "sum +=", text: "t" }],
      },
      patch: totalsPatch,
    });
    expect(warnings[0]).toContain("matches 3 changed lines");
    expect(input.annotations[0].unresolved).toBe("ambiguous");
    const review = buildReview(stubs.testRunResult(), {
      changedFiles: [],
      codeDiffs: [input],
    });
    expect(review.codeDiffs[0].annotations[0].resolution.state).toBe("ambiguous");
  });

  it("warns on a non-https patchUrl", () => {
    const { warnings } = assembleCodeDiff({
      sidecar: { title: "T", patchUrl: "javascript:alert(1)", annotations: [] },
      patch: totalsPatch,
    });
    expect(warnings[0]).toContain("not https:");
  });
});

describe("code diff rendering", () => {
  // totalsPatch with a hostile changed line, for the escaping regression tests.
  const patch = totalsPatch.replace(
    "+    sum += item.tax;",
    '+    sum += "<script>alert(1)</script>";'
  );

  function reviewWithDiff() {
    const run = runWithScenario("tc-1");
    const { input } = assembleCodeDiff({
      sidecar: {
        title: "Quantity-aware totals",
        baseLabel: "main",
        headLabel: "feat/x",
        patchUrl: "https://example.com/changes.patch",
        annotations: [
          {
            file: "src/cart/totals.ts",
            match: "item.quantity",
            label: "Core calculation",
            text: "Totals now multiply by quantity.",
            scenarioIds: ["tc-1", "tc-missing"],
          },
        ],
      },
      patch,
    });
    return buildReview(run, { changedFiles: [], codeDiffs: [input] });
  }

  it("HTML renders annotation, scenario deep link, unverified ref, and escaped patch", () => {
    const html = new ReviewHtmlFormatter().format(reviewWithDiff());
    expect(html).toContain("Code diff: Quantity-aware totals");
    expect(html).toContain("Core calculation");
    expect(html).toContain('href="#claim-tc-1"');
    expect(html).toContain("unverified reference");
    expect(html).toContain("Comparing main → feat/x");
    expect(html).toContain("https://example.com/changes.patch");
    // Security: patch content renders as text, never as executable nodes.
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain('class="diff-add diff-anchored"');
  });

  it("HTML claim cards carry the deep-link target id", () => {
    const html = new ReviewHtmlFormatter().format(reviewWithDiff());
    expect(html).toContain('id="claim-tc-1"');
  });

  it("markdown renders the static fallback with fenced patch and notices", () => {
    const md = new ReviewMarkdownFormatter().format(reviewWithDiff());
    expect(md).toContain("## Code diff evidence: Quantity-aware totals");
    expect(md).toContain("### Core calculation");
    expect(md).toContain("✅ Quantity multiplies the line total (`tc-1`)");
    expect(md).toContain("⚠️ `tc-missing` — unverified reference");
    expect(md).toContain("```diff");
    expect(md).toContain("Canonical patch: https://example.com/changes.patch");
  });

  it("markdown marks an annotation with no scenarios as uncovered", () => {
    const { input } = assembleCodeDiff({
      sidecar: {
        title: "T",
        annotations: [
          { file: "src/cart/totals.ts", match: "item.quantity", text: "Prose." },
        ],
      },
      patch,
    });
    const md = new ReviewMarkdownFormatter().format(
      buildReview(stubs.testRunResult(), { changedFiles: [], codeDiffs: [input] })
    );
    expect(md).toContain("_Not covered by a scenario._");
  });

  it("markdown fences the patch longer than any backtick run inside it", () => {
    // A diff touching a Markdown file: its changed lines carry ``` fences.
    const mdPatch = totalsPatch.replace(
      "+    sum += item.tax;",
      "+```js\n+const x = 1;\n+```"
    ).replace("@@ -10,6 +10,7 @@", "@@ -10,6 +10,9 @@");
    const md = new ReviewMarkdownFormatter().format(
      buildReview(stubs.testRunResult(), {
        changedFiles: [],
        codeDiffs: [{ title: "T", patch: mdPatch, annotations: [] }],
      })
    );
    // The fence must be 4 backticks, and the inner ``` must stay inside it.
    expect(md).toContain("````diff");
    const fenced = md.slice(md.indexOf("````diff"));
    expect(fenced.split("\n````")[0]).toContain("+```js");
  });

  it("renders a non-https patchUrl as inert text, never a link", () => {
    const { input } = assembleCodeDiff({
      sidecar: {
        title: "T",
        patchUrl: "javascript:alert(1)",
        annotations: [],
      },
      patch: totalsPatch,
    });
    const review = buildReview(stubs.testRunResult(), {
      changedFiles: [],
      codeDiffs: [input],
    });
    const html = new ReviewHtmlFormatter().format(review);
    expect(html).not.toContain('href="javascript:');
    expect(html).toContain("<code>javascript:alert(1)</code>");
    const md = new ReviewMarkdownFormatter().format(review);
    expect(md).toContain("Canonical patch: `javascript:alert(1)`");
  });
});

describe("codeDiffDiagnostics", () => {
  function reviewFor(annotations: Parameters<typeof assembleCodeDiff>[0]["sidecar"]["annotations"], run = runWithScenario("tc-1")) {
    const { input } = assembleCodeDiff({
      sidecar: { title: "Totals", annotations },
      patch: totalsPatch,
    });
    return buildReview(run, { changedFiles: [], codeDiffs: [input] });
  }

  it("is empty when anchors hold and scenarios resolve", () => {
    const review = reviewFor([
      { file: "src/cart/totals.ts", match: "item.quantity", text: "t", scenarioIds: ["tc-1"] },
    ]);
    expect(codeDiffDiagnostics(review)).toEqual([]);
  });

  it("reports orphaned and ambiguous anchors by label", () => {
    const review = reviewFor([
      { file: "src/cart/totals.ts", match: "gone", label: "Lost", text: "t" },
      { file: "src/cart/totals.ts", match: "sum +=", label: "Vague", text: "t" },
    ]);
    const issues = codeDiffDiagnostics(review);
    expect(issues).toHaveLength(2);
    expect(issues[0]).toContain('"Totals" Lost: anchor is orphaned');
    expect(issues[1]).toContain('"Totals" Vague: anchor is ambiguous');
  });

  it("reports unverified scenario references", () => {
    const review = reviewFor([
      { file: "src/cart/totals.ts", match: "item.quantity", text: "t", scenarioIds: ["tc-ghost"] },
    ]);
    expect(codeDiffDiagnostics(review)).toEqual([
      '"Totals" annotation 1: cites scenario "tc-ghost" which is not in this run',
    ]);
  });
});

describe("code diff end-to-end gate", () => {
  it("explains, links, regenerates, and orphans — the full authoring loop", () => {
    const patchV1 = totalsPatch;
    const run = runWithScenario("tc-1");
    const sidecar = {
      title: "Quantity-aware totals",
      annotations: [
        {
          file: "src/cart/totals.ts",
          match: "item.quantity",
          text: "Multiply by quantity.",
          scenarioIds: ["tc-1"],
        },
      ],
    };

    // 1. Author against patch v1: anchored, scenario resolves, both outputs render.
    const v1 = assembleCodeDiff({ sidecar, patch: patchV1 });
    expect(v1.warnings).toEqual([]);
    const reviewV1 = buildReview(run, { changedFiles: [], codeDiffs: [v1.input] });
    expect(reviewV1.codeDiffs[0].annotations[0].resolution.state).toBe("anchored");
    expect(new ReviewHtmlFormatter().format(reviewV1)).toContain('href="#claim-tc-1"');
    expect(new ReviewMarkdownFormatter().format(reviewV1)).toContain("Multiply by quantity.");

    // 2. The change is rewritten and the patch regenerated: the SAME anchor must
    //    orphan (never silently reattach), while the prose and evidence stay visible.
    const patchV2 = patchV1
      .replace("+    sum += item.price * item.quantity;", "+    sum += lineTotal(item);")
      .replace("+    sum += item.tax;", "+    sum += taxFor(item);");
    const reviewV2 = buildReview(run, {
      changedFiles: [],
      codeDiffs: [{ ...v1.input, patch: patchV2 }],
    });
    const annotation = reviewV2.codeDiffs[0].annotations[0];
    expect(annotation.resolution.state).toBe("orphaned");
    expect(annotation.scenarios[0].resolved).toBe(true);
    const htmlV2 = new ReviewHtmlFormatter().format(reviewV2);
    expect(htmlV2).toContain("Orphaned annotation");
  });
});
