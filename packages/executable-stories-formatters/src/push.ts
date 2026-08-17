/**
 * `push` — send a run to a compatible cloud ingest endpoint without a custom
 * curl script. Local/other-CI parity with the GitHub Action's ingest mode,
 * which shells out to this: accepts a StoryReport v1 JSON or a raw run JSON,
 * which goes through the same synthesize -> canonicalize -> StoryReport
 * pipeline as `format --format story-report-json`.
 *
 * fn(args, deps): file, network, and git access are injected for tests.
 */

import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import { parseArgs } from "node:util";

import { canonicalizeRun } from "executable-stories-core/converters/acl/index";
import { toStoryReport } from "executable-stories-core/converters/story-report";
import { synthesizeStories } from "executable-stories-core/converters/synthesize";

const EXIT_SUCCESS = 0;
const EXIT_PUSH_FAILED = 1;
const EXIT_USAGE = 4;
/** Same code `check` uses for "your tests said no": the gate blocked. */
const EXIT_GATE_BLOCKED = 5;

const HELP = `Usage:
  executable-stories push <run.json> [options]

Send a run to a cloud ingest endpoint. <run.json> is either a StoryReport v1
(e.g. reports/index.story-report.json) or a raw run JSON, which is converted
through the standard pipeline first.

Options:
  --key <es_...>     API key. Default: EXECUTABLE_STORIES_API_KEY env var.
  --url <base>       Cloud base URL. Default: EXECUTABLE_STORIES_URL env var,
                     then https://app.executablestories.com.
  --repo <org/name>  Repository slug as registered in the cloud.
                     Default: inferred from the git origin remote.
  --branch <name>    Default: current git branch.
  --git-sha <sha>    Default: current git HEAD.
  --base <ref>       Send files changed since <ref> (e.g. origin/main) so the
                     cloud can recommend a test scope for the change.
  --gate             After pushing, ask the cloud whether this commit is safe
                     to release and exit 5 if it is blocked. The policy lives
                     in your organization's settings, not in a file here.
  -h, --help         Show this help.

Under GitHub Actions, repo/branch/sha, the base commit, and PR metadata are
read from the environment, the run URL and recommended scope are written to
the job summary, and the run id is written to GITHUB_OUTPUT as ingest-run-id.

Exit codes: 0 pushed, 1 push rejected/failed, 4 usage error, 5 gate blocked.`;

export interface PushDeps {
  readFile: (filePath: string) => string;
  appendFile: (filePath: string, text: string) => void;
  fetchFn: typeof fetch;
  /** Run a git command, returning trimmed stdout or undefined on failure. */
  git: (args: string[]) => string | undefined;
  env: Record<string, string | undefined>;
  log: (message: string) => void;
  error: (message: string) => void;
}

function defaultDeps(): PushDeps {
  return {
    readFile: (filePath) => fs.readFileSync(filePath, "utf8"),
    appendFile: (filePath, text) => fs.appendFileSync(filePath, text),
    fetchFn: fetch,
    git: (args) => {
      try {
        return execFileSync("git", args, { stdio: ["ignore", "pipe", "ignore"] })
          .toString()
          .trim();
      } catch {
        return undefined;
      }
    },
    env: process.env,
    log: console.log,
    error: console.error,
  };
}

/** git@host:org/name.git or https://host/org/name(.git) -> "org/name". */
export function repoSlugFromRemote(remoteUrl: string): string | undefined {
  const match = /(?:[:/])([^/:]+\/[^/:]+?)(?:\.git)?\/?$/.exec(remoteUrl.trim());
  return match?.[1];
}

/** StoryReport v1 uses a string schemaVersion ("1.0"); raw runs use 1. */
function isStoryReport(data: Record<string, unknown>): boolean {
  return typeof data.schemaVersion === "string";
}

interface GithubContext {
  repo?: string;
  branch?: string;
  gitSha?: string;
  baseSha?: string;
  prNumber?: number;
  prUrl?: string;
}

interface GithubEvent {
  pull_request?: { number?: number; html_url?: string; base?: { sha?: string } };
  before?: string;
}

/**
 * What GitHub Actions knows that git alone does not. The base commit comes
 * from the event payload because a default `actions/checkout` is a depth-1
 * clone: `origin/main` does not exist locally, so there is no ref for `--base`
 * to resolve. Best effort throughout — a run still ingests with no change
 * metadata attached.
 */
function githubContext(deps: PushDeps): GithubContext {
  const env = deps.env;
  const context: GithubContext = {
    repo: env.GITHUB_REPOSITORY,
    // GITHUB_HEAD_REF is the source branch on a pull_request event, where
    // GITHUB_REF_NAME would be the synthetic "<n>/merge" ref.
    branch: env.GITHUB_HEAD_REF || env.GITHUB_REF_NAME,
    gitSha: env.GITHUB_SHA,
  };

  let event: GithubEvent;
  try {
    event = JSON.parse(deps.readFile(env.GITHUB_EVENT_PATH ?? "")) as GithubEvent;
  } catch {
    return context;
  }

  context.prNumber = event.pull_request?.number;
  context.prUrl = event.pull_request?.html_url;

  // An all-zero `before` is a first push to a branch: there is no base.
  const baseSha = event.pull_request?.base?.sha ?? event.before;
  if (baseSha && !/^0+$/.test(baseSha)) {
    // git returns undefined only when the command failed, so an empty string
    // from `cat-file -e` means the object is present.
    if (deps.git(["cat-file", "-e", baseSha]) === undefined) {
      deps.git(["fetch", "--depth=1", "origin", baseSha]);
    }
    context.baseSha = baseSha;
  }
  return context;
}

