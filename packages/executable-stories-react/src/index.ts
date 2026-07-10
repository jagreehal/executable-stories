/**
 * executable-stories-react — public exports.
 *
 * Drop-in React renderer for StoryReport v1 JSON. Semantic, SSR-safe,
 * themeable via CSS variables. Import the stylesheet once in your root:
 *
 *   import "executable-stories-react/styles.css";
 */

export { Report } from "./components/Report";
export type { ReportProps } from "./components/Report";

export { ReportRoot } from "./context/ReportRoot";
export type { ReportRootProps } from "./context/ReportRoot";

export { ReportSummary, ReportSummaryView } from "./components/ReportSummary";
export type { ReportSummaryProps, ReportSummaryViewProps } from "./components/ReportSummary";

export { ReportMeta } from "./components/ReportMeta";
export { ReportAttachments } from "./components/ReportAttachments";
export { ReportTrace } from "./components/ReportTrace";

export { ReportFeatureList } from "./components/ReportFeatureList";
export { ReportFeature } from "./components/ReportFeature";
export type { ReportFeatureProps } from "./components/ReportFeature";

export { ReportScenarioList } from "./components/ReportScenarioList";
export type { ReportScenarioListProps } from "./components/ReportScenarioList";

export { ReportScenario } from "./components/ReportScenario";
export type { ReportScenarioProps } from "./components/ReportScenario";

export { ReportSteps, ReportStepItem } from "./components/ReportSteps";
export type { ReportStepsProps } from "./components/ReportSteps";

export { ReportDocEntries } from "./components/ReportDocEntries";
export type { ReportDocEntriesProps } from "./components/ReportDocEntries";

export { DocEntry } from "./components/doc/DocEntry";
export { DocNote } from "./components/doc/DocNote";
export { DocTag } from "./components/doc/DocTag";
export { DocKv } from "./components/doc/DocKv";
export { DocCode } from "./components/doc/DocCode";
export { DocTable } from "./components/doc/DocTable";
export { DocLink } from "./components/doc/DocLink";
export { DocSection } from "./components/doc/DocSection";
export { DocMermaid, MermaidSource } from "./components/doc/DocMermaid";
// Opt-in client renderer that draws mermaid diagrams (dynamically imports the
// `mermaid` peer dep). Wire via `renderers={{ mermaid: (e) => <MermaidDiagram entry={e} /> }}`.
export { MermaidDiagram } from "./components/doc/MermaidDiagram";
export { DocScreenshot } from "./components/doc/DocScreenshot";
export { DocVideo } from "./components/doc/DocVideo";
export { DocHtml } from "./components/doc/DocHtml";
export { DocCustom } from "./components/doc/DocCustom";

export { ScenarioExplorer } from "./components/ScenarioExplorer";
export type { ScenarioExplorerProps, ExplorerScenario, ExplorerStatus } from "./components/ScenarioExplorer";

export { useCustomRenderers, useBuiltinRenderers } from "./hooks/useRenderers";

// Provenance/freshness helpers shared by ReportMeta, the interactive
// freshness banner, and downstream consumers (e.g. the Astro site).
export {
  reportLastRunMs,
  formatRelativeAge,
  isReportStale,
  ciDisplayName,
  commitUrl,
  prUrl,
} from "./lib/provenance";

// Run-history types + helpers (the interactive scenario timeline strip).
export { currentStreak, describeRunHistory } from "./lib/run-history";
export type { ScenarioRunEvent, ScenarioRunStatus, ScenarioHistoryMap, RunStreak } from "./lib/run-history";
export { ScenarioRunHistory } from "./components/ScenarioRunHistory";

// Interactive layer (client-only) lives under the dedicated entry point:
//   import { ReportInteractive } from "executable-stories-react/interactive";
// That bundle ships with a top-of-file "use client" directive so Next.js
// App Router recognizes it as a client component.

export type {
  CustomRenderer,
  CustomRenderers,
  BuiltinRenderers,
} from "./renderers";

export { ReportEmpty } from "./components/ReportEmpty";
export type { ReportEmptyProps } from "./components/ReportEmpty";

export { ReportSchemaError } from "./components/ReportSchemaError";
export type { ReportSchemaErrorProps } from "./components/ReportSchemaError";

export { useReport } from "./hooks/useReport";

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
} from "executable-stories-core";
