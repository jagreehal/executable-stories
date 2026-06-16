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
  startWatch,
} from "./index.js";
import { parseNdjson } from "./converters/ndjson-parser";
import { buildReview } from "./review/build-review";
import { ReviewMarkdownFormatter } from "./formatters/review-markdown";
import { ReviewHtmlFormatter } from "./formatters/review-html";
import type { ChangedFile, ReviewContext, EvidenceStrength } from "./types/review";
import type { OutputFormat } from "./types/options";
import { sendNotifications } from "./notifiers";
import { toCIInfo } from "./types/ci";
import type { NotifyCondition, GenericWebhookNotifierOptions, WebhookSignerHmac } from "./notifiers/types";
import { loadHistory, saveHistory, updateHistory } from "./history";
import { pickAutoBaseline } from "./compare/auto-baseline";
import { listScenarios } from "./list-scenarios";
import { buildCheck, renderCheck } from "./check";
import { buildGoal, renderGoal } from "./goal";
import { buildTriage, renderTriage } from "./triage";
import { selectTestCases } from "./select-test-cases";
import type { RawRun } from "./types/raw";
import type { TestRunResult, TestStatus } from "./types/test-result";
import { initAstro as initAstroFn } from "./init-astro";
import { scaffoldDoc, TEMPLATES } from "./scaffold-doc";
import { checkLinks, formatLinkReport } from "./check-links";
import { importOpenApi } from "./import-openapi";
import { buildDocs, BuildDocsError } from "./build-docs";
import { publishConfluencePage } from "./publishers/confluence";
import { publishJiraIssue, type JiraPublishMode } from "./publishers/jira";
import { recordDeployment, getDeploymentStatus, getEnvironmentDrift } from "./deploy/index";
import { loadConfig } from "./config.js";
import type { Formatter } from "./types/formatter.js";
import type { ScenarioDiff } from "./types/compare";

// ============================================================================
// Exit Codes
// ============================================================================

const EXIT_SUCCESS = 0;
const EXIT_SCHEMA_VALIDATION = 1;
const EXIT_CANONICAL_VALIDATION = 2;
const EXIT_GENERATION = 3;
const EXIT_USAGE = 4;
const EXIT_COMPARE_GATE = 5;
const EXIT_REVIEW_GATE = 5;
const EXIT_AGENT_GATE = 5; // check / goal: condition not met
const EXIT_RELEASE_GATE = 6;

// ============================================================================
// CLI Argument Parsing
// ============================================================================

