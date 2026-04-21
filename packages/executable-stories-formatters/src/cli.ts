/**
 * executable-stories CLI
 *
 * Reads raw test results as JSON and generates reports.
 *
 * Usage:
 *   executable-stories format run.json --format html,markdown
 *   executable-stories format --stdin --format html
 *   executable-stories validate run.json
 */

import { parseArgs } from "node:util";
import * as fs from "node:fs";
import * as path from "node:path";

import { validateRawRun } from "./validation/schema-validator";
import { synthesizeStories } from "./converters/synthesize";
import { canonicalizeRun } from "./converters/acl";
import { assertValidRun } from "./converters/acl/validate";
// eslint-disable-next-line no-restricted-imports -- ReportGenerator and compare helpers currently live in the package entrypoint.
import {
  ReportGenerator,
  createPrCommentSummary,
  generateRunComparison,
} from "./index.js";
import { parseNdjson } from "./converters/ndjson-parser";
import type { OutputFormat } from "./types/options";
import { sendNotifications } from "./notifiers";
import { toCIInfo } from "./types/ci";
import type { NotifyCondition, GenericWebhookNotifierOptions, WebhookSignerHmac } from "./notifiers/types";
import { loadHistory, saveHistory, updateHistory } from "./history";
import { pickAutoBaseline } from "./compare/auto-baseline";
import { listScenarios } from "./list-scenarios";
import { selectTestCases } from "./select-test-cases";
import type { RawRun } from "./types/raw";
import type { TestRunResult } from "./types/test-result";
import { initAstro as initAstroFn } from "./init-astro";
import { publishConfluencePage } from "./publishers/confluence";
import { publishJiraIssue, type JiraPublishMode } from "./publishers/jira";
import { loadConfig } from "./config.js";
import type { Formatter } from "./types/formatter.js";

// ============================================================================
// Exit Codes
// ============================================================================

const EXIT_SUCCESS = 0;
const EXIT_SCHEMA_VALIDATION = 1;
const EXIT_CANONICAL_VALIDATION = 2;
const EXIT_GENERATION = 3;
const EXIT_USAGE = 4;

// ============================================================================
// CLI Argument Parsing
// ============================================================================

const HELP_TEXT = `
executable-stories — Generate reports from test results JSON.

USAGE
  executable-stories format <file> [options]
  executable-stories format --stdin [options]
  executable-stories compare <baseline-file> <current-file> [options]
  executable-stories list <file> [options]
  executable-stories validate <file>
  executable-stories validate --stdin
  executable-stories init-astro [directory]
  executable-stories publish-confluence <file.adf.json> [options]
  executable-stories publish-jira <file.adf.json> [options]

SUBCOMMANDS
  format             Read raw test results and generate reports
  compare            Compare two runs and generate a diff report
  list               List scenarios from a test run (text table or JSON)
  validate           Validate a JSON file against the schema (no output generated)
  init-astro         Scaffold an Astro docs site for story output (Starlight with themed CSS)
  publish-confluence Publish an ADF JSON file to a Confluence page via REST API
  publish-jira       Publish an ADF JSON file to a Jira issue (as comment or description)

OPTIONS
  --format <formats>            Comma-separated formats: html, markdown, junit, cucumber-json, cucumber-messages, cucumber-html, astro, confluence, or custom names from config (default: html)
                                  astro             Themed Markdown (for Astro docs sites with matching CSS)
                                  confluence        Atlassian Document Format (ADF) JSON for Confluence / Jira
                                  html              Custom HTML report (accessible, dark mode, mermaid)
                                  cucumber-html     Official Cucumber HTML report
                                  markdown          Markdown documentation
                                  junit             JUnit XML
                                  cucumber-json     Cucumber JSON
                                  cucumber-messages Raw NDJSON (Cucumber Messages)
  --config <path>               Path to executable-stories.config.js (default: ./executable-stories.config.js)
  --input-type <type>           Input type: raw, canonical, or ndjson (default: raw)
  --output-dir <dir>            Output directory (default: reports)
  --output-name <name>          Base filename (default: index)
  --output-name-timestamp       Append run timestamp (UTC seconds) to output filename for before/after diffs
  --sort-test-cases <mode>      Sort scenarios deterministically: id, source, none (default: none)
  --include <globs>             Comma-separated globs to include test cases by sourceFile (e.g. "**/*.Story*.cs")
  --exclude <globs>             Comma-separated globs to exclude test cases by sourceFile (e.g. "**/obj/**")
  --include-tags <tags>         Comma-separated tags to include test cases (any match)
  --exclude-tags <tags>         Comma-separated tags to exclude test cases (any match)
  --synthesize-stories          Synthesize story metadata for plain test results (default)
  --no-synthesize-stories       Disable story synthesis (strict mode)
  --html-title <title>          HTML report title (default: Test Results)
  --html-theme <name>           HTML theme (default, corporate, terminal, minimal, dashboard, playful)
  --html-no-syntax-highlighting Disable syntax highlighting in HTML (enabled by default)
  --html-no-mermaid             Disable mermaid diagrams in HTML (enabled by default)
  --html-no-markdown            Disable markdown parsing in HTML (enabled by default)
  --html-permalink-base-url <url> Base URL for source permalinks in HTML (e.g. "https://github.com/org/repo/blob/main")
  --html-no-toc                 Disable table of contents sidebar in HTML (enabled by default)
  --html-theme-picker           Include theme picker in HTML report (embeds all CSS-only themes)
  --html-ticket-url-template <url> URL template for ticket links in HTML (use {ticket} as placeholder)
  --asset-mode <mode>         Asset bundling: "none" (default) or "copy"
  --allow-missing-assets      Warn on missing assets instead of failing
  --stdin                       Read JSON from stdin instead of file
  --list-format <format>        list output format: text (default), json, csv, markdown-table
  --json-summary                Deprecated alias for --list-format json
  --baseline <path|auto>        Compare baseline file, or auto-pick a prior run for compare
  --baseline-dir <dir>          Directory to scan when --baseline auto is used
  --pr-summary                  Print a PR-friendly markdown summary after compare
  --pr-summary-file <path>      Write the PR-friendly markdown summary to a file
  --emit-canonical <path>       Write canonical JSON to given path
  --help                        Show this help message

LIST
  list prints one scenario per line (--list-format text by default)
  list --list-format json outputs machine-parsable JSON (--json-summary is a deprecated alias)
  list supports --include-tags, --exclude-tags for filtering
  list supports --input-type and --stdin

COMPARE
  compare supports --format html,markdown
  compare uses the same --input-type for both baseline and current files

INIT-ASTRO
  executable-stories init-astro [directory]   Scaffold into directory (default: ./story-docs)
  --force                                      Overwrite existing directory

PUBLISH-CONFLUENCE
  executable-stories publish-confluence <file.adf.json> [options]
  --page-id <id>               Update an existing page (alternative to --space-id)
  --space-id <id>              Create a new page (requires --title)
  --parent-id <id>             Parent page ID (for new pages)
  --title <title>              Page title
  --base-url <url>             Confluence base URL (env: CONFLUENCE_BASE_URL)
  --email <email>              Atlassian email (env: CONFLUENCE_EMAIL)
  --token <token>              API token (env: CONFLUENCE_TOKEN)
  --dry-run                    Validate and print request plan, don't POST

PUBLISH-JIRA
  executable-stories publish-jira <file.adf.json> [options]
  --issue <KEY>                Issue key, e.g. PROJ-123 (required)
  --mode <mode>                "comment" (default) or "description"
  --base-url <url>             Jira base URL (env: JIRA_BASE_URL)
  --email <email>              Atlassian email (env: JIRA_EMAIL)
  --token <token>              API token (env: JIRA_TOKEN)
  --dry-run                    Validate and print request plan, don't POST

NOTIFICATIONS
  --slack-webhook <url>         Slack incoming webhook URL (fallback: SLACK_WEBHOOK_URL env var)
  --teams-webhook <url>         Teams incoming webhook URL (fallback: TEAMS_WEBHOOK_URL env var)
  --notify <condition>          When to send: always, on-failure, never (default: on-failure)
  --report-url <url>            URL to link in notification messages
  --max-failed-tests <n>        Max failed tests to show in notifications (default: 5)

GENERIC WEBHOOK
  --webhook-url <url>            Generic webhook URL (repeatable for multiple endpoints)
  --webhook-header <Key: Value>  Custom request header (repeatable)
  --webhook-method <POST|PUT>    HTTP method (default: POST)
  --webhook-hmac-secret <s>      HMAC-SHA256 signing secret
  --webhook-hmac-header <name>   Signature header name (default: X-Signature)
  --webhook-hmac-timestamp       Include timestamp in HMAC signing
  Note: all --webhook-url entries share the same method/headers/signing options.

HISTORY
  --history-file <path>         Path to JSON history file (enables tracking)
  --max-history-runs <n>        Max runs to keep in history per test (default: 10)

EXIT CODES
  0  Success
  1  Schema validation failure
  2  Canonical validation failure
  3  Formatter/generation failure
  4  Bad arguments / usage error
`.trim();

