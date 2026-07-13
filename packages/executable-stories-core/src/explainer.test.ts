import { describe, expect, it } from "vitest";

import {
  checkExplainerRef,
  explainerRefFromFrontmatter,
  scenarioContentHash,
  type ExplainerRef,
} from "./explainer.js";
import type { ReportScenario, ReportStep } from "./types/story-report.js";

function step(keyword: ReportStep["keyword"], text: string, index: number): ReportStep {
  return {
    id: `step-${index}`,
    index,
    keyword,
    text,
    status: "passed",
    durationMs: 1,
    docEntries: [],
  };
}

function scenario(id: string, title: string, stepTexts: string[]): ReportScenario {
  return {
    id,
    title,
    status: "passed",
    durationMs: 1,
    tags: [],
    retry: 0,
    retries: 0,
    docEntries: [],
    attachments: [],
    steps: stepTexts.map((text, index) => step("Given", text, index)),
  };
}

describe("scenarioContentHash", () => {
  it("is deterministic and 16 lowercase hex chars", () => {
    const s = scenario("s1", "Login works", ["a user exists"]);
    const hash = scenarioContentHash(s);
    expect(hash).toBe(scenarioContentHash(scenario("other-id", "Login works", ["a user exists"])));
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it("changes when a step text changes but not when status would", () => {
    const before = scenarioContentHash(scenario("s1", "Login works", ["a user exists"]));
    const after = scenarioContentHash(scenario("s1", "Login works", ["an admin exists"]));
    expect(after).not.toBe(before);
    const failing = scenario("s1", "Login works", ["a user exists"]);
    failing.status = "failed";
    expect(scenarioContentHash(failing)).toBe(before);
  });
});

describe("explainerRefFromFrontmatter", () => {
  it("coerces a valid block", () => {
    const ref = explainerRefFromFrontmatter({
      version: 1,
      runId: "run-1",
      scenarios: [{ id: "s1", title: "Login works", hash: "0123456789abcdef" }],
    });
    expect(ref?.scenarios[0]).toEqual({ id: "s1", title: "Login works", hash: "0123456789abcdef" });
  });

  it("rejects wrong versions, empty scenario lists, missing ids, and missing hashes", () => {
    expect(
      explainerRefFromFrontmatter({ version: 2, scenarios: [{ id: "s1", hash: "0123456789abcdef" }] }),
    ).toBeUndefined();
    expect(explainerRefFromFrontmatter({ version: 1, scenarios: [] })).toBeUndefined();
    expect(
      explainerRefFromFrontmatter({ version: 1, scenarios: [{ title: "no id", hash: "0123456789abcdef" }] }),
    ).toBeUndefined();
    // hash is mandatory in v1: id-only citations cannot detect drift.
    expect(explainerRefFromFrontmatter({ version: 1, scenarios: [{ id: "s1" }] })).toBeUndefined();
    expect(explainerRefFromFrontmatter("nope")).toBeUndefined();
  });

  it("rejects malformed hashes (must match the v1 16-hex pattern, same as the JSON Schema)", () => {
    expect(
      explainerRefFromFrontmatter({ version: 1, scenarios: [{ id: "s1", hash: "abc" }] }),
    ).toBeUndefined();
    expect(
      explainerRefFromFrontmatter({ version: 1, scenarios: [{ id: "s1", hash: "0123456789ABCDEF" }] }),
    ).toBeUndefined();
  });
});

describe("checkExplainerRef", () => {
  const current = scenario("s1", "Login works", ["a user exists"]);
  const currentHash = scenarioContentHash(current);

  function refWith(overrides: Partial<ExplainerRef["scenarios"][0]>): ExplainerRef {
    return {
      version: 1,
      scenarios: [{ id: "s1", title: "Login works", hash: currentHash, ...overrides }],
    };
  }

  it("is fresh when id and hash match", () => {
    const result = checkExplainerRef(refWith({}), [current]);
    expect(result.status).toBe("fresh");
    expect(result.scenarios[0].status).toBe("ok");
  });


  it("flags changed content", () => {
    const mutated = scenario("s1", "Login works", ["an admin exists"]);
    const result = checkExplainerRef(refWith({}), [mutated]);
    expect(result.status).toBe("stale");
    expect(result.scenarios[0].status).toBe("changed");
    expect(result.scenarios[0].currentHash).toBe(scenarioContentHash(mutated));
  });

  it("detects a rename (same title + content under a new id)", () => {
    const renamed = scenario("s1-v2", "Login works", ["a user exists"]);
    const result = checkExplainerRef(refWith({}), [renamed]);
    expect(result.status).toBe("stale");
    expect(result.scenarios[0].status).toBe("renamed");
    expect(result.scenarios[0].matchedId).toBe("s1-v2");
  });

  it("treats same-title different-content as changed, not renamed", () => {
    const drifted = scenario("s1-v2", "Login works", ["an admin exists"]);
    const result = checkExplainerRef(refWith({}), [drifted]);
    expect(result.scenarios[0].status).toBe("changed");
  });

  it("flags missing scenarios", () => {
    const result = checkExplainerRef(refWith({}), [scenario("other", "Different", ["x"])]);
    expect(result.status).toBe("stale");
    expect(result.scenarios[0].status).toBe("missing");
  });
});
