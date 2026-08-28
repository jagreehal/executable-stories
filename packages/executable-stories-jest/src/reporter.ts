/**
 * Jest reporter for executable-stories.
 * Generates reports using the executable-stories-formatters package.
 *
 * Uses file-based communication: story.init() writes JSON files to
 * .jest-executable-stories/ which this reporter reads.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import fg from "fast-glob";
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

/** Shape of JSON files written by story.init() */
interface StoryFileReport {
  testFilePath: string;
  scenarios: (StoryMeta & {
    _attachments?: Array<{
      name: string;
      mediaType: string;
      path?: string;
      body?: string;
      encoding?: "BASE64" | "IDENTITY";
      charset?: string;
      fileName?: string;
      stepIndex?: number;
      stepId?: string;
    }>;
  })[];
}

interface JestTestResult {
  testFilePath: string;
  testResults: Array<{
    fullName: string;
    title?: string;
    status: "passed" | "failed" | "pending" | "todo";
    duration?: number;
    failureMessages?: string[];
  }>;
}

interface JestAggregatedResult {
  testResults: JestTestResult[];
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

export default class StoryReporter {
  private options: StoryReporterOptions;
  private startTime = 0;
  private packageVersion: string | undefined;
  private gitSha: string | undefined;
  /**
   * Left unknown when Jest hands us no global config. Claiming full coverage
   * without having looked would let a later merge retire scenarios on a guess.
   */
  private runScope: "full" | "filtered" | undefined;

  constructor(globalConfig: unknown, reporterOptions: StoryReporterOptions = {}) {
    this.options = reporterOptions;
    // `jest -t` runs only the matching tests, so a run carrying a pattern
    // reports a subset of each file it touches and must not be read as that
    // file's full contents.
    const config = globalConfig as { testNamePattern?: unknown } | undefined;
    if (config) {
      const pattern = config.testNamePattern;
      const filtered = typeof pattern === "string" ? pattern.length > 0 : pattern != null;
      this.runScope = filtered ? "filtered" : "full";
    }
  }

  /** Get the output directory for story JSON files */
  private getOutputDir(): string {
    const baseDir = process.env.JEST_STORY_DOCS_DIR ?? ".jest-executable-stories";
    return path.resolve(process.cwd(), baseDir);
  }

