/**
 * Cypress/Mocha reporter for executable-stories.
 * Builds RawRun (formatters schema) from run results + stored story meta, then generates reports.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { StoryMeta } from "executable-stories-formatters";

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
  type RawStatus,
  type FormatterOptions,
} from "executable-stories-formatters";

import { getMeta, getAttachments, getAllMeta, clearStore } from "./store";

// Re-export types from formatters
export type {
  OutputFormat,
  OutputMode,
  ColocatedStyle,
  OutputRule,
  FormatterOptions,
} from "executable-stories-formatters";

// ============================================================================
// Reporter Options
// ============================================================================

export interface StoryReporterOptions extends FormatterOptions {
  /** If set, write raw run JSON (schemaVersion 1) to this path for CLI/binary */
  rawRunPath?: string;
  /** Spec file path (relative to projectRoot) for this run. If omitted, inferred from stored meta when possible. */
  specPath?: string;
  /** Project root. Defaults to process.cwd(). */
  projectRoot?: string;
}

// ============================================================================
// Mocha Runner / Test types (minimal for reporter)
// ============================================================================

interface MochaSuite {
  title: string;
  suites: MochaSuite[];
  tests: MochaTest[];
  parent?: MochaSuite;
}

interface MochaTest {
  title: string;
  state?: string;
  duration?: number;
  err?: Error & { message?: string; stack?: string };
  parent?: MochaSuite;
}

interface MochaRunner {
  suite: MochaSuite;
  startTime?: number;
  on?(event: string, callback: () => void): void;
}

function getTitlePath(test: MochaTest): string[] {
  const path: string[] = [];
  let current: MochaSuite | MochaTest | undefined = test;
  while (current) {
    const title = "title" in current ? current.title : "";
    if (title) path.unshift(title);
    current = "parent" in current ? current.parent : undefined;
  }
  return path;
}

function collectTests(suite: MochaSuite): MochaTest[] {
  const tests = [...suite.tests];
  for (const s of suite.suites) {
    tests.push(...collectTests(s));
  }
  return tests;
}

function mapCypressStateToRaw(state: string | undefined): RawStatus {
  switch (state) {
    case "passed":
      return "pass";
    case "failed":
      return "fail";
    case "pending":
      return "skip";
    default:
      return "unknown";
  }
}

// ============================================================================
// Reporter Implementation
// ============================================================================

const DEFAULT_OPTIONS: Partial<StoryReporterOptions> = {
  projectRoot: process.cwd(),
};

/**
 * Create a Mocha reporter function that Cypress can use (--reporter path/to/reporter).
 * Cypress passes (runner, reporterOptions) with reporterOptions as the second argument directly.
 * Also supports options.reporterOptions for wrapped usage.
 */
