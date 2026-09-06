/** Publish a report and its evidence through presigned asset uploads. */

import * as fs from "node:fs";
import * as path from "node:path";
import { parseArgs } from "node:util";

import { canonicalizeRun } from "executable-stories-core/converters/acl/canonicalize";
import { collectReportAssets, rewriteReportAssets } from "executable-stories-core/report-assets";
import { toStoryReport } from "executable-stories-core/converters/story-report";
import { synthesizeStories } from "executable-stories-core/converters/synthesize";
import type { StoryReport } from "executable-stories-core/types/story-report";

const EXIT_SUCCESS = 0;
const EXIT_SHARE_FAILED = 1;
const EXIT_USAGE = 4;

const HELP = `Usage:
  executable-stories share <reports-dir|report.html|report.json> [options]

Publish a report to Executable Stories Cloud and print a link to it. The
screenshots and videos the report references are uploaded with it, so the link
shows the same evidence your local copy does.

Point it at the directory you generated the report into (it looks for
index.html, then other *.html files, index.story-report.json, other
*.story-report.json files, and raw-run.json), or at a report file directly.

Options:
  --key <es_...>       API key. Default: EXECUTABLE_STORIES_API_KEY env var.
  --url <base>         Cloud base URL. Default: EXECUTABLE_STORIES_URL env var,
                       then https://app.executablestories.com.
  --title <text>       Name the share. Default: the report's title.
  --emails <a@b,c@d>   Only these people can open it, after signing in. Without
                       this, anyone holding the link can open it.
  --expires-days <n>   Delete the share after n days. Default: 30. 0 never expires.
  --json               Print the response as JSON instead of prose.
  -h, --help           Show this help.

Exit codes: 0 shared, 1 rejected or failed, 4 usage error.`;

export interface ShareDeps {
  readFile: (filePath: string) => string;
  readBinary: (filePath: string) => Uint8Array<ArrayBuffer>;
  /** Byte size, or undefined when the file is not there. */
  fileSize: (filePath: string) => number | undefined;
  /** Entry names in a directory, or undefined when the path is not one. */
  listDir: (dirPath: string) => string[] | undefined;
  fetchFn: typeof fetch;
  env: Record<string, string | undefined>;
  log: (message: string) => void;
  error: (message: string) => void;
}

function defaultDeps(): ShareDeps {
  return {
    readFile: (filePath) => fs.readFileSync(filePath, "utf8"),
    readBinary: (filePath) => new Uint8Array(fs.readFileSync(filePath)) as Uint8Array<ArrayBuffer>,
    fileSize: (filePath) => {
      try {
        const stat = fs.statSync(filePath);
        return stat.isFile() ? stat.size : undefined;
      } catch {
        return undefined;
      }
    },
    listDir: (dirPath) => {
      try {
        return fs.readdirSync(dirPath);
      } catch {
        return undefined;
      }
    },
    fetchFn: fetch,
    env: process.env,
    log: console.log,
    error: console.error,
  };
}

/** Enough types to make a browser play the video and show the picture. */
const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".html": "text/html",
  ".json": "application/json",
  ".txt": "text/plain",
  ".zip": "application/zip",
};

export function contentTypeFor(filePath: string): string {
  return CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
}

/** Prefer HTML for its bundled asset paths; skip pages without embedded reports. */
export function resolveReport(
  inputPath: string,
  deps: ShareDeps,
): { path: string; report: StoryReport } {
  const entries = deps.listDir(inputPath);
  const candidates =
    entries === undefined
      ? [inputPath]
      : candidateNames(entries).map((name) => path.join(inputPath, name));
  if (candidates.length === 0) {
    throw new Error(
      "no report in it. Generate one first: executable-stories format <run.json> --format story-report-json --output-dir <dir> --output-name index",
    );
  }

  let firstError: unknown;
  for (const candidate of candidates) {
    try {
      return { path: candidate, report: loadReport(candidate, deps) };
    } catch (err) {
      firstError ??= err;
    }
  }
  throw firstError;
}

/** Files in a report directory that could hold a report, best first. */
function candidateNames(entries: string[]): string[] {
  const html = entries.filter((name) => name.endsWith(".html")).sort();
  const reports = entries.filter((name) => name.endsWith(".story-report.json")).sort();
  return [
    ...html.filter((name) => name === "index.html"),
    ...html,
    ...reports.filter((name) => name === "index.story-report.json"),
    ...reports,
    ...entries.filter((name) => name === "raw-run.json"),
  ].filter((name, i, all) => all.indexOf(name) === i);
}

