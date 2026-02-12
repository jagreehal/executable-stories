/**
 * Vitest reporter that reads task.meta.story from tests and writes reports
 * using the executable-stories-formatters package.
 *
 * Do not add value imports from "vitest" or "./story-api.js" here; this entry is loaded in vitest.config
 * before Vitest is ready. Use only `import type` from those modules.
 */
import type {
  Reporter,
  SerializedError,
  TestModule,
  TestCase,
  TestRunEndReason,
  Vitest,
} from "vitest/node";
import * as fs from "node:fs";
import * as path from "node:path";
import type { StoryMeta } from "./types";

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
  type CoverageSummary,
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
  /** When GITHUB_ACTIONS, append report to job summary via @actions/core. Default: true */
  enableGithubActionsSummary?: boolean;
  /** If set, write raw run JSON (schemaVersion 1) to this path for use with the executable-stories CLI/binary */
  rawRunPath?: string;
}

// ============================================================================
// Coverage Types
// ============================================================================

type CoverageMetric = { total: number; covered: number; pct: number };
type CoverageData = {
  statements: CoverageMetric;
  branches: CoverageMetric;
  functions: CoverageMetric;
  lines?: CoverageMetric;
};
type CoverageFile = {
  s: Record<string, number>;
  f: Record<string, number>;
  b: Record<string, number[]>;
  l?: Record<string, number>;
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Normalize Vitest onCoverage payload to coverage data.
 */
function normalizeCoveragePayload(
  coverage: unknown
): Record<string, CoverageFile> | undefined {
  if (!coverage || typeof coverage !== "object" || Array.isArray(coverage))
    return undefined;
  const raw = coverage as Record<string, unknown>;
  const data: Record<string, CoverageFile> = {};
  for (const [filePath, file] of Object.entries(raw)) {
    if (
      file &&
      typeof file === "object" &&
      "s" in file &&
      "f" in file &&
      "b" in file
    ) {
      data[filePath] = file as CoverageFile;
    }
  }
  if (Object.keys(data).length === 0) return undefined;
  return data;
}

/**
 * Summarize coverage data.
 */
function summarizeCoverage(
  data: Record<string, CoverageFile>
): CoverageData | undefined {
  let statementsTotal = 0;
  let statementsCovered = 0;
  let functionsTotal = 0;
  let functionsCovered = 0;
  let branchesTotal = 0;
  let branchesCovered = 0;
  let linesTotal = 0;
  let linesCovered = 0;
  let hasLines = false;

  for (const file of Object.values(data)) {
    for (const count of Object.values(file.s)) {
      statementsTotal += 1;
      if (count > 0) statementsCovered += 1;
    }
    for (const count of Object.values(file.f)) {
      functionsTotal += 1;
      if (count > 0) functionsCovered += 1;
    }
    for (const counts of Object.values(file.b)) {
      for (const count of counts) {
        branchesTotal += 1;
        if (count > 0) branchesCovered += 1;
      }
    }
    if (file.l) {
      hasLines = true;
      for (const count of Object.values(file.l)) {
        linesTotal += 1;
        if (count > 0) linesCovered += 1;
      }
    }
  }

  if (
    statementsTotal === 0 &&
    functionsTotal === 0 &&
    branchesTotal === 0 &&
    !hasLines
  ) {
    return undefined;
  }

  const metric = (covered: number, total: number): CoverageMetric => ({
    total,
    covered,
    pct: total === 0 ? 100 : Math.round((covered / total) * 100),
  });

  const summary: CoverageData = {
    statements: metric(statementsCovered, statementsTotal),
    branches: metric(branchesCovered, branchesTotal),
    functions: metric(functionsCovered, functionsTotal),
  };
  if (hasLines) {
    summary.lines = metric(linesCovered, linesTotal);
  }
  return summary;
}

/**
 * Convert internal coverage data to formatters CoverageSummary.
 */
function toCoverageSummary(
  data: CoverageData | undefined
): CoverageSummary | undefined {
  if (!data) return undefined;
  return {
    statementsPct: data.statements.pct,
    branchesPct: data.branches.pct,
    functionsPct: data.functions.pct,
    linesPct: data.lines?.pct,
  };
}

/**
 * Convert path to relative posix format.
 */
function toRelativePosix(absolutePath: string, projectRoot: string): string {
  return path.relative(projectRoot, absolutePath).split(path.sep).join("/");
}

// ============================================================================
// Reporter Implementation
// ============================================================================

/**
 * Vitest reporter that generates reports using executable-stories-formatters.
 *
 * Reads `task.meta.story` from each test and generates reports in configured formats.
 * Supports output routing (aggregated/colocated) and multiple output formats.
 */
export default class StoryReporter implements Reporter {
  private options: StoryReporterOptions;
  private ctx: Vitest | undefined;
  private startTime: number = 0;
  private packageVersion: string | undefined;
  private gitSha: string | undefined;
  private coverageData: CoverageData | undefined;

  constructor(options: StoryReporterOptions = {}) {
    this.options = options;
  }

  onInit(ctx: Vitest): void {
    this.ctx = ctx;
    this.startTime = Date.now();
    const root = ctx.config?.root ?? process.cwd();

    // Read metadata if needed
    const includeMetadata = this.options.markdown?.includeMetadata ?? true;
    if (includeMetadata) {
      this.packageVersion = readPackageVersion(root);
      this.gitSha = readGitSha(root);
    }
  }

  onCoverage(coverage: unknown): void {
    const data = normalizeCoveragePayload(coverage);
    if (data) {
      this.coverageData = summarizeCoverage(data);
    }
  }

  async onTestRunEnd(
    testModules: ReadonlyArray<TestModule>,
    _unhandledErrors: ReadonlyArray<SerializedError>,
    reason: TestRunEndReason
  ): Promise<void> {
    if (reason === "interrupted") return;

    const root = this.ctx?.config?.root ?? process.cwd();

    // Collect test cases
    const rawTestCases = this.collectTestCases(testModules, root);

    // Build RawRun
    const rawRun: RawRun = {
      testCases: rawTestCases,
      startedAtMs: this.startTime,
      finishedAtMs: Date.now(),
      projectRoot: root,
      packageVersion: this.packageVersion,
      gitSha: this.gitSha,
      ci: detectCI(),
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

    // Add coverage if available
    if (this.coverageData) {
      canonicalRun.coverage = toCoverageSummary(this.coverageData);
    }

    // Generate reports
    const generator = new ReportGenerator(this.options);
    try {
      const results = await generator.generate(canonicalRun);

      // Append to GitHub Actions summary if enabled
      const enableGithubSummary = this.options.enableGithubActionsSummary ?? true;
      if (process.env.GITHUB_ACTIONS === "true" && enableGithubSummary) {
        const markdownPaths = results.get("markdown") ?? [];
        if (markdownPaths.length > 0) {
          const firstPath = markdownPaths[0];
          const content = fs.readFileSync(firstPath, "utf8");
          await this.appendGithubSummary(content).catch(() => {});
        }
      }
    } catch (err) {
      console.error("Failed to generate reports:", err);
    }
  }

  /**
   * Collect test cases from Vitest test modules.
   */
  private collectTestCases(
    testModules: ReadonlyArray<TestModule>,
    root: string
  ): RawTestCase[] {
    const testCases: RawTestCase[] = [];

    for (const mod of testModules) {
      const collection = mod.children;
      if (!collection) continue;

      const moduleId =
        mod.moduleId ??
        (mod as { relativeModuleId?: string }).relativeModuleId ??
        "";
      const absoluteModuleId = path.isAbsolute(moduleId)
        ? moduleId
        : path.resolve(root, moduleId);
      const sourceFile = toRelativePosix(absoluteModuleId, root);

      for (const test of collection.allTests()) {
        const meta = this.getStoryMeta(test);
        if (!meta?.scenario || !Array.isArray(meta.steps)) continue;

        const result = test.result?.();
        const state = result?.state ?? "pending";
        const durationMs =
          typeof (result as { duration?: number } | undefined)?.duration ===
          "number"
            ? (result as unknown as { duration: number }).duration
            : 0;

        // Get error details
        let errorMessage: string | undefined;
        let errorStack: string | undefined;
        if (state === "failed" && result) {
          const errors = (result as { errors?: SerializedError[] }).errors;
          if (errors?.length) {
            const err = errors[0];
            errorMessage = err.message;
            errorStack = err.stack;
          }
        }

        // Map Vitest state to raw status
        const statusMap: Record<string, string> = {
          passed: "pass",
          failed: "fail",
          skipped: "skip",
          pending: "pending",
          todo: "pending",
        };

        // Extract attachments from task.meta.storyAttachments
        const taskMeta = test.meta() as Record<string, unknown>;
        const scopedAttachments = (taskMeta?.storyAttachments ?? []) as Array<{
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
        const attachments: RawAttachment[] = scopedAttachments.map((a) => ({
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

        // Extract step events (timing) from story steps
        const stepEvents: RawStepEvent[] = meta.steps
          .filter((s: { durationMs?: number }) => s.durationMs !== undefined)
          .map((s: { durationMs?: number }, i: number) => ({
            index: i,
            title: (s as { text: string }).text,
            durationMs: s.durationMs,
          }));

        // Retry info from Vitest result
        const retryCount = (result as { retryCount?: number } | undefined)?.retryCount ?? 0;

        testCases.push({
          title: meta.scenario,
          titlePath: meta.suitePath
            ? [...meta.suitePath, meta.scenario]
            : [meta.scenario],
          story: meta,
          sourceFile,
          sourceLine: Math.max(1, meta.sourceOrder ?? 1),
          status: (statusMap[state] ?? "unknown") as RawTestCase["status"],
          durationMs,
          error: errorMessage
            ? { message: errorMessage, stack: errorStack }
            : undefined,
          attachments: attachments.length > 0 ? attachments : undefined,
          stepEvents: stepEvents.length > 0 ? stepEvents : undefined,
          retry: retryCount,
          retries: 0,
        });
      }
    }

    return testCases;
  }

  private getStoryMeta(test: TestCase): StoryMeta | undefined {
    const meta = test.meta() as Record<string, unknown>;
    return meta?.["story"] as StoryMeta | undefined;
  }

  private async appendGithubSummary(reportText: string): Promise<void> {
    try {
      const { summary } = await import("@actions/core");
      summary.addRaw(reportText);
      await summary.write();
    } catch {
      // @actions/core not available or not in Actions
    }
  }
}

export { StoryReporter };
