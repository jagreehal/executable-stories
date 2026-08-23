import { describe, expect, it, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  recordDeployment,
  getDeploymentStatus,
  getEnvironmentDrift,
} from "../src/deploy/deployments";
import { loadLedger, createEmptyLedger, saveLedger } from "../src/deploy/ledger";
import { stubs } from "./stubs";

describe("deployment ledger", () => {
  let tmpDir: string;
  let ledgerPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "es-deploy-test-"));
    ledgerPath = path.join(tmpDir, "deployments.json");
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("creates an empty ledger when no file exists", () => {
    const ledger = loadLedger(ledgerPath);
    expect(ledger.schemaVersion).toBe(1);
    expect(ledger.deployments).toEqual([]);
  });

  it("loads and saves a ledger", () => {
    const ledger = createEmptyLedger();
    saveLedger(ledger, ledgerPath);
    const loaded = loadLedger(ledgerPath);
    expect(loaded.deployments).toEqual([]);
  });

  it("records a deployment entry", () => {
    const run = stubs.testRunResult({
      startedAtMs: 1000,
      finishedAtMs: 2000,
      gitSha: "abc123",
      testCases: [
        stubs.testCaseResult({
          id: "scenario-1",
          status: "passed",
          sourceFile: "src/login.story.test.ts",
          sourceLine: 1,
          story: stubs.storyMeta({ scenario: "Login works" }),
        }),
        stubs.testCaseResult({
          id: "scenario-2",
          status: "failed",
          sourceFile: "src/login.story.test.ts",
          sourceLine: 10,
          story: stubs.storyMeta({ scenario: "Login fails" }),
        }),
      ],
    });

    const result = recordDeployment({
      run,
      environment: "staging",
      tag: "v1.0.0",
      ledgerPath,
      runFilePath: "reports/run.json",
    });

    expect(result.entry.environment).toBe("staging");
    expect(result.entry.tag).toBe("v1.0.0");
    expect(result.entry.sha).toBe("abc123");
    expect(result.entry.scenarioIds).toEqual(["scenario-1", "scenario-2"]);
    expect(result.entry.summary.total).toBe(2);
    expect(result.entry.summary.passed).toBe(1);
    expect(result.entry.summary.failed).toBe(1);

    const ledger = loadLedger(ledgerPath);
    expect(ledger.deployments).toHaveLength(1);
  });

  it("tracks multiple deployments to the same environment", () => {
    const run1 = stubs.testRunResult({
      startedAtMs: 1000,
      finishedAtMs: 2000,
      testCases: [
        stubs.testCaseResult({
          id: "scenario-1",
          status: "passed",
          sourceFile: "src/a.story.test.ts",
          sourceLine: 1,
          story: stubs.storyMeta({ scenario: "A" }),
        }),
      ],
    });

    const run2 = stubs.testRunResult({
      startedAtMs: 3000,
      finishedAtMs: 4000,
      testCases: [
        stubs.testCaseResult({
          id: "scenario-1",
          status: "passed",
          sourceFile: "src/a.story.test.ts",
          sourceLine: 1,
          story: stubs.storyMeta({ scenario: "A" }),
        }),
        stubs.testCaseResult({
          id: "scenario-2",
          status: "passed",
          sourceFile: "src/b.story.test.ts",
          sourceLine: 1,
          story: stubs.storyMeta({ scenario: "B" }),
        }),
      ],
    });

    recordDeployment({
      run: run1,
      environment: "production",
      ledgerPath,
      runFilePath: "reports/run1.json",
    });

    recordDeployment({
      run: run2,
      environment: "production",
      tag: "v2.0.0",
      ledgerPath,
      runFilePath: "reports/run2.json",
    });

    const ledger = loadLedger(ledgerPath);
    expect(ledger.deployments).toHaveLength(2);
    expect(ledger.deployments[1].scenarioIds).toEqual(["scenario-1", "scenario-2"]);
  });

  it("gets deployment status for all environments", () => {
    const run1 = stubs.testRunResult({
      startedAtMs: 1000,
      finishedAtMs: 2000,
      testCases: [
        stubs.testCaseResult({
          id: "dev-1",
          status: "passed",
          sourceFile: "src/a.story.test.ts",
          sourceLine: 1,
          story: stubs.storyMeta({ scenario: "Dev scenario" }),
        }),
      ],
    });

    const run2 = stubs.testRunResult({
      startedAtMs: 3000,
      finishedAtMs: 4000,
      testCases: [
        stubs.testCaseResult({
          id: "prod-1",
          status: "passed",
          sourceFile: "src/a.story.test.ts",
          sourceLine: 1,
          story: stubs.storyMeta({ scenario: "Prod scenario" }),
        }),
      ],
    });

    recordDeployment({
      run: run1,
      environment: "dev",
      ledgerPath,
      runFilePath: "reports/dev.json",
    });

    recordDeployment({
      run: run2,
      environment: "production",
      ledgerPath,
      runFilePath: "reports/prod.json",
    });

    const status = getDeploymentStatus(ledgerPath);
    const envs = Object.keys(status.environments);
    expect(envs).toContain("dev");
    expect(envs).toContain("production");
    expect(status.environments["dev"]?.latest.scenarioIds).toEqual(["dev-1"]);
    expect(status.environments["production"]?.latest.scenarioIds).toEqual(["prod-1"]);
  });

  it("detects environment drift", () => {
    const run1 = stubs.testRunResult({
      startedAtMs: 1000,
      finishedAtMs: 2000,
      testCases: [
        stubs.testCaseResult({
          id: "shared-1",
          status: "passed",
          sourceFile: "src/shared.story.test.ts",
          sourceLine: 1,
          story: stubs.storyMeta({ scenario: "Shared" }),
        }),
        stubs.testCaseResult({
          id: "dev-only",
          status: "passed",
          sourceFile: "src/dev.story.test.ts",
          sourceLine: 1,
          story: stubs.storyMeta({ scenario: "Dev only" }),
        }),
      ],
    });

    const run2 = stubs.testRunResult({
      startedAtMs: 3000,
      finishedAtMs: 4000,
      testCases: [
        stubs.testCaseResult({
          id: "shared-1",
          status: "passed",
          sourceFile: "src/shared.story.test.ts",
          sourceLine: 1,
          story: stubs.storyMeta({ scenario: "Shared" }),
        }),
        stubs.testCaseResult({
          id: "prod-only",
          status: "passed",
          sourceFile: "src/prod.story.test.ts",
          sourceLine: 1,
          story: stubs.storyMeta({ scenario: "Prod only" }),
        }),
      ],
    });

    recordDeployment({
      run: run1,
      environment: "dev",
      ledgerPath,
      runFilePath: "reports/dev.json",
    });

    recordDeployment({
      run: run2,
      environment: "production",
      ledgerPath,
      runFilePath: "reports/prod.json",
    });

    const drift = getEnvironmentDrift(ledgerPath, "dev", "production");
    expect(drift.inBoth).toEqual(["shared-1"]);
    expect(drift.onlyInA).toEqual(["dev-only"]);
    expect(drift.onlyInB).toEqual(["prod-only"]);
  });

  it("detects status drift for scenarios present in both environments", () => {
    const dev = stubs.testRunResult({
      startedAtMs: 1000,
      finishedAtMs: 2000,
      testCases: [
        stubs.testCaseResult({
          id: "checkout",
          status: "passed",
          sourceFile: "src/checkout.story.test.ts",
          sourceLine: 1,
          story: stubs.storyMeta({ scenario: "Checkout completes" }),
        }),
      ],
    });

    const production = stubs.testRunResult({
      startedAtMs: 3000,
      finishedAtMs: 4000,
      testCases: [
        stubs.testCaseResult({
          id: "checkout",
          status: "failed",
          sourceFile: "src/checkout.story.test.ts",
          sourceLine: 1,
          story: stubs.storyMeta({ scenario: "Checkout completes" }),
        }),
      ],
    });

    recordDeployment({
      run: dev,
      environment: "dev",
      ledgerPath,
      runFilePath: "reports/dev.json",
    });

    recordDeployment({
      run: production,
      environment: "production",
      ledgerPath,
      runFilePath: "reports/prod.json",
    });

    const drift = getEnvironmentDrift(ledgerPath, "dev", "production");
    expect(drift.onlyInA).toEqual([]);
    expect(drift.onlyInB).toEqual([]);
    expect(drift.statusChanged).toEqual([
      { id: "checkout", statusA: "passed", statusB: "failed" },
    ]);
  });

  it("throws when environment has no deployments", () => {
    expect(() => getEnvironmentDrift(ledgerPath, "dev", "production")).toThrow(
      'No deployment found for environment "dev"',
    );
  });
});
