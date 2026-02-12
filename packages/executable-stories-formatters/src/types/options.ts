/**
 * Configuration options for ACL and formatters.
 */

/** Options for canonicalizing raw run data */
export interface CanonicalizeOptions {
  /** Attachment handling options */
  attachments?: {
    /** Max bytes before attachment becomes external link. Default: 512KB (524288) */
    maxEmbedBytes?: number;
    /** Directory for external attachments */
    externalDir?: string;
  };

  /** Cucumber compatibility options */
  cucumber?: {
    /** Include trailing space in keywords (e.g., "Given "). Default: true */
    keywordSpacing?: boolean;
    /** Generate deterministic line numbers. Default: true */
    deterministicLines?: boolean;
  };

  /** Default timestamps if not provided in raw data */
  defaults?: {
    /** Default start time (epoch ms). Default: Date.now() */
    startedAtMs?: number;
    /** Default finish time (epoch ms). Default: Date.now() */
    finishedAtMs?: number;
  };
}

/** Output format for report generation */
export type OutputFormat = "cucumber-json" | "cucumber-messages" | "cucumber-html" | "html" | "junit" | "markdown";

/** Output mode for report routing */
export type OutputMode = "aggregated" | "colocated";

/** Colocated output style */
export type ColocatedStyle = "mirrored" | "adjacent";

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
  formats?: OutputFormat[];
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
  /** Output formats to generate. Default: ["cucumber-json"] */
  formats?: OutputFormat[];

  /** Output directory for generated reports. Default: "reports" */
  outputDir?: string;

  /** Base filename (without extension). Default: "test-results" */
  outputName?: string;

  /** Output routing configuration */
  output?: OutputConfig;

  /** Cucumber JSON specific options */
  cucumberJson?: {
    /** Pretty-print JSON output. Default: false */
    pretty?: boolean;
  };

  /** HTML specific options */
  html?: {
    /** Report title. Default: "Test Results" */
    title?: string;
    /** Include dark mode toggle. Default: true */
    darkMode?: boolean;
    /** Include search/filter functionality. Default: true */
    searchable?: boolean;
    /** Start with scenarios collapsed. Default: false */
    startCollapsed?: boolean;
    /** Embed screenshots inline (base64). Default: true */
    embedScreenshots?: boolean;
    /** Enable syntax highlighting for code blocks (via highlight.js CDN). Default: true */
    syntaxHighlighting?: boolean;
    /** Enable live Mermaid diagram rendering (via Mermaid.js CDN). Default: true */
    mermaidEnabled?: boolean;
    /** Enable Markdown parsing for section doc entries (via marked.js CDN). Default: true */
    markdownEnabled?: boolean;
  };

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
  /** Include source links when permalinkBaseUrl is set. Default: true */
  includeSourceLinks?: boolean;
  /** Custom renderers for doc entries */
  customRenderers?: MarkdownRenderers;
}

import type { DocEntry, StoryStep } from "./story";
import type { TestCaseResult, TestRunResult } from "./test-result";

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
  formats: OutputFormat[];
  outputDir: string;
  outputName: string;
  output: {
    mode: OutputMode;
    colocatedStyle: ColocatedStyle;
    rules: OutputRule[];
    outputName?: string;
  };
  cucumberJson: {
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
    darkMode: boolean;
    searchable: boolean;
    startCollapsed: boolean;
    embedScreenshots: boolean;
    syntaxHighlighting: boolean;
    mermaidEnabled: boolean;
    markdownEnabled: boolean;
  };
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
    includeSourceLinks: boolean;
    customRenderers?: MarkdownRenderers;
  };
}
