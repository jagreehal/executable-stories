/**
 * Golden test for the explainer pipeline: run artifact → explainer doc (with
 * quiz + micro-world HTML in the body) → freshness audit → stale detection
 * when the cited behaviour changes.
 */
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { toStoryReport } from "executable-stories-core/converters/story-report";
import { scenarioContentHash } from "executable-stories-core/explainer";
import type { TestRunResult } from "executable-stories-core/types/test-result";
import {
  buildExplainersReport,
  explainersGateFailed,
  parseExplainerDoc,
  renderExplainersReport,
} from "../src/explainers";
import { stubs } from "./stubs";

function makeRun(stepText: string, scenarioTitle = "Expired session redirects to login"): TestRunResult {
  const testCase = stubs.testCaseResult({
    id: "tc-1",
    status: "passed",
    sourceFile: "src/auth/session.story.test.ts",
    story: stubs.storyMeta({
      scenario: scenarioTitle,
      steps: [
        { id: "s0", keyword: "Given", text: stepText },
        { id: "s1", keyword: "Then", text: "they are redirected to /login" },
      ],
    }),
    stepResults: [
      { index: 0, stepId: "s0", status: "passed", durationMs: 1 },
      { index: 1, stepId: "s1", status: "passed", durationMs: 1 },
    ],
  });
  return stubs.testRunResult({ testCases: [testCase] });
}

/** Explainer markdown fixture: provenance frontmatter + quiz + micro-world HTML. */
function explainerMarkdown(scenario: { id: string; title: string; hash: string }): string {
  return `---
title: Session expiry now redirects
description: Why expired sessions bounce to /login, with evidence.
explainer:
  version: 1
  generated: 2026-07-13
  runId: run-1
  commit: abc1234
  scenarios:
    - id: ${scenario.id}
      title: ${scenario.title}
      hash: ${scenario.hash}
---

# Session expiry now redirects

## Intuition

An expired session should never see the dashboard.

## Micro-world

<div class="micro-world">
  <pre style="white-space: pre-wrap">GET /dashboard → 302 /login</pre>
</div>

## Quiz

<div class="quiz" data-question="Where does an expired session land?">
  <button data-correct="true">/login</button>
  <button data-correct="false">/home!</button>
</div>
`;
}

