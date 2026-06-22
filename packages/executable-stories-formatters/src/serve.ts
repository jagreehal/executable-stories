import * as fs from "node:fs";
import * as http from "node:http";
import * as path from "node:path";

import { diffRuns } from "./compare/index";
import { regenerateRun, startWatch } from "./watch";
import type { OutputFormat } from "./types/options";
import type { RunDiffResult } from "./types/compare";
import type { TestRunResult } from "./types/test-result";

export interface ServeOptions {
  /** Path to the raw-run (or canonical) JSON the framework adapter writes. */
  input: string;
  outputDir: string;
  outputName: string;
  formats: OutputFormat[];
  /** Input is "raw" (default) or already-canonical "canonical". */
  inputType?: "raw" | "canonical";
  /** Synthesize story metadata for plain tests (raw input only). Default true. */
  synthesize?: boolean;
  /** Port for the live server. Default 4321. */
  port?: number;
  /** Host to bind. Default "127.0.0.1". */
  host?: string;
  /** Coalesce rapid change events. Default 150ms. */
  debounceMs?: number;
}

/**
 * The realtime state the server renders. The session baseline is pinned to the
 * first run we observe after boot, so the headline tracks the whole loop's
 * trajectory rather than the noise between any two adjacent iterations.
 */
export interface RunState {
  /** First run observed this session — the trajectory anchor. */
  sessionBaseline: TestRunResult | null;
  /** The run immediately before {@link current} — the per-iteration anchor. */
  previous: TestRunResult | null;
  /** Latest run. */
  current: TestRunResult | null;
  /** How many runs we have observed since boot. */
  runCount: number;
}

/**
 * Fold a freshly-read run into the prior state. Pure so the trajectory logic is
 * testable without a server or filesystem: the first run pins the session
 * baseline; later runs shift `previous`/`current` forward.
 */
export function advanceState(prev: RunState, run: TestRunResult): RunState {
  if (prev.sessionBaseline === null) {
    return { sessionBaseline: run, previous: null, current: run, runCount: 1 };
  }
  return {
    sessionBaseline: prev.sessionBaseline,
    previous: prev.current,
    current: run,
    runCount: prev.runCount + 1,
  };
}

/** The two diffs the live view — and a portal payload — care about. */
export interface RunDeltas {
  /** Versus the first run of the session: the loop's trajectory. */
  session: RunDiffResult | null;
  /** Versus the immediately-previous run: what the last iteration did. */
  iteration: RunDiffResult | null;
}

/**
 * Derive the session and per-iteration diffs from the run history. Both are null
 * until there are two runs to compare. Pure, computed once per run — this is the
 * single source the strip renders from and the same payload a portal sink would
 * push, so neither re-runs the compare engine.
 */
export function computeDeltas(state: RunState): RunDeltas {
  if (state.current === null || state.sessionBaseline === null || state.runCount <= 1) {
    return { session: null, iteration: null };
  }
  return {
    session: diffRuns(state.sessionBaseline, state.current),
    iteration: state.previous ? diffRuns(state.previous, state.current) : null,
  };
}