interface CliArgs {
  subcommand: "format" | "compare" | "list" | "validate";
  inputFile?: string;
  baselineFile?: string;
  currentFile?: string;
  baselineMode: "explicit" | "auto";
  baselineDir?: string;
  stdin: boolean;
  formats: OutputFormat[];
  inputType: "raw" | "canonical" | "ndjson";
  outputDir: string;
  outputName: string;
  outputNameTimestamp: boolean;
  sortTestCases: "id" | "source" | "none";
  include: string[];
  exclude: string[];
  includeTags: string[];
  excludeTags: string[];
  synthesizeStories: boolean;
  htmlTitle: string;
  htmlTheme: string;
  htmlNoSyntaxHighlighting: boolean;
  htmlNoMermaid: boolean;
  htmlNoMarkdown: boolean;
  htmlPermalinkBaseUrl?: string;
  htmlTicketUrlTemplate?: string;
  htmlNoToc: boolean;
  htmlThemePicker: boolean;
  jsonSummary: boolean;
  listFormat: "text" | "json" | "csv" | "markdown-table";
  emitCanonical?: string;
  slackWebhook?: string;
  teamsWebhook?: string;
  notify: NotifyCondition;
  reportUrl?: string;
  maxFailedTests: number;
  historyFile?: string;
  maxHistoryRuns: number;
  webhookUrls: string[];
  webhookHeaders: Record<string, string>;
  webhookMethod: "POST" | "PUT";
  webhookHmacSecret?: string;
  webhookHmacHeader: string;
  webhookHmacTimestamp: boolean;
  assetMode: "none" | "copy";
  allowMissingAssets: boolean;
  prSummary: boolean;
  prSummaryFile?: string;
  config?: string;
}

