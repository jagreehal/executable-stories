/**
 * StoryReport — public, frozen contract for UI renderers.
 *
 * Distinct from internal TestRunResult. Pre-grouped feature → scenario tree,
 * with pre-computed summaries at every level. Adapter concerns (rawStatus,
 * projectName, titlePath) are stripped at the toStoryReport boundary.
 *
 * Versioning: semver-style "<major>.<minor>". Additive-only within a major.
 * Source of truth: schemas/story-report-v1.json. Types here must stay in sync.
 */

import type { DocPhase } from "./story.js";
import type { OtelSpan } from "./otel.js";

export type StoryReportSchemaVersion = `1.${number}`;

export type TestStatus = "passed" | "failed" | "skipped" | "pending";

export type StepKeyword = "Given" | "When" | "Then" | "And" | "But";

export type StepMode = "normal" | "skip" | "only" | "todo" | "fails" | "concurrent";

export interface ReportSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  pending: number;
  durationMs: number;
}

export interface ReportTicket {
  id: string;
  url?: string;
}

export interface ReportAttachment {
  name: string;
  mediaType: string;
  body: string;
  contentEncoding: "BASE64" | "IDENTITY";
}

export interface ReportCIInfo {
  name: string;
  url?: string;
  buildNumber?: string;
  branch?: string;
  commitSha?: string;
  prNumber?: string;
}

export interface ReportCoverageSummary {
  linesPct?: number;
  branchesPct?: number;
  functionsPct?: number;
  statementsPct?: number;
}

export type ReportDocEntry =
  | ReportDocNote
  | ReportDocTag
  | ReportDocKv
  | ReportDocCode
  | ReportDocTable
  | ReportDocLink
  | ReportDocSection
  | ReportDocMermaid
  | ReportDocScreenshot
  | ReportDocVideo
  | ReportDocHtml
  | ReportDocCustom;

export interface ReportDocNote {
  kind: "note";
  text: string;
  phase: DocPhase;
  children?: ReportDocEntry[];
}

export interface ReportDocTag {
  kind: "tag";
  names: string[];
  phase: DocPhase;
  children?: ReportDocEntry[];
}

export interface ReportDocKv {
  kind: "kv";
  label: string;
  value: unknown;
  phase: DocPhase;
  children?: ReportDocEntry[];
}

export interface ReportDocCode {
  kind: "code";
  label: string;
  content: string;
  lang?: string;
  phase: DocPhase;
  children?: ReportDocEntry[];
}

export interface ReportDocTable {
  kind: "table";
  label: string;
  columns: string[];
  rows: string[][];
  phase: DocPhase;
  children?: ReportDocEntry[];
}

export interface ReportDocLink {
  kind: "link";
  label: string;
  url: string;
  phase: DocPhase;
  children?: ReportDocEntry[];
}

export interface ReportDocSection {
  kind: "section";
  title: string;
  markdown: string;
  phase: DocPhase;
  children?: ReportDocEntry[];
}

export interface ReportDocMermaid {
  kind: "mermaid";
  code: string;
  title?: string;
  phase: DocPhase;
  children?: ReportDocEntry[];
}

export interface ReportDocScreenshot {
  kind: "screenshot";
  path: string;
  alt?: string;
  phase: DocPhase;
  children?: ReportDocEntry[];
}

export interface ReportDocVideo {
  kind: "video";
  path: string;
  caption?: string;
  poster?: string;
  phase: DocPhase;
  children?: ReportDocEntry[];
}

export interface ReportDocHtml {
  kind: "html";
  /** Local HTML file path (exactly one of path/url/content) */
  path?: string;
  /** Remote URL rendered via iframe src (exactly one of path/url/content) */
  url?: string;
  /** Inline HTML content rendered via iframe srcdoc (exactly one of path/url/content) */
  content?: string;
  title?: string;
  /** Iframe height: number → px, string passed through (e.g. "60vh"). Default 400px. */
  height?: number | string;
  phase: DocPhase;
  children?: ReportDocEntry[];
}

export interface ReportDocCustom {
  kind: "custom";
  type: string;
  data: unknown;
  phase: DocPhase;
  children?: ReportDocEntry[];
}

export interface ReportStep {
  id: string;
  index: number;
  keyword: StepKeyword;
  text: string;
  status: TestStatus;
  durationMs: number;
  errorMessage?: string;
  mode?: StepMode;
  docEntries: ReportDocEntry[];
}

export interface ReportScenario {
  id: string;
  title: string;
  status: TestStatus;
  durationMs: number;
  tags: string[];
  tickets?: ReportTicket[];
  /** Product-code paths/globs this scenario exercises (project-root-relative). */
  covers?: string[];
  sourceLine?: number;
  errorMessage?: string;
  errorStack?: string;
  retry: number;
  retries: number;
  docEntries: ReportDocEntry[];
  steps: ReportStep[];
  attachments: ReportAttachment[];
  /** OTel spans for the trace waterfall (carried through from the run). */
  otelSpans?: OtelSpan[];
}

export interface ReportFeature {
  id: string;
  title: string;
  sourceFile: string;
  summary: ReportSummary;
  scenarios: ReportScenario[];
}

export interface StoryReport {
  schemaVersion: StoryReportSchemaVersion;
  runId: string;
  startedAtMs: number;
  finishedAtMs: number;
  durationMs: number;
  projectRoot: string;
  packageVersion?: string;
  gitSha?: string;
  ci?: ReportCIInfo;
  coverage?: ReportCoverageSummary;
  summary: ReportSummary;
  features: ReportFeature[];
}

export const STORY_REPORT_SCHEMA_VERSION: StoryReportSchemaVersion = "1.0";
export const STORY_REPORT_SCHEMA_MAJOR = 1 as const;
