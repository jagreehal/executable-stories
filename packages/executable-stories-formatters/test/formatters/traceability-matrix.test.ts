import { describe, expect, it } from "vitest";

import { TraceabilityCsvFormatter, TraceabilityMatrixFormatter, toTraceabilityMatrix } from "../../src/index";
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

  it("renders CSV with one row per requirement-scenario pair plus untraced rows", () => {
    const csv = new TraceabilityCsvFormatter().format(run());
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(
      "ticket,ticket_url,requirement_status,scenario_id,scenario_title,scenario_status,source,covers",
    );
    // US-101 has 2 scenarios, US-200 has 1, plus 1 untraced row.
    expect(lines).toHaveLength(5);
    expect(lines[1]).toBe(
      "US-101,https://tracker/US-101,failing,a,View current savings balance,passed,src/api.py:10,src/api.py",
    );
    expect(lines[2]).toContain("src/api.py; src/match.py");
    expect(lines[4]).toBe(",,untraced,d,Untraced behavior,passed,src/misc.py:1,");
  });

  it("neutralizes spreadsheet formula injection in adapter-supplied cells", () => {
    const r = stubs.testRunResult({
      testCases: [
        stubs.testCaseResult({
          id: "f",
          status: "passed",
          sourceFile: "s.ts",
          sourceLine: 1,
          story: stubs.storyMeta({
            scenario: "=HYPERLINK(\"http://evil\",\"click\")",
            tickets: [{ id: "+US-9" }],
            covers: ["-lib/a.ts", "@utils/b.ts"],
          }),
        }),
      ],
    });
    const csv = new TraceabilityCsvFormatter().format(r);
    expect(csv).toContain("'+US-9");
    expect(csv).toContain("\"'=HYPERLINK(\"\"http://evil\"\",\"\"click\"\")\"");
    expect(csv).toContain("'-lib/a.ts; @utils/b.ts");
    expect(csv).not.toMatch(/,(=|\+|-|@)/);
  });

  it("escapes CSV cells containing commas and quotes", () => {
    const r = stubs.testRunResult({
      testCases: [
        stubs.testCaseResult({
          id: "q",
          status: "passed",
          sourceFile: "s.ts",
          sourceLine: 1,
          story: stubs.storyMeta({
            scenario: 'Says "hello, world"',
            tickets: [{ id: "US-1" }],
          }),
        }),
      ],
    });
    const csv = new TraceabilityCsvFormatter().format(r);
    expect(csv).toContain('"Says ""hello, world"""');
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
