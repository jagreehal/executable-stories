/**
 * Configuration options for ACL and formatters.
 */

// CanonicalizeOptions is owned by executable-stories-core (the ACL lives there).
// Re-exported here so existing `../types/options` imports keep resolving.
export type { CanonicalizeOptions } from "executable-stories-core/types/canonicalize";

/** Output format for report generation */
export type OutputFormat = "astro-markdown" | "behavior-manifest-json" | "confluence" | "cucumber-json" | "cucumber-messages" | "cucumber-html" | "html" | "junit" | "markdown" | "release-manifest" | "scenario-index-json" | "story-report-json" | "traceability-matrix" | "traceability-csv";

/**
 * Format names accepted as INPUT. Adds `"astro"` as a deprecated alias for
 * `"astro-markdown"` — it is normalised (with a warning) wherever formats enter
 * the pipeline, so existing programmatic/config callers keep working.
 * @deprecated `"astro"` — use `"astro-markdown"`.
 */
export type FormatInput = OutputFormat | "astro";

/** Sort order for test cases in reports (deterministic for diff-friendly output) */
export type SortTestCasesMode = "id" | "source" | "none";

/** Output mode for report routing */
export type OutputMode = "aggregated" | "colocated";

/**
 * Colocated output style:
 * - `mirrored`  — preserve the source directory tree under outputDir (default)
 * - `adjacent`  — write next to each source file (ignores outputDir)
 * - `flat`      — one page per file directly under outputDir, named by its clean
 *                 stem (e.g. `convert-currency.md`); best for a browsable docs nav
 */
export type ColocatedStyle = "mirrored" | "adjacent" | "flat";

/** Output rule for routing reports based on source file patterns */
export interface OutputRule {
  /** Glob pattern to match sourceFile (uses micromatch, forward slashes) */
  match: string;
  /** Output mode for matched files */
  mode?: OutputMode;
  /** Colocated style (only applicable when mode is "colocated") */
  colocatedStyle?: ColocatedStyle;
  /** Output directory override */
  outputDir?: string;
  /** Output filename override (without extension) */
  outputName?: string;
  /** Formats to generate for matched files */
  formats?: FormatInput[];
}

/** Output configuration for report routing */
export interface OutputConfig {
  /** Default output mode. Default: "aggregated" */
  mode?: OutputMode;
  /** Default colocated style. Default: "mirrored" */
  colocatedStyle?: ColocatedStyle;
  /** Rules for routing reports based on source file patterns */
  rules?: OutputRule[];
  /** Default output filename (without extension) */
  outputName?: string;
}

/** Logger interface for dependency injection */
export interface Logger {
  warn(msg: string): void;
}

/** File writer function type for dependency injection */
export type WriteFile = (path: string, contents: string) => Promise<void>;

/** Formatter options for report generation */
export interface FormatterOptions {
  /** Glob patterns to include test cases by sourceFile (forward slashes). If empty, all are considered. */
  include?: string[];
  /** Glob patterns to exclude test cases by sourceFile (forward slashes). Applied after include. */
  exclude?: string[];
  /** Tags to include test cases (any match). If empty, all are considered. */
  includeTags?: string[];
  /** Tags to exclude test cases (any match). Applied after includeTags. */
  excludeTags?: string[];
  /** Output formats to generate. Default: ["html"] */
  formats?: FormatInput[];

  /** Output directory for generated reports. Default: "reports" */
  outputDir?: string;

  /** Base filename (without extension). Default: "index" */
  outputName?: string;

  /** Append run timestamp (UTC seconds) to output filename for before/after diffs. Default: false */
  outputNameTimestamp?: boolean;

  /** Sort test cases deterministically so report content order is stable across runs. Default: "none" */
  sortTestCases?: SortTestCasesMode;

  /** Output routing configuration */
  output?: OutputConfig;

  /** Cucumber JSON specific options */
  cucumberJson?: {
    /** Pretty-print JSON output. Default: false */
    pretty?: boolean;
  };

  /** StoryReport JSON specific options */
  storyReportJson?: {
    /** Pretty-print JSON output. Default: true */
    pretty?: boolean;
  };

  /** Scenario index JSON specific options */
  scenarioIndexJson?: {
    /** Pretty-print JSON output. Default: true */
    pretty?: boolean;
  };

  /** Behavior manifest JSON specific options */
  behaviorManifestJson?: {
    /** Pretty-print JSON output. Default: true */
    pretty?: boolean;
  };

  /**
   * HTML specific options. The HTML report renders via executable-stories-react;
   * only these CDN toggles and the title affect it. The string renderer's
   * darkMode, searchable, startCollapsed, embed, toc, and markdown options were
   * removed with it — the React report owns that behavior.
   */
  html?: {
    /** Report title. Default: "Test Results" */
    title?: string;
    /** Enable syntax highlighting for code blocks (via highlight.js CDN). Default: true */
    syntaxHighlighting?: boolean;
    /** Enable live Mermaid diagram rendering (via Mermaid.js CDN). Default: true */
    mermaidEnabled?: boolean;
    /** Days before the report shows a stale warning. 0 disables. Default: 7 */
    staleAfterDays?: number;
  };