/**
 * Append markdown to the GitHub Actions job summary; a no-op everywhere else.
 * The summary is where a human reads the result, because it outlives the log.
 */
function summaryWriter(deps: PushDeps): (markdown: string) => void {
  const summaryPath = deps.env.GITHUB_STEP_SUMMARY;
  return (markdown) => {
    if (summaryPath) deps.appendFile(summaryPath, `${markdown}\n`);
  };
}

/** A pipe in a cell would end it early and shear the rest of the row off. */
function cell(text: string): string {
  return text.replaceAll("|", "\\|");
}

export async function runPush(
  rawArgs: string[],
  depsOverride: Partial<PushDeps> = {},
): Promise<number> {
  const deps = { ...defaultDeps(), ...depsOverride };

  let parsed;
  try {
    parsed = parseArgs({
      args: rawArgs,
      allowPositionals: true,
      options: {
        key: { type: "string" },
        url: { type: "string" },
        repo: { type: "string" },
        branch: { type: "string" },
        "git-sha": { type: "string" },
        base: { type: "string" },
        gate: { type: "boolean" },
        help: { type: "boolean", short: "h" },
      },
    });
  } catch (err) {
    deps.error(err instanceof Error ? err.message : String(err));
    deps.error(HELP);
    return EXIT_USAGE;
  }

  if (parsed.values.help) {
    deps.log(HELP);
    return EXIT_SUCCESS;
  }

  const inputPath = parsed.positionals[0];
  if (!inputPath) {
    deps.error("push needs a run file: executable-stories push <run.json>");
    deps.error(HELP);
    return EXIT_USAGE;
  }

  const key = parsed.values.key ?? deps.env.EXECUTABLE_STORIES_API_KEY;
  if (!key) {
    deps.error(
      "push needs an API key: pass --key or set EXECUTABLE_STORIES_API_KEY. Create one in your cloud instance's settings (Ingest key).",
    );
    return EXIT_USAGE;
  }

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(deps.readFile(inputPath)) as Record<string, unknown>;
  } catch (err) {
    deps.error(`Could not read ${inputPath}: ${err instanceof Error ? err.message : String(err)}`);
    return EXIT_USAGE;
  }

  let report: unknown;
  if (isStoryReport(data)) {
    report = data;
  } else {
    try {
      report = toStoryReport(canonicalizeRun(synthesizeStories(data as never)));
    } catch (err) {
      deps.error(
        `${inputPath} is neither a StoryReport v1 nor a convertible raw run: ${err instanceof Error ? err.message : String(err)}`,
      );
      return EXIT_USAGE;
    }
  }

  const onActions = deps.env.GITHUB_ACTIONS === "true";
  const github = onActions ? githubContext(deps) : {};
  const summary = summaryWriter(deps);

  const repo =
    parsed.values.repo ??
    github.repo ??
    repoSlugFromRemote(deps.git(["config", "--get", "remote.origin.url"]) ?? "");
  if (!repo) {
    deps.error("Could not infer the repository slug from git. Pass --repo <org/name>.");
    return EXIT_USAGE;
  }

  const branch =
    parsed.values.branch ?? github.branch ?? deps.git(["rev-parse", "--abbrev-ref", "HEAD"]);
  const gitSha = parsed.values["git-sha"] ?? github.gitSha ?? deps.git(["rev-parse", "HEAD"]);
  const baseUrl =
    parsed.values.url ?? deps.env.EXECUTABLE_STORIES_URL ?? "https://app.executablestories.com";

  // Change metadata for change-aware selection; best effort, never fatal.
  // --base wins; under Actions the event payload supplies one for free.
  const base = parsed.values.base;
  const baseSha = base ? deps.git(["rev-parse", base]) : github.baseSha;
  const changedFiles = baseSha
    ? (deps.git(["diff", "--name-only", `${baseSha}...HEAD`])?.split("\n").filter(Boolean) ?? [])
    : [];
  if (base && changedFiles.length === 0) {
    deps.error(`Warning: no changed files found against ${base}; pushing without change metadata.`);
  }

  let response: Response;
  try {
    response = await deps.fetchFn(new URL("/api/v1/runs", baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        repo,
        branch,
        gitSha,
        // "serve" named a subcommand that no longer exists (ADR 0006). The
        // cloud accepts both; "local" is what this is.
        source: onActions ? "action" : "local",
        report,
        ...(changedFiles.length > 0 ? { changedFiles, baseSha } : {}),
        ...(github.prNumber ? { prNumber: github.prNumber } : {}),
        ...(github.prUrl ? { prUrl: github.prUrl } : {}),
      }),
    });
  } catch (err) {
    deps.error(`Could not reach ${baseUrl}: ${err instanceof Error ? err.message : String(err)}`);
    return EXIT_PUSH_FAILED;
  }

  const body = await response.text();
  if (!response.ok) {
    const retryAfter = response.headers.get("Retry-After");
    deps.error(`Push rejected: HTTP ${response.status}${retryAfter ? ` (retry after ${retryAfter}s)` : ""}: ${body.slice(0, 500)}`);
    return EXIT_PUSH_FAILED;
  }

  let result: PushResponse = {};
  try {
    result = JSON.parse(body) as PushResponse;
  } catch {
    // Non-JSON success body: still a success, just nothing to report back.
  }

  const runId = String(result.runId ?? "");
  deps.log(runId ? `Pushed run ${runId} (${repo}${branch ? `@${branch}` : ""})` : "Pushed run.");
  if (result.url) deps.log(result.url);
  summary(
    result.url
      ? `### Executable Stories\n\n[View this run](${result.url})`
      : "### Executable Stories\n\nRun pushed.",
  );

  // Written before the gate runs, so a blocked release still tells the rest of
  // the workflow where the run landed — it did ingest.
  if (runId && deps.env.GITHUB_OUTPUT) {
    deps.appendFile(deps.env.GITHUB_OUTPUT, `ingest-run-id=${runId}\n`);
  }

  // The cloud answers a push with the scope the change implies. Reporting it
  // is the whole point of sending a base commit: otherwise the answer dies on
  // the wire and the CI log says nothing useful.
  const recommendations = result.recommendations ?? [];
  if (recommendations.length > 0) {
    deps.log(`\nRecommended scope for this change (${recommendations.length}):`);
    for (const item of recommendations) {
      deps.log(`  [${item.confidence}] ${item.title} — ${item.reason}`);
    }
    summary(`\n**Recommended scope for this change (${recommendations.length})**\n`);
    summary("| Confidence | Case | Why |\n| --- | --- | --- |");
    for (const item of recommendations) {
      summary(`| ${cell(item.confidence)} | ${cell(item.title)} | ${cell(item.reason)} |`);
    }
  }

  if (!parsed.values.gate) return EXIT_SUCCESS;
  if (!gitSha) {
    deps.error("--gate needs a commit sha: pass --git-sha or run inside a git repository.");
    return EXIT_USAGE;
  }
  return await runGate({ baseUrl, key, repo, gitSha, onActions }, deps);
}

