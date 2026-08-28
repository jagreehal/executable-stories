/**
 * Playwright reporter for executable-stories.
 * Generates reports using the executable-stories-formatters package.
 */

import type {
  Reporter,
  FullConfig,
  Suite,
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
  stripAnsi,
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
  /**
   * Attachment persistence settings. Playwright keeps videos/screenshots/traces
   * inside its per-test outputDir; that directory may be cleaned before the
   * formatter (or a downstream CI job) runs, leaving reports with broken
   * <video>/<img> tags pointing at /home/runner/... paths. The reporter
   * eagerly persists each attachment at onTestEnd:
   *   - small files (<= inlineMaxBytes) are base64-encoded into raw-run.json
   *   - larger files are copied to <attachmentDir>/<test-id>/<filename>
   * so the bytes always survive even when the source dir is wiped.
   */
  attachments?: {
    /** Directory to copy non-inlined attachments to. Default: "<outputDir>/attachments" */
    dir?: string;
    /** Inline threshold in bytes. Default: 1 MB (1_048_576) */
    inlineMaxBytes?: number;
    /** Set false to skip persistence entirely. Default: true */
    enabled?: boolean;
  };
  /** Enable verbose reporter diagnostics. Default: false */
  debug?: boolean;
}

// ============================================================================
// Internal Types
// ============================================================================

interface CollectedScenario {
  /** Playwright's own test id, used to keep a runtime fixme from being counted twice. */
  testId?: string;
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
/**
 * Whether the run was narrowed by title, via `--grep` / `--grep-invert` or the
 * config equivalents. Such a run reports a subset of each file it touches, so
 * consumers must not read it as those files' full contents.
 *
 * `grep` is always present on FullConfig and defaults to a match-everything
 * pattern, so presence is not the signal; only a pattern that actually narrows
 * the run is. `--shard` narrows just as much and must count too.
 */
function isNameFiltered(config: Partial<FullConfig> | undefined): boolean {
  if (!config) return false;
  // Sharding splits a file's tests across machines, so this process sees only
  // some of them. Scenario ids do not carry the project, so project selection
  // is not a hazard the same way: every project reports the same scenario ids,
  // and a single-project run still names every scenario in a file.
  if (config.shard != null) return true;
  if (config.grepInvert != null) return true;
  const patterns = Array.isArray(config.grep) ? config.grep : config.grep ? [config.grep] : [];
  return patterns.some((pattern) => pattern.source !== ".*");
}

function toRelativePosix(absolutePath: string, projectRoot: string): string {
  return path.relative(projectRoot, absolutePath).split(path.sep).join("/");
}

const DEFAULT_ATTACHMENT_INLINE_MAX_BYTES = 1024 * 1024; // 1 MB

/**
 * Persist a single Playwright attachment so its bytes outlive Playwright's
 * per-test outputDir cleanup. Small files are base64-encoded inline; larger
 * files are copied to a stable directory and referenced by absolute path.
 *
 * Returns the resolved RawAttachment. On unexpected I/O failure falls back to
 * the original path-only mapping so behavior is no worse than before.
 */
function persistAttachment(
  raw: { name: string; contentType: string; path?: string; body?: unknown },
  args: { testId: string; attachmentDir: string; inlineMaxBytes: number },
): RawAttachment {
  // Attachment already has a body (either string content or a Buffer) — encode
  // it once and we're done. No filesystem I/O required.
  if (raw.body !== undefined) {
    if (typeof raw.body === "string") {
      return {
        name: raw.name,
        mediaType: raw.contentType,
        path: raw.path,
        body: raw.body,
        encoding: "IDENTITY",
      };
    }
    if (Buffer.isBuffer(raw.body) || raw.body instanceof Uint8Array) {
      return {
        name: raw.name,
        mediaType: raw.contentType,
        path: raw.path,
        body: Buffer.from(raw.body as Buffer | Uint8Array).toString("base64"),
        encoding: "BASE64",
      };
    }
  }

  // Path-only attachment: read the file now while it still exists.
  if (raw.path) {
    try {
      if (fs.existsSync(raw.path)) {
        const stats = fs.statSync(raw.path);
        if (stats.size <= args.inlineMaxBytes) {
          const buf = fs.readFileSync(raw.path);
          return {
            name: raw.name,
            mediaType: raw.contentType,
            path: raw.path,
            body: buf.toString("base64"),
            encoding: "BASE64",
            byteLength: stats.size,
          };
        }
        // Too large to inline — copy to stable location instead.
        const destDir = path.join(args.attachmentDir, args.testId);
        fs.mkdirSync(destDir, { recursive: true });
        const filename = path.basename(raw.path);
        const destPath = path.join(destDir, filename);
        fs.copyFileSync(raw.path, destPath);
        return {
          name: raw.name,
          mediaType: raw.contentType,
          path: destPath,
          byteLength: stats.size,
        };
      }
    } catch {
      // Fall through to original path-only mapping.
    }
  }

  return {
    name: raw.name,
    mediaType: raw.contentType,
    path: raw.path,
  };
}

// ============================================================================
// Reporter Implementation
// ============================================================================

export default class StoryReporter implements Reporter {
  private options: StoryReporterOptions;
  private scenarios: CollectedScenario[] = [];
  /** Kept from onBegin so onEnd can find tests that never ran (planned ones). */
  private rootSuite?: Suite;
  private startTime = 0;
  private packageVersion: string | undefined;
  private gitSha: string | undefined;
  private projectRoot: string = process.cwd();
  /**
   * Left unknown until onBegin sees a config. Claiming full coverage without
   * having looked would let a later merge retire scenarios on a guess.
   */
  private runScope: "full" | "filtered" | undefined;
  /**
   * Every spec file this run executed, story-bearing or not. Collected from all
   * tests rather than from the scenarios, so a file whose last story was
   * deleted is still known to have run and can have its report emptied.
   */
  private coveredSourceFiles = new Set<string>();
  /**
   * Files where a test ended badly without ever declaring its story — a hook
   * that threw before `story.init()`, a timeout during collection. Those
   * scenarios are missing because the run broke, not because they were deleted.
   */
  private incompleteSourceFiles = new Set<string>();
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

