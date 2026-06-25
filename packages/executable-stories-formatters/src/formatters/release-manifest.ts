import { createHash } from "node:crypto";

import type { TestCaseResult, TestRunResult } from "executable-stories-core/types/test-result";

export interface ReleaseManifest {
  schemaVersion: "1.0";
  generatedAt: string;
  run: {
    startedAt: string;
    finishedAt: string;
    gitSha?: string;
    branch?: string;
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    pending: number;
  };
  testedTogetherHash: string;
  scenarios: Array<{
    id: string;
    title: string;
    status: string;
    sourceFile: string;
    sourceLine: number;
    tags: string[];
  }>;
}

export class ReleaseManifestFormatter {
  format(run: TestRunResult): string {
    const manifest = toReleaseManifest(run);
    const lines: string[] = [];

    lines.push("# Release Manifest");
    lines.push("");
    lines.push(`Generated: ${manifest.generatedAt}`);
    lines.push(`Run: ${manifest.run.startedAt} to ${manifest.run.finishedAt}`);
    if (manifest.run.branch) lines.push(`Branch: ${manifest.run.branch}`);
    if (manifest.run.gitSha) lines.push(`Commit: ${manifest.run.gitSha}`);
    lines.push(`Tested-together hash: \`${manifest.testedTogetherHash}\``);
    lines.push("");
    lines.push("| Scenarios | Passed | Failed | Skipped | Pending |");
    lines.push("| ---: | ---: | ---: | ---: | ---: |");
    lines.push(`| ${manifest.run.total} | ${manifest.run.passed} | ${manifest.run.failed} | ${manifest.run.skipped} | ${manifest.run.pending} |`);
    lines.push("");
    lines.push("## Scenarios");
    lines.push("");
    lines.push("| Status | Scenario | Source | Tags |");
    lines.push("| --- | --- | --- | --- |");
    for (const scenario of manifest.scenarios) {
      const source = `${scenario.sourceFile}:${scenario.sourceLine}`;
      const tags = scenario.tags.length > 0 ? scenario.tags.map((tag) => `\`${tag}\``).join(", ") : "";
      lines.push(`| ${renderStatus(scenario.status)} | ${escapePipe(scenario.title)} | \`${source}\` | ${tags} |`);
    }

    return lines.join("\n");
  }
}

export function toReleaseManifest(run: TestRunResult): ReleaseManifest {
  const scenarios = [...run.testCases]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((tc) => ({
      id: tc.id,
      title: tc.story.scenario,
      status: tc.status,
      sourceFile: tc.sourceFile,
      sourceLine: tc.sourceLine,
      tags: tc.tags,
    }));

  const fingerprint = scenarios.map((scenario) => `${scenario.id}:${scenario.status}`).join("\n");

  return {
    schemaVersion: "1.0",
    generatedAt: new Date().toISOString(),
    run: {
      startedAt: new Date(run.startedAtMs).toISOString(),
      finishedAt: new Date(run.finishedAtMs).toISOString(),
      gitSha: run.gitSha,
      branch: getBranch(run),
      total: run.testCases.length,
      passed: count(run.testCases, "passed"),
      failed: count(run.testCases, "failed"),
      skipped: count(run.testCases, "skipped"),
      pending: count(run.testCases, "pending"),
    },
    testedTogetherHash: createHash("sha256").update(fingerprint).digest("hex"),
    scenarios,
  };
}

function getBranch(run: TestRunResult): string | undefined {
  return run.ci?.branch;
}

function count(testCases: TestCaseResult[], status: TestCaseResult["status"]): number {
  return testCases.filter((tc) => tc.status === status).length;
}

function renderStatus(status: string): string {
  switch (status) {
    case "passed":
      return "passed";
    case "failed":
      return "failed";
    case "skipped":
      return "skipped";
    case "pending":
      return "pending";
    default:
      return status;
  }
}

function escapePipe(value: string): string {
  return value.replace(/\|/g, "\\|");
}