interface PushResponse {
  runId?: string;
  url?: string;
  recommendations?: { title: string; confidence: string; reason: string }[];
}

interface GateResponse {
  status?: "clear" | "blocked" | "no-release";
  blocking?: string[];
  warnings?: string[];
  release?: { name?: string };
}

/** Ask the cloud whether this commit is safe to release. */
async function runGate(
  {
    baseUrl,
    key,
    repo,
    gitSha,
    onActions,
  }: { baseUrl: string; key: string; repo: string; gitSha: string; onActions: boolean },
  deps: PushDeps,
): Promise<number> {
  const summary = summaryWriter(deps);
  const query = `repo=${encodeURIComponent(repo)}&sha=${encodeURIComponent(gitSha)}`;
  let response: Response;
  try {
    response = await deps.fetchFn(new URL(`/api/v1/releases/gate?${query}`, baseUrl), {
      headers: { Authorization: `Bearer ${key}` },
    });
  } catch (err) {
    deps.error(`Could not reach the gate: ${err instanceof Error ? err.message : String(err)}`);
    return EXIT_PUSH_FAILED;
  }

  const body = await response.text();
  if (!response.ok) {
    deps.error(`Gate check failed: HTTP ${response.status}: ${body.slice(0, 500)}`);
    return EXIT_PUSH_FAILED;
  }

  let gate: GateResponse = {};
  try {
    gate = JSON.parse(body) as GateResponse;
  } catch {
    deps.error(`Gate returned a non-JSON body: ${body.slice(0, 200)}`);
    return EXIT_PUSH_FAILED;
  }

  for (const warning of gate.warnings ?? []) deps.log(`  warning: ${warning}`);

  const commit = `${repo}@${gitSha.slice(0, 12)}`;
  if (gate.status === "no-release") {
    deps.log(`\nNo release recorded for ${commit} — nothing to gate on.`);
    summary("\n**Release gate: no release recorded for this commit**");
    return EXIT_SUCCESS;
  }
  if (gate.status === "blocked") {
    deps.error(`\nRelease gate: BLOCKED for ${commit}`);
    summary("\n**Release gate: blocked**\n");
    for (const reason of gate.blocking ?? []) {
      deps.error(`  - ${reason}`);
      summary(`- ${reason}`);
      // An annotation puts the reason on the PR's Files/Checks view, where a
      // reviewer sees it without opening the job log.
      if (onActions) deps.error(`::error::Release gate: ${reason}`);
    }
    return EXIT_GATE_BLOCKED;
  }
  deps.log(`\nRelease gate: clear for ${commit}`);
  summary("\n**Release gate: clear**");
  return EXIT_SUCCESS;
}