const HELP_TEXT = `
executable-stories — Generate reports from test results JSON.

USAGE
  executable-stories format <file> [options]
  executable-stories format --stdin [options]
  executable-stories watch <raw-run.json> [options]
  executable-stories compare <baseline-file> <current-file> [options]
  executable-stories gate-release <dev-run.json> <rc-run.json> [options]
  executable-stories review <file> --changed-files <path> [options]
  executable-stories list <file> [options]
  executable-stories check <file> [--baseline <path|auto>] [--check-format text|json] [--no-fail]
  executable-stories goal <file> [--require-tags <csv>] [--require-tickets <csv>] [--require-scenarios <csv>] [--baseline <path|auto>] [--no-regressions] [--goal-format text|json]
  executable-stories triage <file> [--baseline <path|auto>] [--triage-format text|json]
  executable-stories validate <file>
  executable-stories validate --stdin
  executable-stories init-astro [directory]
  executable-stories build-docs <raw-run.json> [--site-dir <dir>] [options]
  executable-stories new <template> "<name>" [options]
  executable-stories check-links <dir> [options]
  executable-stories import-openapi <spec> [options]
  executable-stories publish-confluence <file.adf.json> [options]
  executable-stories publish-jira <file.adf.json> [options]
  executable-stories deploy record <file> --env <env> [--tag <tag>] [options]
  executable-stories deploy status [options]
  executable-stories deploy diff <env-a> <env-b> [options]

SUBCOMMANDS
  format             Read raw test results and generate reports
  watch              Regenerate reports whenever the raw-run file changes (live agent index)
  compare            Compare two runs and generate a diff report
  gate-release       Verify a release candidate against the dev test baseline (RC gate)
  review             Generate an Evidence Review of AI-authored changes (correlate a run to the diff)
  list               List scenarios from a test run (text table or JSON)
  check              Backpressure summary: compress passing, expand failing (GWT + error + covers); non-zero exit on failures
  goal               Behavioral definition-of-done for agent loops: required scenarios pass, no regressions, no weakened scenarios (exit 0 = met, 5 = not)
  triage             Discovery worklist for agent loops: failing scenarios, regressions first, each with the code it covers
  validate           Validate a JSON file against the schema (no output generated)
  init-astro         Scaffold an Astro docs site for story output (Starlight with themed CSS)
  build-docs         Build the living-docs site: one page per story file + Explorer data (auto-pickup, prunes deleted stories)
  new                Scaffold a docs page from a template (adr, runbook, decision-log, incident, scenario-note)
  check-links        Scan docs for broken internal/external links (CI-friendly exit code)
  import-openapi     Generate API doc pages from an OpenAPI spec, linked to verifying stories
  publish-confluence Publish an ADF JSON file to a Confluence page via REST API
  publish-jira       Publish an ADF JSON file to a Jira issue (as comment or description)
  deploy             Record deployments, show environment status, detect drift

OPTIONS
  --format <formats>            Comma-separated formats: html, markdown, release-manifest, traceability-matrix, junit, cucumber-json, cucumber-messages, cucumber-html, astro, confluence, story-report-json, scenario-index-json, behavior-manifest-json, or custom names from config (default: html)
                                  astro             Themed Markdown primitive (single aggregated page; for a full site use "build-docs")
                                  confluence        Atlassian Document Format (ADF) JSON for Confluence / Jira
                                  behavior-manifest-json Agent-readable behavior manifest and debugger warnings
                                  html              Custom HTML report (accessible, dark mode, mermaid)
                                  cucumber-html     Official Cucumber HTML report
                                  markdown          Markdown documentation
                                  junit             JUnit XML
                                  cucumber-json     Cucumber JSON
                                  cucumber-messages Raw NDJSON (Cucumber Messages)
                                  story-report-json StoryReport v1 JSON (consumed by executable-stories-react and other UI renderers)
                                  scenario-index-json Storybook-like scenario index for agents and explorers
                                  traceability-matrix Requirement-first matrix (ticket -> scenarios -> covered code -> status)
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
  --check-format <format>       check output format: text (default) or json
  --no-fail                     (check) Report only — always exit 0 even when scenarios failed
  --require-tags <csv>          (goal) Every scenario carrying any of these tags must pass
  --require-tickets <csv>       (goal) Every scenario carrying any of these tickets must pass
  --require-scenarios <csv>     (goal) These scenarios (by id or exact title) must pass
  --no-regressions              (goal) Not met if any scenario regressed vs --baseline
  --no-ratchet                  (goal) Disable the removed/weakened-scenario guard (on by default with --baseline)
  --goal-format <format>        goal output format: text (default) or json
  --triage-format <format>      triage output format: text (default) or json
  --baseline <path|auto>        Compare baseline file, or auto-pick a prior run for compare
  --baseline-dir <dir>          Directory to scan when --baseline auto is used
  --pr-summary                  Print a PR-friendly markdown summary after compare
  --pr-summary-file <path>      Write the PR-friendly markdown summary to a file
  --fail-on-regression          Exit non-zero when any regression is detected in compare
  --fail-on-added-failures      Exit non-zero when newly added scenarios are failing
  --fail-on-removal             Exit non-zero when scenarios are removed from the baseline
  --fail-on-new                 Exit non-zero when new scenarios appear that weren't in the baseline
  --max-regressions <n>         Exit non-zero when regressions exceed threshold
  --release-policy <path>       (gate-release) Path to JSON policy file with allowed exceptions
  --changed-files <path>        (review) Changed files: JSON (ChangedFile[] or {changedFiles,baseRef,headRef}) or "git diff --name-status" text
  --base-ref <ref>              (review) Base ref label shown in the report (informational)
  --head-ref <ref>              (review) Head ref label shown in the report (informational)
  --fail-on <band>              (review) Gate: "uncovered" or "weak" — exit non-zero when changed code lacks evidence (default: off)
  --min-evidence <strength>     (review) Gate: "weak"|"moderate"|"strong" — exit non-zero when any claim is below this strength (default: off)
  --emit-canonical <path>       Write canonical JSON to given path
  --help                        Show this help message

LIST
  list prints one scenario per line (--list-format text by default)
  list --list-format json outputs machine-parsable JSON (--json-summary is a deprecated alias)
  list supports --include-tags, --exclude-tags for filtering
  list supports --input-type and --stdin

CHECK
  check is the inner-loop "backpressure" view for coding agents: run it after tests.
  Passing scenarios collapse to a single count line; each failing scenario expands
  to its Given/When/Then steps, the step that broke, the error, and the product
  code it covers — so the agent gets an actionable signal, not a wall of green.
  check exits 5 when any scenario failed (so the agent loop pushes back); pass
  --no-fail to report only. --baseline <path|auto> adds "N regressed / N fixed"
  since the prior run. --check-format json emits the structured report.

GOAL
  goal is the behavioral stopping condition for an agent loop (the /goal pattern).
  It is "met" when the required scenarios pass, nothing regressed (with
  --no-regressions), and no scenario was removed, disabled, or had steps deleted
  versus --baseline (the ratchet, on by default when a baseline is given). Declare
  the target with --require-tags / --require-tickets / --require-scenarios; with
  none given, the goal is "every scenario passes". Exit 0 means met, 5 means not
  yet, so a loop can run until the verdict flips. --goal-format json for machines.

TRIAGE
  triage is the discovery-phase worklist for a loop. It lists failing scenarios,
  regressions first (with --baseline), each with the product code it covers, the
  error, and its tickets, so the loop can route each fix to a sub-agent. Failures
  with no covers are flagged. --triage-format json emits the work queue. triage
  always exits 0 — it reports work, it does not gate.

COMPARE
  compare supports --format html,markdown
  compare uses the same --input-type for both baseline and current files

GATE-RELEASE
  gate-release compares a dev environment test run (baseline) against a
  release candidate test run to verify the RC matches what was tested in dev.
  By default, fails if scenarios are omitted or regressed.
  --fail-on-regression and --fail-on-removal are enabled by default.
  Supports --release-policy for exception lists.

DEPLOY
  executable-stories deploy record <file> --env <env> [--tag <tag>]
    Record a deployment of a test run to an environment (e.g. dev, staging, prod).
    The deployment ledger is at .executable-stories/deployments.json by default.

  executable-stories deploy status [--ledger <path>]
    Show the latest deployment for each environment.

  executable-stories deploy diff <env-a> <env-b> [--ledger <path>]
    Show scenario drift between two environments (what's in one but not the other).

INIT-ASTRO
  executable-stories init-astro [directory]   Scaffold into directory (default: ./story-docs)
  --force                                      Overwrite existing directory
  --update                                     Refresh framework files only (keeps your content + config)

BUILD-DOCS
  Build the multi-page living-docs site from a raw run: one Astro page per story
  file plus Explorer data (scenario-links.json, story-report.json). Auto-pickup —
  a new *.story.test.ts becomes a new page on the next run; deleting a story
  prunes its page. This is the headline living-docs flow; "format --format astro"
  is a low-level primitive that emits a single aggregated page, not a site.

  executable-stories build-docs <raw-run.json> [--site-dir <dir>]
  --site-dir <dir>             Target site dir (default: a scaffolded init-astro site)
  --openapi <spec>             Link generated API pages to verifying stories
  --baseline <prev-report>     Diff against a prior story-report.json for change markers
  --audience-split             Split pages by audience (business vs technical)

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
  5  Compare / review / check gate failed
  6  Release gate failed
`.trim();

interface CliArgs {
  subcommand: "format" | "watch" | "compare" | "gate-release" | "review" | "list" | "check" | "goal" | "triage" | "validate";
  inputFile?: string;
  baselineFile?: string;
  /** Raw --baseline value (path or "auto"), used by check for delta detection. */
  baselineArg?: string;
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
  checkFormat: "text" | "json";
  noFail: boolean;
  requireTags: string[];
  requireTickets: string[];
  requireScenarios: string[];
  noRegressions: boolean;
  noRatchet: boolean;
  goalFormat: "text" | "json";
  triageFormat: "text" | "json";
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
  failOnRegression: boolean;
  failOnAddedFailures: boolean;
  failOnRemoval: boolean;
  failOnNew: boolean;
  maxRegressions?: number;
  releasePolicy?: string;
  changedFilesPath?: string;
  baseRef?: string;
  headRef?: string;
  failOn?: "uncovered" | "weak";
  minEvidence?: EvidenceStrength;
  config?: string;
}

