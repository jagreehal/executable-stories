/**
 * Playwright reporter for executable-stories.
 * Generates reports using the executable-stories-formatters package.
 */

import type {
  Reporter,
  FullConfig,
  TestCase,
  TestResult,
  FullResult,
} from "@playwright/test/reporter";
import * as fs from "node:fs";
import * as path from "node:path";
import type { StoryMeta } from "executable-stories-formatters";

// Import from formatters package
import {
  ReportGenerator,
  canonicalizeRun,
  readGitSha,
  readPackageVersion,
  detectCI,
  type RawRun,
  type RawTestCase,
  type RawAttachment,
  type RawStepEvent,
  type FormatterOptions,
} from "executable-stories-formatters";

// Re-export types from formatters for convenience
export type {
  OutputFormat,
  OutputMode,
  ColocatedStyle,
  OutputRule,
  FormatterOptions,
} from "executable-stories-formatters";

// ============================================================================
// Reporter Options (delegates to FormatterOptions)
// ============================================================================

export interface StoryReporterOptions extends FormatterOptions {
  /** If set, write raw run JSON (schemaVersion 1) to this path for use with the executable-stories CLI/binary */
  rawRunPath?: string;
}

// ============================================================================
// Internal Types
// ============================================================================

interface CollectedScenario {
  meta: StoryMeta;
  sourceFile: string;
  sourceLine: number;
  status: "passed" | "failed" | "skipped" | "timedOut" | "interrupted";
  error?: string;
  errorStack?: string;
  durationMs: number;
  projectName?: string;
  retry: number;
  retries: number;
  attachments?: RawAttachment[];
  stepEvents?: RawStepEvent[];
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert path to relative posix format.
 */
function toRelativePosix(absolutePath: string, projectRoot: string): string {
  return path.relative(projectRoot, absolutePath).split(path.sep).join("/");
}

// ============================================================================
// Reporter Implementation
// ============================================================================

export default class StoryReporter implements Reporter {
  private options: StoryReporterOptions;
  private scenarios: CollectedScenario[] = [];
  private startTime = 0;
  private packageVersion: string | undefined;
  private gitSha: string | undefined;
  private projectRoot: string = process.cwd();

  constructor(options: StoryReporterOptions = {}) {
    this.options = options;
  }

  onBegin(config: FullConfig): void {
    this.startTime = Date.now();
    this.projectRoot = config.rootDir ?? process.cwd();
    const includeMetadata = this.options.markdown?.includeMetadata ?? true;
    if (includeMetadata) {
      this.packageVersion = readPackageVersion(this.projectRoot);
      this.gitSha = readGitSha(this.projectRoot);
    }
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    // Find story-meta annotation
    const storyAnnotation = test.annotations.find((a) => a.type === "story-meta");
    if (!storyAnnotation?.description) return;

    try {
      const meta: StoryMeta = JSON.parse(storyAnnotation.description);

      // Get source file and line for sorting
      const sourceFile = test.location?.file
        ? toRelativePosix(test.location.file, this.projectRoot)
        : "unknown";
      const sourceLine = (test.location as { line?: number })?.line ?? 1;

      // Get error message if failed
      let error: string | undefined;
      let errorStack: string | undefined;
      if (result.status === "failed" && result.errors?.length) {
        const err = result.errors[0];
        error = err.message || String(err);
        errorStack = err.stack;
      }

      // Map Playwright result.attachments → RawAttachment[]
      const attachments: RawAttachment[] = (result.attachments ?? []).map((a) => {
        let body: string | undefined;
        let encoding: "BASE64" | "IDENTITY" | undefined;
        if (a.body !== undefined) {
          if (typeof a.body === "string") {
            body = a.body;
            encoding = "IDENTITY";
          } else if (Buffer.isBuffer(a.body) || (a.body as unknown) instanceof Uint8Array) {
            body = Buffer.from(a.body as Buffer | Uint8Array).toString("base64");
            encoding = "BASE64";
          }
        }
        return {
          name: a.name,
          mediaType: a.contentType,
          path: a.path,
          body,
          encoding,
        };
      });

      // Extract step events (timing) from story steps
      const stepEvents: RawStepEvent[] = meta.steps
        .filter((s: { durationMs?: number }) => s.durationMs !== undefined)
        .map((s: { durationMs?: number; text: string }, i: number) => ({
          index: i,
          title: s.text,
          durationMs: s.durationMs,
        }));

      this.scenarios.push({
        meta,
        sourceFile,
        sourceLine,
        status: result.status,
        error,
        errorStack,
        durationMs: result.duration,
        projectName: test.parent?.project()?.name,
        retry: result.retry,
        retries: test.retries,
        attachments: attachments.length > 0 ? attachments : undefined,
        stepEvents: stepEvents.length > 0 ? stepEvents : undefined,
      });
    } catch {
      // Ignore parse errors
    }
  }

  async onEnd(_result: FullResult): Promise<void> {
    if (this.scenarios.length === 0) return;

    // Collect test cases
    const rawTestCases: RawTestCase[] = this.scenarios.map((scenario) => {
      // Map Playwright status to raw status
      const statusMap: Record<string, RawTestCase["status"]> = {
        passed: "pass",
        failed: "fail",
        skipped: "skip",
        timedOut: "fail",
        interrupted: "fail",
      };

      return {
        title: scenario.meta.scenario,
        titlePath: scenario.meta.suitePath
          ? [...scenario.meta.suitePath, scenario.meta.scenario]
          : [scenario.meta.scenario],
        story: scenario.meta,
        sourceFile: scenario.sourceFile,
        sourceLine: Math.max(1, scenario.sourceLine),
        status: statusMap[scenario.status] ?? "unknown",
        durationMs: scenario.durationMs,
        error: scenario.error
          ? { message: scenario.error, stack: scenario.errorStack }
          : undefined,
        projectName: scenario.projectName,
        retry: scenario.retry,
        retries: scenario.retries,
        attachments: scenario.attachments,
        stepEvents: scenario.stepEvents,
      };
    });

    // Build RawRun
    const rawRun: RawRun = {
      testCases: rawTestCases,
      startedAtMs: this.startTime,
      finishedAtMs: Date.now(),
      projectRoot: this.projectRoot,
      packageVersion: this.packageVersion,
      gitSha: this.gitSha,
      ci: detectCI(),
    };

    // Optionally write raw run JSON for CLI/binary consumption
    const rawRunPath = this.options.rawRunPath;
    if (rawRunPath) {
      const absolutePath = path.isAbsolute(rawRunPath)
        ? rawRunPath
        : path.join(this.projectRoot, rawRunPath);
      const dir = path.dirname(absolutePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const payload = { schemaVersion: 1, ...rawRun };
      fs.writeFileSync(absolutePath, JSON.stringify(payload, null, 2), "utf8");
    }

    // Canonicalize
    const canonicalRun = canonicalizeRun(rawRun);

    // Generate reports
    const generator = new ReportGenerator(this.options);
    try {
      await generator.generate(canonicalRun);
    } catch (err) {
      console.error("Failed to generate reports:", err);
    }
  }
}