function createReporter(
  runner: MochaRunner,
  options: StoryReporterOptions | { reporterOptions?: StoryReporterOptions } = {}
) {
  const reporterOpts =
    "reporterOptions" in options && options.reporterOptions
      ? options.reporterOptions
      : (options as StoryReporterOptions);
  const opts: StoryReporterOptions = { ...DEFAULT_OPTIONS, ...reporterOpts };
  const projectRoot = opts.projectRoot ?? process.cwd();
  const specPath = opts.specPath ?? "unknown";
  const startTime = runner.startTime ?? Date.now();

  runner.suite && runner.on?.("end", () => {
    const tests = collectTests(runner.suite);
    const rawTestCases: RawTestCase[] = [];

    // If specPath not provided, infer from first stored meta (all stored entries are for this spec in a single-spec run)
    const effectiveSpecPath =
      specPath !== "unknown"
        ? specPath
        : (() => {
            const all = getAllMeta();
            return all.length > 0 ? all[0].specRelative : "unknown";
          })();

    for (const test of tests) {
      const titlePath = getTitlePath(test);
      const meta = getMeta(effectiveSpecPath, titlePath);
      if (!meta) continue; // only document tests that used story.init()

      const status = mapCypressStateToRaw(test.state);

      // Map stored attachments to RawAttachment[]
      const storedAttachments = getAttachments(effectiveSpecPath, titlePath);
      const attachments: RawAttachment[] | undefined = storedAttachments?.map((a) => ({
        name: a.name,
        mediaType: a.mediaType,
        path: a.path,
        body: typeof a.body === 'string' ? a.body : a.body instanceof Buffer ? a.body.toString('base64') : undefined,
        encoding: a.encoding ?? (a.body instanceof Buffer ? 'BASE64' : undefined),
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
        titlePath: meta.suitePath ? [...meta.suitePath, meta.scenario] : [meta.scenario],
        story: meta,
        sourceFile: effectiveSpecPath,
        sourceLine: 1,
        status,
        durationMs: test.duration,
        error: test.err
          ? { message: test.err.message, stack: test.err.stack }
          : undefined,
        attachments: attachments && attachments.length > 0 ? attachments : undefined,
        stepEvents: stepEvents.length > 0 ? stepEvents : undefined,
        retry: 0,
        retries: 0,
      });
    }

    if (rawTestCases.length === 0) {
      clearStore();
      return;
    }

    const includeMetadata = opts.markdown?.includeMetadata ?? true;
    const rawRun: RawRun = {
      testCases: rawTestCases,
      startedAtMs: startTime,
      finishedAtMs: Date.now(),
      projectRoot,
      packageVersion: includeMetadata ? readPackageVersion(projectRoot) : undefined,
      gitSha: includeMetadata ? readGitSha(projectRoot) : undefined,
      ci: detectCI(),
    };

    const rawRunPath = opts.rawRunPath;
    if (rawRunPath) {
      const absolutePath = path.isAbsolute(rawRunPath)
        ? rawRunPath
        : path.join(projectRoot, rawRunPath);
      const dir = path.dirname(absolutePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(absolutePath, JSON.stringify({ schemaVersion: 1, ...rawRun }, null, 2), "utf8");
    }

    const canonicalRun = canonicalizeRun(rawRun);
    const generator = new ReportGenerator(opts);
    generator.generate(canonicalRun).catch((err) => {
      console.error("Failed to generate reports:", err);
    });

    clearStore();
  });
}

/**
 * Alternative: build RawRun from Cypress Module API results + stored meta.
 * Use this when not using the Mocha reporter (e.g. in after:run plugin).
 * Call recordMeta via plugin during the run, then call this with cypress.run() result.
 */
export interface CypressRunResultTest {
  title: string[];
  state?: string;
  displayError?: string;
  duration?: number;
  attempts?: Array<{
    state?: string;
    duration?: number;
    error?: { message?: string; stack?: string };
  }>;
}

export interface CypressRunResultRun {
  spec?: { relative?: string; absolute?: string };
  tests?: CypressRunResultTest[];
}

export interface CypressRunResult {
  runs?: CypressRunResultRun[];
  config?: { projectRoot?: string };
}

export function buildRawRunFromCypressResult(
  result: CypressRunResult,
  options: StoryReporterOptions = {}
): RawRun {
  const projectRoot = options.projectRoot ?? result.config?.projectRoot ?? process.cwd();
  const rawTestCases: RawTestCase[] = [];

  for (const run of result.runs ?? []) {
    const specRelative = run.spec?.relative ?? "unknown";
    for (const test of run.tests ?? []) {
      const titlePath = test.title ?? [];
      const meta = getMeta(specRelative, titlePath);
      if (!meta) continue;

      const lastAttempt = test.attempts?.length
        ? test.attempts[test.attempts.length - 1]
        : undefined;
      const state = lastAttempt?.state ?? test.state;
      const err = lastAttempt?.error ?? (test.displayError ? { message: test.displayError } : undefined);
      const duration = lastAttempt?.duration ?? test.duration;

      rawTestCases.push({
        title: meta.scenario,
        titlePath: meta.suitePath ? [...meta.suitePath, meta.scenario] : [meta.scenario],
        story: meta,
        sourceFile: specRelative,
        sourceLine: 1,
        status: mapCypressStateToRaw(state),
        durationMs: duration,
        error: err ? { message: err.message, stack: err.stack } : undefined,
      });
    }
  }

  const includeMetadata = options.markdown?.includeMetadata ?? true;
  return {
    testCases: rawTestCases,
    startedAtMs: undefined,
    finishedAtMs: Date.now(),
    projectRoot,
    packageVersion: includeMetadata ? readPackageVersion(projectRoot) : undefined,
    gitSha: includeMetadata ? readGitSha(projectRoot) : undefined,
    ci: detectCI(),
  };
}

/**
 * Generate reports from a RawRun (e.g. after buildRawRunFromCypressResult).
 */
export async function generateReportsFromRawRun(
  rawRun: RawRun,
  options: FormatterOptions
): Promise<void> {
  if (rawRun.testCases.length === 0) return;
  const canonicalRun = canonicalizeRun(rawRun);
  const generator = new ReportGenerator(options);
  await generator.generate(canonicalRun);
}

export default createReporter;