/** Validate a `--*-format text|json` flag, exiting with a usage error otherwise. */
function parseTextJsonFormat(flag: string, value: string): "text" | "json" {
  if (value !== "text" && value !== "json") {
    console.error(`Error: ${flag} must be "text" or "json", got "${value}".`);
    process.exit(EXIT_USAGE);
  }
  return value;
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
    subcommand !== "watch" &&
    subcommand !== "compare" &&
    subcommand !== "gate-release" &&
    subcommand !== "deploy" &&
    subcommand !== "review" &&
    subcommand !== "list" &&
    subcommand !== "check" &&
    subcommand !== "goal" &&
    subcommand !== "triage" &&
    subcommand !== "validate" &&
    subcommand !== "init-astro" &&
    subcommand !== "build-docs" &&
    subcommand !== "new" &&
    subcommand !== "check-links" &&
    subcommand !== "import-openapi" &&
    subcommand !== "publish-confluence" &&
    subcommand !== "publish-jira"
  ) {
    console.error(
      `Unknown subcommand: "${subcommand}". Use "format", "watch", "compare", "gate-release", "deploy", "review", "list", "check", "goal", "triage", "validate", "init-astro", "build-docs", "new", "check-links", "import-openapi", "publish-confluence", or "publish-jira".`,
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

  // Handle deploy early (has its own arg shape — exits after completion)
  if (subcommand === "deploy") {
    process.exit(await runDeploy(args.slice(1)));
  }

  // Handle init-astro early (no parseArgs needed)
  if (subcommand === "init-astro") {
    const initArgs = args.slice(1);
    const targetDir = initArgs.find((a) => !a.startsWith("--")) ?? "./story-docs";
    const force = initArgs.includes("--force");
    // --update refreshes only framework files (components, lib, styles, explorer)
    // and never touches your content (ADRs, runbooks), astro.config, or package.json.
    const update = initArgs.includes("--update");

    try {
      const result = initAstroFn({ targetDir, force, update });
      if (update) {
        console.log(`Updated framework files in ${result.targetDir} (content left untouched)`);
        console.log(`  Refreshed: ${result.updatedFiles?.length ?? 0} file(s)`);
        process.exit(EXIT_SUCCESS);
      }
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
      console.log("Next steps:");
      console.log(`  1. cd ${result.targetDir} && pnpm install      # or npm install`);
      console.log("  2. In your TEST project, add the StoryReporter with a rawRunPath, e.g.");
      console.log("       StoryReporter({ rawRunPath: 'reports/raw-run.json' })");
      console.log("     (this is what writes the raw run that build-docs reads)");
      console.log("  3. Run your tests to produce reports/raw-run.json:");
      console.log("       pnpm test");
      console.log("  4. Build the living-docs site (story pages, explorer data, API pages):");
      console.log(
        `       executable-stories build-docs reports/raw-run.json --site-dir ${result.targetDir} [--openapi spec.json]`,
      );
      console.log(`  5. Preview it:  cd ${result.targetDir} && pnpm dev`);
      console.log("");
      console.log("Later, pull template/design improvements without losing your content:");
      console.log(`  executable-stories init-astro ${result.targetDir} --update`);
      process.exit(EXIT_SUCCESS);
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(EXIT_USAGE);
    }
  }

  // Docs-site subcommands have their own arg shapes — each owns its parsing and
  // exit code, mirroring runPublishConfluence/runPublishJira below.
  if (subcommand === "new") process.exit(runNew(args.slice(1)));
  if (subcommand === "check-links") process.exit(await runCheckLinks(args.slice(1)));
  if (subcommand === "import-openapi") process.exit(await runImportOpenApi(args.slice(1)));
  if (subcommand === "build-docs") process.exit(await runBuildDocs(args.slice(1)));

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
      "check-format": { type: "string", default: "text" },
      "no-fail": { type: "boolean", default: false },
      "require-tags": { type: "string" },
      "require-tickets": { type: "string" },
      "require-scenarios": { type: "string" },
      "no-regressions": { type: "boolean", default: false },
      "no-ratchet": { type: "boolean", default: false },
      "goal-format": { type: "string", default: "text" },
      "triage-format": { type: "string", default: "text" },
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
      "fail-on-regression": { type: "boolean", default: false },
      "fail-on-added-failures": { type: "boolean", default: false },
      "fail-on-removal": { type: "boolean", default: false },
      "fail-on-new": { type: "boolean", default: false },
      "max-regressions": { type: "string" },
      "release-policy": { type: "string" },
      "changed-files": { type: "string" },
      "base-ref": { type: "string" },
      "head-ref": { type: "string" },
      "fail-on": { type: "string" },
      "min-evidence": { type: "string" },
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
  const isCompareLike = subcommand === "compare" || subcommand === "gate-release";
  const inputFile = isCompareLike ? undefined : positionals[0];
  const baselineFile =
    isCompareLike
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
    isCompareLike
      ? positionals.length > 1
        ? positionals[1]
        : positionals[0]
      : undefined;

  if (isCompareLike) {
    if (useStdin) {
      console.error(`Error: ${subcommand} does not support --stdin. Pass baseline and current files.`);
      process.exit(EXIT_USAGE);
    }
    if (!currentFile) {
      console.error(`Error: ${subcommand} requires <current-file>, and either <baseline-file> or --baseline auto.`);
      process.exit(EXIT_USAGE);
    }
    if (baselineMode === "explicit" && !baselineFile) {
      console.error(`Error: ${subcommand} requires <baseline-file> and <current-file>, or use --baseline auto.`);
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

  const builtInFormats = new Set(["astro", "behavior-manifest-json", "confluence", "html", "markdown", "release-manifest", "traceability-matrix", "junit", "cucumber-json", "cucumber-messages", "cucumber-html", "scenario-index-json", "story-report-json"]);
  const formatStr = values.format as string;
  const allRequestedFormats = formatStr.split(",").map((f) => f.trim());
  const builtInRequested = allRequestedFormats.filter((f) => builtInFormats.has(f)) as OutputFormat[];
  const customRequested = allRequestedFormats.filter((f) => customFormatterNames.has(f));
  const unknownFormats = allRequestedFormats.filter((f) => !builtInFormats.has(f) && !customFormatterNames.has(f));

  if (unknownFormats.length > 0) {
    const knownCustom = customFormatterNames.size > 0 ? `, ${[...customFormatterNames].join(", ")}` : "";
    console.error(`Error: Unknown format(s): ${unknownFormats.join(", ")}. Valid built-in: astro, behavior-manifest-json, confluence, html, markdown, release-manifest, traceability-matrix, junit, cucumber-json, cucumber-messages, cucumber-html, scenario-index-json, story-report-json${knownCustom}.`);
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

  const maxRegressionsStr = values["max-regressions"] as string | undefined;
  const maxRegressions =
    maxRegressionsStr !== undefined ? parseInt(maxRegressionsStr, 10) : undefined;
  if (
    maxRegressionsStr !== undefined &&
    (isNaN(maxRegressions as number) || (maxRegressions as number) < 0)
  ) {
    console.error(`Error: --max-regressions must be a non-negative integer, got "${maxRegressionsStr}".`);
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

  const failOnRaw = values["fail-on"] as string | undefined;
  if (failOnRaw !== undefined && failOnRaw !== "uncovered" && failOnRaw !== "weak") {
    console.error(`Error: --fail-on must be "uncovered" or "weak", got "${failOnRaw}".`);
    process.exit(EXIT_USAGE);
  }
  const minEvidenceRaw = values["min-evidence"] as string | undefined;
  const validMinEvidence = new Set(["weak", "moderate", "strong"]);
  if (minEvidenceRaw !== undefined && !validMinEvidence.has(minEvidenceRaw)) {
    console.error(`Error: --min-evidence must be "weak", "moderate", or "strong", got "${minEvidenceRaw}".`);
    process.exit(EXIT_USAGE);
  }

  const checkFormat = parseTextJsonFormat("--check-format", values["check-format"] as string);
  const goalFormat = parseTextJsonFormat("--goal-format", values["goal-format"] as string);
  const triageFormat = parseTextJsonFormat("--triage-format", values["triage-format"] as string);

  const cliArgs: CliArgs = {
    subcommand: subcommand as "format" | "watch" | "compare" | "gate-release" | "review" | "list" | "check" | "validate",
    inputFile,
    baselineFile,
    baselineArg: baselineValue,
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
    checkFormat,
    noFail: values["no-fail"] as boolean,
    requireTags: parseGlobs(values["require-tags"] as string | undefined),
    requireTickets: parseGlobs(values["require-tickets"] as string | undefined),
    requireScenarios: parseGlobs(values["require-scenarios"] as string | undefined),
    noRegressions: values["no-regressions"] as boolean,
    noRatchet: values["no-ratchet"] as boolean,
    goalFormat,
    triageFormat,
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
    failOnRegression: values["fail-on-regression"] as boolean,
    failOnAddedFailures: values["fail-on-added-failures"] as boolean,
    failOnRemoval: values["fail-on-removal"] as boolean,
    failOnNew: values["fail-on-new"] as boolean,
    maxRegressions,
    releasePolicy: values["release-policy"] as string | undefined,
    changedFilesPath: values["changed-files"] as string | undefined,
    baseRef: values["base-ref"] as string | undefined,
    headRef: values["head-ref"] as string | undefined,
    failOn: failOnRaw as "uncovered" | "weak" | undefined,
    minEvidence: minEvidenceRaw as EvidenceStrength | undefined,
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

/**
 * Resolve the baseline run for the gate-style subcommands (check, goal, triage).
 * Returns undefined when no --baseline was given. Supports an explicit path or
 * "auto" (pick a prior run from the output directory).
 */
function resolveBaselineRun(args: CliArgs, currentRun: TestRunResult): TestRunResult | undefined {
  if (!args.baselineArg) return undefined;
  let baselineFile: string;
  if (args.baselineArg === "auto") {
    if (!args.inputFile) {
      console.error("Error: --baseline auto requires a current input file (not --stdin).");
      process.exit(EXIT_USAGE);
    }
    baselineFile = resolveBaselineAuto(args.inputFile, currentRun, args);
  } else {
    baselineFile = args.baselineArg;
  }
  return applySelection(normalizeRunFromText(readFileInput(baselineFile), args).run, args);
}

/** Baseline scenario statuses by id, for the commands that only need regression deltas. */
function resolveBaselineStatusMap(
  args: CliArgs,
  currentRun: TestRunResult,
): Map<string, TestStatus> | undefined {
  const baselineRun = resolveBaselineRun(args, currentRun);
  return baselineRun
    ? new Map(baselineRun.testCases.map((tc) => [tc.id, tc.status]))
    : undefined;
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
      const gateFailures = evaluateCompareGate(result, args);
      if (gateFailures.length > 0) {
        for (const failure of gateFailures) {
          console.error(`Compare gate failed: ${failure}`);
        }
        process.exit(EXIT_COMPARE_GATE);
      }
      process.exit(EXIT_SUCCESS);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Comparison failed: ${msg}`);
      process.exit(EXIT_GENERATION);
    }
  }

  if (args.subcommand === "gate-release") {
    // Gate-release enforces stricter defaults: --fail-on-regression and --fail-on-removal
    const gatedArgs = {
      ...args,
      failOnRegression: true,
      failOnRemoval: true,
      // failOnNew is opt-in via --fail-on-new flag
    };

    // Load release policy if specified
    let policy: ReleasePolicy | undefined;
    if (args.releasePolicy) {
      policy = loadReleasePolicy(args.releasePolicy);
    }

    const currentText = readFileInput(gatedArgs.currentFile!);
    const current = applySelection(normalizeRunFromText(currentText, gatedArgs).run, gatedArgs);
    const baselineFile =
      gatedArgs.baselineMode === "auto"
        ? resolveBaselineAuto(gatedArgs.currentFile!, current, gatedArgs)
        : gatedArgs.baselineFile!;
    const baselineText = readFileInput(baselineFile);
    const baseline = applySelection(normalizeRunFromText(baselineText, gatedArgs).run, gatedArgs);

    try {
      const result = await generateCompareReports(baseline, current, baselineFile, gatedArgs);

      // Apply release policy exceptions
      const effectiveResult = policy
        ? applyReleasePolicy(result, policy)
        : result;

      printCompareResult(effectiveResult, gatedArgs, startMs);
      const gateFailures = evaluateCompareGate(effectiveResult, gatedArgs);
      if (gateFailures.length > 0) {
        for (const failure of gateFailures) {
          console.error(`Release gate failed: ${failure}`);
        }
        if (policy) {
          console.error(`Release policy: ${args.releasePolicy}`);
          if (policy.allowedOmissions && policy.allowedOmissions.length > 0) {
            console.error(`  Allowed omissions: ${policy.allowedOmissions.join(", ")}`);
          }
          if (policy.allowedRegressions && policy.allowedRegressions.length > 0) {
            console.error(`  Allowed regressions: ${policy.allowedRegressions.join(", ")}`);
          }
        }
        process.exit(EXIT_RELEASE_GATE);
      }
      console.error("Release gate passed: RC matches dev baseline.");
      process.exit(EXIT_SUCCESS);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Release gate check failed: ${msg}`);
      process.exit(EXIT_GENERATION);
    }
  }

  if (args.subcommand === "review") {
    const text = await readInput(args);
    const run = applySelection(normalizeRunFromText(text, args).run, args);
    const context = loadReviewContext(args);
    const review = buildReview(run, context);

    try {
      const files = writeReviewReport(review, args);
      for (const f of files) {
        console.log(f);
      }
      const gateFailures = evaluateReviewGate(review, args);
      if (gateFailures.length > 0) {
        for (const failure of gateFailures) {
          console.error(`Review gate failed: ${failure}`);
        }
        process.exit(EXIT_REVIEW_GATE);
      }
      process.exit(EXIT_SUCCESS);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Review failed: ${msg}`);
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

  // === check subcommand: context-efficient backpressure for coding agents ===
  // Compress success (a count line), expand failure (GWT + failing step + error
  // + covers). Exits non-zero when any scenario failed so the agent's loop pushes
  // back before a human is involved. --no-fail forces exit 0 (report-only).
  if (args.subcommand === "check") {
    const text = await readInput(args);
    const run = applySelection(normalizeRunFromText(text, args).run, args);

    const baseline = resolveBaselineStatusMap(args, run);

    const report = buildCheck(
      { testCases: run.testCases, baseline, format: args.checkFormat },
      {},
    );
    console.log(renderCheck(report, args.checkFormat));

    if (report.summary.failed > 0 && !args.noFail) {
      process.exit(EXIT_AGENT_GATE);
    }
    process.exit(EXIT_SUCCESS);
  }

  // === goal subcommand: behavioral definition-of-done for agent loops ===
  // Met when the required scenarios/tags/tickets pass, nothing regressed (with
  // --no-regressions), and nothing was removed or weakened vs baseline (ratchet,
  // on when a baseline is given; disable with --no-ratchet). Exit 0 = met, 5 = not.
  if (args.subcommand === "goal") {
    const text = await readInput(args);
    const run = applySelection(normalizeRunFromText(text, args).run, args);
    const baseline = resolveBaselineRun(args, run);

    const report = buildGoal(
      {
        run,
        baseline,
        requireTags: args.requireTags,
        requireTickets: args.requireTickets,
        requireScenarios: args.requireScenarios,
        enforceNoRegressions: args.noRegressions,
        enforceRatchet: !args.noRatchet,
        format: args.goalFormat,
      },
      {},
    );
    console.log(renderGoal(report, args.goalFormat));
    process.exit(report.met ? EXIT_SUCCESS : EXIT_AGENT_GATE);
  }

  // === triage subcommand: discovery worklist for an agent loop ===
  // Failing scenarios, regressions first, each with the code it covers. JSON for
  // the loop to hand to sub-agents; text for humans. Always exits 0 (it reports).
  if (args.subcommand === "triage") {
    const text = await readInput(args);
    const run = applySelection(normalizeRunFromText(text, args).run, args);
    const baseline = resolveBaselineStatusMap(args, run);

    const report = buildTriage(
      { testCases: run.testCases, baseline, format: args.triageFormat },
      {},
    );
    console.log(renderTriage(report, args.triageFormat));
    process.exit(EXIT_SUCCESS);
  }

  // === watch subcommand: keep agent artifacts fresh on every raw-run change ===
  if (args.subcommand === "watch") {
    if (!args.inputFile) {
      console.error("Error: watch requires an input file (the raw-run JSON the framework writes).");
      process.exit(EXIT_USAGE);
    }
    console.log(
      `Watching ${args.inputFile} → regenerating [${args.formats.join(", ")}] into ${args.outputDir}/ (Ctrl+C to stop)`,
    );
    startWatch({
      input: args.inputFile,
      outputDir: args.outputDir,
      outputName: args.outputName,
      formats: args.formats,
      inputType: args.inputType === "canonical" ? "canonical" : "raw",
      synthesize: args.synthesizeStories,
    });
    return; // long-lived; do not exit
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
  addedFailures: number;
  summary: {
    added: number;
    removed: number;
    changed: number;
    regressed: number;
    fixed: number;
    unchanged: number;
  };
  scenarios: ScenarioDiff[];
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
    addedFailures: result.diff.scenarios.filter(
      (scenario) =>
        scenario.kind === "added" && scenario.current?.status === "failed"
    ).length,
    summary: result.diff.summary,
    scenarios: result.diff.scenarios,
    prSummary: args.prSummary || args.prSummaryFile ? createPrCommentSummary(result.diff) : undefined,
  };
}

// ============================================================================
// Review (Evidence-Driven Review)
// ============================================================================

const STRENGTH_RANK: Record<EvidenceStrength, number> = {
  none: 0,
  weak: 1,
  moderate: 2,
  strong: 3,
};

/** Map a `git diff` status code to a change kind. */
function mapStatus(status: string): ChangedFile["changeKind"] {
  const letter = status.charAt(0).toUpperCase();
  if (letter === "A") return "added";
  if (letter === "D") return "deleted";
  if (letter === "R") return "renamed";
  if (letter === "C") return "added";
  return "modified";
}

/** Parse `git diff --name-status` text into changed files. */
function parseNameStatus(text: string): ChangedFile[] {
  const files: ChangedFile[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const cols = line.includes("\t") ? line.split("\t") : line.split(/\s+/);
    const status = cols[0];
    if (!status) continue;
    // Renames/copies report old and new path; use the new (last) path.
    const filePath = /^[RC]/i.test(status) && cols.length >= 3 ? cols[cols.length - 1] : cols[1];
    if (!filePath) continue;
    files.push({ path: filePath, changeKind: mapStatus(status) });
  }
  return files;
}

const VALID_CHANGE_KINDS = new Set(["added", "modified", "deleted", "renamed"]);

/** Coerce an arbitrary object into a ChangedFile (defaulting changeKind to "modified"). */
function coerceChangedFile(value: unknown): ChangedFile | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const obj = value as Record<string, unknown>;
  if (typeof obj.path !== "string") return undefined;
  const kind = typeof obj.changeKind === "string" && VALID_CHANGE_KINDS.has(obj.changeKind)
    ? (obj.changeKind as ChangedFile["changeKind"])
    : "modified";
  const changedLines = Array.isArray(obj.changedLines)
    ? obj.changedLines.filter((n): n is number => typeof n === "number")
    : undefined;
  return changedLines ? { path: obj.path, changeKind: kind, changedLines } : { path: obj.path, changeKind: kind };
}

/**
 * Build the review context from CLI flags. The `--changed-files` file may be
 * JSON (a ChangedFile[] or a {changedFiles, baseRef, headRef} object) or plain
 * `git diff --name-status` text — whichever the Action/CLI finds easiest.
 */
function loadReviewContext(args: CliArgs): ReviewContext {
  let changedFiles: ChangedFile[] = [];
  let baseRef = args.baseRef;
  let headRef = args.headRef;

  if (args.changedFilesPath) {
    const text = readFileInput(args.changedFilesPath);
    const parsed = tryParseJson(text);
    if (Array.isArray(parsed)) {
      changedFiles = parsed.map(coerceChangedFile).filter((f): f is ChangedFile => f !== undefined);
    } else if (parsed && typeof parsed === "object") {
      const obj = parsed as Record<string, unknown>;
      if (Array.isArray(obj.changedFiles)) {
        changedFiles = obj.changedFiles.map(coerceChangedFile).filter((f): f is ChangedFile => f !== undefined);
      }
      if (typeof obj.baseRef === "string") baseRef = baseRef ?? obj.baseRef;
      if (typeof obj.headRef === "string") headRef = headRef ?? obj.headRef;
    } else {
      changedFiles = parseNameStatus(text);
    }
  }

  return { changedFiles, baseRef, headRef };
}

/** Render and write the review report (markdown + HTML, mirroring report mode). */
function writeReviewReport(
  review: ReturnType<typeof buildReview>,
  args: CliArgs
): string[] {
  const title = args.htmlTitle && args.htmlTitle !== "Test Results" ? args.htmlTitle : undefined;
  const titleOpt = title ? { title } : {};

  const markdown = new ReviewMarkdownFormatter(titleOpt).format(review);
  const html = new ReviewHtmlFormatter({ ...titleOpt, theme: args.htmlTheme }).format(review);

  const outputDir = args.outputDir ?? "reports";
  const baseName = args.outputName ?? "evidence-review";
  const suffix = args.outputNameTimestamp
    ? `-${Math.floor(review.run.startedAtMs / 1000)}`
    : "";

  fs.mkdirSync(outputDir, { recursive: true });
  const mdPath = path.join(outputDir, `${baseName}${suffix}.md`);
  const htmlPath = path.join(outputDir, `${baseName}${suffix}.html`);
  fs.writeFileSync(mdPath, markdown, "utf8");
  fs.writeFileSync(htmlPath, html, "utf8");

  return [mdPath, htmlPath];
}

/** Evaluate the opt-in review gate. Returns failure messages (empty = pass). */
function evaluateReviewGate(
  review: ReturnType<typeof buildReview>,
  args: CliArgs
): string[] {
  const failures: string[] = [];
  const { summary } = review;

  if (args.failOn === "uncovered" && summary.uncovered > 0) {
    failures.push(`${summary.uncovered} changed source file(s) have no evidence`);
  }
  if (args.failOn === "weak" && summary.uncovered + summary.weaklyCovered > 0) {
    failures.push(
      `${summary.uncovered + summary.weaklyCovered} changed source file(s) lack moderate+ evidence`
    );
  }
  if (args.minEvidence) {
    const threshold = STRENGTH_RANK[args.minEvidence];
    const below = review.claims.filter((c) => STRENGTH_RANK[c.strength] < threshold);
    if (below.length > 0) {
      failures.push(
        `${below.length} claim(s) below "${args.minEvidence}" evidence strength`
      );
    }
  }

  return failures;
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
          addedFailures: result.addedFailures,
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

interface ReleasePolicy {
  allowedOmissions?: string[];
  allowedRegressions?: string[];
  allowNewScenarios?: boolean;
}

function loadReleasePolicy(policyPath: string): ReleasePolicy {
  const resolved = path.resolve(policyPath);
  if (!fs.existsSync(resolved)) {
    console.error(`Error: release policy file not found: ${resolved}`);
    process.exit(EXIT_USAGE);
  }
  try {
    const raw = JSON.parse(fs.readFileSync(resolved, "utf8"));
    return {
      allowedOmissions: Array.isArray(raw.allowedOmissions) ? raw.allowedOmissions : [],
      allowedRegressions: Array.isArray(raw.allowedRegressions) ? raw.allowedRegressions : [],
      allowNewScenarios: Boolean(raw.allowNewScenarios),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Error reading release policy: ${msg}`);
    process.exit(EXIT_USAGE);
  }
}

function applyReleasePolicy(
  result: CompareCliResult,
  policy: ReleasePolicy,
): CompareCliResult {
  const allowedOmissionSet = new Set(policy.allowedOmissions ?? []);
  const allowedRegressionSet = new Set(policy.allowedRegressions ?? []);
  const adjustedOmissions = result.scenarios.filter(
    (scenario) => scenario.kind === "removed" && !allowedOmissionSet.has(scenario.id),
  ).length;
  const adjustedRegressions = result.scenarios.filter(
    (scenario) => scenario.kind === "regressed" && !allowedRegressionSet.has(scenario.id),
  ).length;

  const adjustedSummary = {
    ...result.summary,
    removed: adjustedOmissions,
    regressed: adjustedRegressions,
  };

  return {
    ...result,
    summary: adjustedSummary,
  };
}

function evaluateCompareGate(
  result: CompareCliResult,
  args: CliArgs,
): string[] {
  const failures: string[] = [];
  if (args.failOnRegression && result.summary.regressed > 0) {
    failures.push(
      `regressions detected (${result.summary.regressed}) with --fail-on-regression`
    );
  }
  if (args.failOnAddedFailures && result.addedFailures > 0) {
    failures.push(
      `new failing scenarios detected (${result.addedFailures}) with --fail-on-added-failures`
    );
  }
  if (args.failOnRemoval && result.summary.removed > 0) {
    failures.push(
      `removed scenarios detected (${result.summary.removed}) with --fail-on-removal`
    );
  }
  if (args.failOnNew && result.summary.added > 0) {
    failures.push(
      `new scenarios detected (${result.summary.added}) with --fail-on-new`
    );
  }
  if (
    args.maxRegressions !== undefined &&
    result.summary.regressed > args.maxRegressions
  ) {
    failures.push(
      `regressions ${result.summary.regressed} exceed --max-regressions ${args.maxRegressions}`
    );
  }
  return failures;
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

/** `new <template> "<name>"` — scaffold a verified-by-wired docs page. Returns an exit code. */
function runNew(rawArgs: string[]): number {
  const { values, positionals } = parseArgs({
    args: rawArgs,
    options: {
      dir: { type: "string" },
      force: { type: "boolean", default: false },
      "scenario-id": { type: "string" },
    },
    allowPositionals: true,
    strict: true,
  });

  const template = positionals[0];
  const name = positionals.slice(1).join(" ");
  if (!template) {
    console.error(
      `Usage: executable-stories new <template> "<name>" [--dir <docs-dir>] [--scenario-id <id>] [--force]`,
    );
    console.error(`Templates: ${TEMPLATES.join(", ")}`);
    return EXIT_USAGE;
  }

  try {
    const result = scaffoldDoc({
      template,
      name,
      scenarioId: values["scenario-id"] as string | undefined,
      baseDir: values.dir as string | undefined,
      force: values.force as boolean,
    });
    console.log(`Created ${result.template}: ${result.path}`);
    console.log(`  Title: ${result.title}`);
    console.log("");
    console.log("Next: fill in the content and link verifying stories in `verifiedBy`.");
    return EXIT_SUCCESS;
  } catch (err) {
    console.error(`Error: ${(err as Error).message}`);
    return EXIT_USAGE;
  }
}

/** `check-links <dir>` — fail on broken docs links. Returns a CI-friendly exit code. */
async function runCheckLinks(rawArgs: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: rawArgs,
    options: {
      external: { type: "boolean", default: false },
      json: { type: "boolean", default: false },
    },
    allowPositionals: true,
    strict: true,
  });

  try {
    const report = await checkLinks({
      target: positionals[0] ?? ".",
      checkExternal: values.external as boolean,
    });
    console.log(values.json ? JSON.stringify(report, null, 2) : formatLinkReport(report));
    return report.brokenCount > 0 ? EXIT_GENERATION : EXIT_SUCCESS;
  } catch (err) {
    console.error(`Error: ${(err as Error).message}`);
    return EXIT_USAGE;
  }
}

/** `import-openapi <spec>` — generate API pages with per-endpoint coverage. Returns an exit code. */
async function runImportOpenApi(rawArgs: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: rawArgs,
    options: {
      "output-dir": { type: "string" },
      run: { type: "string" },
      force: { type: "boolean", default: false },
    },
    allowPositionals: true,
    strict: true,
  });

  const spec = positionals[0];
  if (!spec) {
    console.error(`Usage: executable-stories import-openapi <spec.json|yaml> [--output-dir <dir>] [--run <story-report.json>] [--force]`);
    return EXIT_USAGE;
  }

  try {
    const result = await importOpenApi({
      specPath: spec,
      outputDir: values["output-dir"] as string | undefined,
      runFile: values.run as string | undefined,
      force: values.force as boolean,
    });
    console.log(`Generated ${result.pageCount} API page(s) at ${result.outputDir}`);
    console.log(`  Covered endpoints: ${result.coveredCount} / ${result.endpointCount}`);
    if (result.uncoveredCount > 0) {
      console.log(`  ⚠ ${result.uncoveredCount} endpoint(s) have no verifying story`);
    }
    return EXIT_SUCCESS;
  } catch (err) {
    console.error(`Error: ${(err as Error).message}`);
    return EXIT_USAGE;
  }
}

// ============================================================================
// build-docs — thin CLI wrapper around src/build-docs.ts
// ============================================================================

async function runBuildDocs(rawArgs: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: rawArgs,
    options: {
      "site-dir": { type: "string" },
      openapi: { type: "string" },
      "no-synthesize-stories": { type: "boolean", default: false },
      "audience-split": { type: "boolean", default: false },
      baseline: { type: "string" },
    },
    allowPositionals: true,
    strict: true,
  });

  const rawRunPath = positionals[0];
  if (!rawRunPath) {
    console.error(
      `Usage: executable-stories build-docs <raw-run.json> [--site-dir <dir>] [--openapi <spec>] [--baseline <prev-story-report.json>] [--audience-split]`,
    );
    return EXIT_USAGE;
  }

  const audienceSplit = values["audience-split"] as boolean;

  try {
    const result = await buildDocs({
      rawRunPath,
      siteDir: (values["site-dir"] as string | undefined) ?? ".",
      openapiPath: values.openapi as string | undefined,
      synthesizeStories: !values["no-synthesize-stories"],
      audienceSplit,
      baselinePath: values.baseline as string | undefined,
    });

    console.log(`✓ Living docs generated in ${result.siteDir}`);
    console.log(`  • Explorer data   → public/stories/story-report.json`);
    console.log(`  • Deep links      → public/stories/scenario-links.json (${result.scenarioLinks})`);
    console.log(`  • Note links      → public/stories/notes-index.json (${result.notesIndexed})`);
    if (audienceSplit) {
      console.log(
        `  • Story pages     → src/content/docs/stories/{engineer,stakeholder} ` +
          `(engineer: ${result.audiences.engineer}, stakeholder: ${result.audiences.stakeholder})`,
      );
    } else {
      console.log(`  • Story pages     → src/content/docs/stories`);
    }
    if (result.bundledAssets > 0) {
      console.log(`  • Bundled assets  → public/stories/assets (${result.bundledAssets})`);
    }
    if (result.apiPages > 0) {
      console.log(`  • API pages       → src/content/docs/api (${result.apiPages})`);
    }
    if (result.changes) {
      const c = result.changes;
      console.log(
        `  • What's changed  → src/content/docs/stories/changes.md ` +
          `(+${c.added} added, ${c.regressed} regressed, ${c.fixed} fixed, ${c.removed} removed)`,
      );
    }
    const rel = path.relative(process.cwd(), result.siteDir) || ".";
    console.log(`\nPreview: cd ${rel} && npm run dev`);
    return EXIT_SUCCESS;
  } catch (err) {
    if (err instanceof BuildDocsError) {
      console.error(err.message);
      if (err.kind === "schema") return EXIT_SCHEMA_VALIDATION;
      if (err.kind === "generation") return EXIT_GENERATION;
      return EXIT_USAGE;
    }
    console.error(`Error: ${(err as Error).message}`);
    return EXIT_USAGE;
  }
}