  private debug(...args: unknown[]): void {
    if (this.options.debug) {
      console.error("[executable-stories-playwright][debug]", ...args);
    }
  }

  onBegin(config: FullConfig, suite: Suite): void {
    this.startTime = Date.now();
    this.rootSuite = suite;
    this.projectRoot = config.rootDir ?? process.cwd();
    if (config) this.runScope = isNameFiltered(config) ? "filtered" : "full";
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
    // Record the file whether or not this test carries a story: the point is to
    // know the file ran, so a report emptied of stories can be retired.
    const file = test.location?.file;
    if (file) {
      const relative = toRelativePosix(file, this.projectRoot);
      this.coveredSourceFiles.add(relative);
      // No story annotation on a test that failed or timed out means the story
      // never got the chance to declare itself.
      const declared = test.annotations?.some((a) => a.type === "story-meta");
      const brokeEarly =
        result.status === "failed" ||
        result.status === "timedOut" ||
        result.status === "interrupted";
      if (!declared && brokeEarly) this.incompleteSourceFiles.add(relative);
    }

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

      // Get error message if failed. Playwright populates these with ANSI
      // color codes; strip them so reports render clean text instead of
      // garbled escape sequences like "[2mexpect([22m...".
      let error: string | undefined;
      let errorStack: string | undefined;
      if (result.status === "failed" && result.errors?.length) {
        const err = result.errors[0];
        error = stripAnsi(err.message || String(err));
        errorStack = err.stack ? stripAnsi(err.stack) : undefined;
      }

      // Map Playwright result.attachments → RawAttachment[]. Eagerly persist
      // path-based attachments (videos/screenshots/traces) so their bytes
      // survive Playwright's per-test outputDir cleanup — see the
      // `persistAttachment` helper for the inline-vs-copy decision.
      const persistEnabled = this.options.attachments?.enabled ?? true;
      const inlineMaxBytes =
        this.options.attachments?.inlineMaxBytes ?? DEFAULT_ATTACHMENT_INLINE_MAX_BYTES;
      const attachmentDir =
        this.options.attachments?.dir ??
        path.join(this.options.outputDir ?? "reports", "attachments");
      const allAttachments: RawAttachment[] = (result.attachments ?? []).map((a) => {
        if (!persistEnabled) {
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
        }
        return persistAttachment(a, {
          testId: test.id,
          attachmentDir,
          inlineMaxBytes,
        });
      });

      // Deduplicate video attachments by name — Playwright may attach
      // multiple video files per test (e.g. video.webm and video-1.webm).
      // Keep only the last video attachment per name, which is the real recording.
      const attachments = deduplicateVideoAttachments(allAttachments);

      // Auto-promote the Playwright screen recording into a featured inline
      // video doc entry when story.init(..., { featureVideo: true }) was set.
      // The recording already rides along as an attachment; this surfaces it as
      // a playable walkthrough at the top of the scenario rather than a footer
      // attachment. Referenced by a path relative to the report output dir so
      // the generated HTML/Markdown resolves it alongside the report.
      const featureVideo =
        (meta.meta as { featureVideo?: boolean } | undefined)?.featureVideo === true;
      if (featureVideo) {
        const videoAtt = attachments.find(
          (a) => a.mediaType?.startsWith("video/") && a.path,
        );
        if (videoAtt?.path) {
          const outDir = this.options.outputDir ?? "reports";
          const relPath = path
            .relative(outDir, videoAtt.path)
            .split(path.sep)
            .join("/");
          meta.docs = meta.docs ?? [];
          meta.docs.unshift({
            kind: "video",
            path: relPath,
            caption: "Recorded walkthrough",
            phase: "runtime",
          });
        }
      }

      // Extract step events (timing) from story steps
      const stepEvents: RawStepEvent[] = meta.steps
        .filter((s: { durationMs?: number }) => s.durationMs !== undefined)
        .map((s: { durationMs?: number; text: string; id?: string }, i: number) => ({
          index: i,
          stepId: s.id,
          title: s.text,
          durationMs: s.durationMs,
        }));

      this.scenarios.push({
        testId: test.id,
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

  /**
   * `test.fixme("title")` declares behaviour that is specified but not working
   * yet, which is what a planned scenario is. Those tests never run, so they
   * never call `story.init` and never reach `this.scenarios`; they have to be
   * read back off the suite instead.
   *
   * Only files that also contain story tests contribute, so a plain spec full
   * of fixmes does not leak into the generated docs. `test.skip` is left alone:
   * it means "do not run this now", not "we have not built this yet".
   */
  private collectPlannedTestCases(): RawTestCase[] {
    if (!this.rootSuite) return [];
    // Eligibility is per project AND file: the same spec can carry story tests
    // under one project and nothing under another.
    const key = (projectName: string | undefined, sourceFile: string) => `${projectName ?? ""}\u0000${sourceFile}`;
    const storyFiles = new Set(this.scenarios.map((s) => key(s.projectName, s.sourceFile)));
    if (storyFiles.size === 0) return [];

    // A story that ran and then called test.fixme() at runtime is already
    // collected as a skipped scenario; it must not appear a second time as a
    // planned one.
    const collectedIds = new Set(this.scenarios.map((s) => s.testId).filter(Boolean));

    const planned: RawTestCase[] = [];
    for (const test of this.rootSuite.allTests()) {
      const isFixme = test.annotations.some((a) => a.type === "fixme");
      if (!isFixme) continue;
      if (collectedIds.has(test.id)) continue;

      const absolute = test.location?.file;
      if (!absolute) continue;
      const sourceFile = toRelativePosix(absolute, this.projectRoot);
      const projectName = test.parent?.project()?.name;
      if (!storyFiles.has(key(projectName, sourceFile))) continue;

      // Walk the parent chain rather than titlePath(): suite.type tells us
      // exactly which entries are describes, with no filename guessing.
      const suitePath: string[] = [];
      for (let parent: Suite | undefined = test.parent; parent; parent = parent.parent) {
        if (parent.type === "describe" && parent.title) suitePath.unshift(parent.title);
      }
      planned.push({
        title: test.title,
        titlePath: [...suitePath, test.title],
        story: {
          scenario: test.title,
          steps: [],
          ...(suitePath.length > 0 ? { suitePath } : {}),
        },
        sourceFile,
        sourceLine: test.location?.line ?? 1,
        status: "todo",
        durationMs: 0,
        projectName,
        retry: 0,
        retries: 0,
      });
    }
    return planned;
  }

  async onEnd(_result: FullResult): Promise<void> {
    // Nothing ran and nothing was covered: there is genuinely nothing to say.
    if (this.scenarios.length === 0 && this.coveredSourceFiles.size === 0) return;

    if (this.scenarios.length > 0) {
      const sampleScenario = this.scenarios[0];
      if ("tags" in sampleScenario) {
        this.debug("tags found at scenario level", Object.keys(sampleScenario));
      }
      if (sampleScenario.meta && "tags" in sampleScenario.meta) {
        this.debug("tags found inside meta (expected)", sampleScenario.meta.tags);
      }
    }

    // Collect test cases
    const rawTestCases: RawTestCase[] = this.scenarios.map((scenario) => {
      // Map Playwright status to raw status
      const statusMap: Record<string, RawTestCase["status"]> = {
        passed: "pass",
        failed: "fail",
        skipped: "skip",
        timedOut: "timeout",
        interrupted: "interrupted",
      };

      const testCase = {
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

      return testCase;
    });

    if (rawTestCases.length > 0) {
      const sample = rawTestCases[0];
      if ("tags" in sample) {
        this.debug("tags found at rawTestCase level", Object.keys(sample));
      }
      if (sample.story && "tags" in sample.story) {
        this.debug("tags found inside story (expected)");
      }
    }

    rawTestCases.push(...this.collectPlannedTestCases());

    // Build RawRun
    const rawRun: RawRun = {
      testCases: rawTestCases,
      startedAtMs: this.startTime,
      finishedAtMs: Date.now(),
      projectRoot: this.projectRoot,
      ...(this.runScope ? { runScope: this.runScope } : {}),
      ...(this.coveredSourceFiles.size > 0
        ? { coveredSourceFiles: [...this.coveredSourceFiles].sort() }
        : {}),
      ...(this.incompleteSourceFiles.size > 0
        ? { incompleteSourceFiles: [...this.incompleteSourceFiles].sort() }
        : {}),
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