  /** Reset run artifacts (clear previous story files) */
  private resetRunArtifacts(): void {
    try {
      fs.rmSync(this.getOutputDir(), { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }

  /** Read story reports written by story.init() during test execution */
  private readStoryReports(): StoryFileReport[] {
    const outputDir = this.getOutputDir();
    if (!fs.existsSync(outputDir)) return [];
    const files = fg.sync("**/*.json", {
      cwd: outputDir,
      onlyFiles: true,
      absolute: true,
    });
    const reports: StoryFileReport[] = [];
    for (const file of files) {
      try {
        const raw = fs.readFileSync(file, "utf8");
        const parsed = JSON.parse(raw) as StoryFileReport;
        if (!parsed?.testFilePath || !Array.isArray(parsed.scenarios)) continue;
        reports.push(parsed);
      } catch {
        // Ignore unreadable or malformed files
      }
    }
    return reports;
  }

  onRunStart(): void {
    this.resetRunArtifacts();
    this.startTime = Date.now();
    const root = process.cwd();
    const includeMetadata = this.options.markdown?.includeMetadata ?? true;
    if (includeMetadata) {
      this.packageVersion = readPackageVersion(root);
      this.gitSha = readGitSha(root);
    }
  }

  async onRunComplete(
    _testContexts: Set<unknown>,
    results: JestAggregatedResult
  ): Promise<void> {
    const root = process.cwd();

    // Build map of test results by file for status lookup
    const fileResults = new Map<string, JestTestResult>();
    for (const testFileResult of results.testResults) {
      fileResults.set(testFileResult.testFilePath, testFileResult);
    }

    // Read story data from JSON files written by story.init()
    const reports = this.readStoryReports();

    // Collect test cases
    const rawTestCases: RawTestCase[] = [];

    // Which tests actually declared a story, per file. A failed test missing
    // from here never got the chance to declare one.
    const declaredByFile = new Map<string, Set<string>>();

    for (const report of reports) {
      const fileResult = fileResults.get(report.testFilePath);
      const sourceFile = toRelativePosix(report.testFilePath, root);
      const matchedFullNames = new Set<string>();
      declaredByFile.set(sourceFile, matchedFullNames);

      for (const meta of report.scenarios) {
        if (!meta?.scenario) continue;

        // Find matching test result
        const matchingTest = fileResult?.testResults.find((test) => {
          const expectedFullName = meta.suitePath
            ? [...meta.suitePath, meta.scenario].join(" > ")
            : meta.scenario;
          return test.fullName === expectedFullName;
        });
        if (matchingTest) matchedFullNames.add(matchingTest.fullName);

        // Map Jest status to raw status
        const statusMap: Record<string, RawTestCase["status"]> = {
          passed: "pass",
          failed: "fail",
          pending: "pending",
          todo: "pending",
        };

        const status = matchingTest
          ? statusMap[matchingTest.status] ?? "unknown"
          : "pass";

        // Map attachments
        const rawAttachments: RawAttachment[] = (meta._attachments ?? []).map((a: NonNullable<typeof meta._attachments>[number]) => ({
          name: a.name,
          mediaType: a.mediaType,
          path: a.path,
          body: a.body,
          encoding: a.encoding,
          charset: a.charset,
          fileName: a.fileName,
          stepIndex: a.stepIndex,
          stepId: a.stepId,
        }));

        // Extract step events (timing)
        const stepEvents: RawStepEvent[] = meta.steps
          .filter((s: { durationMs?: number }) => s.durationMs !== undefined)
          .map((s: { durationMs?: number; text: string }, i: number) => ({
            index: i,
            title: s.text,
            durationMs: s.durationMs,
          }));

        rawTestCases.push({
          title: meta.scenario,
          titlePath: meta.suitePath
            ? [...meta.suitePath, meta.scenario]
            : [meta.scenario],
          story: meta,
          sourceFile,
          sourceLine: Math.max(1, meta.sourceOrder ?? 1),
          status,
          durationMs: matchingTest?.duration ?? 0,
          error: matchingTest?.failureMessages?.length
            ? { message: matchingTest.failureMessages.join("\n") }
            : undefined,
          attachments: rawAttachments.length > 0 ? rawAttachments : undefined,
          stepEvents: stepEvents.length > 0 ? stepEvents : undefined,
          retry: 0,
          retries: 0,
        });
      }

      // Bodyless `it.todo(...)` never runs `story.init()`, so it has no story
      // meta — but Jest still reports it with status "todo". Emit those as
      // planned scenarios. Only files with story reports reach this loop, so
      // plain (non-story) suites full of todos never leak into the docs.
      for (const test of fileResult?.testResults ?? []) {
        if (test.status !== "todo" || matchedFullNames.has(test.fullName)) continue;
        const title = test.title ?? test.fullName;
        matchedFullNames.add(test.fullName);
        rawTestCases.push({
          title,
          titlePath: [title],
          story: { scenario: title, steps: [] },
          sourceFile,
          sourceLine: 1,
          status: "todo",
          durationMs: 0,
          retry: 0,
          retries: 0,
        });
      }
    }

    // Every file Jest executed, whether or not it produced a story. Without
    // this a file whose last story was deleted looks like a file that did not
    // run, and keeps its old scenarios for good.
    const coveredSourceFiles = [
      ...new Set(
        (results.testResults ?? [])
          .map((r) => r.testFilePath)
          .filter((f): f is string => typeof f === "string" && f.length > 0)
          .map((f) => toRelativePosix(f, root))
      ),
    ].sort();

    // A story that never declared itself — a throwing beforeAll, an import
    // error, a timeout before `story.init()` — is missing because the run
    // broke, not because someone deleted it. Checked per test, not per file:
    // one healthy story in a file does not vouch for its broken siblings.
    const incompleteSourceFiles = [
      ...new Set(
        (results.testResults ?? [])
          .filter((r) => {
            const declared =
              declaredByFile.get(toRelativePosix(r.testFilePath, root)) ??
              new Set<string>();
            const undeclaredFailure = (r.testResults ?? []).some(
              (t) => t.status === "failed" && !declared.has(t.fullName)
            );
            // No tests at all plus a failure means the module never loaded.
            const suiteError =
              Boolean((r as { testExecError?: unknown }).testExecError) ||
              ((r.testResults ?? []).length === 0 &&
                Boolean((r as { failureMessage?: string | null }).failureMessage));
            return undeclaredFailure || suiteError;
          })
          .map((r) => toRelativePosix(r.testFilePath, root))
      ),
    ].sort();

    // Nothing ran and nothing was covered: there is genuinely nothing to say.
    if (rawTestCases.length === 0 && coveredSourceFiles.length === 0) return;

    // Build RawRun
    const rawRun: RawRun = {
      testCases: rawTestCases,
      startedAtMs: this.startTime,
      finishedAtMs: Date.now(),
      projectRoot: root,
      packageVersion: this.packageVersion,
      gitSha: this.gitSha,
      ci: detectCI(),
      ...(this.runScope ? { runScope: this.runScope } : {}),
      ...(coveredSourceFiles.length > 0 ? { coveredSourceFiles } : {}),
      ...(incompleteSourceFiles.length > 0 ? { incompleteSourceFiles } : {}),
    };

    // Optionally write raw run JSON for CLI/binary consumption
    const rawRunPath = this.options.rawRunPath;
    if (rawRunPath) {
      const absolutePath = path.isAbsolute(rawRunPath)
        ? rawRunPath
        : path.join(root, rawRunPath);
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
