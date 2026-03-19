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
  TestStep,
} from "@playwright/test/reporter";
import * as fs from "node:fs";
import * as path from "node:path";
import type { StoryMeta } from "executable-stories-formatters";
import {
  tryLoadAutotel,
  shouldInstrumentStep,
  createTestSpan,
  createStepSpan,
  type AutotelApi,
} from "./otel-reporter-spans.js";

// Import from formatters package
import {
  ReportGenerator,
  canonicalizeRun,
  readGitSha,
  readPackageVersion,
  detectCI,
  sendNotifications,
  toCIInfo,
  loadHistory,
  updateHistory,
  saveHistory,
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
  private autotel: AutotelApi | null = null;
  private testSpans = new Map<
    string,
    { endSpan: (status: string, errorMessage?: string) => void }
  >();
  private stepSpanStacks = new Map<
    string,
    Array<{ endSpan: (errorMessage?: string) => void }>
  >();

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
    this.autotel = tryLoadAutotel();
  }

  onTestBegin(test: TestCase): void {
    if (!this.autotel) return;
    const sourceFile = test.location?.file;
    const sourceLine = (test.location as { line?: number })?.line;
    const titlePath = test.titlePath();
    // titlePath: [projectName, ...describes, testTitle]
    const suitePath = titlePath.slice(1, -1);
    const testTitle = titlePath[titlePath.length - 1] ?? test.title;

    const handle = createTestSpan(
      { testTitle, suitePath, sourceFile, sourceLine },
      { autotel: this.autotel },
    );
    this.testSpans.set(test.id, handle);
    this.stepSpanStacks.set(test.id, []);
  }

  onStepBegin(test: TestCase, _result: TestResult, step: TestStep): void {
    if (!this.autotel) return;
    if (!shouldInstrumentStep({ category: step.category, title: step.title }))
      return;

    const handle = createStepSpan(
      { stepTitle: step.title, stepCategory: step.category },
      { autotel: this.autotel },
    );
    const stack = this.stepSpanStacks.get(test.id);
    if (stack) {
      stack.push(handle);
    }
  }

  onStepEnd(test: TestCase, _result: TestResult, step: TestStep): void {
    if (!this.autotel) return;
    if (!shouldInstrumentStep({ category: step.category, title: step.title }))
      return;

    const stack = this.stepSpanStacks.get(test.id);
    if (stack && stack.length > 0) {
      const handle = stack.pop()!;
      handle.endSpan(step.error?.message);
    }
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    // Defensive: unwind leftover step spans (interrupted/crash)
    if (this.autotel) {
      const stack = this.stepSpanStacks.get(test.id);
      if (stack) {
        while (stack.length > 0) {
          const handle = stack.pop()!;
          handle.endSpan("interrupted test");
        }
        this.stepSpanStacks.delete(test.id);
      }
      // End test span
      const testHandle = this.testSpans.get(test.id);
      if (testHandle) {
        testHandle.endSpan(result.status, result.errors?.[0]?.message);
        this.testSpans.delete(test.id);
      }
    }

    // Find story-meta annotation
    const storyAnnotation = test.annotations.find((a) => a.type === "story-meta");
    if (!storyAnnotation?.description) return;

    try {
      const meta: StoryMeta = JSON.parse(storyAnnotation.description);

      // Read autotel OTel spans from annotations
      const otelSpansAnnotation = test.annotations.find(
        (a) => a.type === "otel-spans",
      );
      if (otelSpansAnnotation?.description) {
        try {
          const spans = JSON.parse(otelSpansAnnotation.description);
          if (Array.isArray(spans) && spans.length > 0) {
            const valid = spans.filter(
              (s: unknown) =>
                s != null &&
                typeof s === "object" &&
                typeof (s as Record<string, unknown>).spanId === "string" &&
                typeof (s as Record<string, unknown>).name === "string",
            );
            if (valid.length > 0) {
              meta.otelSpans = valid;
            }
          }
        } catch {
          /* ignore parse errors */
        }
      }

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
      const allAttachments: RawAttachment[] = (result.attachments ?? []).map((a) => {
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

      // Deduplicate video attachments by name — Playwright may attach
      // multiple video files per test (e.g. video.webm and video-1.webm).
      // Keep only the last video attachment per name, which is the real recording.
      const attachments = deduplicateVideoAttachments(allAttachments);

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

    // 1. Generate reports
    const generator = new ReportGenerator(this.options);
    try {
      await generator.generate(canonicalRun);
    } catch (err) {
      console.error("Failed to generate reports:", err);
    }

    // 2. Update history (independent of report generation)
    try {
      const histOpts = this.options.history;
      if (histOpts?.filePath) {
        const historyPath = path.isAbsolute(histOpts.filePath)
          ? histOpts.filePath
          : path.join(this.projectRoot, histOpts.filePath);
        const store = loadHistory(
          { filePath: historyPath },
          {
            readFile: (p: string) => { try { return fs.readFileSync(p, "utf8"); } catch { return undefined; } },
            logger: console,
          },
        );
        const updated = updateHistory({ store, run: canonicalRun, maxRuns: histOpts.maxRuns ?? 10 });
        const dir = path.dirname(historyPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        saveHistory(
          { filePath: historyPath, store: updated },
          { writeFile: (p: string, c: string) => fs.writeFileSync(p, c, "utf8") },
        );
      }
    } catch (err) {
      console.error("Failed to update history:", err);
    }

    // 3. Send notifications (independent of both above)
    try {
      if (this.options.notification) {
        await sendNotifications(
          { run: canonicalRun, notification: this.options.notification },
          { fetch: globalThis.fetch, logger: console, toCIInfo },
        );
      }
    } catch (err) {
      console.error("Failed to send notifications:", err);
    }
  }
}

/**
 * Deduplicate video attachments by name.
 *
 * Playwright with `video: "on"` may produce multiple video files per test
 * in the output directory (e.g. `video.webm` and `video-1.webm`), attaching
 * all of them to the test result. This leads to duplicate videos in reports.
 *
 * For each unique video attachment name, keep only the last occurrence —
 * Playwright appends the real recording after any stubs.
 * Non-video attachments are always preserved.
 */
export function deduplicateVideoAttachments(
  attachments: RawAttachment[],
): RawAttachment[] {
  // Find the last index for each video attachment name
  const lastVideoIndex = new Map<string, number>();
  for (let i = 0; i < attachments.length; i++) {
    if (attachments[i].mediaType.startsWith("video/")) {
      lastVideoIndex.set(attachments[i].name, i);
    }
  }

  // Keep non-video attachments and only the last video per name
  return attachments.filter((att, i) => {
    if (!att.mediaType.startsWith("video/")) return true;
    return lastVideoIndex.get(att.name) === i;
  });
}
