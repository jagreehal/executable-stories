import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { canonicalizeRun, toStoryReport, type RawTestCase } from "executable-stories-core";
import { describe, expect, it } from "vitest";
import { storiesSidebar, type SidebarEntry, type SidebarItem } from "./index.js";

function tc(sourceFile: string, scenario: string, tags: string[], order: number): RawTestCase {
  return {
    title: scenario,
    titlePath: [sourceFile, scenario],
    sourceFile,
    sourceLine: order + 1,
    status: "pass",
    durationMs: 1,
    story: { scenario, steps: [], suitePath: ["Suite"], tags, sourceOrder: order },
  };
}

const RUN = {
  schemaVersion: 1,
  startedAtMs: 1000,
  finishedAtMs: 2000,
  projectRoot: "/proj",
  testCases: [
    tc("src/auth.story.test.ts", "logs in", ["smoke"], 0),
    tc("src/auth.story.test.ts", "blocks suspended user", ["security"], 1),
    tc("src/cart.story.test.ts", "adds an item", ["smoke"], 0),
  ],
};

function writeRun(run: unknown): string {
  const dir = mkdtempSync(path.join(tmpdir(), "es-sidebar-"));
  const file = path.join(dir, "raw-run.json");
  writeFileSync(file, JSON.stringify(run));
  return file;
}

function storiesGroup(entries: SidebarEntry[]): Extract<SidebarEntry, { items: SidebarItem[] }> {
  const s = entries.find((e) => e.label === "Stories");
  if (!s || !("items" in s)) throw new Error("no Stories group");
  return s;
}

describe("storiesSidebar", () => {
  it("folds the feature/scenario tree into the Stories group", () => {
    const source = writeRun(RUN);
    const group = storiesGroup(storiesSidebar({ source }));

    // First item is the overview link to the page itself.
    expect(group.items[0]).toEqual({ label: "All scenarios", link: "/stories/" });

    // One collapsed group per feature (two source files).
    const features = group.items.slice(1);
    expect(features.map((f) => ("label" in f ? f.label : "?"))).toEqual(["Suite", "Suite"]);
    for (const f of features) {
      expect("items" in f && (f as { collapsed?: boolean }).collapsed).toBe(true);
    }
  });

  it("links every scenario to the SAME anchor id the report renders", () => {
    const source = writeRun(RUN);
    // Ground truth: the exact ids the page's island renders, via the same
    // canonicalizeRun -> toStoryReport path.
    const report = toStoryReport(canonicalizeRun(RUN));
    const expected = report.features.flatMap((f) =>
      f.scenarios.map((s) => `/stories/#${s.id}`),
    );

    const group = storiesGroup(storiesSidebar({ source }));
    const links = group.items
      .slice(1)
      .flatMap((f) => ("items" in f ? f.items : []))
      .map((i) => ("link" in i ? i.link : "?"));

    expect(links).toEqual(expected);
    // Sanity: anchors are the compound feature--scenario ids, not bare titles.
    expect(links[0]).toMatch(/^\/stories\/#feature-.+--.+/);
  });

  it("honours include/exclude so no link points at a hidden scenario", () => {
    const source = writeRun(RUN);
    const group = storiesGroup(storiesSidebar({ source, exclude: { tags: ["security"] } }));
    const labels = group.items
      .slice(1)
      .flatMap((f) => ("items" in f ? f.items : []))
      .map((i) => ("label" in i ? i.label : "?"));
    expect(labels).toContain("logs in");
    expect(labels).not.toContain("blocks suspended user");
  });

  it("falls back to a plain link when no run JSON is readable (first run)", () => {
    const entries = storiesSidebar({ source: "/no/such/run.json" });
    expect(entries).toContainEqual({ label: "Stories", link: "/stories/" });
    // No throw, and no scenario tree when there is nothing to read.
    const s = entries.find((e) => e.label === "Stories")!;
    expect("items" in s).toBe(false);
  });
});