  /**
   * Run history store (see loadHistory/updateHistory). When set, the HTML
   * report embeds each scenario's recent run history so cards can show a
   * run-over-run timeline. Update the store with the current run before
   * passing it so the report includes this run as the latest entry.
   */
  historyStore?: HistoryStore;

  /** JUnit XML specific options */
  junit?: {
    /** Test suite name. Default: "Test Suite" */
    suiteName?: string;
    /** Include system-out/system-err. Default: true */
    includeOutput?: boolean;
  };

  /** Cucumber Messages (NDJSON) specific options */
  cucumberMessages?: {
    /** Strategy for deriving Source.uri. Default: "sourceFile" */
    uriStrategy?: "sourceFile" | "virtual";
    /** Whether to emit Source/GherkinDocument for synthesized features. Default: true */
    includeSynthetics?: boolean;
    /** Salt for deterministic IDs. Default: "" */
    idSalt?: string;
    /** Tool metadata for Meta envelope */
    meta?: { toolName?: string; toolVersion?: string };
  };

  /** Markdown specific options */
  markdown?: MarkdownFormatterOptions;

  /** Astro/Starlight specific options */
  astro?: AstroFormatterOptions;

  /** Confluence/ADF specific options */
  confluence?: ConfluenceFormatterOptionsType;

  /** History tracking options */
  history?: {
    /** Path to JSON history file (enables tracking) */
    filePath?: string;
    /** Max runs to keep in history per test. Default: 10 */
    maxRuns?: number;
  };

  /** Notification options */
  notification?: {
    /** Slack webhook URL (fallback: SLACK_WEBHOOK_URL env var) */
    slackWebhookUrl?: string;
    /** Teams webhook URL (fallback: TEAMS_WEBHOOK_URL env var) */
    teamsWebhookUrl?: string;
    /** When to send: "always", "on-failure", "never". Default: "on-failure" */
    condition?: NotifyCondition;
    /** URL to link in notifications */
    reportUrl?: string;
    /** Max failed tests to show. Default: 5 */
    maxFailedTests?: number;
    /** Generic webhook configurations */
    webhooks?: GenericWebhookNotifierOptions[];
  };

  /** Asset bundling mode. "none" = no asset copying, "copy" = copy referenced assets next to HTML. Default: "none" */
  assetMode?: "none" | "copy";

  /** When true, warn on missing assets instead of throwing. Default: false */
  allowMissingAssets?: boolean;

  /** Logger for warnings and info. Default: console */
  logger?: Logger;

  /** File writer function. Default: fs.promises.writeFile */
  writeFile?: WriteFile;
}

/** Markdown formatter options (extended for feature parity) */
export interface MarkdownFormatterOptions {
  /** Report title. Default: "User Stories" */
  title?: string;
  /** Include status icons. Default: true */
  includeStatusIcons?: boolean;
  /** Include metadata table. Default: true */
  includeMetadata?: boolean;
  /** Include error details. Default: true */
  includeErrors?: boolean;
  /** Scenario heading level. Default: 3 */
  scenarioHeadingLevel?: 2 | 3 | 4;
  /** Step style. Default: "bullets" */
  stepStyle?: "bullets" | "gherkin";
  /** Group scenarios by. Default: "file" */
  groupBy?: "file" | "suite" | "none";
  /** Sort scenarios. Default: "source" */
  sortScenarios?: "alpha" | "source" | "none";
  /** Suite path separator. Default: " - " */
  suiteSeparator?: string;
  /** Include YAML front-matter for machine parsing. Default: false */
  includeFrontMatter?: boolean;
  /** Include summary table (counts, duration). Default: false */
  includeSummaryTable?: boolean;
  /** Base URL for source permalinks. E.g., "https://github.com/user/repo/blob" */
  permalinkBaseUrl?: string;
  /** URL template for ticket links. Use {ticket} as placeholder. E.g., "https://jira.example.com/browse/{ticket}" */
  ticketUrlTemplate?: string;
  /** URL template for trace links. Use {traceId} as placeholder. E.g., "https://grafana.example.com/explore?traceId={traceId}" */
  traceUrlTemplate?: string;
  /** Include source links when permalinkBaseUrl is set. Default: true */
  includeSourceLinks?: boolean;
  /** Custom renderers for doc entries */
  customRenderers?: MarkdownRenderers;
  /** Emit a stable per-scenario anchor for deep-linking. Returns the id, or undefined to skip. */
  scenarioAnchor?: (tc: TestCaseResult) => string | undefined;
  /** Render a badge line under a scenario heading (e.g. a what's-changed marker). Undefined to skip. */
  scenarioBadge?: (tc: TestCaseResult) => string | undefined;
  /** Render a business-context link line under a scenario heading. Undefined to skip. */
  scenarioNoteLink?: (tc: TestCaseResult) => string | undefined;
}

