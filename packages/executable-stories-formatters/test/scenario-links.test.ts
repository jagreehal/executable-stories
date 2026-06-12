import { describe, it, expect } from "vitest";
import { buildScenarioLinks, scenarioAnchor } from "../src/scenario-links";
import type { StoryReport } from "../src/types/story-report";

function report(
  features: Array<{
    sourceFile: string;
    scenarios: Array<{ id: string; title: string; tags?: string[]; status?: string }>;
  }>,
): StoryReport {
  return {
    runId: "run-1",
    features: features.map((f, fi) => ({
      id: `f${fi}`,
      title: f.sourceFile,
      sourceFile: f.sourceFile,
      scenarios: f.scenarios.map((s) => ({
        id: s.id,
        title: s.title,
        tags: s.tags ?? [],
        status: s.status ?? "passed",
      })),
    })),
  } as unknown as StoryReport;
}

describe("scenarioAnchor", () => {
  it("slugifies the title into a stable fragment id", () => {
    expect(scenarioAnchor("Guest can check out")).toBe("scenario-guest-can-check-out");
    expect(scenarioAnchor("Adds 2 + 2 = 4!")).toBe("scenario-adds-2-2-4");
  });
});

describe("buildScenarioLinks", () => {
  it("maps engineer and stakeholder scenarios to audience-split URLs", () => {
    const index = buildScenarioLinks(
      report([
        { sourceFile: "tests/math.story.test.ts", scenarios: [{ id: "m--adds", title: "Adds numbers" }] },
        { sourceFile: "e2e/checkout.story.spec.ts", scenarios: [{ id: "c--guest", title: "Guest can check out" }] },
      ]),
      { audienceSplit: true },
    );

    expect(index.scenarios["m--adds"]).toMatchObject({
      audience: "engineer",
      url: "/stories/engineer/math/",
      anchor: "scenario-adds-numbers",
      deepLink: "/stories/engineer/math/#scenario-adds-numbers",
    });
    expect(index.scenarios["c--guest"]).toMatchObject({
      audience: "stakeholder",
      url: "/stories/stakeholder/checkout/",
      deepLink: "/stories/stakeholder/checkout/#scenario-guest-can-check-out",
    });
  });

  it("slugifies dotted stems to match Astro's route (auth.int.test.ts → authint)", () => {
    const index = buildScenarioLinks(
      report([{ sourceFile: "src/auth.int.test.ts", scenarios: [{ id: "a--x", title: "Rejects token" }] }]),
      { audienceSplit: true },
    );
    expect(index.scenarios["a--x"].url).toBe("/stories/engineer/authint/");
  });

  it("defaults to a flat layout, matching build-docs / the CLI", () => {
    const index = buildScenarioLinks(
      report([{ sourceFile: "tests/math.story.test.ts", scenarios: [{ id: "m--adds", title: "Adds" }] }]),
    );
    expect(index.scenarios["m--adds"].url).toBe("/stories/math/");
  });

  it("keys by the durable scenario id and carries status + sourceFile", () => {
    const index = buildScenarioLinks(
      report([{ sourceFile: "tests/a.story.test.ts", scenarios: [{ id: "a--x", title: "X", status: "failed" }] }]),
    );
    expect(Object.keys(index.scenarios)).toEqual(["a--x"]);
    expect(index.scenarios["a--x"].status).toBe("failed");
    expect(index.scenarios["a--x"].sourceFile).toBe("tests/a.story.test.ts");
    expect(index.runId).toBe("run-1");
  });

  it("drops the audience segment when audienceSplit is false", () => {
    const index = buildScenarioLinks(
      report([{ sourceFile: "tests/math.story.test.ts", scenarios: [{ id: "m--adds", title: "Adds" }] }]),
      { audienceSplit: false },
    );
    expect(index.scenarios["m--adds"].url).toBe("/stories/math/");
  });

  it("honours a custom baseUrl", () => {
    const index = buildScenarioLinks(
      report([{ sourceFile: "tests/math.story.test.ts", scenarios: [{ id: "m--adds", title: "Adds" }] }]),
      { baseUrl: "/docs/stories/", audienceSplit: true },
    );
    expect(index.baseUrl).toBe("/docs/stories");
    expect(index.scenarios["m--adds"].url).toBe("/docs/stories/engineer/math/");
  });
});
