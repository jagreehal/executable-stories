/**
 * Playwright Adapter - Layer 1.
 *
 * Transforms Playwright test results into RawRun.
 */

import type { StoryMeta } from "../../types/story";
import type { RawRun, RawTestCase, RawStatus, RawAttachment } from "../../types/raw";

/** Playwright test status */
export type PlaywrightStatus =
  | "passed"
  | "failed"
  | "skipped"
  | "timedOut"
  | "interrupted";

/** Playwright test error */
export interface PlaywrightError {
  message?: string;
  stack?: string;
}

/** Playwright attachment */
export interface PlaywrightAttachment {
  name: string;
  contentType: string;
  path?: string;
  body?: Buffer;
}

/** Playwright test result */
export interface PlaywrightTestResult {
  status: PlaywrightStatus;
  duration: number;
  errors: PlaywrightError[];
  attachments: PlaywrightAttachment[];
  retry: number;
}

/** Playwright test case annotation */
export interface PlaywrightAnnotation {
  type: string;
  description?: string;
}

/** Playwright test location */
export interface PlaywrightLocation {
  file: string;
  line: number;
  column: number;
}

/** Playwright test case shape (minimal) */
export interface PlaywrightTestCase {
  title: string;
  titlePath: () => string[];
  annotations: PlaywrightAnnotation[];
  location: PlaywrightLocation;
  retries: number;
}

/** Options for Playwright adapter */
export interface PlaywrightAdapterOptions {
  /** Project root directory */
  projectRoot?: string;
  /** Package version */
  packageVersion?: string;
  /** Git SHA */
  gitSha?: string;
  /** Start time (epoch ms) */
  startedAtMs?: number;
  /** Playwright project name */
  projectName?: string;
}

/**
 * Map Playwright status to RawStatus.
 */
function mapPlaywrightStatus(status: PlaywrightStatus): RawStatus {
  switch (status) {
    case "passed":
      return "pass";
    case "failed":
      return "fail";
    case "skipped":
      return "skip";
    case "timedOut":
      return "timeout";
    case "interrupted":
      return "interrupted";
    default:
      return "unknown";
  }
}

/**
 * Adapt Playwright test results to RawRun.
 *
 * @param testResults - Array of [testCase, result] tuples
 * @param options - Adapter options
 * @returns RawRun for ACL processing
 */
export function adaptPlaywrightRun(
  testResults: Array<[PlaywrightTestCase, PlaywrightTestResult]>,
  options: PlaywrightAdapterOptions = {}
): RawRun {
  const testCases: RawTestCase[] = [];
  const projectRoot = options.projectRoot ?? process.cwd();

  for (const [test, result] of testResults) {
    // Find story-meta annotation
    const storyAnnotation = test.annotations.find((a) => a.type === "story-meta");
    if (!storyAnnotation?.description) continue;

    let story: StoryMeta;
    try {
      story = JSON.parse(storyAnnotation.description);
    } catch {
      continue; // Skip if annotation is not valid JSON
    }

    if (!story?.scenario || !Array.isArray(story.steps)) continue;

    // Convert attachments
    const attachments = convertAttachments(result.attachments);

    // Get error info
    const error = result.errors?.length
      ? {
          message: result.errors[0].message,
          stack: result.errors[0].stack,
        }
      : undefined;

    testCases.push({
      externalId: test.titlePath().join(" > "),
      title: story.scenario,
      titlePath: test.titlePath(),
      story,
      sourceFile: test.location.file,
      sourceLine: test.location.line,
      status: mapPlaywrightStatus(result.status),
      durationMs: result.duration,
      error,
      stepEvents: undefined, // Playwright could provide step info, but we don't capture it yet
      attachments,
      meta: {
        playwrightStatus: result.status,
        column: test.location.column,
      },
      retry: result.retry,
      retries: test.retries,
      projectName: options.projectName,
    });
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
 * Convert Playwright attachments to raw attachments.
 */
function convertAttachments(
  attachments: PlaywrightAttachment[]
): RawAttachment[] {
  return attachments.map((att) => ({
    name: att.name,
    mediaType: att.contentType,
    path: att.path,
    body: att.body ? att.body.toString("base64") : undefined,
    encoding: att.body ? "BASE64" as const : undefined,
    byteLength: att.body?.length,
  }));
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
