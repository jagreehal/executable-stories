import { describe, expect, it } from "vitest";
import { EventEmitter } from "node:events";
import type { StoryReport } from "executable-stories-formatters";

import {
  RUNNERS,
  buildFocusedRunCommand,
  getBehaviorDiff,
  getBehaviorManifest,
  getFailingScenarios,
  getFeatureSummary,
  getScenario,
  getScenarioIndex,
  getScenariosForPaths,
  inferFrameworkFromSourceFile,
  listScenarios,
  resolveFocusedRunFramework,
  runFocusedScenario,
} from "../src/index.js";

describe("executable-stories-mcp utilities", () => {
  it("lists scenarios with source, steps, docs, and errors", () => {
    const report = createReport();

    const scenarios = listScenarios(report);

    expect(scenarios).toHaveLength(2);
    expect(scenarios[1]).toMatchObject({
      id: "scenario-fail",
      title: "Login blocked for suspended user",
      status: "failed",
      feature: "Auth",
      sourceFile: "src/auth.story.test.ts",
      sourceLine: 42,
      tags: ["auth"],
      tickets: [{ id: "AUTH-1" }],
      error: { message: "Expected session to be absent" },
    });
    expect(scenarios[1].steps).toEqual([
      {
        id: "step-0",
        index: 0,
        keyword: "Given",
        text: "a suspended user",
        status: "passed",
        durationMs: 1,
        docKinds: [],
      },
      {
        id: "step-1",
        index: 1,
        keyword: "Then",
        text: "login is blocked",
        status: "failed",
        durationMs: 2,
        errorMessage: "Expected session to be absent",
        docKinds: ["note"],
      },
    ]);
  });

  it("filters failures", () => {
    expect(getFailingScenarios(createReport()).map((scenario) => scenario.id)).toEqual([
      "scenario-fail",
    ]);
  });

  it("filters scenarios by status, tag, and source file", () => {
    const report = createReport();
    expect(listScenarios(report, { statuses: ["failed"] }).map((s) => s.id)).toEqual([
      "scenario-fail",
    ]);
    expect(listScenarios(report, { tags: ["auth"] })).toHaveLength(2);
    expect(listScenarios(report, { tags: ["missing"] })).toHaveLength(0);
    expect(listScenarios(report, { sourceFiles: ["auth"] })).toHaveLength(2);
  });

  it("finds scenarios covering a path", () => {
    const report = createReport();
    expect(getScenariosForPaths(report, ["src/auth/login.ts"]).map((s) => s.id)).toEqual([
      "scenario-fail",
    ]);
    expect(getScenariosForPaths(report, ["src/unrelated.ts"])).toEqual([]);
  });

  it("diffs two reports by scenario id", () => {
    const baseline = createReport();
    const current = createReport();
    current.features[0].scenarios[1].status = "passed";
    const diff = getBehaviorDiff(baseline, current);
    expect(diff.scenarios.find((s) => s.id === "scenario-fail")?.kind).toBe("fixed");
    expect(diff.summary.fixed).toBe(1);
  });

  it("exposes a runner registry keyed by framework", () => {
    expect(Object.keys(RUNNERS).sort()).toEqual([
      "cypress",
      "dotnet",
      "go",
      "jest",
      "playwright",
      "pytest",
      "rust",
      "vitest",
    ]);
    expect(
      RUNNERS.vitest.buildCommand({ sourceFile: "a.test.ts", scenarioTitle: "x" }).args,
    ).toContain("-t");
  });

  it("builds focused-run commands for the non-JS runners", () => {
    expect(RUNNERS.go.buildCommand({ sourceFile: "pkg/calc_story_test.go", scenarioTitle: "Adds" })).toEqual({
      command: "go",
      args: ["test", "./pkg", "-run", "Adds"],
    });
    expect(
      RUNNERS.pytest.buildCommand({ sourceFile: "tests/test_calc_story.py", scenarioTitle: "adds" }).args,
    ).toEqual(["tests/test_calc_story.py", "-k", "adds"]);
    expect(RUNNERS.rust.buildCommand({ sourceFile: "tests/stories.rs", scenarioTitle: "adds" }).command).toBe("cargo");
    expect(
      RUNNERS.dotnet.buildCommand({ sourceFile: "CalcTest.cs", scenarioTitle: "adds" }).args,
    ).toEqual(["test", "--filter", "DisplayName~adds"]);
    // go/pytest auto-detect from their story-test suffixes; rust/dotnet do not.
    expect(inferFrameworkFromSourceFile("pkg/calc_story_test.go")).toBe("go");
    expect(inferFrameworkFromSourceFile("tests/test_calc_story.py")).toBe("pytest");
    expect(inferFrameworkFromSourceFile("tests/stories.rs")).toBeUndefined();
  });

  it("finds scenario by id or title", () => {
    const report = createReport();

    expect(getScenario(report, "scenario-pass")?.scenario.title).toBe("Login succeeds");
    expect(getScenario(report, "Login blocked for suspended user")?.scenario.id).toBe(
      "scenario-fail",
    );
  });

  it("summarizes features", () => {
    expect(getFeatureSummary(createReport())).toEqual([
      {
        id: "feature-auth",
        title: "Auth",
        sourceFile: "src/auth.story.test.ts",
        total: 2,
        passed: 1,
        failed: 1,
        skipped: 0,
        pending: 0,
        durationMs: 30,
      },
    ]);
  });

  it("builds scenario index and behavior manifest", () => {
    const report = createReport();
    const index = getScenarioIndex(report);
    expect(index.schemaVersion).toBe("1.0");
    expect(index.scenarios).toHaveLength(2);

    const manifest = getBehaviorManifest(report);
    expect(manifest.sourceFiles).toHaveLength(1);
    expect(manifest.docCoverage.docKinds).toContain("link");
    expect(manifest.debugger.length).toBeGreaterThan(0);
  });

  it("infers framework from source file patterns", () => {
    expect(inferFrameworkFromSourceFile("e2e/login.story.spec.ts")).toBe("playwright");
    expect(inferFrameworkFromSourceFile("cypress/e2e/login.story.cy.ts")).toBe("cypress");
    expect(inferFrameworkFromSourceFile("src/auth.story.test.ts")).toBeUndefined();
    expect(
      resolveFocusedRunFramework({
        sourceFile: "src/auth.story.test.ts",
        framework: "vitest",
      }),
    ).toBe("vitest");
  });

  it("builds focused run commands per framework", () => {
    expect(buildFocusedRunCommand({
      framework: "vitest",
      sourceFile: "src/auth.story.test.ts",
      scenarioTitle: "Login succeeds",
    })).toEqual({
      command: "pnpm",
      args: ["exec", "vitest", "run", "src/auth.story.test.ts", "-t", "Login succeeds"],
    });

    expect(buildFocusedRunCommand({
      framework: "playwright",
      sourceFile: "e2e/login.story.spec.ts",
      scenarioTitle: "Login succeeds",
    }).args).toContain("-g");
  });

  it("runs focused scenarios via injected spawn", async () => {
    const result = await runFocusedScenario({
      framework: "jest",
      sourceFile: "src/auth.story.test.ts",
      scenarioTitle: "Login succeeds",
      spawnFn: ((_command, _args, _options) => {
        const child = new EventEmitter() as NodeJS.EventEmitter & {
          stdout: EventEmitter;
          stderr: EventEmitter;
        };
        child.stdout = new EventEmitter();
        child.stderr = new EventEmitter();
        queueMicrotask(() => {
          child.stdout.emit("data", "PASS");
          child.emit("close", 0);
        });
        return child;
      }) as typeof import("node:child_process").spawn,
    });

    expect(result.ok).toBe(true);
    expect(result.stdout).toContain("PASS");
  });

  it("returns structured focused run failures", async () => {
    const result = await runFocusedScenario({
      framework: "jest",
      sourceFile: "src/auth.story.test.ts",
      scenarioTitle: "Login succeeds",
      spawnFn: ((_command, _args, _options) => {
        const child = new EventEmitter() as NodeJS.EventEmitter & {
          stdout: EventEmitter;
          stderr: EventEmitter;
        };
        child.stdout = new EventEmitter();
        child.stderr = new EventEmitter();
        queueMicrotask(() => {
          child.stderr.emit("data", "FAIL");
          child.emit("close", 1);
        });
        return child;
      }) as typeof import("node:child_process").spawn,
    });

    expect(result).toMatchObject({
      ok: false,
      exitCode: 1,
      command: "pnpm",
      stderr: "FAIL",
    });
  });
});