async function parseCliArgs(argv: string[]): Promise<{ args: CliArgs; pluginConfig: Awaited<ReturnType<typeof loadConfig>>; customRequested: string[] }> {
  // Strip node + script path
  const args = argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(HELP_TEXT);
    process.exit(EXIT_SUCCESS);
  }

  const subcommand = args[0];
  if (
    subcommand !== "format" &&
    subcommand !== "compare" &&
    subcommand !== "list" &&
    subcommand !== "validate" &&
    subcommand !== "init-astro" &&
    subcommand !== "publish-confluence" &&
    subcommand !== "publish-jira"
  ) {
    console.error(
      `Unknown subcommand: "${subcommand}". Use "format", "compare", "list", "validate", "init-astro", "publish-confluence", or "publish-jira".`,
    );
    process.exit(EXIT_USAGE);
  }

  // Handle publish-confluence early (has its own arg shape — exits after completion)
  if (subcommand === "publish-confluence") {
    await runPublishConfluence(args.slice(1));
    process.exit(EXIT_SUCCESS);
  }

  // Handle publish-jira early (has its own arg shape — exits after completion)
  if (subcommand === "publish-jira") {
    await runPublishJira(args.slice(1));
    process.exit(EXIT_SUCCESS);
  }

  // Handle init-astro early (no parseArgs needed)
  if (subcommand === "init-astro") {
    const initArgs = args.slice(1);
    const targetDir = initArgs.find((a) => !a.startsWith("--")) ?? "./story-docs";
    const force = initArgs.includes("--force");

    try {
      const result = initAstroFn({ targetDir, force });
      console.log(`Scaffolded Astro docs site at ${result.targetDir}`);
      console.log("");
      console.log("Themes available in src/styles/themes/:");
      console.log("  default.css   IBM Plex Sans, cucumber green (default)");
      console.log("  corporate.css  DM Sans, navy accent");
      console.log("  terminal.css   JetBrains Mono, green-on-dark");
      console.log("  minimal.css    DM Sans, warm teal");
      console.log("  dashboard.css  DM Sans, blue accent");
      console.log("  playful.css    Source Sans, coral pastels");
      console.log("");
      console.log("To change theme, edit astro.config.mjs customCss array.");
      console.log("");
      console.log("");
      console.log("Next steps:");
      console.log(`  cd ${result.targetDir}`);
      console.log("  pnpm install    # or npm install");
      console.log("  pnpm dev        # start the dev server");
      console.log("");
      console.log("Generate story docs with:");
      console.log(`  executable-stories format run.json --format astro --output-dir ${result.targetDir}/src/content/docs/stories --asset-mode copy`);
      process.exit(EXIT_SUCCESS);
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(EXIT_USAGE);
    }
  }

  // Parse remaining args with node:util parseArgs
  const { values, positionals } = parseArgs({
    args: args.slice(1),
    options: {
      format: { type: "string", default: "html" },
      baseline: { type: "string" },
      "baseline-dir": { type: "string" },
      "input-type": { type: "string", default: "raw" },
      "output-dir": { type: "string", default: "reports" },
      "output-name": { type: "string", default: "index" },
      "output-name-timestamp": { type: "boolean", default: false },
      "sort-test-cases": { type: "string", default: "none" },
      include: { type: "string" },
      exclude: { type: "string" },
      "include-tags": { type: "string" },
      "exclude-tags": { type: "string" },
      "synthesize-stories": { type: "boolean", default: true },
      "no-synthesize-stories": { type: "boolean", default: false },
      "html-title": { type: "string", default: "Test Results" },
      "html-theme": { type: "string", default: "default" },
      "html-no-syntax-highlighting": { type: "boolean", default: false },
      "html-no-mermaid": { type: "boolean", default: false },
      "html-no-markdown": { type: "boolean", default: false },
      "html-permalink-base-url": { type: "string" },
      "html-ticket-url-template": { type: "string" },
      "html-no-toc": { type: "boolean", default: false },
      "html-theme-picker": { type: "boolean", default: false },
      stdin: { type: "boolean", default: false },
      "json-summary": { type: "boolean", default: false },
      "list-format": { type: "string", default: "text" },
      "emit-canonical": { type: "string" },
      "slack-webhook": { type: "string" },
      "teams-webhook": { type: "string" },
      notify: { type: "string", default: "on-failure" },
      "report-url": { type: "string" },
      "max-failed-tests": { type: "string" },
      "history-file": { type: "string" },
      "max-history-runs": { type: "string" },
      "webhook-url": { type: "string", multiple: true },
      "webhook-header": { type: "string", multiple: true },
      "webhook-method": { type: "string" },
      "webhook-hmac-secret": { type: "string" },
      "webhook-hmac-header": { type: "string" },
      "webhook-hmac-timestamp": { type: "boolean", default: false },
      "asset-mode": { type: "string", default: "none" },
      "allow-missing-assets": { type: "boolean", default: false },
      "pr-summary": { type: "boolean", default: false },
      "pr-summary-file": { type: "string" },
      "config": { type: "string" },
      help: { type: "boolean", default: false },
    },
    allowPositionals: true,
    strict: true,
  });

  if (values.help) {
    console.log(HELP_TEXT);
    process.exit(EXIT_SUCCESS);
  }

  const useStdin = values.stdin as boolean;
  const baselineValue = values.baseline as string | undefined;
  const baselineMode = baselineValue === "auto" ? "auto" : "explicit";
  const inputFile = subcommand === "compare" ? undefined : positionals[0];
  const baselineFile =
    subcommand === "compare"
      ? baselineMode === "auto"
        ? baselineValue && baselineValue !== "auto"
          ? baselineValue
          : positionals.length > 1
            ? positionals[0]
            : undefined
        : baselineValue && baselineValue !== "auto"
          ? baselineValue
          : positionals.length > 1
            ? positionals[0]
            : undefined
      : undefined;
  const currentFile =
    subcommand === "compare"
      ? positionals.length > 1
        ? positionals[1]
        : positionals[0]
      : undefined;

  if (subcommand === "compare") {
    if (useStdin) {
      console.error("Error: compare does not support --stdin. Pass baseline and current files.");
      process.exit(EXIT_USAGE);
    }
    if (!currentFile) {
      console.error("Error: compare requires <current-file>, and either <baseline-file> or --baseline auto.");
      process.exit(EXIT_USAGE);
    }
    if (baselineMode === "explicit" && !baselineFile) {
      console.error("Error: compare requires <baseline-file> and <current-file>, or use --baseline auto.");
      process.exit(EXIT_USAGE);
    }
  } else if (!useStdin && !inputFile) {
    console.error("Error: No input file specified. Use a positional argument or --stdin.");
    process.exit(EXIT_USAGE);
  }

  const inputType = values["input-type"] as string;
  if (inputType !== "raw" && inputType !== "canonical" && inputType !== "ndjson") {
    console.error(`Error: --input-type must be "raw", "canonical", or "ndjson", got "${inputType}".`);
    process.exit(EXIT_USAGE);
  }

  // Load config early so custom formatter names can be validated alongside built-ins
  const pluginConfig = await loadConfig(values["config"] as string | undefined);
  const customFormatterNames = new Set(Object.keys(pluginConfig.formatters ?? {}));

  const builtInFormats = new Set(["astro", "confluence", "html", "markdown", "junit", "cucumber-json", "cucumber-messages", "cucumber-html"]);
  const formatStr = values.format as string;
  const allRequestedFormats = formatStr.split(",").map((f) => f.trim());
  const builtInRequested = allRequestedFormats.filter((f) => builtInFormats.has(f)) as OutputFormat[];
  const customRequested = allRequestedFormats.filter((f) => customFormatterNames.has(f));
  const unknownFormats = allRequestedFormats.filter((f) => !builtInFormats.has(f) && !customFormatterNames.has(f));

  if (unknownFormats.length > 0) {
    const knownCustom = customFormatterNames.size > 0 ? `, ${[...customFormatterNames].join(", ")}` : "";
    console.error(`Error: Unknown format(s): ${unknownFormats.join(", ")}. Valid built-in: astro, confluence, html, markdown, junit, cucumber-json, cucumber-messages, cucumber-html${knownCustom}.`);
    process.exit(EXIT_USAGE);
  }

  const formats = builtInRequested;

  // Validate --html-theme
  const htmlTheme = values["html-theme"] as string;
  const validThemes = new Set(["default", "corporate", "terminal", "minimal", "dashboard", "playful"]);
  if (!validThemes.has(htmlTheme)) {
    console.error(`Error: Unknown theme "${htmlTheme}". Valid: ${[...validThemes].join(", ")}.`);
    process.exit(EXIT_USAGE);
  }

  const noSynthesize = values["no-synthesize-stories"] as boolean;

  const parseGlobs = (v: string | undefined): string[] =>
    v ? v.split(",").map((s) => s.trim()).filter(Boolean) : [];

  // Validate --notify
  const notifyValue = values.notify as string;
  const validNotifyConditions = new Set(["always", "on-failure", "never"]);
  if (!validNotifyConditions.has(notifyValue)) {
    console.error(`Error: --notify must be "always", "on-failure", or "never", got "${notifyValue}".`);
    process.exit(EXIT_USAGE);
  }

  // Parse --max-failed-tests
  const maxFailedTestsStr = values["max-failed-tests"] as string | undefined;
  const maxFailedTests = maxFailedTestsStr ? parseInt(maxFailedTestsStr, 10) : 5;
  if (maxFailedTestsStr && (isNaN(maxFailedTests) || maxFailedTests < 0)) {
    console.error(`Error: --max-failed-tests must be a non-negative integer, got "${maxFailedTestsStr}".`);
    process.exit(EXIT_USAGE);
  }

  // Slack/Teams webhook: CLI flag (env fallback is handled inside sendNotifications)
  const slackWebhook = values["slack-webhook"] as string | undefined;
  const teamsWebhook = values["teams-webhook"] as string | undefined;

  // Parse --webhook-url (repeatable)
  const webhookUrls = (values["webhook-url"] as string[] | undefined) ?? [];

  // Parse --webhook-header (repeatable) "Key: Value"
  const webhookHeaders: Record<string, string> = {};
  const rawHeaders = (values["webhook-header"] as string[] | undefined) ?? [];
  for (const h of rawHeaders) {
    const colonIdx = h.indexOf(":");
    if (colonIdx <= 0) {
      console.error(`Warning: ignoring invalid --webhook-header "${h}" (expected "Key: Value")`);
      continue;
    }
    const key = h.slice(0, colonIdx).trim();
    const value = h.slice(colonIdx + 1).trim();
    if (!key) {
      console.error(`Warning: ignoring --webhook-header with empty key`);
      continue;
    }
    webhookHeaders[key] = value;
  }

  // Parse --webhook-method
  const webhookMethodRaw = values["webhook-method"] as string | undefined;
  let webhookMethod: "POST" | "PUT" = "POST";
  if (webhookMethodRaw) {
    const upper = webhookMethodRaw.toUpperCase();
    if (upper !== "POST" && upper !== "PUT") {
      console.error(`Error: --webhook-method must be "POST" or "PUT", got "${webhookMethodRaw}".`);
      process.exit(EXIT_USAGE);
    }
    webhookMethod = upper as "POST" | "PUT";
  }

  // Parse --max-history-runs
  const maxHistoryRunsStr = values["max-history-runs"] as string | undefined;
  const maxHistoryRuns = maxHistoryRunsStr ? parseInt(maxHistoryRunsStr, 10) : 10;
  if (maxHistoryRunsStr && (isNaN(maxHistoryRuns) || maxHistoryRuns < 1)) {
    console.error(`Error: --max-history-runs must be a positive integer, got "${maxHistoryRunsStr}".`);
    process.exit(EXIT_USAGE);
  }

  const sortTestCasesRaw = values["sort-test-cases"] as string;
  const validSortModes = new Set(["id", "source", "none"]);
  if (!validSortModes.has(sortTestCasesRaw)) {
    console.error(`Error: --sort-test-cases must be id, source, or none, got "${sortTestCasesRaw}".`);
    process.exit(EXIT_USAGE);
  }

  const assetModeRaw = values["asset-mode"] as string;
  const validAssetModes = new Set(["none", "copy"]);
  if (!validAssetModes.has(assetModeRaw)) {
    console.error(`Error: --asset-mode must be "none" or "copy", got "${assetModeRaw}".`);
    process.exit(EXIT_USAGE);
  }

  const cliArgs: CliArgs = {
    subcommand: subcommand as "format" | "compare" | "list" | "validate",
    inputFile,
    baselineFile,
    currentFile,
    baselineMode,
    baselineDir: values["baseline-dir"] as string | undefined,
    stdin: useStdin,
    formats,
    inputType: inputType as "raw" | "canonical" | "ndjson",
    outputDir: values["output-dir"] as string,
    outputName: values["output-name"] as string,
    outputNameTimestamp: values["output-name-timestamp"] as boolean,
    sortTestCases: sortTestCasesRaw as "id" | "source" | "none",
    include: parseGlobs(values.include as string | undefined),
    exclude: parseGlobs(values.exclude as string | undefined),
    includeTags: parseGlobs(values["include-tags"] as string | undefined),
    excludeTags: parseGlobs(values["exclude-tags"] as string | undefined),
    synthesizeStories: !noSynthesize,
    htmlTitle: values["html-title"] as string,
    htmlTheme: values["html-theme"] as string,
    htmlNoSyntaxHighlighting: values["html-no-syntax-highlighting"] as boolean,
    htmlNoMermaid: values["html-no-mermaid"] as boolean,
    htmlNoMarkdown: values["html-no-markdown"] as boolean,
    htmlPermalinkBaseUrl: values["html-permalink-base-url"] as string | undefined,
    htmlTicketUrlTemplate: values["html-ticket-url-template"] as string | undefined,
    htmlNoToc: values["html-no-toc"] as boolean,
    htmlThemePicker: values["html-theme-picker"] as boolean,
    jsonSummary: values["json-summary"] as boolean,
    listFormat: (values["list-format"] as string) as "text" | "json" | "csv" | "markdown-table",
    emitCanonical: values["emit-canonical"] as string | undefined,
    slackWebhook,
    teamsWebhook,
    notify: notifyValue as NotifyCondition,
    reportUrl: values["report-url"] as string | undefined,
    maxFailedTests,
    historyFile: values["history-file"] as string | undefined,
    maxHistoryRuns,
    webhookUrls,
    webhookHeaders,
    webhookMethod,
    webhookHmacSecret: values["webhook-hmac-secret"] as string | undefined,
    webhookHmacHeader: (values["webhook-hmac-header"] as string | undefined) ?? "X-Signature",
    webhookHmacTimestamp: values["webhook-hmac-timestamp"] as boolean,
    assetMode: assetModeRaw as "none" | "copy",
    allowMissingAssets: values["allow-missing-assets"] as boolean,
    prSummary: values["pr-summary"] as boolean,
    prSummaryFile: values["pr-summary-file"] as string | undefined,
    config: values["config"] as string | undefined,
  };

  return { args: cliArgs, pluginConfig, customRequested };
}