function pluralize(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/**
 * One-line human summary of a diff, or null when there is nothing worth saying.
 * `fixed`/`regressed` lead because they are what a human babysitting a loop
 * actually scans for; structural changes (new/removed/renamed) follow.
 */
function summarizeDiff(diff: RunDiffResult): string | null {
  const s = diff.summary;
  const parts: string[] = [];
  if (s.fixed > 0) parts.push(`+${pluralize(s.fixed, "passing")}`);
  if (s.regressed > 0) parts.push(`${pluralize(s.regressed, "regressed")}`);
  if (s.added > 0) parts.push(`${pluralize(s.added, "new behaviour")}`);
  if (s.removed > 0) parts.push(`${pluralize(s.removed, "removed")}`);
  const moved = s.renamed + s.moved;
  if (moved > 0) parts.push(`${pluralize(moved, "renamed")}`);
  if (s.changed > 0) parts.push(`${pluralize(s.changed, "changed")}`);
  return parts.length > 0 ? parts.join(", ") : null;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Render the delta strip that sits above the report. This is the one thing a
 * dumb static server cannot do — it needs the prior runs and the compare
 * engine. Pure, so the copy is unit-testable.
 */
export function renderDeltaStrip(state: RunState): string {
  if (state.current === null) return "";

  const { session, iteration } = computeDeltas(state);

  // Only one run so far: baseline pinned, nothing to diff against yet.
  if (session === null) {
    const label = `Run #${state.runCount} captured — baseline pinned. Watching for changes…`;
    return `<div data-es-live="strip"><strong>Live</strong> · ${escapeHtml(label)}</div>`;
  }

  const sessionLine = summarizeDiff(session) ?? "no change yet";

  let detail = "";
  if (iteration) {
    const iterationLine = summarizeDiff(iteration);
    if (iterationLine) detail = ` · <span data-es-live="iteration">this iteration: ${escapeHtml(iterationLine)}</span>`;
  }

  return [
    `<div data-es-live="strip">`,
    `<strong>Live</strong> · run #${state.runCount} · `,
    `<span data-es-live="session">since you started: ${escapeHtml(sessionLine)}</span>`,
    detail,
    `</div>`,
  ].join("");
}

/** Client script: subscribe to the reload stream and full-reload on a new run. */
const RELOAD_CLIENT = `<script data-es-live="client">
(function () {
  try {
    var es = new EventSource("/__es_reload");
    es.onmessage = function (e) { if (e.data === "reload") location.reload(); };
  } catch (err) { /* SSE unavailable: stay static */ }
})();
</script>`;

const STRIP_STYLE = `<style data-es-live="style">
[data-es-live="strip"]{position:sticky;top:0;z-index:9999;font:14px/1.5 system-ui,sans-serif;
padding:8px 16px;background:#0b1021;color:#e6e9f5;border-bottom:1px solid #2a3052}
[data-es-live="strip"] strong{color:#7dd3fc}
</style>`;

/**
 * Inject the live bits into a generated (static) report without touching the
 * file on disk: the strip after <body>, the style + reload client before
 * </body>. The artifact stays a clean static file for the CI/Action path.
 */
export function injectLiveBits(html: string, stripHtml: string): string {
  let out = html;
  const bodyOpen = out.match(/<body[^>]*>/i);
  if (bodyOpen) {
    const at = bodyOpen.index! + bodyOpen[0].length;
    out = out.slice(0, at) + stripHtml + out.slice(at);
  } else {
    out = stripHtml + out;
  }
  const tail = STRIP_STYLE + RELOAD_CLIENT;
  if (/<\/body>/i.test(out)) {
    out = out.replace(/<\/body>/i, tail + "</body>");
  } else {
    out += tail;
  }
  return out;
}

export interface ServeDeps {
  readFile?: (filePath: string) => string;
  watch?: (filePath: string, listener: () => void) => { close: () => void };
  log?: (message: string) => void;
  /** Inject a server factory for tests. */
  createServer?: (handler: http.RequestListener) => http.Server;
}

export interface ServeHandle {
  /** Resolved listening port (useful when port 0 picks a free one). */
  port: number;
  close: () => void;
}

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

/**
 * Default watcher. Watch the *directory*, not the file: the input often does not
 * exist when `serve` boots (you start it, then the first loop iteration writes
 * the run), and tools commonly write atomically (temp + rename), which breaks a
 * file-level watch when the original inode disappears.
 */
function watchInputDir(filePath: string, listener: () => void): { close: () => void } {
  const dir = path.dirname(filePath);
  const base = path.basename(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const watcher = fs.watch(dir, (_event, changed) => {
    if (!changed || changed === base) listener();
  });
  return { close: () => watcher.close() };
}

/** Strip tags from a strip fragment so it reads as a plain console line. */
function plainText(html: string): string {
  return html.replace(/<[^>]+>/g, "").trim();
}

/**
 * Serve the living docs at a URL and push a reload whenever the framework
 * rewrites its raw-run. The watch loop (debounce, coalesce, initial build) is
 * delegated to {@link startWatch}; `serve` only adds the HTTP surface and, on
 * each run, the delta strip — "what changed since you started this loop" —
 * rendered from the in-memory run history. That strip is the one thing a static
 * file server cannot give you.
 */
export function startServe(options: ServeOptions, deps: ServeDeps = {}): ServeHandle {
  const log = deps.log ?? ((message: string) => console.log(message));
  const read = deps.readFile ?? ((filePath: string) => fs.readFileSync(filePath, "utf8"));
  const port = options.port ?? 4321;
  const host = options.host ?? "127.0.0.1";

  let state: RunState = { sessionBaseline: null, previous: null, current: null, runCount: 0 };
  let htmlPath: string | null = null;
  // Rendered once per run (when state advances), not per request, so a page load
  // never re-runs the compare engine.
  let stripHtml = renderDeltaStrip(state);
  const clients = new Set<http.ServerResponse>();

  const pushReload = (): void => {
    for (const res of clients) res.write("data: reload\n\n");
  };

  const handler: http.RequestListener = (req, res) => {
    const url = (req.url ?? "/").split("?")[0];

    if (url === "/__es_reload") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      res.write("retry: 1000\n\n");
      clients.add(res);
      req.on("close", () => clients.delete(res));
      return;
    }

    if (url === "/" || url === "/index.html") {
      const html = htmlPath
        ? read(htmlPath)
        : "<!doctype html><html><body><h1>executable-stories</h1></body></html>";
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(injectLiveBits(html, stripHtml));
      return;
    }

    // Static fallback: serve files from the output directory (assets etc.).
    const safe = path.normalize(url).replace(/^(\.\.[/\\])+/, "");
    const filePath = path.join(path.resolve(options.outputDir), safe);
    if (filePath.startsWith(path.resolve(options.outputDir)) && fs.existsSync(filePath)) {
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream" });
      res.end(read(filePath));
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  };

  const server = deps.createServer
    ? deps.createServer(handler)
    : http.createServer(handler);

  const watchOptions = {
    input: options.input,
    outputDir: options.outputDir,
    outputName: options.outputName,
    formats: options.formats,
    inputType: (options.inputType ?? "raw") as "raw" | "canonical",
    synthesize: options.synthesize !== false,
    debounceMs: options.debounceMs,
  };

  // startWatch owns the loop; our regenerate also diffs the run and notifies the
  // browser. regenerateRun returns the canonical run alongside the files, so the
  // diff reuses the same read/canonicalize the artifacts were built from.
  const watchHandle = startWatch(watchOptions, {
    readFile: read,
    watch: deps.watch ?? watchInputDir,
    log: () => {}, // serve emits its own per-run line below
    regenerate: async (input) => {
      if (!fs.existsSync(path.resolve(input))) return []; // wait quietly for the first run
      const { files, run } = await regenerateRun({ ...watchOptions, input }, { readFile: read });
      htmlPath = files.find((f) => f.endsWith(".html")) ?? htmlPath;
      state = advanceState(state, run);
      stripHtml = renderDeltaStrip(state);
      log(`Run #${state.runCount}: ${plainText(stripHtml)}`);
      pushReload();
      return files;
    },
  });

  server.listen(port, host);
  const address = server.address();
  const boundPort = typeof address === "object" && address ? address.port : port;
  log(`Live docs: http://${host}:${boundPort} (Ctrl+C to stop)`);

  return {
    port: boundPort,
    close: () => {
      watchHandle.close();
      for (const res of clients) res.end();
      clients.clear();
      server.close();
    },
  };
}
