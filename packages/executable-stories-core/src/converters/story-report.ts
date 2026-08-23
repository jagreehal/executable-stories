/**
 * toStoryReport — convert a canonical TestRunResult into the public
 * StoryReport shape consumed by UI renderers.
 *
 * - Groups by sourceFile (relative to projectRoot when possible).
 * - Derives feature title from titlePath[0] when available, otherwise file basename.
 * - Strips adapter-only fields (rawStatus, projectName, raw titlePath).
 * - Pre-computes summary counts at every level.
 * - Generates stable IDs suitable for deep linking.
 */

import { posix as path } from "node:path";
import type {
  ReportAttachment,
  ReportDocEntry,
  ReportFeature,
  ReportScenario,
  ReportStep,
  ReportSummary,
  StepKeyword,
  StoryReport,
  TestStatus,
} from "../types/story-report.js";
import type { DocEntry } from "../types/story.js";
import type { FeatureDeclaration, TestCaseResult, TestRunResult } from "../types/test-result.js";
import { STORY_REPORT_SCHEMA_VERSION } from "../types/story-report.js";

function reportSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[/\\.]+/g, "-")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toRelativeSourceFile(sourceFile: string, projectRoot: string): string {
  if (!sourceFile) return sourceFile;
  const normalized = sourceFile.split(path.sep).join("/");
  const root = projectRoot.split(path.sep).join("/").replace(/\/$/, "");
  if (root && normalized.startsWith(root + "/")) return normalized.slice(root.length + 1);
  return normalized;
}

function fileBasenameTitle(sourceFile: string): string {
  const base = sourceFile.split("/").pop() ?? sourceFile;
  return base.replace(/\.(story\.)?(test|spec)\.[tj]sx?$/, "").replace(/\.[tj]sx?$/, "");
}

function emptySummary(): ReportSummary {
  return { total: 0, passed: 0, failed: 0, skipped: 0, pending: 0, durationMs: 0 };
}

function addToSummary(summary: ReportSummary, status: TestStatus, durationMs: number): void {
  summary.total += 1;
  summary[status] += 1;
  summary.durationMs += durationMs;
}

function isKeyword(value: string): value is StepKeyword {
  return value === "Given" || value === "When" || value === "Then" || value === "And" || value === "But";
}

function copyDocEntries(entries: DocEntry[] | undefined): ReportDocEntry[] {
  if (!entries || entries.length === 0) return [];
  return entries.map(copyDocEntry);
}

function copyDocEntry(entry: DocEntry): ReportDocEntry {
  const children = entry.children ? { children: copyDocEntries(entry.children) } : {};
  switch (entry.kind) {
    case "note":
      return { kind: "note", text: entry.text, phase: entry.phase, ...children };
    case "tag":
      return { kind: "tag", names: [...entry.names], phase: entry.phase, ...children };
    case "kv":
      return { kind: "kv", label: entry.label, value: entry.value, phase: entry.phase, ...children };
    case "code":
      return {
        kind: "code",
        label: entry.label,
        content: entry.content,
        ...(entry.lang ? { lang: entry.lang } : {}),
        phase: entry.phase,
        ...children,
      };
    case "table":
      return {
        kind: "table",
        label: entry.label,
        columns: [...entry.columns],
        rows: entry.rows.map((r) => [...r]),
        phase: entry.phase,
        ...children,
      };
    case "link":
      return { kind: "link", label: entry.label, url: entry.url, phase: entry.phase, ...children };
    case "section":
      return { kind: "section", title: entry.title, markdown: entry.markdown, phase: entry.phase, ...children };
    case "mermaid":
      return {
        kind: "mermaid",
        code: entry.code,
        ...(entry.title ? { title: entry.title } : {}),
        phase: entry.phase,
        ...children,
      };
    case "screenshot":
      return {
        kind: "screenshot",
        path: entry.path,
        ...(entry.alt ? { alt: entry.alt } : {}),
        phase: entry.phase,
        ...children,
      };
    case "video":
      return {
        kind: "video",
        path: entry.path,
        ...(entry.caption ? { caption: entry.caption } : {}),
        ...(entry.poster ? { poster: entry.poster } : {}),
        phase: entry.phase,
        ...children,
      };
    case "html":
      return {
        kind: "html",
        ...(entry.path !== undefined ? { path: entry.path } : {}),
        ...(entry.url !== undefined ? { url: entry.url } : {}),
        ...(entry.content !== undefined ? { content: entry.content } : {}),
        ...(entry.title !== undefined ? { title: entry.title } : {}),
        ...(entry.height !== undefined ? { height: entry.height } : {}),
        phase: entry.phase,
        ...children,
      };
    case "state":
      return {
        kind: "state",
        ...(entry.label !== undefined ? { label: entry.label } : {}),
        value: entry.value,
        phase: entry.phase,
        ...children,
      };
    case "custom":
      return {
        kind: "custom",
        type: entry.type,
        data: entry.data,
        phase: entry.phase,
        ...children,
      };
  }
}

