import { describe, it, expect } from "vitest";

import {
  getFeatureSummary,
  getScenario,
  listScenarioSummaries,
  runProvenance,
  slowestScenarios,
} from "./report-queries.js";
import type {
  ReportFeature,
  ReportScenario,
  ReportStep,
  StoryReport,
} from "./types/story-report.js";

function step(overrides: Partial<ReportStep> = {}): ReportStep {
  return {
    id: "step-1",
    index: 0,
    keyword: "Given",
    text: "a step",
    status: "passed",
    durationMs: 1,
    docEntries: [],
    ...overrides,
  } as ReportStep;
}

function scenario(overrides: Partial<ReportScenario> = {}): ReportScenario {
  return {
    id: "s1",
    title: "Scenario one",
    status: "passed",
    durationMs: 10,
    tags: [],
    retry: 0,
    retries: 0,
    docEntries: [],
    steps: [step()],
    attachments: [],
    ...overrides,
  } as ReportScenario;
}

function feature(overrides: Partial<ReportFeature> = {}): ReportFeature {
  const scenarios = overrides.scenarios ?? [scenario()];
  return {
    id: "f1",
    title: "Checkout",
    sourceFile: "src/checkout.story.test.ts",
    summary: {
      total: scenarios.length,
      passed: scenarios.filter((s) => s.status === "passed").length,
      failed: scenarios.filter((s) => s.status === "failed").length,
      skipped: 0,
      pending: 0,
      durationMs: 10,
    },
    ...overrides,
    scenarios,
  } as ReportFeature;
}

function report(overrides: Partial<StoryReport> = {}): StoryReport {
  return {
    schemaVersion: "1.0",
    runId: "run-1",
    startedAtMs: 1_000,
    finishedAtMs: 2_000,
    durationMs: 1_000,
    projectRoot: "/repo",
    summary: { total: 1, passed: 1, failed: 0, skipped: 0, pending: 0, durationMs: 10 },
    features: [feature()],
    ...overrides,
  } as StoryReport;
}

describe("listScenarioSummaries", () => {
  it("flattens every scenario with its feature title and source file", () => {
    const summaries = listScenarioSummaries(report());
    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toMatchObject({
      id: "s1",
      title: "Scenario one",
      feature: "Checkout",
      sourceFile: "src/checkout.story.test.ts",
    });
  });

  it("carries step text and doc kinds but not doc bodies", () => {
    const summaries = listScenarioSummaries(
      report({
        features: [
          feature({
            scenarios: [
              scenario({
                docEntries: [{ kind: "note", text: "secret" }] as ReportScenario["docEntries"],
                steps: [step({ text: "the cart holds one item" })],
              }),
            ],
          }),
        ],
      }),
    );
    expect(summaries[0]?.docKinds).toEqual(["note"]);
    expect(summaries[0]?.steps[0]?.text).toBe("the cart holds one item");
    expect(JSON.stringify(summaries)).not.toContain("secret");
  });

  it("promotes a scenario error into the error field", () => {
    const summaries = listScenarioSummaries(
      report({
        features: [
          feature({
            scenarios: [
              scenario({
                status: "failed",
                errorMessage: "expected 2 to be 3",
                errorStack: "at checkout.ts:12",
              }),
            ],
          }),
        ],
      }),
    );
    expect(summaries[0]?.error).toEqual({
      message: "expected 2 to be 3",
      stack: "at checkout.ts:12",
    });
  });

  it("omits the error field entirely when the scenario passed", () => {
    expect(listScenarioSummaries(report())[0]?.error).toBeUndefined();
  });

  it("filters by status", () => {
    const r = report({
      features: [
        feature({
          scenarios: [
            scenario({ id: "s1", status: "passed" }),
            scenario({ id: "s2", status: "failed" }),
          ],
        }),
      ],
    });
    expect(listScenarioSummaries(r, { statuses: ["failed"] }).map((s) => s.id)).toEqual(["s2"]);
  });

  it("matches ANY of the requested tags, not all of them", () => {
    const r = report({
      features: [
        feature({
          scenarios: [
            scenario({ id: "s1", tags: ["checkout"] }),
            scenario({ id: "s2", tags: ["search"] }),
            scenario({ id: "s3", tags: ["billing"] }),
          ],
        }),
      ],
    });
    expect(listScenarioSummaries(r, { tags: ["checkout", "search"] }).map((s) => s.id)).toEqual([
      "s1",
      "s2",
    ]);
  });

  it("matches source files as substrings", () => {
    expect(listScenarioSummaries(report(), { sourceFiles: ["checkout"] })).toHaveLength(1);
    expect(listScenarioSummaries(report(), { sourceFiles: ["billing"] })).toHaveLength(0);
  });

  it("applies AND across filter kinds", () => {
    const r = report({
      features: [
        feature({
          scenarios: [
            scenario({ id: "s1", status: "failed", tags: ["checkout"] }),
            scenario({ id: "s2", status: "failed", tags: ["search"] }),
          ],
        }),
      ],
    });
    expect(
      listScenarioSummaries(r, { statuses: ["failed"], tags: ["search"] }).map((s) => s.id),
    ).toEqual(["s2"]);
  });

  it("treats empty filter arrays as no filter", () => {
    expect(listScenarioSummaries(report(), { statuses: [], tags: [] })).toHaveLength(1);
  });
});

