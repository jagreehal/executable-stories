import { describe, expect, it } from "vitest";
import { scenariosCoveringPaths } from "../src/coverage-index";
import type { ScenarioIndex, ScenarioIndexItem } from "../src/formatters/scenario-index-json";

function item(id: string, covers: string[]): ScenarioIndexItem {
  return {
    id,
    title: id,
    status: "passed",
    feature: "F",
    sourceFile: "t.test.ts",
    tags: [],
    tickets: [],
    covers,
    durationMs: 0,
    steps: [],
    docKinds: [],
  };
}

function index(items: ScenarioIndexItem[]): ScenarioIndex {
  return {
    schemaVersion: "1.0",
    runId: "r",
    generatedAtMs: 0,
    summary: { total: items.length, passed: items.length, failed: 0, skipped: 0, pending: 0, durationMs: 0 },
    scenarios: items,
  };
}

describe("scenariosCoveringPaths", () => {
  const idx = index([
    item("a", ["src/auth/**"]),
    item("b", ["src/checkout/total.ts"]),
    item("c", []),
  ]);

  it("matches a glob against a single path", () => {
    expect(scenariosCoveringPaths(idx, ["src/auth/login.ts"]).map((s) => s.id)).toEqual(["a"]);
  });

  it("matches an exact path", () => {
    expect(scenariosCoveringPaths(idx, ["src/checkout/total.ts"]).map((s) => s.id)).toEqual(["b"]);
  });

  it("matches any of several query paths and dedupes", () => {
    expect(scenariosCoveringPaths(idx, ["src/auth/x.ts", "src/checkout/total.ts"]).map((s) => s.id)).toEqual([
      "a",
      "b",
    ]);
  });

  it("normalizes leading ./ on query paths", () => {
    expect(scenariosCoveringPaths(idx, ["./src/auth/login.ts"]).map((s) => s.id)).toEqual(["a"]);
  });

  it("returns nothing for scenarios with no covers", () => {
    expect(scenariosCoveringPaths(idx, ["src/other.ts"])).toEqual([]);
  });
});
