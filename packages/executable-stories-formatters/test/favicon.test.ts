/**
 * Every generated HTML document carries the tab icon.
 *
 * Reports are opened several at a time — this run, last week's, the diff
 * between them — so an unmarked tab is a real cost. There is no shared head
 * builder: four modules each write their own `<!doctype html>`, which is
 * exactly how one of them ends up without it. The last test here is the guard
 * against a fifth appearing.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { canonicalizeRun } from "executable-stories-core/converters/acl/canonicalize";
import { toStoryReport } from "executable-stories-core/converters/story-report";
import type { TestRunResult } from "executable-stories-core/types/test-result";
import { renderReportToHtml } from "executable-stories-react/ssr";
import { describe, expect, it } from "vitest";

import { buildIndexEntries, renderColocatedIndex } from "../src/colocated-index";
import { RunDiffHtmlFormatter } from "../src/formatters/run-diff-html";
import { diffRuns } from "../src/compare/diff-runs";
import { stubs } from "./stubs";

const here = path.dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(
  fs.readFileSync(path.resolve(here, "../schemas/examples/full.json"), "utf8"),
);
const report = toStoryReport(canonicalizeRun(raw));

function tc(sourceFile: string, title: string, status: string) {
  return {
    title,
    sourceFile,
    status,
    durationMs: 1,
    titlePath: [title],
  } as unknown as TestRunResult["testCases"][number];
}

describe("report favicon", () => {
  it("marks the single-file report", () => {
    expect(renderReportToHtml(report, { title: "Run" })).toContain('<link rel="icon"');
  });

  it("marks the colocated index", () => {
    const run = {
      schemaVersion: 1,
      runId: "r1",
      startedAtMs: 0,
      finishedAtMs: 1,
      durationMs: 1,
      projectRoot: "/proj",
      testCases: [tc("src/auth.story.test.ts", "logs in", "passed")],
    } as unknown as TestRunResult;

    const entries = buildIndexEntries(
      run,
      new Map([["src/auth.story.test.ts", "reports/src/auth.story.html"]]),
      "reports",
    );

    expect(renderColocatedIndex(entries)).toContain('<link rel="icon"');
  });

  it("marks the run-diff report", () => {
    const baseline = stubs.testRunResult({ testCases: [] });
    const current = stubs.testRunResult({ testCases: [] });
    const html = new RunDiffHtmlFormatter().format(diffRuns(baseline, current));

    expect(html).toContain('<link rel="icon"');
  });

  it("inlines it, because a report makes no external request", () => {
    // A report is emailed, attached to a CI job and opened from disk. A linked
    // icon file would 404 everywhere but the directory it was written in.
    const html = renderReportToHtml(report, { title: "Run" });
    const href = /<link rel="icon" href="([^"]+)"/.exec(html)?.[1] ?? "";

    expect(href.startsWith("data:image/svg+xml,")).toBe(true);
    // Decodes back to the drawn mark rather than to something a browser will
    // silently drop: the `#` of each colour has to survive encoding, or the
    // data URI ends at the first one and the icon is blank.
    const svg = decodeURIComponent(href.slice("data:image/svg+xml,".length));
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("#40916c");
  });

  it("is on every document that writes its own head", () => {
    // The real risk is not a broken icon, it is a fifth `<!doctype html>`
    // landing here without one. Nothing enforces a shared head, so this does.
    const roots = [
      path.resolve(here, "../src"),
      path.resolve(here, "../../executable-stories-react/src"),
    ];

    const documents = roots
      .flatMap((root) => walk(root))
      .filter((file) => {
        const text = fs.readFileSync(file, "utf8");
        return /<!doctype html>/i.test(text) && !file.includes("generated");
      });

    expect(documents.length).toBeGreaterThanOrEqual(4);
    for (const file of documents) {
      expect(
        fs.readFileSync(file, "utf8"),
        `${path.basename(file)} writes an HTML document with no favicon`,
      ).toContain("REPORT_FAVICON_LINK");
    }
  });
});

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.tsx?$/.test(entry.name) && !/\.(test|stories)\.tsx?$/.test(entry.name)
      ? [full]
      : [];
  });
}
