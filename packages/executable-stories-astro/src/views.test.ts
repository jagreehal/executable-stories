import { describe, it, expect } from "vitest";

import { matchView, resolveViews, viewReport } from "./views.js";
import type { StoryEntryData } from "./loader.js";

const entry = (over: Partial<StoryEntryData>): StoryEntryData =>
  ({
    id: "s",
    entryId: `e-${over.id ?? over.title ?? Math.abs(JSON.stringify(over).length)}`,
    slug: "s",
    title: "t",
    status: "passed",
    durationMs: 1,
    tags: [],
    retry: 0,
    retries: 0,
    docEntries: [],
    steps: [],
    attachments: [],
    feature: { id: "f1", title: "Checkout", sourceFile: "checkout.spec.ts" },
    source: { name: "web", label: "Web" },
    run: { runId: "r", finishedAtMs: 1 },
    ...over,
  }) as StoryEntryData;

describe("resolveViews", () => {
  it("normalizes bases and defaults labels from the last segment", () => {
    const views = resolveViews({ views: [{ base: "for/product/" }, { base: "/for/design", label: "Design" }] });
    expect(views).toEqual([
      { base: "/for/product", label: "Product" },
      { base: "/for/design", label: "Design" },
    ]);
  });

  it("returns [] when no views configured", () => {
    expect(resolveViews({})).toEqual([]);
  });

  it("throws on a missing base", () => {
    expect(() => resolveViews({ views: [{ base: "" }] })).toThrow(/needs a `base`/);
  });

  it("throws on duplicate bases and on collision with stories/explorer/journeys/states routes", () => {
    expect(() => resolveViews({ views: [{ base: "/for/qa" }, { base: "for/qa" }] })).toThrow(/collides/);
    expect(() => resolveViews({ views: [{ base: "/stories" }] })).toThrow(/collides/);
    expect(() => resolveViews({ explorerBase: "/x", views: [{ base: "/x" }] })).toThrow(/collides/);
    expect(() => resolveViews({ views: [{ base: "/journeys" }] })).toThrow(/collides/);
    expect(() => resolveViews({ views: [{ base: "/states" }] })).toThrow(/collides/);
  });

  it("does not reserve the base of a disabled route", () => {
    expect(resolveViews({ injectJourneys: false, views: [{ base: "/journeys" }] })).toEqual([
      { base: "/journeys", label: "Journeys" },
    ]);
    expect(resolveViews({ injectStates: false, injectExplorer: false, views: [{ base: "/states" }, { base: "/explorer" }] })).toHaveLength(2);
  });
});

describe("matchView", () => {
  const views = resolveViews({ views: [{ base: "/for/product" }, { base: "/for/design" }] });

  it("matches exact paths and trailing slashes", () => {
    expect(matchView("/for/product", views)?.base).toBe("/for/product");
    expect(matchView("/for/design/", views)?.base).toBe("/for/design");
  });

  it("matches under a site base prefix and misses unrelated paths", () => {
    expect(matchView("/docs/for/product", views)?.base).toBe("/for/product");
    expect(matchView("/stories", views)).toBeUndefined();
  });
});

describe("viewReport", () => {
  const entries = [
    entry({ id: "a", entryId: "a", title: "Pays with card", tags: ["audience:stakeholder", "capability:checkout"] }),
    entry({ id: "b", entryId: "b", title: "Refund path", tags: ["capability:refunds"], status: "failed" }),
    entry({ id: "c", entryId: "c", title: "Internal cache warmup", tags: [] }),
  ];
  const [view] = resolveViews({
    views: [{ base: "/for/product", include: { tags: ["audience:stakeholder", "capability:refunds"] }, groupBy: "tag" }],
  });

  it("filters by the view's include and groups into synthetic features", () => {
    const report = viewReport(entries, view!, "feature");
    expect(report.summary.total).toBe(2);
    expect(report.features.map((f) => f.title)).toEqual(["audience:stakeholder", "capability:refunds"]);
    expect(report.features[0]?.scenarios[0]?.title).toBe("Pays with card");
  });

  it("places a scenario in its first matching tag group only (no duplicate cards)", () => {
    const report = viewReport(entries, view!, "feature");
    const titles = report.features.flatMap((f) => f.scenarios.map((s) => s.title));
    expect(titles.filter((t) => t === "Pays with card")).toHaveLength(1);
  });

  it("falls back to the site groupBy and returns an empty report when nothing matches", () => {
    const [statusView] = resolveViews({ views: [{ base: "/for/qa", include: { status: ["failed"] } }] });
    const report = viewReport(entries, statusView!, "status");
    expect(report.features.map((f) => f.title)).toEqual(["Failed"]);
    const [none] = resolveViews({ views: [{ base: "/for/support", include: { tags: ["support"] } }] });
    expect(viewReport(entries, none!, "feature").summary.total).toBe(0);
  });
});