import type { DocEntry, StoryStep } from "executable-stories-core/types/story";
import type { TestCaseResult, TestRunResult } from "executable-stories-core/types/test-result";
import type { NotifyCondition, GenericWebhookNotifierOptions } from "../notifiers/types";
import type { HistoryStore } from "../history/types";
import type { ConfluenceFormatterOptions as ConfluenceFormatterOptionsType } from "../formatters/confluence";

/** Re-exported for consumers */
export type { ConfluenceFormatterOptionsType as ConfluenceFormatterOptions };

/** Astro/Starlight formatter options */
export interface AstroFormatterOptions {
  /** Base directory for copied assets (relative to outputDir). Default: "public/stories/assets" */
  assetsDir?: string;
  /** Base URL prefix for asset references in markdown. Default: "/stories/assets" */
  assetsBaseUrl?: string;
  /** Markdown options to pass through (title, permalinkBaseUrl, ticketUrlTemplate, etc.) */
  markdown?: Omit<MarkdownFormatterOptions, "includeFrontMatter" | "includeSummaryTable" | "includeMetadata" | "stepStyle">;
}

/** Custom renderers for markdown doc entries */
export interface MarkdownRenderers {
  /** Custom renderer for scenario header */
  renderScenarioHeader?: (tc: TestCaseResult) => string | null;
  /** Custom renderer for step */
  renderStep?: (step: StoryStep) => string | null;
  /** Custom renderer for doc entry */
  renderDocEntry?: (entry: DocEntry) => string | null;
  /** Custom renderer for footer */
  renderFooter?: (run: TestRunResult) => string | null;
}

/** Resolved formatter options with all defaults applied */
export interface ResolvedFormatterOptions {
  include: string[];
  exclude: string[];
  includeTags: string[];
  excludeTags: string[];
  formats: OutputFormat[];
  outputDir: string;
  outputName: string;
  outputNameTimestamp: boolean;
  sortTestCases: SortTestCasesMode;
  output: {
    mode: OutputMode;
    colocatedStyle: ColocatedStyle;
    rules: OutputRule[];
    outputName?: string;
  };
  cucumberJson: {
    pretty: boolean;
  };
  storyReportJson: {
    pretty: boolean;
  };
  scenarioIndexJson: {
    pretty: boolean;
  };
  behaviorManifestJson: {
    pretty: boolean;
  };
  cucumberMessages: {
    uriStrategy: "sourceFile" | "virtual";
    includeSynthetics: boolean;
    idSalt: string;
    meta?: { toolName?: string; toolVersion?: string };
  };
  html: {
    title: string;
    syntaxHighlighting: boolean;
    mermaidEnabled: boolean;
    staleAfterDays: number;
  };
  historyStore: HistoryStore | undefined;
  junit: {
    suiteName: string;
    includeOutput: boolean;
  };
  markdown: {
    title: string;
    includeStatusIcons: boolean;
    includeMetadata: boolean;
    includeErrors: boolean;
    scenarioHeadingLevel: 2 | 3 | 4;
    stepStyle: "bullets" | "gherkin";
    groupBy: "file" | "suite" | "none";
    sortScenarios: "alpha" | "source" | "none";
    suiteSeparator: string;
    includeFrontMatter: boolean;
    includeSummaryTable: boolean;
    permalinkBaseUrl?: string;
    ticketUrlTemplate?: string;
    traceUrlTemplate?: string;
    includeSourceLinks: boolean;
    customRenderers?: MarkdownRenderers;
  };
  confluence: {
    title: string;
    includeStatusIcons: boolean;
    includeMetadata: boolean;
    includeSummaryTable: boolean;
    includeErrors: boolean;
    scenarioHeadingLevel: 1 | 2 | 3 | 4 | 5 | 6;
    groupBy: "file" | "suite" | "none";
    sortScenarios: "alpha" | "source" | "none";
    pretty: boolean;
    permalinkBaseUrl?: string;
    ticketUrlTemplate?: string;
  };
  astro: {
    assetsDir: string;
    assetsBaseUrl: string;
    markdown: {
      title: string;
      includeStatusIcons: boolean;
      includeErrors: boolean;
      scenarioHeadingLevel: 2 | 3 | 4;
      groupBy: "file" | "suite" | "none";
      sortScenarios: "alpha" | "source" | "none";
      suiteSeparator: string;
      includeSourceLinks: boolean;
      permalinkBaseUrl?: string;
      ticketUrlTemplate?: string;
      traceUrlTemplate?: string;
      customRenderers?: MarkdownRenderers;
      scenarioAnchor?: (tc: TestCaseResult) => string | undefined;
      scenarioBadge?: (tc: TestCaseResult) => string | undefined;
      scenarioNoteLink?: (tc: TestCaseResult) => string | undefined;
    };
  };
  assetMode: "none" | "copy";
  allowMissingAssets: boolean;
}
