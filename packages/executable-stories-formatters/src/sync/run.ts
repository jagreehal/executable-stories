/**
 * `coverage` and `sync` — the two CLI entry points for test-management targets.
 *
 * They share one analysis pass. `coverage` needs no write permission at all and
 * stops after reporting; `sync` continues into the plan and, only when asked,
 * applies it.
 *
 * Dry run is the default on purpose. Writing to a company's test-management
 * system is the kind of thing that should require typing an extra word.
 *
 * fn(args, deps): every file, clock, and network touch is injected so the tests
 * never reach a real instance.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { parseArgs } from "node:util";

import { canonicalizeRun } from "executable-stories-core/converters/acl/index";
import { synthesizeStories } from "executable-stories-core/converters/synthesize";
import type { TestRunResult } from "executable-stories-core/types/test-result";

import { loadConfig } from "../config.js";
import { analyzeSync, applySync, type AttachPolicy, type SyncEngineConfig } from "./engine";
import {
  buildProvider,
  isProviderName,
  PROVIDER_NAMES,
  type ProviderName,
  type SyncTargets,
} from "./adapters/index";
import {
  DEFAULT_LOCKFILE_PATH,
  emptyLockfile,
  parseLockfile,
  serializeLockfile,
} from "./lockfile";
import {
  buildCoverageJson,
  renderApplyResult,
  renderCoverageMarkdown,
  renderCoverageText,
  renderPlan,
} from "./report";

const EXIT_SUCCESS = 0;
const EXIT_FAILED = 1;
const EXIT_USAGE = 4;

const COVERAGE_HELP = `Usage:
  executable-stories coverage <provider> <run.json> [options]

Compares what your tests cover against what a test-management system holds.
Read-only: needs nothing but a read-scoped API key, and writes nothing remote.

Providers: ${PROVIDER_NAMES.join(", ")}

Options:
  --config <path>      Config file (default: executable-stories.config.mjs, .js, or .json)
  --output-dir <dir>   Where the JSON and Markdown land (default: reports)
  --report-url <url>   Published report URL, used for deep links
  --lockfile <path>    Default: ${DEFAULT_LOCKFILE_PATH}
  --quiet              Write the artifacts, skip the stdout summary
  -h, --help           Show this help

Credentials come from the environment:
  TestRail  TESTRAIL_USERNAME, TESTRAIL_API_KEY
  Xray      XRAY_CLIENT_ID, XRAY_CLIENT_SECRET (JIRA_EMAIL/JIRA_TOKEN to edit Jira fields)

Exit codes: 0 report produced, 1 provider unreachable, 4 usage error.`;

const SYNC_HELP = `Usage:
  executable-stories sync <provider> <run.json> [options]

Pushes stories into a test-management system: case bodies authored from the
test, executions recorded against them, evidence attached.

Prints the plan and changes nothing unless --apply is passed.

Providers: ${PROVIDER_NAMES.join(", ")}

Options:
  --apply              Actually write. Without it, this is a dry run.
  --attach <policy>    failed (default), all, or none
  --config <path>      Config file (default: executable-stories.config.mjs, .js, or .json)
  --lockfile <path>    Default: ${DEFAULT_LOCKFILE_PATH}
  --report-url <url>   Published report URL, used for deep links
  --output-dir <dir>   Where coverage artifacts land (default: reports)
  --continue-on-error  Exit 0 even when some writes failed
  --init               Print a config block for this provider and exit
  -h, --help           Show this help

The lockfile binds each story to its case. Commit it: the diff shows up in the
pull request that created the case.

Exit codes: 0 applied (or planned), 1 some writes failed, 4 usage error.`;

export interface SyncCliDeps {
  readFile: (filePath: string) => string;
  /** Separate from `readFile` because a missing lockfile is normal, not an error. */
  fileExists: (filePath: string) => boolean;
  writeFile: (filePath: string, contents: string) => void;
  fetchFn: typeof globalThis.fetch;
  env: Record<string, string | undefined>;
  log: (message: string) => void;
  error: (message: string) => void;
  loadConfigFn: typeof loadConfig;
}

function defaultDeps(): SyncCliDeps {
  return {
    readFile: (filePath) => fs.readFileSync(filePath, "utf8"),
    fileExists: (filePath) => fs.existsSync(filePath),
    writeFile: (filePath, contents) => {
      fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
      fs.writeFileSync(filePath, contents, "utf8");
    },
    fetchFn: globalThis.fetch,
    env: process.env,
    log: console.log,
    error: console.error,
    loadConfigFn: loadConfig,
  };
}