/** The report inside `<script type="application/json" id="es-report-data">`. */
const HTML_REPORT_DATA = /<script[^>]*\bid=["']?es-report-data["']?[^>]*>([\s\S]*?)<\/script>/;

function loadReport(filePath: string, deps: ShareDeps): StoryReport {
  const text = deps.readFile(filePath);
  if (filePath.endsWith(".html")) {
    const match = HTML_REPORT_DATA.exec(text);
    if (!match?.[1]) throw new Error(`${filePath} is an HTML page with no report embedded in it`);
    return asStoryReport(JSON.parse(match[1]) as Record<string, unknown>, filePath);
  }
  return asStoryReport(JSON.parse(text) as Record<string, unknown>, filePath);
}

/** StoryReport v1 declares a string schemaVersion; a raw run uses a number. */
function asStoryReport(data: Record<string, unknown>, filePath: string): StoryReport {
  if (typeof data.schemaVersion === "string") return data as unknown as StoryReport;
  try {
    return toStoryReport(canonicalizeRun(synthesizeStories(data as never)));
  } catch (err) {
    throw new Error(
      `${filePath} is neither a StoryReport v1 nor a convertible raw run: ${err instanceof Error ? err.message : String(err)}`,
      { cause: err },
    );
  }
}

export interface AssetToUpload {
  /** Key the share stores the file under. Report-relative, never absolute. */
  path: string;
  /** Where the file is on this machine. Local only — never sent anywhere. */
  localPath: string;
  contentType: string;
  bytes: number;
}

/** Use report-relative keys inside the report directory and flat keys elsewhere. */
function keyFor(assetPath: string, reportDir: string, taken: Set<string>): string {
  const resolved = path.resolve(reportDir, assetPath);
  const relative = path.relative(reportDir, resolved);
  const inside = relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
  const base = inside
    ? relative.split(path.sep).join("/")
    : `assets/${path.basename(resolved)}`;

  // Two files can flatten to one name; the share needs them kept apart.
  let key = base;
  const ext = path.extname(base);
  const stem = base.slice(0, base.length - ext.length);
  for (let n = 2; taken.has(key); n++) key = `${stem}-${n}${ext}`;
  taken.add(key);
  return key;
}

/** Plan uploads and replacements for all local asset paths, including missing files. */
export function planAssets(
  report: StoryReport,
  reportDir: string,
  deps: ShareDeps,
): { assets: AssetToUpload[]; missing: string[]; keyByPath: Map<string, string> } {
  const assets: AssetToUpload[] = [];
  const missing: string[] = [];
  const keyByPath = new Map<string, string>();
  const taken = new Set<string>();
  for (const assetPath of collectReportAssets(report)) {
    const localPath = path.resolve(reportDir, assetPath);
    const bytes = deps.fileSize(localPath);
    // Missing assets receive storage keys too, keeping local paths private.
    const key = keyFor(assetPath, reportDir, taken);
    keyByPath.set(assetPath, key);
    if (bytes === undefined) {
      missing.push(assetPath);
      continue;
    }
    assets.push({ path: key, localPath, contentType: contentTypeFor(key), bytes });
  }
  return { assets, missing, keyByPath };
}

interface CreateShareResponse {
  id: string;
  url: string;
  uploads?: { path: string; url: string; headers?: Record<string, string> }[];
}

interface ErrorBody {
  error?: { type?: string; message?: string; limit?: number; maxBytes?: number };
}

/** Translate cloud limits into actionable CLI messages. */
async function describeFailure(response: Response): Promise<string> {
  const text = await response.text().catch(() => "");
  try {
    const body = JSON.parse(text) as ErrorBody;
    const error = body.error;
    if (error?.type === "SHARE_LIMIT") {
      return `you already have ${error.limit ?? 3} shares. Delete one in your cloud settings, or upgrade, then run this again.`;
    }
    if (error?.type === "SHARE_TOO_LARGE") {
      return `the report and its assets are over the ${error.maxBytes ?? 0} byte limit for a share.`;
    }
    if (error?.message) return error.message;
    if (error?.type) return error.type;
  } catch {
    // Not JSON: fall through to the raw text.
  }
  return text.trim() || `HTTP ${response.status}`;
}

export async function runShare(
  rawArgs: string[],
  depsOverride: Partial<ShareDeps> = {},
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
        title: { type: "string" },
        emails: { type: "string" },
        "expires-days": { type: "string" },
        json: { type: "boolean" },
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
    deps.error("share needs a report: executable-stories share <reports-dir|report.html|report.json>");
    deps.error(HELP);
    return EXIT_USAGE;
  }

  const key = parsed.values.key ?? deps.env.EXECUTABLE_STORIES_API_KEY;
  if (!key) {
    deps.error(
      "share needs an API key: pass --key or set EXECUTABLE_STORIES_API_KEY. Sign in with Google at https://app.executablestories.com and create one under Settings.",
    );
    return EXIT_USAGE;
  }

  const expiresRaw = parsed.values["expires-days"];
  const expiresInDays = expiresRaw === undefined ? 30 : Number(expiresRaw);
  if (!Number.isInteger(expiresInDays) || expiresInDays < 0) {
    deps.error(`--expires-days takes a whole number of days (0 never expires), not "${expiresRaw}".`);
    return EXIT_USAGE;
  }

  let reportPath: string;
  let report: StoryReport;
  try {
    ({ path: reportPath, report } = resolveReport(inputPath, deps));
  } catch (err) {
    deps.error(`Could not read ${inputPath}: ${err instanceof Error ? err.message : String(err)}`);
    return EXIT_USAGE;
  }

  const reportDir = path.dirname(reportPath);
  const { assets, missing, keyByPath } = planAssets(report, reportDir, deps);
  for (const assetPath of missing) {
    deps.error(`Warning: ${assetPath} is missing, so it will not be in the share.`);
  }

  const shareReport = {
    ...rewriteReportAssets(report, (assetPath) => keyByPath.get(assetPath) ?? assetPath),
    projectRoot: "",
  };

  const emails = (parsed.values.emails ?? "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
  const baseUrl =
    parsed.values.url ?? deps.env.EXECUTABLE_STORIES_URL ?? "https://app.executablestories.com";

  let created: CreateShareResponse;
  try {
    const response = await deps.fetchFn(new URL("/api/v1/shares", baseUrl), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        title: parsed.values.title,
        report: shareReport,
        assets: assets.map(({ path: key, contentType, bytes }) => ({
          path: key,
          contentType,
          bytes,
        })),
        visibility: emails.length > 0 ? "emails" : "link",
        ...(emails.length > 0 ? { allowedEmails: emails } : {}),
        expiresInDays,
      }),
    });
    if (!response.ok) {
      deps.error(`Share rejected: ${await describeFailure(response)}`);
      return EXIT_SHARE_FAILED;
    }
    created = (await response.json()) as CreateShareResponse;
  } catch (err) {
    deps.error(`Could not reach ${baseUrl}: ${err instanceof Error ? err.message : String(err)}`);
    return EXIT_SHARE_FAILED;
  }

  // Only read files offered in the manifest, regardless of the response paths.
  const localByKey = new Map(assets.map((asset) => [asset.path, asset.localPath]));
  for (const upload of created.uploads ?? []) {
    const filePath = localByKey.get(upload.path);
    if (filePath === undefined) {
      deps.error(`Share asked for a file this report did not offer: ${upload.path}`);
      return EXIT_SHARE_FAILED;
    }
    try {
      const response = await deps.fetchFn(upload.url, {
        method: "PUT",
        headers: { "Content-Type": contentTypeFor(upload.path), ...upload.headers },
        body: new Blob([deps.readBinary(filePath)], { type: contentTypeFor(upload.path) }),
      });
      if (!response.ok) {
        deps.error(`Upload of ${upload.path} failed: HTTP ${response.status}`);
        return EXIT_SHARE_FAILED;
      }
    } catch (err) {
      deps.error(
        `Upload of ${upload.path} failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return EXIT_SHARE_FAILED;
    }
  }

  // The share stays invisible until this lands, so a half-uploaded report is
  // never something you can send to someone.
  try {
    const response = await deps.fetchFn(new URL(`/api/v1/shares/${created.id}/complete`, baseUrl), {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!response.ok) {
      deps.error(`Share could not be published: ${await describeFailure(response)}`);
      return EXIT_SHARE_FAILED;
    }
  } catch (err) {
    deps.error(
      `Share could not be published: ${err instanceof Error ? err.message : String(err)}`,
    );
    return EXIT_SHARE_FAILED;
  }

  if (parsed.values.json) {
    deps.log(JSON.stringify({ id: created.id, url: created.url, assets: assets.length }, null, 2));
    return EXIT_SUCCESS;
  }

  const withAssets = assets.length === 1 ? "1 asset" : `${assets.length} assets`;
  deps.log(`Shared ${path.basename(reportPath)} (${withAssets}):`);
  deps.log(`  ${created.url}`);
  deps.log(
    emails.length > 0
      ? `  Only ${emails.join(", ")} can open it, after signing in.`
      : "  Anyone with the link can open it.",
  );
  return EXIT_SUCCESS;
}
