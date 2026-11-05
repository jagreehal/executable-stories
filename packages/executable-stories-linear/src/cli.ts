/**
 * `executable-stories-linear publish [run-file]` — put a run on the Linear
 * issues its stories name. fn(args, deps): `runCli` takes its environment,
 * files and network as deps and returns the exit code, so it is tested
 * without a terminal or Linear.
 */

import * as path from "node:path";
import { parseArgs } from "node:util";

import { scenarioSlug } from "executable-stories-core/utils/slug";
import {
  DEFAULT_RUN_FILES,
  defaultScope,
  publishRun,
  readRun,
  type TicketStatus,
  ticketStatuses,
} from "executable-stories-trackers";

import { attachVideo, createLinearClient, type LinearAuth, type LinearOptions, ownsTicket } from "./linear";

export interface CliDeps {
  env: Record<string, string | undefined>;
  readFile: (path: string) => Promise<string>;
  readBytes: (path: string) => Promise<Uint8Array>;
  exists: (path: string) => boolean;
  fetch: typeof fetch;
  out: (line: string) => void;
  err: (line: string) => void;
}

const USAGE = `Usage: executable-stories-linear publish [run-file] [options]

Puts the run on every Linear issue its stories name (story.init(task, { ticket: 'PAY-12' })):
one "Quality checks" attachment per issue, updated in place by the next run of the same scope.

  run-file             raw run or StoryReport JSON (default: ${DEFAULT_RUN_FILES.join(", then ")})
  --scope <name>       the stream of evidence, one attachment per issue per scope
                       (default: "CI <owner/repo> <branch>" in GitHub Actions, "CI <branch>"
                       elsewhere in CI, else "Local"; the hosted app uses the same names)
  --link <url>         where the attachment links for good: a report site or the repository
                       (default: the GitHub repository in Actions; required elsewhere)
  --run-url <url>      this run (default: the GitHub Actions run, or the run's own ci.url)
  --trust <url>        another writer's link whose status for the scope may be shared
                       (repeatable; also EXECUTABLE_STORIES_TRUSTED_LINKS, comma-separated),
                       e.g. the hosted app. Statuses with any other link are left alone.
  --videos <dir>       also attach each scenario's <dir>/<slug>.mp4 to its issues, stored in
                       Linear; write them with \`executable-stories video\` (reports/video)
  --dry-run            print what would be posted; needs no Linear key
  --json               print the result as JSON

Credentials: LINEAR_API_KEY (personal key, lin_api_…) or LINEAR_ACCESS_TOKEN (OAuth).
Exit codes: 0 posted (or nothing to post), 1 Linear refused some issues, 2 usage or setup error.`;

function githubRepository(env: CliDeps["env"]): string | null {
  return env.GITHUB_SERVER_URL && env.GITHUB_REPOSITORY ? `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}` : null;
}

function authOf(env: CliDeps["env"]): LinearAuth | null {
  if (env.LINEAR_API_KEY) return { apiKey: env.LINEAR_API_KEY };
  if (env.LINEAR_ACCESS_TOKEN) return { accessToken: env.LINEAR_ACCESS_TOKEN };
  return null;
}

/** Each scenario of these statuses with a file in `dir`, one per ticket it names. */
function videoFiles(statuses: readonly TicketStatus[], dir: string, exists: CliDeps["exists"]) {
  return statuses.flatMap((status) =>
    status.scenarios.flatMap((scenario) => {
      const filename = `${scenarioSlug(scenario.title)}.mp4`;
      const file = path.join(dir, filename);
      return exists(file) ? [{ ticket: status.ticket, scope: status.scope, scenario: scenario.title, filename, file }] : [];
    }),
  );
}

