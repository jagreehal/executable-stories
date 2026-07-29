/**
 * `push` — send a run to Executable Stories Cloud (or any compatible ingest
 * endpoint) without a custom curl script. Local/other-CI parity with the
 * GitHub Action's ingest mode: accepts a StoryReport v1 JSON or a raw run
 * JSON, which goes through the same synthesize -> canonicalize -> StoryReport
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

const HELP = `Usage:
  executable-stories push <run.json> [options]

Send a run to Executable Stories Cloud. <run.json> is either a StoryReport v1
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
  -h, --help         Show this help.

Exit codes: 0 pushed, 1 push rejected/failed, 4 usage error.`;

export interface PushDeps {
  readFile: (filePath: string) => string;
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
      "push needs an API key: pass --key or set EXECUTABLE_STORIES_API_KEY. Create one in Executable Stories Cloud (Settings -> Ingest key).",
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

  const repo =
    parsed.values.repo ??
    repoSlugFromRemote(deps.git(["config", "--get", "remote.origin.url"]) ?? "");
  if (!repo) {
    deps.error("Could not infer the repository slug from git. Pass --repo <org/name>.");
    return EXIT_USAGE;
  }

  const branch = parsed.values.branch ?? deps.git(["rev-parse", "--abbrev-ref", "HEAD"]);
  const gitSha = parsed.values["git-sha"] ?? deps.git(["rev-parse", "HEAD"]);
  const baseUrl =
    parsed.values.url ?? deps.env.EXECUTABLE_STORIES_URL ?? "https://app.executablestories.com";

  // Change metadata for change-aware selection; best effort, never fatal.
  const base = parsed.values.base;
  const changedFiles = base
    ? (deps.git(["diff", "--name-only", `${base}...HEAD`])?.split("\n").filter(Boolean) ?? [])
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
        source: "serve",
        report,
        ...(changedFiles.length > 0 ? { changedFiles, baseSha: deps.git(["rev-parse", base!]) } : {}),
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

  let runId = "";
  try {
    runId = String((JSON.parse(body) as { runId?: string }).runId ?? "");
  } catch {
    // Non-JSON success body: still a success, just no id to print.
  }
  deps.log(runId ? `Pushed run ${runId} (${repo}${branch ? `@${branch}` : ""})` : "Pushed run.");
  return EXIT_SUCCESS;
}