async function runDeploy(rawArgs: string[]): Promise<number> {
  const mode = rawArgs[0];
  if (!mode || !["record", "status", "diff"].includes(mode)) {
    console.error("Usage: executable-stories deploy <record|status|diff> [options]");
    console.error("  deploy record <file> --env <env> [--tag <tag>] [--ledger <path>]");
    console.error("  deploy status [--ledger <path>] [--json]");
    console.error("  deploy diff <env-a> <env-b> [--ledger <path>] [--json]");
    return EXIT_USAGE;
  }

  const { values, positionals } = parseArgs({
    args: rawArgs.slice(1),
    options: {
      env: { type: "string" },
      tag: { type: "string" },
      ledger: { type: "string", default: ".executable-stories/deployments.json" },
      json: { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
    allowPositionals: true,
    strict: true,
  });

  if (values.help) {
    console.log(`executable-stories deploy — Track deployments across environments.

USAGE
  executable-stories deploy record <file> --env <env> [--tag <tag>] [--ledger <path>]
  executable-stories deploy status [--ledger <path>] [--json]
  executable-stories deploy diff <env-a> <env-b> [--ledger <path>] [--json]

OPTIONS
  --env <env>       Environment name (e.g. dev, staging, production)
  --tag <tag>       Optional Git tag for this deployment (e.g. v1.2.3)
  --ledger <path>   Path to deployment ledger JSON (default: .executable-stories/deployments.json)
  --json            Output as JSON instead of text`);
    return EXIT_SUCCESS;
  }

  const ledgerPath = values.ledger as string;

  if (mode === "record") {
    const inputFile = positionals[0];
    if (!inputFile) {
      console.error("Error: deploy record requires an input file.");
      return EXIT_USAGE;
    }
    const env = values.env as string | undefined;
    if (!env) {
      console.error("Error: deploy record requires --env <environment>.");
      return EXIT_USAGE;
    }

    const text = readFileInput(inputFile);
    const { run } = normalizeRunFromText(text, {
      ...createDefaultCliArgs(),
      inputType: "raw",
      inputFile,
    });
    const applied = applySelection(run, createDefaultCliArgs());

    const result = recordDeployment({
      run: applied,
      environment: env,
      tag: values.tag as string | undefined,
      ledgerPath,
      runFilePath: inputFile,
    });

    console.error(
      `Recorded deployment to "${result.entry.environment}" at ${result.entry.timestamp}`,
    );
    console.error(
      `  Scenarios: ${result.entry.summary.total} (${result.entry.summary.passed} passed, ${result.entry.summary.failed} failed)`,
    );
    if (result.entry.tag) {
      console.error(`  Tag: ${result.entry.tag}`);
    }
    console.error(`  Ledger: ${result.ledgerPath}`);
    return EXIT_SUCCESS;
  }

  if (mode === "status") {
    const status = getDeploymentStatus(ledgerPath);
    const envs = Object.keys(status.environments);

    if (envs.length === 0) {
      console.error("No deployments recorded yet.");
      return EXIT_SUCCESS;
    }

    if (values.json as boolean) {
      console.log(JSON.stringify(status, null, 2));
    } else {
      for (const envName of envs) {
        const env = status.environments[envName];
        if (!env) continue;
        const e = env.latest;
        console.log(`${envName}:`);
        console.log(`  Deployed: ${e.timestamp}`);
        console.log(`  SHA: ${e.sha ?? "unknown"}`);
        console.log(`  Tag: ${e.tag ?? "none"}`);
        console.log(`  Scenarios: ${e.summary.total} (${e.summary.passed} passed, ${e.summary.failed} failed, ${e.summary.skipped} skipped, ${e.summary.pending} pending)`);
        if (env.previousDeployment) {
          const prev = env.previousDeployment;
          const added = e.scenarioIds.filter((id) => !new Set(prev.scenarioIds).has(id)).length;
          const removed = prev.scenarioIds.filter((id) => !new Set(e.scenarioIds).has(id)).length;
          if (added > 0 || removed > 0) {
            console.log(`  Drift from previous: +${added} added, -${removed} removed`);
          }
        }
        console.log();
      }
      console.log(`Ledger: ${ledgerPath}`);
    }
    return EXIT_SUCCESS;
  }

  if (mode === "diff") {
    const envA = positionals[0];
    const envB = positionals[1];
    if (!envA || !envB) {
      console.error("Error: deploy diff requires two environment names.");
      return EXIT_USAGE;
    }

    try {
      const drift = getEnvironmentDrift(ledgerPath, envA, envB);

      if (values.json as boolean) {
        console.log(JSON.stringify(drift, null, 2));
      } else {
        console.log(`Environment drift: ${envA} ↔ ${envB}`);
        console.log(`  ${envA}: ${drift.aEntry.summary.total} scenarios (${drift.aEntry.timestamp})`);
        console.log(`  ${envB}: ${drift.bEntry.summary.total} scenarios (${drift.bEntry.timestamp})`);
        console.log(`  In both: ${drift.inBoth.length}`);
        console.log(`  Only in ${envA}: ${drift.onlyInA.length}`);
        console.log(`  Only in ${envB}: ${drift.onlyInB.length}`);
        console.log(`  Status changed: ${drift.statusChanged.length}`);

        if (drift.onlyInA.length > 0) {
          console.log(`\n  Only in ${envA}:`);
          for (const id of drift.onlyInA.slice(0, 20)) {
            console.log(`    - ${id}`);
          }
          if (drift.onlyInA.length > 20) {
            console.log(`    ... and ${drift.onlyInA.length - 20} more`);
          }
        }
        if (drift.onlyInB.length > 0) {
          console.log(`\n  Only in ${envB}:`);
          for (const id of drift.onlyInB.slice(0, 20)) {
            console.log(`    - ${id}`);
          }
          if (drift.onlyInB.length > 20) {
            console.log(`    ... and ${drift.onlyInB.length - 20} more`);
          }
        }
        if (drift.statusChanged.length > 0) {
          console.log("\n  Status changed:");
          for (const item of drift.statusChanged.slice(0, 20)) {
            console.log(`    - ${item.id}: ${item.statusA} -> ${item.statusB}`);
          }
          if (drift.statusChanged.length > 20) {
            console.log(`    ... and ${drift.statusChanged.length - 20} more`);
          }
        }
      }
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      return EXIT_USAGE;
    }
    return EXIT_SUCCESS;
  }

  return EXIT_USAGE;
}

function createDefaultCliArgs(): CliArgs {
  return {
    subcommand: "format",
    stdin: false,
    formats: [],
    inputType: "raw",
    outputDir: "reports",
    outputName: "index",
    outputNameTimestamp: false,
    sortTestCases: "none",
    include: [],
    exclude: [],
    includeTags: [],
    excludeTags: [],
    synthesizeStories: true,
    htmlTitle: "Test Results",
    htmlTheme: "default",
    htmlNoSyntaxHighlighting: false,
    htmlNoMermaid: false,
    htmlNoMarkdown: false,
    htmlNoToc: false,
    htmlThemePicker: false,
    jsonSummary: false,
    listFormat: "text",
    checkFormat: "text",
    noFail: false,
    requireTags: [],
    requireTickets: [],
    requireScenarios: [],
    noRegressions: false,
    noRatchet: false,
    goalFormat: "text",
    triageFormat: "text",
    notify: "never",
    maxFailedTests: 5,
    maxHistoryRuns: 10,
    webhookUrls: [],
    webhookHeaders: {},
    webhookMethod: "POST",
    webhookHmacHeader: "X-Signature",
    webhookHmacTimestamp: false,
    assetMode: "none",
    allowMissingAssets: false,
    prSummary: false,
    failOnRegression: false,
    failOnAddedFailures: false,
    failOnRemoval: false,
    failOnNew: false,
    baselineMode: "explicit",
  };
}

main().catch((err) => {
  console.error(err);
  process.exit(EXIT_USAGE);
});