describe("assertion evidence", () => {
  const claimSteps = (assertions: Array<number | undefined>) =>
    assertions.map((count, i) =>
      step({
        id: `s-${i}`,
        index: i,
        keyword: i === 0 ? "Given" : "Then",
        ...(count === undefined ? {} : { assertions: count }),
      }),
    );

  const stateOf = (assertions: Array<number | undefined>) =>
    listScenarioSummaries(
      report({
        features: [feature({ scenarios: [scenario({ steps: claimSteps(assertions) })] })],
      }),
    )[0]?.assertionState;

  it("grades a claim step that asserted as asserted", () => {
    expect(stateOf([undefined, 2])).toBe("asserted");
  });

  it("grades a claim step that asserted nothing as unasserted", () => {
    expect(stateOf([undefined, 0])).toBe("unasserted");
  });

  it("grades an adapter with no counter as unobserved, never unasserted", () => {
    expect(stateOf([undefined, undefined])).toBe("unobserved");
  });

  it("ignores assertions made during setup — they prove the setup, not the claim", () => {
    const state = listScenarioSummaries(
      report({
        features: [
          feature({
            scenarios: [
              scenario({
                steps: [
                  step({ id: "a", index: 0, keyword: "Given", assertions: 5 }),
                  step({ id: "b", index: 1, keyword: "Then", assertions: 0 }),
                ],
              }),
            ],
          }),
        ],
      }),
    )[0]?.assertionState;
    expect(state).toBe("unasserted");
  });

  it("carries the per-step count through, and omits it where nothing was observed", () => {
    const steps = listScenarioSummaries(
      report({
        features: [
          feature({
            scenarios: [
              scenario({
                steps: [
                  step({ id: "a", index: 0, keyword: "Then", assertions: 3 }),
                  step({ id: "b", index: 1, keyword: "Then" }),
                ],
              }),
            ],
          }),
        ],
      }),
    )[0]?.steps;
    expect(steps?.[0]?.assertions).toBe(3);
    expect(steps?.[1]).not.toHaveProperty("assertions", 0);
    expect(steps?.[1]?.assertions).toBeUndefined();
  });
});

