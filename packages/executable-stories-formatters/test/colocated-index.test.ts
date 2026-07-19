import { describe, expect, it } from "vitest";

import type { TestRunResult } from "executable-stories-core/types/test-result";

import { buildIndexEntries, renderColocatedIndex } from "../src/colocated-index";

function tc(sourceFile: string, title: string, status: string) {
  return { title, sourceFile, status, durationMs: 1, titlePath: [title] } as unknown as TestRunResult["testCases"][number];
}

const RUN = {
  schemaVersion: 1,
  runId: "r1",
  startedAtMs: 0,
  finishedAtMs: 1,
  durationMs: 1,
  projectRoot: "/proj",
  testCases: [
    tc("src/auth.story.test.ts", "logs in", "passed"),
    tc("src/auth.story.test.ts", "blocks suspended", "failed"),
    tc("src/cart.story.test.ts", "adds an item", "passed"),
    tc("src/cart.story.test.ts", "removes an item", "skipped"),
  ],
} as unknown as TestRunResult;

const REPORTS = new Map([
  ["src/auth.story.test.ts", "reports/src/auth.story.html"],
  ["src/cart.story.test.ts", "reports/src/cart.story.html"],
]);

describe("buildIndexEntries", () => {
  it("counts each source file's scenarios by status", () => {
    const entries = buildIndexEntries(RUN, REPORTS, "reports");
    const auth = entries.find((e) => e.sourceFile === "src/auth.story.test.ts");
    expect(auth?.counts).toEqual({ passed: 1, failed: 1, skipped: 0, pending: 0 });
    const cart = entries.find((e) => e.sourceFile === "src/cart.story.test.ts");
    expect(cart?.counts).toEqual({ passed: 1, failed: 0, skipped: 1, pending: 0 });
  });

  it("puts files with failures first — the index is a triage surface too", () => {
    const entries = buildIndexEntries(RUN, REPORTS, "reports");
    expect(entries[0].sourceFile).toBe("src/auth.story.test.ts");
  });

  it("sorts the rest alphabetically for a stable page", () => {
    const clean = { ...RUN, testCases: RUN.testCases.filter((t) => t.status !== "failed") } as TestRunResult;
    const entries = buildIndexEntries(clean, REPORTS, "reports");
    expect(entries.map((e) => e.sourceFile)).toEqual(["src/auth.story.test.ts", "src/cart.story.test.ts"]);
  });

  it("links each report relative to the index, with posix separators", () => {
    const entries = buildIndexEntries(RUN, REPORTS, "reports");
    expect(entries.map((e) => e.href).sort()).toEqual(["src/auth.story.html", "src/cart.story.html"]);
  });

  it("tolerates the adapters' raw status spellings", () => {
    const raw = {
      ...RUN,
      testCases: [tc("a.test.ts", "x", "pass"), tc("a.test.ts", "y", "fail"), tc("a.test.ts", "z", "skip")],
    } as TestRunResult;
    const entries = buildIndexEntries(raw, new Map([["a.test.ts", "reports/a.html"]]), "reports");
    expect(entries[0].counts).toEqual({ passed: 1, failed: 1, skipped: 1, pending: 0 });
  });
});

describe("renderColocatedIndex", () => {
  it("renders one link per report with its status pills", () => {
    const html = renderColocatedIndex(buildIndexEntries(RUN, REPORTS, "reports"));
    expect(html).toContain('<a href="src/auth.story.html">src/auth.story.test.ts</a>');
    expect(html).toContain('<span class="pill failed">1 failed</span>');
    expect(html).toContain("2 files · 4 scenarios · 2 passed, 1 failed, 1 skipped");
  });

  it("is self-contained — no scripts and no external requests", () => {
    const html = renderColocatedIndex(buildIndexEntries(RUN, REPORTS, "reports"));
    expect(html).not.toContain("<script");
    expect(html).not.toMatch(/https?:\/\//);
  });

  it("escapes source paths so a crafted filename can't inject markup", () => {
    const entries = buildIndexEntries(
      { ...RUN, testCases: [tc('a"><img src=x>.ts', "t", "passed")] } as TestRunResult,
      new Map([['a"><img src=x>.ts', "reports/x.html"]]),
      "reports",
    );
    const html = renderColocatedIndex(entries);
    expect(html).not.toContain("<img src=x>");
    expect(html).toContain("&quot;&gt;&lt;img");
  });

  it("says so plainly when nothing was written", () => {
    expect(renderColocatedIndex([])).toContain("No reports were written.");
  });

  it("uses the configured report title", () => {
    expect(renderColocatedIndex([], "Checkout suite")).toContain("<title>Checkout suite</title>");
  });
});