// ============================================================================
// Input Reading
// ============================================================================

async function readInput(args: CliArgs): Promise<string> {
  if (args.stdin) {
    return readStdin();
  }
  const filePath = path.resolve(args.inputFile!);
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(EXIT_USAGE);
  }
  return fs.readFileSync(filePath, "utf8");
}

function readFileInput(filePath: string): string {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    console.error(`Error: File not found: ${resolved}`);
    process.exit(EXIT_USAGE);
  }
  return fs.readFileSync(resolved, "utf8");
}

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: string[] = [];
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => chunks.push(chunk as string));
    process.stdin.on("end", () => resolve(chunks.join("")));
    process.stdin.on("error", reject);
  });
}

// ============================================================================
// Validation Pipeline
// ============================================================================

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Error: Invalid JSON — ${msg}`);
    process.exit(EXIT_USAGE);
  }
}

function tryParseJson(text: string): unknown | undefined {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function normalizeRunFromJsonData(data: unknown, args: CliArgs): {
  run: TestRunResult;
  droppedMissingStory: number;
} {
  if (args.inputType === "canonical") {
    try {
      assertValidRun(data as TestRunResult);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Canonical validation failed:\n${msg}`);
      process.exit(EXIT_CANONICAL_VALIDATION);
    }

    return { run: data as TestRunResult, droppedMissingStory: 0 };
  }

  const obj = data as Record<string, unknown>;
  if (obj.schemaVersion !== 1) {
    console.error(`Unsupported schemaVersion ${obj.schemaVersion}. Supported: 1.`);
    process.exit(EXIT_SCHEMA_VALIDATION);
  }

  const schemaResult = validateRawRun(data);
  if (!schemaResult.valid) {
    console.error("Schema validation failed:");
    for (const err of schemaResult.errors) {
      console.error(`  ${err}`);
    }
    process.exit(EXIT_SCHEMA_VALIDATION);
  }

  let raw = data as RawRun;
  let droppedMissingStory = 0;

  if (args.synthesizeStories) {
    raw = synthesizeStories(raw);
  } else {
    const before = raw.testCases.length;
    const withStory = raw.testCases.filter((tc) => tc.story != null).length;
    droppedMissingStory = before - withStory;
  }

  const canonical = canonicalizeRun(raw);
  try {
    assertValidRun(canonical);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Canonical validation failed:\n${msg}`);
    process.exit(EXIT_CANONICAL_VALIDATION);
  }

  return { run: canonical, droppedMissingStory };
}

function normalizeRunFromText(text: string, args: CliArgs): {
  run: TestRunResult;
  droppedMissingStory: number;
} {
  if (args.inputType === "ndjson") {
    try {
      return { run: parseNdjson(text), droppedMissingStory: 0 };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`NDJSON parse failed: ${msg}`);
      process.exit(EXIT_SCHEMA_VALIDATION);
    }
  }

  return normalizeRunFromJsonData(parseJson(text), args);
}

function applySelection(run: TestRunResult, args: CliArgs): TestRunResult {
  const testCases = selectTestCases(
    {
      testCases: run.testCases,
      include: args.include,
      exclude: args.exclude,
      includeTags: args.includeTags,
      excludeTags: args.excludeTags,
      sortTestCases: args.sortTestCases,
    },
    { logger: console }
  );

  return { ...run, testCases };
}

function tryNormalizeRunFromText(
  text: string,
  args: CliArgs
): TestRunResult | undefined {
  if (args.inputType === "ndjson") {
    try {
      return parseNdjson(text);
    } catch {
      return undefined;
    }
  }

  const data = tryParseJson(text);
  if (data === undefined) return undefined;

  if (args.inputType === "canonical") {
    try {
      assertValidRun(data as TestRunResult);
      return data as TestRunResult;
    } catch {
      return undefined;
    }
  }

  const obj = data as Record<string, unknown>;
  if (obj.schemaVersion !== 1) return undefined;

  const schemaResult = validateRawRun(data);
  if (!schemaResult.valid) return undefined;

  let raw = data as RawRun;
  if (args.synthesizeStories) {
    raw = synthesizeStories(raw);
  }

  const canonical = canonicalizeRun(raw);
  try {
    assertValidRun(canonical);
    return canonical;
  } catch {
    return undefined;
  }
}

function listBaselineCandidates(currentFile: string, args: CliArgs): string[] {
  const baselineDir = path.resolve(args.baselineDir ?? path.dirname(currentFile));
  const currentResolved = path.resolve(currentFile);

  if (!fs.existsSync(baselineDir)) {
    console.error(`Error: baseline directory not found: ${baselineDir}`);
    process.exit(EXIT_USAGE);
  }

  const entries = fs.readdirSync(baselineDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(baselineDir, entry.name))
    .filter((candidate) => path.resolve(candidate) !== currentResolved)
    .filter((candidate) =>
      args.inputType === "ndjson" ? candidate.endsWith(".ndjson") : candidate.endsWith(".json")
    );
}

function resolveBaselineAuto(
  currentFile: string,
  currentRun: TestRunResult,
  args: CliArgs
): string {
  const candidates = listBaselineCandidates(currentFile, args);
  const comparable: Array<{ file: string; run: TestRunResult }> = [];

  for (const candidate of candidates) {
    const run = tryNormalizeRunFromText(fs.readFileSync(candidate, "utf8"), args);
    if (run) {
      comparable.push({ file: candidate, run });
    }
  }

  if (comparable.length === 0) {
    console.error(
      `Error: no compatible baseline files found in ${path.resolve(args.baselineDir ?? path.dirname(currentFile))}.`
    );
    process.exit(EXIT_USAGE);
  }

  const picked = pickAutoBaseline(currentRun, comparable);
  if (!picked) {
    console.error("Error: unable to choose an automatic baseline.");
    process.exit(EXIT_USAGE);
  }
  return picked.file;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const { args, pluginConfig, customRequested } = await parseCliArgs(process.argv);
  const startMs = Date.now();

  if (args.subcommand === "compare") {
    const currentText = readFileInput(args.currentFile!);
    const current = applySelection(normalizeRunFromText(currentText, args).run, args);
    const baselineFile =
      args.baselineMode === "auto"
        ? resolveBaselineAuto(args.currentFile!, current, args)
        : args.baselineFile!;
    const baselineText = readFileInput(baselineFile);
    const baseline = applySelection(normalizeRunFromText(baselineText, args).run, args);

    try {
      const result = await generateCompareReports(baseline, current, baselineFile, args);
      printCompareResult(result, args, startMs);
      process.exit(EXIT_SUCCESS);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Comparison failed: ${msg}`);
      process.exit(EXIT_GENERATION);
    }
  }

  if (args.subcommand === "list") {
    const text = await readInput(args);
    const run = applySelection(normalizeRunFromText(text, args).run, args);

    // --json-summary is a deprecated alias for --list-format json
    const resolvedFormat = args.jsonSummary ? "json" : args.listFormat;
    const validListFormats = new Set(["text", "json", "csv", "markdown-table"]);
    if (!validListFormats.has(resolvedFormat)) {
      console.error(`Error: Unknown list format "${resolvedFormat}". Valid: text, json, csv, markdown-table.`);
      process.exit(EXIT_USAGE);
    }
    const output = listScenarios(
      { testCases: run.testCases, format: resolvedFormat as "text" | "json" | "csv" | "markdown-table" },
      {}
    );
    console.log(output);
    process.exit(EXIT_SUCCESS);
  }

  // Read input
  const text = await readInput(args);

  // === NDJSON input pipeline ===
  if (args.inputType === "ndjson") {
    if (args.subcommand === "validate") {
      // Validate each line is valid JSON with exactly one envelope field
      const lines = text.trim().split("\n").filter(Boolean);
      const validKeys = new Set([
        "meta", "source", "gherkinDocument", "pickle",
        "testRunStarted", "testCase", "testCaseStarted",
        "testStepStarted", "testStepFinished", "testCaseFinished",
        "testRunFinished", "attachment",
      ]);
      for (let i = 0; i < lines.length; i++) {
        try {
          const obj = JSON.parse(lines[i]);
          const keys = Object.keys(obj);
          if (keys.length !== 1 || !validKeys.has(keys[0])) {
            console.error(`Line ${i + 1}: invalid envelope (keys: ${keys.join(", ")})`);
            process.exit(EXIT_SCHEMA_VALIDATION);
          }
        } catch {
          console.error(`Line ${i + 1}: invalid JSON`);
          process.exit(EXIT_SCHEMA_VALIDATION);
        }
      }
      console.log(`Valid NDJSON (${lines.length} envelopes).`);
      process.exit(EXIT_SUCCESS);
    }

    // Parse NDJSON → TestRunResult
    let run;
    try {
      run = parseNdjson(text);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`NDJSON parse failed: ${msg}`);
      process.exit(EXIT_SCHEMA_VALIDATION);
    }

    // Emit canonical if requested
    if (args.emitCanonical) {
      const outPath = path.resolve(args.emitCanonical);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, JSON.stringify(run, null, 2), "utf8");
    }

    try {
      const result = await generateReports(run, args);
      runCustomFormatters(run, customRequested, pluginConfig.formatters ?? {}, args);
      await dispatchNotifications(run, args);
      runHistoryPipeline(run, args);
      printResult(result, args, startMs);
      process.exit(EXIT_SUCCESS);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Generation failed: ${msg}`);
      process.exit(EXIT_GENERATION);
    }
  }

  const data = parseJson(text);

  if (args.subcommand === "validate") {
    // Validate-only mode
    if (args.inputType === "canonical") {
      try {
        assertValidRun(data as TestRunResult);
        console.log("Valid canonical TestRunResult.");
        process.exit(EXIT_SUCCESS);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(msg);
        process.exit(EXIT_CANONICAL_VALIDATION);
      }
    }

    // Check schemaVersion
    const obj = data as Record<string, unknown>;
    if (obj.schemaVersion !== 1) {
      console.error(
        `Unsupported schemaVersion ${obj.schemaVersion}. Supported: 1.`
      );
      process.exit(EXIT_SCHEMA_VALIDATION);
    }

    const result = validateRawRun(data);
    if (!result.valid) {
      console.error("Schema validation failed:");
      for (const err of result.errors) {
        console.error(`  ${err}`);
      }
      process.exit(EXIT_SCHEMA_VALIDATION);
    }

    console.log("Valid RawRun (schemaVersion 1).");
    process.exit(EXIT_SUCCESS);
  }

  // === format subcommand ===

  if (args.inputType === "canonical") {
    // Skip schema validation, go straight to canonical validation
    try {
      assertValidRun(data as TestRunResult);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Canonical validation failed:\n${msg}`);
      process.exit(EXIT_CANONICAL_VALIDATION);
    }

    const run = data as TestRunResult;

    // Emit canonical if requested
    if (args.emitCanonical) {
      const outPath = path.resolve(args.emitCanonical);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, JSON.stringify(run, null, 2), "utf8");
    }

    try {
      const result = await generateReports(run, args);
      runCustomFormatters(run, customRequested, pluginConfig.formatters ?? {}, args);
      await dispatchNotifications(run, args);
      runHistoryPipeline(run, args);
      printResult(result, args, startMs);
      process.exit(EXIT_SUCCESS);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Generation failed: ${msg}`);
      process.exit(EXIT_GENERATION);
    }
  }

  // Raw input pipeline
  // 1. Check schemaVersion
  const obj = data as Record<string, unknown>;
  if (obj.schemaVersion !== 1) {
    console.error(
      `Unsupported schemaVersion ${obj.schemaVersion}. Supported: 1.`
    );
    process.exit(EXIT_SCHEMA_VALIDATION);
  }

  // 2. Ajv schema validation
  const schemaResult = validateRawRun(data);
  if (!schemaResult.valid) {
    console.error("Schema validation failed:");
    for (const err of schemaResult.errors) {
      console.error(`  ${err}`);
    }
    process.exit(EXIT_SCHEMA_VALIDATION);
  }

  // 3. Synthesize stories (optional)
  let raw = data as RawRun;
  let droppedMissingStory = 0;

  if (args.synthesizeStories) {
    raw = synthesizeStories(raw);
  } else {
    // Count and warn about dropped test cases
    const before = raw.testCases.length;
    const withStory = raw.testCases.filter(
      (tc) => tc.story != null
    ).length;
    droppedMissingStory = before - withStory;
    if (droppedMissingStory > 0) {
      console.error(
        `Dropped ${droppedMissingStory} test cases missing story (use --synthesize-stories to include)`
      );
    }
  }

  // 4. Canonicalize
  const canonical = canonicalizeRun(raw);

  // 5. Assert canonical validity
  try {
    assertValidRun(canonical);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Canonical validation failed:\n${msg}`);
    process.exit(EXIT_CANONICAL_VALIDATION);
  }

  // Emit canonical if requested
  if (args.emitCanonical) {
    const outPath = path.resolve(args.emitCanonical);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(canonical, null, 2), "utf8");
  }

  // 6. Generate reports
  try {
    const result = await generateReports(canonical, args, droppedMissingStory);
    runCustomFormatters(canonical, customRequested, pluginConfig.formatters ?? {}, args);
    await dispatchNotifications(canonical, args);
    runHistoryPipeline(canonical, args);
    printResult(result, args, startMs, droppedMissingStory);
    process.exit(EXIT_SUCCESS);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Generation failed: ${msg}`);
    process.exit(EXIT_GENERATION);
  }
}

// ============================================================================
// Custom Formatters
// ============================================================================

function runCustomFormatters(
  run: TestRunResult,
  customRequested: string[],
  formatters: Record<string, Formatter>,
  args: CliArgs
): void {
  if (customRequested.length === 0) return;
  const outputDir = args.outputDir ?? ".";
  for (const formatName of customRequested) {
    const formatter = formatters[formatName];
    try {
      const content = formatter.format(run);
      const ext = formatter.fileExtension ?? formatName;
      const baseName = args.outputName ?? "report";
      const filename = args.outputNameTimestamp
        ? `${baseName}-${Math.floor(run.startedAtMs / 1000)}.${ext}`
        : `${baseName}.${ext}`;
      const filepath = path.join(outputDir, filename);
      fs.mkdirSync(outputDir, { recursive: true });
      fs.writeFileSync(filepath, content, "utf8");
      console.log(`Generated: ${filepath}`);
    } catch (err) {
      console.error(`Error running custom formatter "${formatName}": ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

// ============================================================================
// Notifications
// ============================================================================

async function dispatchNotifications(run: TestRunResult, args: CliArgs): Promise<void> {
  // Build generic webhook configs from CLI flags
  const webhooks: GenericWebhookNotifierOptions[] = args.webhookUrls.map((url) => {
    const opts: GenericWebhookNotifierOptions = { url };
    if (Object.keys(args.webhookHeaders).length > 0) {
      opts.headers = { ...args.webhookHeaders };
    }
    if (args.webhookMethod !== "POST") {
      opts.method = args.webhookMethod;
    }
    if (args.webhookHmacSecret) {
      const signer: WebhookSignerHmac = {
        type: "hmac-sha256",
        secret: args.webhookHmacSecret,
        header: args.webhookHmacHeader,
      };
      if (args.webhookHmacTimestamp) {
        signer.includeTimestamp = true;
      }
      opts.signer = signer;
    }
    return opts;
  });

  await sendNotifications(
    {
      run,
      notification: {
        slackWebhookUrl: args.slackWebhook,
        teamsWebhookUrl: args.teamsWebhook,
        condition: args.notify,
        reportUrl: args.reportUrl,
        maxFailedTests: args.maxFailedTests,
        webhooks: webhooks.length > 0 ? webhooks : undefined,
      },
    },
    {
      fetch: globalThis.fetch,
      logger: console,
      toCIInfo,
    },
  );
}

// ============================================================================
// History Pipeline
// ============================================================================

function runHistoryPipeline(run: TestRunResult, args: CliArgs): void {
  if (!args.historyFile) return;

  const historyPath = path.resolve(args.historyFile);

  // Load existing history
  const store = loadHistory(
    { filePath: historyPath },
    {
      readFile: (p: string) => {
        try {
          return fs.readFileSync(p, "utf8");
        } catch {
          return undefined;
        }
      },
      logger: console,
    },
  );

  // Update history with current run
  const updated = updateHistory({
    store,
    run,
    maxRuns: args.maxHistoryRuns,
  });

  // Save updated history
  const dir = path.dirname(historyPath);
  fs.mkdirSync(dir, { recursive: true });
  saveHistory(
    { filePath: historyPath, store: updated },
    { writeFile: (p: string, content: string) => fs.writeFileSync(p, content, "utf8") },
  );

  // Compute metrics (log summary for CLI users)
  let metricsCount = 0;
  for (const testId of Object.keys(updated.tests)) {
    const history = updated.tests[testId];
    if (history.entries.length >= 3) {
      metricsCount++;
    }
  }
  if (metricsCount > 0) {
    console.error(`History updated: ${historyPath} (${Object.keys(updated.tests).length} tests tracked)`);
  }
}

// ============================================================================
// Report Generation
// ============================================================================

interface CliResult {
  files: string[];
  counts: { passed: number; failed: number; skipped: number; pending: number };
}

interface CompareCliResult {
  files: string[];
  baselineFile: string;
  summary: {
    added: number;
    removed: number;
    changed: number;
    regressed: number;
    fixed: number;
    unchanged: number;
  };
  prSummary?: string;
}

async function generateReports(
  run: TestRunResult,
  args: CliArgs,
  _droppedMissingStory = 0
): Promise<CliResult> {
  const generator = new ReportGenerator({
    include: args.include,
    exclude: args.exclude,
    includeTags: args.includeTags,
    excludeTags: args.excludeTags,
    formats: args.formats,
    outputDir: args.outputDir,
    outputName: args.outputName,
    outputNameTimestamp: args.outputNameTimestamp,
    sortTestCases: args.sortTestCases,
    html: {
      title: args.htmlTitle,
      theme: args.htmlTheme,
      syntaxHighlighting: !args.htmlNoSyntaxHighlighting,
      mermaidEnabled: !args.htmlNoMermaid,
      markdownEnabled: !args.htmlNoMarkdown,
      permalinkBaseUrl: args.htmlPermalinkBaseUrl,
      ticketUrlTemplate: args.htmlTicketUrlTemplate,
      tocEnabled: !args.htmlNoToc,
      themePickerEnabled: args.htmlThemePicker,
    },
    assetMode: args.assetMode,
    allowMissingAssets: args.allowMissingAssets,
  });

  const resultMap = await generator.generate(run);

  // Collect all generated file paths
  const files: string[] = [];
  for (const paths of resultMap.values()) {
    files.push(...paths);
  }

  // Count statuses
  const counts = { passed: 0, failed: 0, skipped: 0, pending: 0 };
  for (const tc of run.testCases) {
    const status = tc.status as keyof typeof counts;
    if (status in counts) {
      counts[status]++;
    }
  }

  return { files, counts };
}

async function generateCompareReports(
  baseline: TestRunResult,
  current: TestRunResult,
  baselineFile: string,
  args: CliArgs
): Promise<CompareCliResult> {
  const unsupportedCompareFormats = args.formats.filter(
    (format) => format !== "html" && format !== "markdown"
  );
  if (unsupportedCompareFormats.length > 0) {
    throw new Error(
      `compare supports only "html" and "markdown" formats (unsupported: ${unsupportedCompareFormats.join(", ")})`
    );
  }
  const compareFormats = args.formats as ("html" | "markdown")[];

  const result = await generateRunComparison({
    baseline,
    current,
    formats: compareFormats,
    outputDir: args.outputDir,
    outputName: args.outputName,
    title: args.htmlTitle,
  });

  return {
    files: result.files,
    baselineFile,
    summary: result.diff.summary,
    prSummary: args.prSummary || args.prSummaryFile ? createPrCommentSummary(result.diff) : undefined,
  };
}

function printResult(
  result: CliResult,
  args: CliArgs,
  startMs: number,
  droppedMissingStory = 0
) {
  const durationMs = Date.now() - startMs;

  if (args.jsonSummary) {
    const summary: Record<string, unknown> = {
      files: result.files,
      counts: result.counts,
      durationMs,
    };
    if (droppedMissingStory > 0) {
      summary.droppedMissingStory = droppedMissingStory;
    }
    console.log(JSON.stringify(summary, null, 2));
  } else {
    for (const f of result.files) {
      console.log(f);
    }
  }
}

function printCompareResult(
  result: CompareCliResult,
  args: CliArgs,
  startMs: number
) {
  const durationMs = Date.now() - startMs;

  if (result.prSummary && args.prSummaryFile) {
    const outputPath = path.resolve(args.prSummaryFile);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, result.prSummary, "utf8");
  }

  if (args.jsonSummary) {
    console.log(
      JSON.stringify(
        {
          files: result.files,
          baselineFile: result.baselineFile,
          diff: result.summary,
          prSummary: result.prSummary,
          durationMs,
        },
        null,
        2
      )
    );
    return;
  }

  for (const f of result.files) {
    console.log(f);
  }
  console.log(`baseline: ${result.baselineFile}`);
  if (result.prSummary && args.prSummary) {
    console.log("");
    console.log(result.prSummary);
  }
}

