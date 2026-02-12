/**
 * Jest Adapter - Layer 1.
 *
 * Transforms Jest test results and story reports into RawRun.
 */

import type { StoryMeta } from "../../types/story";
import type { RawRun, RawTestCase, RawStatus } from "../../types/raw";

/** Jest test result shape (subset of what Jest provides) */
export interface JestTestResult {
  fullName: string;
  status: "passed" | "failed" | "pending" | "todo";
  duration?: number;
  failureMessages?: string[];
}

/** Jest file result shape */
export interface JestFileResult {
  testFilePath: string;
  testResults: JestTestResult[];
}

/** Jest aggregated result shape */
export interface JestAggregatedResult {
  testResults: JestFileResult[];
  startTime?: number;
}

/** Story file report written by story.init() */
export interface StoryFileReport {
  testFilePath: string;
  scenarios: StoryMeta[];
}

/** Options for Jest adapter */
export interface JestAdapterOptions {
  /** Project root directory */
  projectRoot?: string;
  /** Package version */
  packageVersion?: string;
  /** Git SHA */
  gitSha?: string;
}

/**
 * Map Jest status to RawStatus.
 */
function mapJestStatus(status: JestTestResult["status"]): RawStatus {
  switch (status) {
    case "passed":
      return "pass";
    case "failed":
      return "fail";
    case "pending":
      return "pending";
    case "todo":
      return "todo";
    default:
      return "unknown";
  }
}

/**
 * Adapt Jest results and story reports to RawRun.
 *
 * @param jestResults - Jest aggregated results
 * @param storyReports - Story reports from story.init()
 * @param options - Adapter options
 * @returns RawRun for ACL processing
 */
export function adaptJestRun(
  jestResults: JestAggregatedResult,
  storyReports: StoryFileReport[],
  options: JestAdapterOptions = {}
): RawRun {
  const testCases: RawTestCase[] = [];

  // Build map of Jest results by file for lookup
  const fileResultsMap = new Map<string, JestFileResult>();
  for (const fileResult of jestResults.testResults) {
    fileResultsMap.set(fileResult.testFilePath, fileResult);
  }

  // Process each story report
  for (const report of storyReports) {
    const fileResult = fileResultsMap.get(report.testFilePath);

    for (const meta of report.scenarios) {
      if (!meta?.scenario) continue;

      // Find matching Jest test result
      const matchingTest = findMatchingJestTest(fileResult, meta);

      testCases.push({
        externalId: matchingTest?.fullName,
        title: meta.scenario,
        titlePath: meta.suitePath
          ? [...meta.suitePath, meta.scenario]
          : [meta.scenario],
        story: meta,
        sourceFile: report.testFilePath,
        sourceLine: undefined, // Jest doesn't provide line numbers
        status: matchingTest ? mapJestStatus(matchingTest.status) : "unknown",
        durationMs: matchingTest?.duration,
        error: matchingTest?.failureMessages?.length
          ? { message: matchingTest.failureMessages.join("\n") }
          : undefined,
        stepEvents: undefined, // Jest doesn't provide step-level results
        attachments: undefined, // Jest doesn't capture attachments
        meta: { jestStatus: matchingTest?.status },
        retry: 0,
        retries: 0,
        projectName: undefined,
      });
    }
  }

  return {
    testCases,
    startedAtMs: jestResults.startTime,
    finishedAtMs: Date.now(),
    projectRoot: options.projectRoot ?? process.cwd(),
    packageVersion: options.packageVersion,
    gitSha: options.gitSha,
    ci: detectCI(),
  };
}

/**
 * Find matching Jest test result for a story.
 *
 * Matches by constructing fullName from suitePath and scenario.
 */
function findMatchingJestTest(
  fileResult: JestFileResult | undefined,
  meta: StoryMeta
): JestTestResult | undefined {
  if (!fileResult) return undefined;

  // Construct expected fullName
  const expectedFullName = meta.suitePath
    ? [...meta.suitePath, meta.scenario].join(" > ")
    : meta.scenario;

  return fileResult.testResults.find((test) => test.fullName === expectedFullName);
}

/**
 * Detect CI environment.
 */
function detectCI() {
  if (process.env.GITHUB_ACTIONS === "true") {
    return {
      name: "GitHub Actions",
      url: process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY
        ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
        : undefined,
      buildNumber: process.env.GITHUB_RUN_NUMBER,
    };
  }

  if (process.env.JENKINS_URL) {
    return {
      name: "Jenkins",
      url: process.env.BUILD_URL,
      buildNumber: process.env.BUILD_NUMBER,
    };
  }

  if (process.env.CI) {
    return {
      name: "CI",
      url: undefined,
      buildNumber: undefined,
    };
  }

  return undefined;
}
