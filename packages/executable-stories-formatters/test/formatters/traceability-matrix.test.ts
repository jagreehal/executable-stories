import { describe, expect, it } from "vitest";

import { TraceabilityMatrixFormatter, toTraceabilityMatrix } from "../../src/index";
import { stubs } from "../stubs";

function run() {
  return stubs.testRunResult({
    startedAtMs: 1000,
    finishedAtMs: 2000,
    gitSha: "abc123",
    ci: { name: "github", branch: "main" },
    testCases: [
      stubs.testCaseResult({
        id: "a",
        status: "passed",
        sourceFile: "src/api.py",
        sourceLine: 10,
        story: stubs.storyMeta({
          scenario: "View current savings balance",
          tickets: [{ id: "US-101", url: "https://tracker/US-101" }],
          covers: ["src/api.py"],
        }),
      }),
      stubs.testCaseResult({
        id: "b",
        status: "failed",
        sourceFile: "src/api.py",
        sourceLine: 20,
        story: stubs.storyMeta({
          scenario: "View matching eligibility",
          tickets: [{ id: "US-101" }],
          covers: ["src/api.py", "src/match.py"],
        }),
      }),
      stubs.testCaseResult({
        id: "c",
        status: "passed",
        sourceFile: "src/auth.py",
        sourceLine: 5,
        story: stubs.storyMeta({
          scenario: "Blocks suspended login",
          tickets: [{ id: "US-200" }],
          covers: ["src/auth.py"],
        }),
      }),
      stubs.testCaseResult({
        id: "d",
        status: "passed",
        sourceFile: "src/misc.py",
        sourceLine: 1,
        story: stubs.storyMeta({ scenario: "Untraced behavior", tickets: [] }),
      }),
    ],
  });
}

describe("toTraceabilityMatrix", () => {
  it("groups scenarios by requirement and rolls up status + covers", () => {
    const matrix = toTraceabilityMatrix(run());

    expect(matrix.summary).toMatchObject({
      requirements: 2,
      requirementsVerified: 1, // US-200 (all passed)
      requirementsFailing: 1, // US-101 (one failed)
      scenarios: 4,
      untracedScenarios: 1,
    });

    const us101 = matrix.requirements.find((r) => r.ticket === "US-101");
    expect(us101?.status).toBe("failing");
    expect(us101?.url).toBe("https://tracker/US-101");
    expect(us101?.scenarios).toHaveLength(2);
    expect(us101?.covers).toEqual(["src/api.py", "src/match.py"]);

    const us200 = matrix.requirements.find((r) => r.ticket === "US-200");
    expect(us200?.status).toBe("verified");
  });

  it("collects scenarios with no ticket as untraced", () => {
    const matrix = toTraceabilityMatrix(run());
    expect(matrix.untraced).toHaveLength(1);
    expect(matrix.untraced[0].title).toBe("Untraced behavior");
  });

  it("marks a requirement incomplete when no scenario passed", () => {
    const r = stubs.testRunResult({
      testCases: [
        stubs.testCaseResult({
          id: "x",
          status: "skipped",
          story: stubs.storyMeta({ scenario: "Pending work", tickets: [{ id: "US-300" }] }),
        }),
      ],
    });
    const matrix = toTraceabilityMatrix(r);
    expect(matrix.requirements[0].status).toBe("incomplete");
  });

  it("renders markdown with a requirement heading, status, and untraced section", () => {
    const md = new TraceabilityMatrixFormatter().format(run());
    expect(md).toContain("# Traceability Matrix");
    expect(md).toContain("## [US-101](https://tracker/US-101)");
    expect(md).toContain("Status: failing (a scenario failed)");
    expect(md).toContain("## US-200");
    expect(md).toContain("## Untraced scenarios");
    expect(md).toContain("Untraced behavior");
  });
});
