import { describe, expect, it } from "vitest";

import type { StoryReport } from "executable-stories-core";

import { defaultCollapsedIds, failuresFirst } from "../src/interactive/triage-default";

function scenario(id: string, status: string) {
  return {
    id,
    title: id,
    status,
    durationMs: 1,
    tags: [],
    retry: 0,
    retries: 0,
    docEntries: [],
    steps: [],
    attachments: [],
  } as unknown as StoryReport["features"][number]["scenarios"][number];
}

function feature(id: string, statuses: string[]) {
  return {
    id,
    title: id,
    sourceFile: `${id}.test.ts`,
    summary: { total: statuses.length, passed: 0, failed: 0, skipped: 0, pending: 0, durationMs: 1 },
    scenarios: statuses.map((s, i) => scenario(`${id}-s${i}`, s)),
  } as unknown as StoryReport["features"][number];
}

function report(features: StoryReport["features"], failed: number): StoryReport {
  return {
    schemaVersion: "1.0",
    runId: "r",
    startedAtMs: 0,
    finishedAtMs: 1,
    durationMs: 1,
    projectRoot: "/p",
    summary: { total: 0, passed: 0, failed, skipped: 0, pending: 0, durationMs: 1 },
    features,
  } as unknown as StoryReport;
}

const MIXED = report([feature("auth", ["passed", "passed"]), feature("cart", ["passed", "failed"])], 1);

describe("defaultCollapsedIds", () => {
  it("collapses nothing on an all-green run — there is nothing to triage", () => {
    const green = report([feature("auth", ["passed"]), feature("cart", ["passed"])], 0);
    expect(defaultCollapsedIds(green).size).toBe(0);
  });

  it("collapses passing features whole when the run has failures", () => {
    const ids = defaultCollapsedIds(MIXED);
    expect(ids.has("auth")).toBe(true);
    // Its scenarios collapse too, so expanding the feature doesn't dump
    // every step at once.
    expect(ids.has("auth-s0")).toBe(true);
    expect(ids.has("auth-s1")).toBe(true);
  });

  it("leaves the failing scenario expanded, and its feature open", () => {
    const ids = defaultCollapsedIds(MIXED);
    expect(ids.has("cart")).toBe(false);
    expect(ids.has("cart-s1")).toBe(false);
  });

  it("still collapses passing siblings inside a failing feature", () => {
    const ids = defaultCollapsedIds(MIXED);
    expect(ids.has("cart-s0")).toBe(true);
  });

  it("treats skipped and pending as not needing attention", () => {
    const r = report([feature("mix", ["skipped", "pending", "failed"])], 1);
    const ids = defaultCollapsedIds(r);
    expect(ids.has("mix-s0")).toBe(true);
    expect(ids.has("mix-s1")).toBe(true);
    expect(ids.has("mix-s2")).toBe(false);
  });
});

describe("failuresFirst", () => {
  it("floats features with failures to the top", () => {
    expect(failuresFirst(MIXED).features.map((f) => f.id)).toEqual(["cart", "auth"]);
  });

  it("leaves an all-green run in source order", () => {
    const green = report([feature("b", ["passed"]), feature("a", ["passed"])], 0);
    expect(failuresFirst(green).features.map((f) => f.id)).toEqual(["b", "a"]);
  });

  it("is a stable partition — relative order is preserved within each group", () => {
    const r = report(
      [
        feature("p1", ["passed"]),
        feature("f1", ["failed"]),
        feature("p2", ["passed"]),
        feature("f2", ["failed"]),
      ],
      2,
    );
    expect(failuresFirst(r).features.map((f) => f.id)).toEqual(["f1", "f2", "p1", "p2"]);
  });

  it("returns the report untouched when the summary claims failures but no feature has one", () => {
    // Filtered views can hide the failing feature; ordering must not throw.
    const r = report([feature("a", ["passed"])], 1);
    expect(failuresFirst(r).features.map((f) => f.id)).toEqual(["a"]);
  });
});
