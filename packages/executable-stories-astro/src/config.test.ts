import { describe, it, expect } from "vitest";

import { resolveSources, passesFilter, slugify, type FilterableScenario } from "./config.js";

describe("resolveSources", () => {
  it("accepts the single `source` shorthand", () => {
    const [s, ...rest] = resolveSources({ source: "reports/raw-run.json" });
    expect(rest).toHaveLength(0);
    expect(s).toMatchObject({ source: "reports/raw-run.json", synthesize: true });
    // Left unresolved on purpose: the loader decides from what the path turns
    // out to be, since a directory of per-file reports is canonical.
    expect(s!.inputType).toBeUndefined();
  });

  it("keeps an input type the author stated", () => {
    const [s] = resolveSources({ source: "reports/raw-run.json", inputType: "canonical" });
    expect(s!.inputType).toBe("canonical");
  });

  it("derives a meaningful name from a generic filename via the parent dir", () => {
    const [s] = resolveSources({ source: "../apps/cdk/test-reports/raw-run.json" });
    expect(s!.name).toBe("cdk"); // raw-run.json is generic -> use the meaningful parent
    expect(s!.label).toBe("cdk");
  });

  it("keeps multiple named sources and fills label from name", () => {
    const out = resolveSources({
      sources: [
        { name: "cdk", label: "Infrastructure", source: "a/raw-run.json" },
        { name: "cli", source: "b/raw-run.json" },
      ],
    });
    expect(out.map((s) => [s.name, s.label])).toEqual([
      ["cdk", "Infrastructure"],
      ["cli", "cli"],
    ]);
  });

  it("disambiguates colliding derived names", () => {
    const out = resolveSources({
      sources: [{ source: "x/raw-run.json" }, { source: "y/raw-run.json" }],
    });
    // both parents differ (x, y) so no collision here; force one:
    const dup = resolveSources({ sources: [{ name: "api", source: "a" }, { name: "api", source: "b" }] });
    expect(dup.map((s) => s.name)).toEqual(["api", "api-2"]);
    expect(new Set(out.map((s) => s.name)).size).toBe(2);
  });

  it("throws when no source is configured", () => {
    expect(() => resolveSources({})).toThrow(/no source configured/);
  });
});

describe("passesFilter", () => {
  const sc = (over: Partial<FilterableScenario>): FilterableScenario => ({
    status: "passed",
    tags: [],
    feature: { title: "Login", sourceFile: "src/login.test.ts" },
    ...over,
  });

  it("include.tags keeps only scenarios with a matching tag", () => {
    expect(passesFilter(sc({ tags: ["security"] }), { include: { tags: ["security"] } })).toBe(true);
    expect(passesFilter(sc({ tags: ["ui"] }), { include: { tags: ["security"] } })).toBe(false);
  });

  it("include.status filters by result", () => {
    expect(passesFilter(sc({ status: "failed" }), { include: { status: ["failed"] } })).toBe(true);
    expect(passesFilter(sc({ status: "passed" }), { include: { status: ["failed"] } })).toBe(false);
  });

  it("exclude runs after include", () => {
    expect(passesFilter(sc({ tags: ["wip"] }), { exclude: { tags: ["wip"] } })).toBe(false);
    expect(passesFilter(sc({ status: "skipped" }), { exclude: { status: ["skipped"] } })).toBe(false);
  });

  it("include.features matches feature title or source file (substring, case-insensitive)", () => {
    expect(passesFilter(sc({}), { include: { features: ["login"] } })).toBe(true);
    expect(passesFilter(sc({}), { include: { features: ["checkout"] } })).toBe(false);
  });

  it("no filter = everything passes", () => {
    expect(passesFilter(sc({}), {})).toBe(true);
  });
});

describe("slugify", () => {
  it("lowercases and dashes non-alphanumerics", () => {
    expect(slugify("Slack Relay · test/slack-relay.test.ts")).toBe("slack-relay-test-slack-relay-test-ts");
  });
});