const CONFIG_TEMPLATES: Record<ProviderName, string> = {
  testrail: `export default {
  sync: {
    testrail: {
      url: "https://acme.testrail.io",
      projectId: 1,
      suiteId: 1,
      // Section that newly created cases land in. Without it, creation is refused.
      sectionId: 1,
      // TestRail ships no "skipped" status; set one to record skipped tests.
      // statusIds: { skipped: 6 },
      // Only needed if this instance uses a customised case template.
      // fields: { steps: "custom_steps_separated", description: "custom_preconds" },
    },
  },
};

// Environment: TESTRAIL_USERNAME (login email), TESTRAIL_API_KEY (My Settings -> API Keys)`,
  xray: `export default {
  sync: {
    xray: {
      jiraBaseUrl: "https://acme.atlassian.net",
      projectKey: "PROJ",
      // testPlanKey: "PROJ-100",
    },
  },
};

// Environment: XRAY_CLIENT_ID, XRAY_CLIENT_SECRET (Jira -> Apps -> Xray -> API Keys)
// Optional:    JIRA_EMAIL, JIRA_TOKEN (needed to update an existing test's summary/description)`,
};

/**
 * The same shape as JSON, for adopters whose repo has no JavaScript in it.
 * Comments are dropped rather than JSON5'd: the `.mjs` block above is where the
 * optional keys are explained, and this is a starting point, not a reference.
 */
const JSON_CONFIG_TEMPLATES: Record<ProviderName, string> = {
  testrail: JSON.stringify(
    { sync: { testrail: { url: "https://acme.testrail.io", projectId: 1, suiteId: 1, sectionId: 1 } } },
    null,
    2,
  ),
  xray: JSON.stringify(
    { sync: { xray: { jiraBaseUrl: "https://acme.atlassian.net", projectKey: "PROJ" } } },
    null,
    2,
  ),
};

/** A raw run carries `schemaVersion: 1`; a StoryReport uses the string "1.0". */
function isStoryReport(data: Record<string, unknown>): boolean {
  return typeof data.schemaVersion === "string";
}

function loadRun(inputPath: string, deps: SyncCliDeps): TestRunResult {
  const data = JSON.parse(deps.readFile(inputPath)) as Record<string, unknown>;
  if (isStoryReport(data)) {
    throw new Error(
      `${inputPath} is a StoryReport, which has already dropped the attachment bodies and source paths this needs. Point at the raw run instead (e.g. reports/raw-run.json).`,
    );
  }
  return canonicalizeRun(synthesizeStories(data as never));
}