async function runPublishConfluence(rawArgs: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args: rawArgs,
    options: {
      "page-id": { type: "string" },
      "space-id": { type: "string" },
      "parent-id": { type: "string" },
      title: { type: "string" },
      "base-url": { type: "string" },
      email: { type: "string" },
      token: { type: "string" },
      "dry-run": { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
    allowPositionals: true,
    strict: true,
  });

  if (values.help) {
    console.log(`Usage: executable-stories publish-confluence <file.adf.json> [options]

Publishes an ADF JSON document to a Confluence Cloud page.

Required (one of):
  --page-id <id>           Update an existing page in place
  --space-id <id>          Create a new page in a space (also requires --title)

Optional:
  --parent-id <id>         Parent page ID (new pages only)
  --title <title>          Page title (required for create; overrides current title on update)
  --base-url <url>         Confluence base URL, e.g. https://acme.atlassian.net/wiki
                           (env: CONFLUENCE_BASE_URL)
  --email <email>          Atlassian account email (env: CONFLUENCE_EMAIL)
  --token <token>          Atlassian API token (env: CONFLUENCE_TOKEN)
  --dry-run                Validate inputs and print the request plan, don't POST
  --help                   Show this help

Generate an API token at https://id.atlassian.com/manage-profile/security/api-tokens`);
    process.exit(EXIT_SUCCESS);
  }

  const inputFile = positionals[0];
  if (!inputFile) {
    console.error("Error: missing ADF file argument. Run with --help for usage.");
    process.exit(EXIT_USAGE);
  }
  if (!fs.existsSync(inputFile)) {
    console.error(`Error: file not found: ${inputFile}`);
    process.exit(EXIT_USAGE);
  }

  const baseUrl =
    (values["base-url"] as string | undefined) ??
    process.env.CONFLUENCE_BASE_URL;
  const email =
    (values.email as string | undefined) ?? process.env.CONFLUENCE_EMAIL;
  const token =
    (values.token as string | undefined) ?? process.env.CONFLUENCE_TOKEN;
  const pageId = values["page-id"] as string | undefined;
  const spaceId = values["space-id"] as string | undefined;
  const parentId = values["parent-id"] as string | undefined;
  const title = values.title as string | undefined;
  const dryRun = values["dry-run"] as boolean;

  if (!baseUrl) {
    console.error(
      "Error: --base-url or CONFLUENCE_BASE_URL is required (e.g. https://acme.atlassian.net/wiki)",
    );
    process.exit(EXIT_USAGE);
  }
  if (!pageId && !spaceId) {
    console.error(
      "Error: specify either --page-id (to update) or --space-id (to create)",
    );
    process.exit(EXIT_USAGE);
  }
  if (!pageId && !title) {
    console.error("Error: --title is required when creating a new page");
    process.exit(EXIT_USAGE);
  }

  const adf = fs.readFileSync(path.resolve(inputFile), "utf8");

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          action: pageId ? "update" : "create",
          baseUrl,
          pageId,
          spaceId,
          parentId,
          title,
          adfBytes: adf.length,
        },
        null,
        2,
      ),
    );
    process.exit(EXIT_SUCCESS);
  }

  if (!email || !token) {
    console.error(
      "Error: --email/CONFLUENCE_EMAIL and --token/CONFLUENCE_TOKEN are required unless --dry-run is set",
    );
    process.exit(EXIT_USAGE);
  }

  try {
    const result = await publishConfluencePage(
      { adf, pageId, spaceId, parentId, title, baseUrl },
      { auth: { email, token } },
    );
    console.log(
      `${result.action === "created" ? "Created" : "Updated"} "${result.title}" (v${result.version}) → ${result.url}`,
    );
    process.exit(EXIT_SUCCESS);
  } catch (err) {
    console.error(`Error: ${(err as Error).message}`);
    process.exit(EXIT_GENERATION);
  }
}