export async function runCli(argv: readonly string[], deps: CliDeps): Promise<number> {
  let parsed;
  try {
    parsed = parseArgs({
      args: [...argv],
      allowPositionals: true,
      options: {
        scope: { type: "string" },
        link: { type: "string" },
        "run-url": { type: "string" },
        trust: { type: "string", multiple: true },
        videos: { type: "string" },
        "dry-run": { type: "boolean", default: false },
        json: { type: "boolean", default: false },
        help: { type: "boolean", short: "h", default: false },
      },
    });
  } catch (error) {
    deps.err(error instanceof Error ? error.message : String(error));
    deps.err(USAGE);
    return 2;
  }
  const [command, file] = parsed.positionals;
  if (parsed.values.help || command !== "publish") {
    (parsed.values.help ? deps.out : deps.err)(USAGE);
    return parsed.values.help ? 0 : 2;
  }

  const runFile = file ?? DEFAULT_RUN_FILES.find((path) => deps.exists(path));
  if (!runFile) {
    deps.err(`No run file. Pass one, or write one to ${DEFAULT_RUN_FILES.join(" or ")}.`);
    return 2;
  }
  let report;
  try {
    report = readRun(await deps.readFile(runFile));
  } catch (error) {
    deps.err(`Could not read ${runFile}: ${error instanceof Error ? error.message : String(error)}`);
    return 2;
  }

  const branch = report.ci?.branch ?? deps.env.GITHUB_REF_NAME;
  const scope = parsed.values.scope ?? defaultScope({ repository: deps.env.GITHUB_REPOSITORY, branch });
  const link = parsed.values.link ?? githubRepository(deps.env) ?? report.ci?.url;
  if (!link) {
    deps.err("Pass --link <url>: where each issue's attachment should link (a report site or the repository).");
    return 2;
  }
  const actionsRun =
    deps.env.GITHUB_RUN_ID && githubRepository(deps.env)
      ? `${githubRepository(deps.env)}/actions/runs/${deps.env.GITHUB_RUN_ID}`
      : null;
  const runUrl = parsed.values["run-url"] ?? actionsRun ?? report.ci?.url ?? null;

  if (parsed.values["dry-run"]) {
    deps.err("Dry run: with no key the workspace is unknown, so every key-shaped ticket is listed; a real run posts only the workspace's own.");
    const statuses = ticketStatuses({
      report,
      owns: (ticket) => ownsTicket(ticket.url?.match(/^https:\/\/linear\.app\/([^/]+)\//)?.[1] ?? "", ticket),
      scope,
      link,
      runUrl,
    });
    if (parsed.values.json) deps.out(JSON.stringify({ dryRun: true, statuses }, null, 2));
    else if (statuses.length === 0) deps.out("No Linear issues named in this run.");
    else for (const status of statuses) deps.out(`would post ${status.ticket}: ${status.title}`);
    if (!parsed.values.json && parsed.values.videos) {
      for (const video of videoFiles(statuses, parsed.values.videos, deps.exists)) {
        deps.out(`would attach to ${video.ticket}: ${video.filename}`);
      }
    }
    return 0;
  }

  const auth = authOf(deps.env);
  if (!auth) {
    deps.err("Set LINEAR_API_KEY (a personal key) or LINEAR_ACCESS_TOKEN (OAuth).");
    return 2;
  }
  let client;
  const options: LinearOptions = {
    auth,
    apiUrl: deps.env.LINEAR_API_URL,
    trustedLinks: [
      ...(parsed.values.trust ?? []),
      ...(deps.env.EXECUTABLE_STORIES_TRUSTED_LINKS ?? "").split(",").map((link) => link.trim()).filter(Boolean),
    ],
  };
  try {
    client = await createLinearClient(options, { fetch: deps.fetch });
  } catch (error) {
    deps.err(`Linear refused the credentials: ${error instanceof Error ? error.message : String(error)}`);
    return 2;
  }
  const result = await publishRun({ report, client, scope, link, runUrl });
  const videos = { attached: [] as string[], unchanged: [] as string[], failed: [] as { file: string; error: string }[] };
  if (parsed.values.videos) {
    const posted = result.statuses.filter((status) => result.posted.includes(status.ticket));
    for (const { file, ...video } of videoFiles(posted, parsed.values.videos, deps.exists)) {
      try {
        const bytes = await deps.readBytes(file);
        const outcome = await attachVideo(options, { ...video, bytes }, { fetch: deps.fetch });
        videos[outcome].push(`${video.ticket}: ${video.filename}`);
      } catch (error) {
        videos.failed.push({ file, error: error instanceof Error ? error.message : String(error) });
      }
    }
  }
  if (parsed.values.json) {
    deps.out(
      JSON.stringify(
        {
          workspace: client.workspace,
          posted: result.posted,
          failed: result.failed,
          ...(parsed.values.videos ? { videos } : {}),
        },
        null,
        2,
      ),
    );
  } else {
    if (result.posted.length === 0 && result.failed.length === 0) {
      deps.out(`No issues in the ${client.workspace} workspace are named in this run.`);
    }
    for (const status of result.statuses.filter((each) => result.posted.includes(each.ticket))) {
      deps.out(`posted ${status.ticket}: ${status.title}`);
    }
    for (const failure of result.failed) deps.err(`could not post ${failure.ticket}: ${failure.error}`);
    for (const line of videos.attached) deps.out(`attached ${line}`);
    for (const line of videos.unchanged) deps.out(`unchanged ${line}`);
    for (const failure of videos.failed) deps.err(`could not attach ${failure.file}: ${failure.error}`);
  }
  return result.failed.length > 0 || videos.failed.length > 0 ? 1 : 0;
}