export async function runSyncCommand(
  mode: "sync" | "coverage",
  rawArgs: string[],
  depsOverride: Partial<SyncCliDeps> = {},
): Promise<number> {
  const deps = { ...defaultDeps(), ...depsOverride };
  const help = mode === "sync" ? SYNC_HELP : COVERAGE_HELP;

  let parsed;
  try {
    parsed = parseArgs({
      args: rawArgs,
      allowPositionals: true,
      options: {
        apply: { type: "boolean", default: false },
        attach: { type: "string" },
        config: { type: "string" },
        lockfile: { type: "string" },
        "report-url": { type: "string" },
        "output-dir": { type: "string" },
        "continue-on-error": { type: "boolean", default: false },
        init: { type: "boolean", default: false },
        quiet: { type: "boolean", default: false },
        help: { type: "boolean", short: "h", default: false },
      },
    });
  } catch (err) {
    deps.error(err instanceof Error ? err.message : String(err));
    deps.error(help);
    return EXIT_USAGE;
  }

  if (parsed.values.help) {
    deps.log(help);
    return EXIT_SUCCESS;
  }

  const providerName = parsed.positionals[0];
  if (!providerName || !isProviderName(providerName)) {
    deps.error(
      providerName
        ? `Unknown provider "${providerName}". Available: ${PROVIDER_NAMES.join(", ")}.`
        : `${mode} needs a provider: executable-stories ${mode} <${PROVIDER_NAMES.join("|")}> <run.json>`,
    );
    deps.error(help);
    return EXIT_USAGE;
  }

  if (parsed.values.init) {
    deps.log(CONFIG_TEMPLATES[providerName]);
    deps.log("");
    deps.log(
      `Save the block above as executable-stories.config.mjs (or merge the \`sync\` key into the one you have), then run:\n  executable-stories coverage ${providerName} reports/raw-run.json`,
    );
    // The binary is the whole delivery mechanism for the Go, Ruby, Rust,
    // pytest, JUnit 5, and xUnit adapters. Telling those teams to write an ESM
    // module is the point where they stop reading.
    deps.log("");
    deps.log(
      `Not a JavaScript project? Put the same \`sync\` object in executable-stories.config.json instead:`,
    );
    deps.log(JSON_CONFIG_TEMPLATES[providerName]);
    return EXIT_SUCCESS;
  }

  const inputPath = parsed.positionals[1];
  if (!inputPath) {
    deps.error(`${mode} needs a run file: executable-stories ${mode} ${providerName} <run.json>`);
    deps.error(help);
    return EXIT_USAGE;
  }

  const attach = parsed.values.attach as AttachPolicy | undefined;
  if (attach && !["failed", "all", "none"].includes(attach)) {
    deps.error(`--attach must be one of: failed, all, none (got "${attach}")`);
    return EXIT_USAGE;
  }

  let run: TestRunResult;
  try {
    run = loadRun(inputPath, deps);
  } catch (err) {
    deps.error(`Could not read ${inputPath}: ${err instanceof Error ? err.message : String(err)}`);
    return EXIT_USAGE;
  }

  const logger = { warn: (message: string) => deps.error(`Warning: ${message}`) };

  let targets: SyncTargets;
  try {
    const config = await deps.loadConfigFn(parsed.values.config);
    targets = config.sync ?? {};
  } catch (err) {
    deps.error(err instanceof Error ? err.message : String(err));
    return EXIT_USAGE;
  }

  let built;
  try {
    built = buildProvider(
      { name: providerName, targets, env: deps.env },
      { fetch: deps.fetchFn, logger },
    );
  } catch (err) {
    deps.error(err instanceof Error ? err.message : String(err));
    return EXIT_USAGE;
  }

  // Precedence: CLI flag, then the target's own config, then provider defaults.
  const targetConfig = (targets[providerName] ?? {}) as Partial<SyncEngineConfig>;
  const engineConfig: SyncEngineConfig = {
    ...built.engineDefaults,
    ...targetConfig,
    ...(parsed.values["report-url"] ? { reportUrl: parsed.values["report-url"] } : {}),
    ...(attach ? { attach } : {}),
  };

  const lockfilePath = parsed.values.lockfile ?? DEFAULT_LOCKFILE_PATH;
  const outputDir = parsed.values["output-dir"] ?? "reports";

  let lockfile;
  try {
    lockfile = deps.fileExists(lockfilePath)
      ? parseLockfile(deps.readFile(lockfilePath), lockfilePath)
      : emptyLockfile();
  } catch (err) {
    deps.error(err instanceof Error ? err.message : String(err));
    return EXIT_USAGE;
  }

  let analysis;
  try {
    analysis = await analyzeSync({
      run,
      provider: built.provider,
      lockfile,
      config: engineConfig,
    });
  } catch (err) {
    deps.error(`Could not read from ${providerName}: ${err instanceof Error ? err.message : String(err)}`);
    return EXIT_FAILED;
  }

  // Both modes write the coverage artifacts: the Markdown is what makes the
  // numbers shareable, and generating it unconditionally means nobody has to
  // discover a flag.
  const jsonPath = path.join(outputDir, `sync-coverage.${providerName}.json`);
  const markdownPath = path.join(outputDir, `sync-coverage.${providerName}.md`);
  deps.writeFile(jsonPath, `${JSON.stringify(buildCoverageJson(analysis), null, 2)}\n`);
  deps.writeFile(markdownPath, `${renderCoverageMarkdown(analysis)}\n`);

  if (mode === "coverage") {
    if (!parsed.values.quiet) {
      deps.log(renderCoverageText(analysis));
      deps.log("");
    }
    deps.log(`Wrote ${jsonPath} and ${markdownPath}`);
    return EXIT_SUCCESS;
  }

  const dryRun = !parsed.values.apply;
  deps.log(renderPlan(analysis, { dryRun }));

  if (dryRun) return EXIT_SUCCESS;

  const applied = await applySync(
    { analysis, provider: built.provider, lockfile, config: engineConfig },
    { logger },
  );

  // Persist bindings even on partial failure. A created case whose binding was
  // lost is the one duplicate this tool can actually cause.
  deps.writeFile(lockfilePath, serializeLockfile(lockfile));

  deps.log("");
  deps.log(renderApplyResult(applied));

  if (applied.errors.length > 0 && !parsed.values["continue-on-error"]) {
    deps.error(
      `\n${applied.errors.length} write(s) failed. A stale system of record is worse than a red build, so this exits non-zero. Pass --continue-on-error to treat it as advisory.`,
    );
    return EXIT_FAILED;
  }

  return EXIT_SUCCESS;
}