function buildStep(args: {
  scenarioId: string;
  index: number;
  keyword: StepKeyword;
  text: string;
  status: TestStatus;
  durationMs: number;
  errorMessage?: string;
  mode?: ReportStep["mode"];
  docEntries: ReportDocEntry[];
}): ReportStep {
  const step: ReportStep = {
    id: `${args.scenarioId}--step-${args.index}`,
    index: args.index,
    keyword: args.keyword,
    text: args.text,
    status: args.status,
    durationMs: args.durationMs,
    docEntries: args.docEntries,
  };
  if (args.errorMessage !== undefined) step.errorMessage = args.errorMessage;
  if (args.mode !== undefined) step.mode = args.mode;
  return step;
}

function buildSteps(scenarioId: string, tc: TestCaseResult): ReportStep[] {
  const declared = tc.story.steps ?? [];
  const results = tc.stepResults;
  const max = Math.max(declared.length, results.length);
  const steps: ReportStep[] = [];

  for (let i = 0; i < max; i++) {
    const decl = declared[i];
    const res = results[i];

    const keywordSource = decl?.keyword;
    const keyword: StepKeyword = keywordSource && isKeyword(keywordSource) ? keywordSource : "Given";
    const text = decl?.text ?? "";
    const status: TestStatus = res?.status ?? "pending";
    const durationMs = res?.durationMs ?? decl?.durationMs ?? 0;
    const docEntries = copyDocEntries(decl?.docs);

    steps.push(buildStep({
      scenarioId,
      index: i,
      keyword,
      text,
      status,
      durationMs,
      ...(res?.errorMessage !== undefined ? { errorMessage: res.errorMessage } : {}),
      ...(decl?.mode !== undefined ? { mode: decl.mode } : {}),
      docEntries,
    }));
  }

  return steps;
}

function buildAttachments(tc: TestCaseResult): ReportAttachment[] {
  return tc.attachments.map((a) => ({
    name: a.name,
    mediaType: a.mediaType,
    body: a.body,
    contentEncoding: a.contentEncoding,
  }));
}

function buildScenario(
  tc: TestCaseResult,
  featureId: string,
  scenarioRefs?: Map<string, ReportScenario>,
): ReportScenario {
  const titleRaw = tc.story.scenario?.trim() || "(untitled scenario)";
  const id = `${featureId}--${reportSlug(titleRaw) || `case-${tc.id}`}`;
  const steps = buildSteps(id, tc);

  const scenario: ReportScenario = {
    id,
    title: titleRaw,
    status: tc.status,
    durationMs: tc.durationMs,
    tags: [...tc.tags],
    retry: tc.retry,
    retries: tc.retries,
    docEntries: copyDocEntries(tc.story.docs),
    steps,
    attachments: buildAttachments(tc),
  };

  if (tc.sourceLine && tc.sourceLine > 0) scenario.sourceLine = tc.sourceLine;
  if (tc.errorMessage !== undefined) scenario.errorMessage = tc.errorMessage;
  if (tc.errorStack !== undefined) scenario.errorStack = tc.errorStack;
  // Canonical status collapses todo → pending; keep "planned, not yet
  // implemented" as a first-class presentation signal for formatters.
  if (tc.rawStatus === "todo") scenario.planned = true;

  const tickets = tc.story.tickets;
  if (tickets && tickets.length > 0) {
    scenario.tickets = tickets.map((t) => (t.url ? { id: t.id, url: t.url } : { id: t.id }));
  }

  if (tc.story.covers && tc.story.covers.length > 0) {
    scenario.covers = [...tc.story.covers];
  }

  if (tc.story.otelSpans && tc.story.otelSpans.length > 0) {
    scenario.otelSpans = tc.story.otelSpans;
  }

  scenarioRefs?.set(tc.id, scenario);
  return scenario;
}

function deriveFeatureTitle(group: TestCaseResult[], relSourceFile: string): string {
  for (const tc of group) {
    const head = tc.titlePath?.[0];
    if (head && head.trim()) return head.trim();
  }
  return fileBasenameTitle(relSourceFile);
}

function compareScenarios(a: ReportScenario, b: ReportScenario): number {
  const aLine = a.sourceLine ?? Number.POSITIVE_INFINITY;
  const bLine = b.sourceLine ?? Number.POSITIVE_INFINITY;
  if (aLine !== bLine) return aLine - bLine;
  return a.title.localeCompare(b.title);
}

function buildFeature(
  relSourceFile: string,
  group: TestCaseResult[],
  scenarioRefs?: Map<string, ReportScenario>,
  declaration?: FeatureDeclaration,
): ReportFeature {
  const id = `feature-${reportSlug(relSourceFile.replace(/\.[^.]+$/, "")) || "untitled"}`;
  const title = declaration?.title ?? deriveFeatureTitle(group, relSourceFile);
  const summary = emptySummary();
  const scenarios: ReportScenario[] = [];

  for (const tc of group) {
    const scenario = buildScenario(tc, id, scenarioRefs);
    scenarios.push(scenario);
    addToSummary(summary, scenario.status, scenario.durationMs);
  }

  scenarios.sort(compareScenarios);

  const feature: ReportFeature = { id, title, sourceFile: relSourceFile, summary, scenarios };
  if (declaration) {
    feature.kind = declaration.kind;
    if (declaration.narrative) feature.narrative = declaration.narrative;
    if (declaration.glossary?.length) feature.glossary = declaration.glossary;
  }

  return feature;
}