function createReport(): StoryReport {
  return {
    schemaVersion: "1.0",
    runId: "run-1",
    startedAtMs: 1,
    finishedAtMs: 31,
    durationMs: 30,
    projectRoot: "/repo",
    summary: {
      total: 2,
      passed: 1,
      failed: 1,
      skipped: 0,
      pending: 0,
      durationMs: 30,
    },
    features: [
      {
        id: "feature-auth",
        title: "Auth",
        sourceFile: "src/auth.story.test.ts",
        summary: {
          total: 2,
          passed: 1,
          failed: 1,
          skipped: 0,
          pending: 0,
          durationMs: 30,
        },
        scenarios: [
          {
            id: "scenario-pass",
            title: "Login succeeds",
            status: "passed",
            durationMs: 10,
            tags: ["auth"],
            retry: 0,
            retries: 0,
            docEntries: [],
            steps: [],
            attachments: [],
          },
          {
            id: "scenario-fail",
            title: "Login blocked for suspended user",
            status: "failed",
            durationMs: 20,
            tags: ["auth"],
            tickets: [{ id: "AUTH-1" }],
            covers: ["src/auth/**"],
            sourceLine: 42,
            errorMessage: "Expected session to be absent",
            retry: 0,
            retries: 0,
            docEntries: [{ kind: "link", phase: "runtime", label: "Issue", url: "https://example.com" }],
            steps: [
              {
                id: "step-0",
                index: 0,
                keyword: "Given",
                text: "a suspended user",
                status: "passed",
                durationMs: 1,
                docEntries: [],
              },
              {
                id: "step-1",
                index: 1,
                keyword: "Then",
                text: "login is blocked",
                status: "failed",
                durationMs: 2,
                errorMessage: "Expected session to be absent",
                docEntries: [{ kind: "note", phase: "runtime", text: "negative path" }],
              },
            ],
            attachments: [],
          },
        ],
      },
    ],
  };
}