async function runPublishJira(rawArgs: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args: rawArgs,
    options: {
      issue: { type: "string" },
      mode: { type: "string", default: "comment" },
      "base-url": { type: "string" },
      email: { type: "string" },
      token: { type: "string" },
      "dry-run": { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
    allowPositionals: true,
    strict: true,
  });

  if (values.help) {
    console.log(`Usage: executable-stories publish-jira <file.adf.json> [options]

Publishes an ADF JSON document to a Jira Cloud issue.

Required:
  --issue <KEY>            Issue key, e.g. PROJ-123

Optional:
  --mode <mode>            "comment" (default, append-only) or "description" (replaces field)
  --base-url <url>         Jira base URL, e.g. https://acme.atlassian.net
                           (env: JIRA_BASE_URL)
  --email <email>          Atlassian account email (env: JIRA_EMAIL)
  --token <token>          Atlassian API token (env: JIRA_TOKEN)
  --dry-run                Validate inputs and print the request plan, don't POST
  --help                   Show this help

Generate an API token at https://id.atlassian.com/manage-profile/security/api-tokens`);
    process.exit(EXIT_SUCCESS);
  }

  const inputFile = positionals[0];
  if (!inputFile) {
    console.error("Error: missing ADF file argument. Run with --help for usage.");
    process.exit(EXIT_USAGE);
  }
  if (!fs.existsSync(inputFile)) {
    console.error(`Error: file not found: ${inputFile}`);
    process.exit(EXIT_USAGE);
  }

  const baseUrl =
    (values["base-url"] as string | undefined) ?? process.env.JIRA_BASE_URL;
  const email = (values.email as string | undefined) ?? process.env.JIRA_EMAIL;
  const token = (values.token as string | undefined) ?? process.env.JIRA_TOKEN;
  const issueKey = values.issue as string | undefined;
  const modeRaw = values.mode as string;
  const dryRun = values["dry-run"] as boolean;

  if (!baseUrl) {
    console.error(
      "Error: --base-url or JIRA_BASE_URL is required (e.g. https://acme.atlassian.net)",
    );
    process.exit(EXIT_USAGE);
  }
  if (!issueKey) {
    console.error("Error: --issue <KEY> is required (e.g. --issue PROJ-123)");
    process.exit(EXIT_USAGE);
  }
  if (modeRaw !== "comment" && modeRaw !== "description") {
    console.error(
      `Error: --mode must be "comment" or "description" (got "${modeRaw}")`,
    );
    process.exit(EXIT_USAGE);
  }
  const mode = modeRaw as JiraPublishMode;

  const adf = fs.readFileSync(path.resolve(inputFile), "utf8");

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          action: mode === "description" ? "description-updated" : "comment-added",
          baseUrl,
          issueKey,
          mode,
          adfBytes: adf.length,
        },
        null,
        2,
      ),
    );
    process.exit(EXIT_SUCCESS);
  }

  if (!email || !token) {
    console.error(
      "Error: --email/JIRA_EMAIL and --token/JIRA_TOKEN are required unless --dry-run is set",
    );
    process.exit(EXIT_USAGE);
  }

  try {
    const result = await publishJiraIssue(
      { adf, issueKey, baseUrl, mode },
      { auth: { email, token } },
    );
    if (result.action === "comment-added") {
      console.log(
        `Added comment to ${result.issueKey} (comment ${result.commentId}) → ${result.url}`,
      );
    } else {
      console.log(`Updated description for ${result.issueKey} → ${result.url}`);
    }
    process.exit(EXIT_SUCCESS);
  } catch (err) {
    console.error(`Error: ${(err as Error).message}`);
    process.exit(EXIT_GENERATION);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(EXIT_USAGE);
});