describe("explainer golden path", () => {
  let dir: string;
  beforeEach(() => {
    stubs.setFakerSeed(42);
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "explainers-"));
  });
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  function writeExplainerFor(run: TestRunResult): { id: string; hash: string } {
    const report = toStoryReport(run);
    const scenario = report.features[0].scenarios[0];
    const hash = scenarioContentHash(scenario);
    fs.writeFileSync(
      path.join(dir, "2026-07-13-session-expiry.md"),
      explainerMarkdown({ id: scenario.id, title: scenario.title, hash }),
      "utf8",
    );
    return { id: scenario.id, hash };
  }

  it("run → explainer → fresh audit", () => {
    const run = makeRun("an expired session");
    writeExplainerFor(run);

    const report = buildExplainersReport({ run, dir });
    expect(report.summary).toMatchObject({ total: 1, fresh: 1, stale: 0, invalid: 0 });
    expect(explainersGateFailed(report)).toBe(false);

    const text = renderExplainersReport(report, "text");
    expect(text).toContain("1 fresh");
    expect(text).toContain("✓ 2026-07-13-session-expiry.md");
  });

  it("behaviour change flips the explainer stale with a changed detail line", () => {
    writeExplainerFor(makeRun("an expired session"));
    const changedRun = makeRun("a revoked session");

    const report = buildExplainersReport({ run: changedRun, dir });
    expect(report.summary.stale).toBe(1);
    expect(explainersGateFailed(report)).toBe(true);
    expect(report.explainers[0].check?.scenarios[0].status).toBe("changed");

    const text = renderExplainersReport(report, "text");
    expect(text).toContain("(stale)");
    expect(text).toContain("changed:");
  });

  it("scenario removal reports missing", () => {
    writeExplainerFor(makeRun("an expired session"));
    const differentRun = makeRun("something else", "A completely different scenario");

    const report = buildExplainersReport({ run: differentRun, dir });
    expect(report.explainers[0].check?.scenarios[0].status).toBe("missing");
    expect(renderExplainersReport(report, "text")).toContain("missing:");
  });

  it("json format round-trips the full report", () => {
    const run = makeRun("an expired session");
    writeExplainerFor(run);
    const report = buildExplainersReport({ run, dir });
    const parsed = JSON.parse(renderExplainersReport(report, "json"));
    expect(parsed.summary.fresh).toBe(1);
    expect(parsed.explainers[0].explainer.scenarios[0].id).toBeTruthy();
  });

  it("ignores plain markdown without an explainer block", () => {
    fs.writeFileSync(path.join(dir, "runbook.md"), "# Runbook\n\nNo frontmatter here.\n", "utf8");
    const report = buildExplainersReport({ run: makeRun("an expired session"), dir });
    expect(report.summary.total).toBe(0);
  });

  it("flags an explainer with broken YAML frontmatter as invalid (never silently skipped)", () => {
    fs.writeFileSync(
      path.join(dir, "broken.md"),
      `---\ntitle: Broken\nexplainer:\n  version: 1\n  scenarios: [unclosed\n---\n\nBody.\n`,
      "utf8",
    );
    const report = buildExplainersReport({ run: makeRun("an expired session"), dir });
    expect(report.summary.invalid).toBe(1);
    expect(explainersGateFailed(report)).toBe(true);
    expect(report.explainers[0].errors.join("\n")).toContain("YAML parse failed");
  });

  it("skips broken YAML in docs that are not explainers", () => {
    fs.writeFileSync(
      path.join(dir, "someone-elses.md"),
      `---\ntitle: Other\nlist: [unclosed\n---\n\nBody.\n`,
      "utf8",
    );
    const report = buildExplainersReport({ run: makeRun("an expired session"), dir });
    expect(report.summary.total).toBe(0);
  });

  it("rejects hash-less citations (hash is mandatory in v1)", () => {
    fs.writeFileSync(
      path.join(dir, "no-hash.md"),
      `---\ntitle: No hash\nexplainer:\n  version: 1\n  scenarios:\n    - id: some-scenario\n---\n\nBody.\n`,
      "utf8",
    );
    const report = buildExplainersReport({ run: makeRun("an expired session"), dir });
    expect(report.summary.invalid).toBe(1);
    expect(report.explainers[0].errors.join("\n")).toContain("hash");
  });

  it("flags schema-invalid explainer blocks", () => {
    fs.writeFileSync(
      path.join(dir, "bad.md"),
      `---\ntitle: Bad\nexplainer:\n  version: 1\n  scenarios: []\n---\n\nBody.\n`,
      "utf8",
    );
    const report = buildExplainersReport({ run: makeRun("an expired session"), dir });
    expect(report.summary.invalid).toBe(1);
    expect(explainersGateFailed(report)).toBe(true);
    expect(renderExplainersReport(report, "text")).toContain("invalid frontmatter");
  });
});

describe("explainer-v1 schema ↔ core coercion sync", () => {
  it("the schema's hash pattern is exactly core's SCENARIO_HASH_PATTERN", async () => {
    // Two validators exist for the v1 contract: the Ajv schema (strict, CI)
    // and core's coercion (light, Astro banner). This pin keeps their idea of
    // a valid hash identical so CI and the docs site never disagree about the
    // same file.
    const { SCENARIO_HASH_PATTERN } = await import("executable-stories-core/explainer");
    const schema = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "../schemas/explainer-v1.json"), "utf8"),
    );
    const schemaPattern = schema.properties.scenarios.items.properties.hash.pattern;
    expect(new RegExp(schemaPattern).source).toBe(SCENARIO_HASH_PATTERN.source);
  });
});

describe("parseExplainerDoc", () => {
  it("returns undefined for docs without frontmatter or without an explainer key", () => {
    expect(parseExplainerDoc("# Plain doc")).toBeUndefined();
    expect(parseExplainerDoc("---\ntitle: Doc\n---\n\nBody")).toBeUndefined();
  });

  it("reports schema errors with paths", () => {
    const result = parseExplainerDoc(
      `---\nexplainer:\n  version: 2\n  scenarios:\n    - id: s1\n---\n`,
    );
    expect(result?.explainer).toBeUndefined();
    expect(result?.errors.join("\n")).toContain("version");
  });
});
