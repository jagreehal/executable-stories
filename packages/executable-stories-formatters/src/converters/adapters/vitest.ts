/**
 * Vitest Adapter - Layer 1.
 *
 * Transforms Vitest test results into RawRun.
 */

import type { StoryMeta } from "../../types/story";
import type { RawRun, RawTestCase, RawStatus } from "../../types/raw";

/** Vitest test state */
export type VitestState = "passed" | "failed" | "skipped" | "pending";

/** Vitest serialized error */
export interface VitestSerializedError {
  message?: string;
  stack?: string;
  diff?: string;
}

/** Vitest test result shape */
export interface VitestTestResult {
  state?: VitestState;
  duration?: number;
  errors?: VitestSerializedError[];
}

/** Vitest test case shape (minimal) */
export interface VitestTestCase {
  name: string;
  meta: () => Record<string, unknown>;
  result: () => VitestTestResult | undefined;
}

/** Vitest test module shape (minimal) */
export interface VitestTestModule {
  moduleId?: string;
  relativeModuleId?: string;
  children?: {
    allTests: () => Iterable<VitestTestCase>;
  };
}

/** Options for Vitest adapter */
export interface VitestAdapterOptions {
  /** Project root directory */
  projectRoot?: string;
  /** Package version */
  packageVersion?: string;
  /** Git SHA */
  gitSha?: string;
  /** Start time (epoch ms) */
  startedAtMs?: number;
}

/**
 * Map Vitest state to RawStatus.
 */
function mapVitestStatus(state?: VitestState): RawStatus {
  switch (state) {
    case "passed":
      return "pass";
    case "failed":
      return "fail";
    case "skipped":
      return "skip";
    case "pending":
      return "pending";
    default:
      return "unknown";
  }
}

/**
 * Adapt Vitest test modules to RawRun.
 *
 * @param testModules - Vitest test modules
 * @param options - Adapter options
 * @returns RawRun for ACL processing
 */
export function adaptVitestRun(
  testModules: ReadonlyArray<VitestTestModule>,
  options: VitestAdapterOptions = {}
): RawRun {
  const testCases: RawTestCase[] = [];
  const projectRoot = options.projectRoot ?? process.cwd();

  for (const mod of testModules) {
    const collection = mod.children;
    if (!collection) continue;

    // Get module path
    const moduleId = mod.moduleId ?? mod.relativeModuleId ?? "";
    const sourcePath = moduleId.startsWith("/")
      ? moduleId
      : `${projectRoot}/${moduleId}`;

    for (const test of collection.allTests()) {
      const meta = test.meta();
      const story = meta?.["story"] as StoryMeta | undefined;

      if (!story?.scenario || !Array.isArray(story.steps)) continue;

      const result = test.result();
      const state = result?.state;
      const errors = state === "failed" && result ? result.errors : undefined;

      testCases.push({
        externalId: test.name,
        title: story.scenario,
        titlePath: story.suitePath
          ? [...story.suitePath, story.scenario]
          : [story.scenario],
        story,
        sourceFile: sourcePath,
        sourceLine: undefined, // Vitest doesn't provide line numbers easily
        status: mapVitestStatus(state),
        durationMs: result?.duration,
        error: errors?.length
          ? {
              message: formatVitestError(errors[0]),
              stack: errors[0].stack,
            }
          : undefined,
        stepEvents: undefined, // Vitest doesn't provide step-level results
        attachments: undefined, // Vitest doesn't capture attachments
        meta: { vitestState: state },
        retry: 0,
        retries: 0,
        projectName: undefined,
      });
    }
  }

  return {
    testCases,
    startedAtMs: options.startedAtMs,
    finishedAtMs: Date.now(),
    projectRoot,
    packageVersion: options.packageVersion,
    gitSha: options.gitSha,
    ci: detectCI(),
  };
}

/**
 * Format Vitest error message.
 */
function formatVitestError(error: VitestSerializedError): string {
  const parts: string[] = [];

  if (error.message) {
    parts.push(error.message);
  }

  if (error.diff) {
    parts.push("", error.diff);
  }

  return parts.join("\n") || "Unknown error";
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