describe("getScenario", () => {
  it("finds by id", () => {
    expect(getScenario(report(), "s1")?.scenario.title).toBe("Scenario one");
  });

  it("finds by exact title, because that is what a reader has to hand", () => {
    expect(getScenario(report(), "Scenario one")?.scenario.id).toBe("s1");
  });

  it("does not match on a partial title", () => {
    expect(getScenario(report(), "Scenario")).toBeUndefined();
  });

  it("returns the owning feature alongside the scenario", () => {
    expect(getScenario(report(), "s1")?.feature.title).toBe("Checkout");
  });

  it("returns undefined for an unknown id", () => {
    expect(getScenario(report(), "nope")).toBeUndefined();
  });

  it("prefers an id over an earlier scenario that happens to be titled the same", () => {
    const r = report({
      features: [
        feature({
          scenarios: [
            // This one's TITLE is the other one's ID.
            scenario({ id: "first", title: "second" }),
            scenario({ id: "second", title: "Second scenario" }),
          ],
        }),
      ],
    });
    expect(getScenario(r, "second")?.scenario.id).toBe("second");
  });

  it("falls back to the title when no scenario carries that id", () => {
    const r = report({
      features: [
        feature({
          scenarios: [
            scenario({ id: "first", title: "shared" }),
            scenario({ id: "second", title: "Second scenario" }),
          ],
        }),
      ],
    });
    expect(getScenario(r, "shared")?.scenario.id).toBe("first");
  });
});

describe("getFeatureSummary", () => {
  it("projects each feature's own counts", () => {
    const r = report({
      features: [
        feature({
          scenarios: [
            scenario({ id: "s1", status: "passed" }),
            scenario({ id: "s2", status: "failed" }),
          ],
        }),
      ],
    });
    expect(getFeatureSummary(r)).toEqual([
      {
        id: "f1",
        title: "Checkout",
        sourceFile: "src/checkout.story.test.ts",
        total: 2,
        passed: 1,
        failed: 1,
        skipped: 0,
        pending: 0,
        durationMs: 10,
      },
    ]);
  });
});

describe("runProvenance", () => {
  it("reports the age of the run in whole days", () => {
    const r = report({ finishedAtMs: 0 });
    expect(runProvenance(r, 3 * 86_400_000 + 1).ageDays).toBe(3);
  });

  it("never reports a negative age when a clock runs behind the report", () => {
    expect(runProvenance(report({ finishedAtMs: 10_000 }), 0).ageDays).toBe(0);
  });

  it("prefers the CI commit over the local git sha", () => {
    const r = report({
      gitSha: "local",
      ci: { name: "github", commitSha: "ci-sha", branch: "main" },
    });
    expect(runProvenance(r, 0)).toMatchObject({ gitSha: "ci-sha", branch: "main" });
  });

  it("omits absent provenance rather than reporting undefined fields", () => {
    expect(Object.keys(runProvenance(report(), 0))).toEqual([
      "runId",
      "startedAtMs",
      "finishedAtMs",
      "ageDays",
    ]);
  });
});

describe("slowestScenarios", () => {
  const timed = report({
    features: [
      feature({
        scenarios: [
          scenario({ id: "quick", title: "Quick", durationMs: 40 }),
          scenario({ id: "slow", title: "Slow", durationMs: 9_000 }),
          scenario({ id: "middling", title: "Middling", durationMs: 500 }),
        ],
      }),
      feature({
        id: "f2",
        sourceFile: "src/search.story.test.ts",
        scenarios: [scenario({ id: "slowest", title: "Slowest", durationMs: 12_000 })],
      }),
    ],
  });

  it("ranks scenarios by duration across every feature", () => {
    expect(slowestScenarios(timed, 3).map((s) => s.id)).toEqual(["slowest", "slow", "middling"]);
  });

  it("carries the source file, so a slow scenario can be found and fixed", () => {
    expect(slowestScenarios(timed, 1)[0]!.sourceFile).toBe("src/search.story.test.ts");
  });

  it("returns everything when the report is shorter than the limit", () => {
    expect(slowestScenarios(timed, 99)).toHaveLength(4);
  });

  it("skips scenarios that never ran, which have no duration to rank", () => {
    const pendingOnly = report({
      features: [feature({ scenarios: [scenario({ id: "todo", status: "pending", durationMs: 0 })] })],
    });
    expect(slowestScenarios(pendingOnly, 5)).toEqual([]);
  });
});
