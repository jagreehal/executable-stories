/**
 * Server-safe entry: parseStoryReport, Result types, schema constants.
 *
 * No React, no hooks, no client-only code. Safe to call from Next.js Server
 * Components, build scripts, edge functions, or anywhere else outside the
 * browser. The main "executable-stories-react" entry is marked "use client"
 * because it touches createContext; this entry stays clean.
 */

export { parseStoryReport } from "./schema/parse";
export { storyReportSchema, STORY_REPORT_SCHEMA_MAJOR } from "./schema/story-report.schema";
export type { Result, ReportParseError, ReportParseErrorCode } from "./result";
export { ok, err } from "./result";
export type {
  StoryReport,
  ReportFeature as StoryReportFeature,
  ReportScenario as StoryReportScenario,
  ReportStep as StoryReportStep,
  ReportDocEntry as StoryReportDocEntry,
  ReportSummary as StoryReportSummary,
} from "executable-stories-formatters";