function ensureUniqueFeatureIds(features: ReportFeature[]): void {
  const seen = new Map<string, number>();
  for (const f of features) {
    const count = seen.get(f.id) ?? 0;
    if (count > 0) f.id = `${f.id}-${count + 1}`;
    seen.set(f.id, count + 1);
  }
}

function ensureUniqueScenarioIds(feature: ReportFeature): void {
  const seen = new Map<string, number>();
  for (const s of feature.scenarios) {
    const count = seen.get(s.id) ?? 0;
    if (count > 0) {
      const newId = `${s.id}-${count + 1}`;
      for (const step of s.steps) {
        step.id = step.id.replace(s.id, newId);
      }
      s.id = newId;
    }
    seen.set(s.id, count + 1);
  }
}

/** Lookup from canonical run data into the generated report's ids. */
export interface StoryReportIndex {
  /** Final ReportScenario.id keyed by canonical TestCaseResult.id. */
  scenarioIdByTestCaseId: Record<string, string>;
}

/**
 * Convert a canonical TestRunResult into a frozen-shape StoryReport for UI renderers.
 */
export function toStoryReport(run: TestRunResult): StoryReport {
  return toStoryReportWithIndex(run).report;
}

/**
 * Like toStoryReport, but also returns the test-case-id → scenario-id index so
 * callers can join run-keyed data (e.g. the history store) onto report
 * scenarios. The index is built after the unique-id fixups, so it always holds
 * the final ids.
 */
export function toStoryReportWithIndex(run: TestRunResult): {
  report: StoryReport;
  index: StoryReportIndex;
} {
  const groups = new Map<string, TestCaseResult[]>();

  for (const tc of run.testCases) {
    const rel = toRelativeSourceFile(tc.sourceFile, run.projectRoot);
    const existing = groups.get(rel);
    if (existing) existing.push(tc);
    else groups.set(rel, [tc]);
  }

  const declarations = new Map<string, FeatureDeclaration>();
  for (const declaration of run.features ?? []) {
    declarations.set(toRelativeSourceFile(declaration.sourceFile, run.projectRoot), declaration);
  }

  const scenarioRefs = new Map<string, ReportScenario>();
  const features: ReportFeature[] = [];
  for (const [rel, group] of groups) {
    features.push(buildFeature(rel, group, scenarioRefs, declarations.get(rel)));
  }

  features.sort((a, b) => a.title.localeCompare(b.title));
  ensureUniqueFeatureIds(features);
  for (const f of features) ensureUniqueScenarioIds(f);

  const summary = emptySummary();
  for (const f of features) {
    summary.total += f.summary.total;
    summary.passed += f.summary.passed;
    summary.failed += f.summary.failed;
    summary.skipped += f.summary.skipped;
    summary.pending += f.summary.pending;
    summary.durationMs += f.summary.durationMs;
  }

  const report: StoryReport = {
    schemaVersion: STORY_REPORT_SCHEMA_VERSION,
    runId: run.runId,
    startedAtMs: run.startedAtMs,
    finishedAtMs: run.finishedAtMs,
    durationMs: run.durationMs,
    projectRoot: run.projectRoot,
    summary,
    features,
  };

  if (run.packageVersion) report.packageVersion = run.packageVersion;
  if (run.gitSha) report.gitSha = run.gitSha;
  if (run.ci) {
    const ci: StoryReport["ci"] = { name: run.ci.name };
    if (run.ci.url) ci.url = run.ci.url;
    if (run.ci.buildNumber) ci.buildNumber = run.ci.buildNumber;
    if (run.ci.branch) ci.branch = run.ci.branch;
    if (run.ci.commitSha) ci.commitSha = run.ci.commitSha;
    if (run.ci.prNumber) ci.prNumber = run.ci.prNumber;
    report.ci = ci;
  }
  if (run.coverage) {
    const cov: NonNullable<StoryReport["coverage"]> = {};
    if (run.coverage.linesPct !== undefined) cov.linesPct = run.coverage.linesPct;
    if (run.coverage.branchesPct !== undefined) cov.branchesPct = run.coverage.branchesPct;
    if (run.coverage.functionsPct !== undefined) cov.functionsPct = run.coverage.functionsPct;
    if (run.coverage.statementsPct !== undefined) cov.statementsPct = run.coverage.statementsPct;
    report.coverage = cov;
  }

  const scenarioIdByTestCaseId: Record<string, string> = {};
  for (const [tcId, scenario] of scenarioRefs) {
    scenarioIdByTestCaseId[tcId] = scenario.id;
  }

  return { report, index: { scenarioIdByTestCaseId } };
}
