import http from "node:http";

import {
  getBehaviorDiff,
  getLoopStatus,
  getScenario,
  getScenariosForPaths,
  getTrajectory,
  isFocusedRunFramework,
  listScenarios,
  loadStoryReport,
  readOnlyTools,
  resolveReportPath,
  runChanged,
  runScenarioById,
  runScenarios,
  FOCUSED_RUN_FRAMEWORKS,
  type FocusedRunFramework,
  type ScenarioIndexFilters,
} from "./index.js";

export interface HttpServerOptions {
  port?: number;
  host?: string;
  reportPath?: string;
}

/** A bad client request — surfaced as HTTP 400 rather than a generic 500. */
class BadRequestError extends Error {}

/** Exact GET routes shared with the stdio MCP server (see readOnlyTools). */
const readOnlyRoutes = new Map(readOnlyTools.map((tool) => [tool.route, tool.run]));

/** Shared run/refresh options from a POST body. */
function runOptionsFromBody(body: Record<string, unknown>): {
  framework?: FocusedRunFramework;
  cwd?: string;
  rawRunPath?: string;
  refreshReport?: boolean;
} {
  if (body.framework !== undefined && !isFocusedRunFramework(body.framework)) {
    throw new BadRequestError(
      `Unsupported framework "${String(body.framework)}". Expected one of: ${FOCUSED_RUN_FRAMEWORKS.join(" | ")}.`,
    );
  }
  return {
    framework: isFocusedRunFramework(body.framework) ? body.framework : undefined,
    cwd: typeof body.cwd === "string" ? body.cwd : undefined,
    rawRunPath: typeof body.rawRunPath === "string" ? body.rawRunPath : undefined,
    refreshReport: typeof body.refreshReport === "boolean" ? body.refreshReport : undefined,
  };
}

/** Parse the repeatable filter query params (?status=&tag=&sourceFile=). */
function parseFilters(params: URLSearchParams): ScenarioIndexFilters {
  const statuses = params.getAll("status");
  const tags = params.getAll("tag");
  const sourceFiles = params.getAll("sourceFile");
  return {
    statuses: statuses.length ? (statuses as ScenarioIndexFilters["statuses"]) : undefined,
    tags: tags.length ? tags : undefined,
    sourceFiles: sourceFiles.length ? sourceFiles : undefined,
  };
}

export function createHttpServer(options: HttpServerOptions = {}): http.Server {
  return http.createServer(async (request, response) => {
    try {
      if (!request.url) {
        sendJson(response, 404, { error: "Missing URL" });
        return;
      }

      const url = new URL(request.url, "http://localhost");
      const reportPath = url.searchParams.get("reportPath") ?? options.reportPath;

      if (request.method === "GET" && url.pathname === "/health") {
        sendJson(response, 200, { ok: true, name: "executable-stories-mcp" });
        return;
      }

      // Diff compares two reports, so it resolves before the single-report load.
      if (request.method === "GET" && url.pathname === "/diff") {
        const baseline = loadStoryReport(
          resolveReportPath(url.searchParams.get("baseline") ?? undefined),
        );
        const current = loadStoryReport(
          resolveReportPath(url.searchParams.get("current") ?? reportPath ?? undefined),
        );
        sendJson(response, 200, getBehaviorDiff(baseline, current));
        return;
      }

      if (request.method === "GET") {
        const report = loadStoryReport(resolveReportPath(reportPath));

        // Arg-taking routes resolve before the no-arg catalog and the dynamic
        // /scenarios/:id route.
        if (url.pathname === "/trajectory") {
          const reset = url.searchParams.get("reset") === "true";
          sendJson(response, 200, getTrajectory(report, { reset }));
          return;
        }
        if (url.pathname === "/loop-status") {
          const baselineParam = url.searchParams.get("baseline");
          sendJson(
            response,
            200,
            getLoopStatus(report, {
              baseline: baselineParam
                ? loadStoryReport(resolveReportPath(baselineParam))
                : undefined,
            }),
          );
          return;
        }
        if (url.pathname === "/scenarios") {
          sendJson(response, 200, listScenarios(report, parseFilters(url.searchParams)));
          return;
        }
        if (url.pathname === "/scenarios/covering") {
          sendJson(response, 200, getScenariosForPaths(report, url.searchParams.getAll("path")));
          return;
        }

        // Exact catalog routes resolve before the dynamic /scenarios/:id route,
        // so /scenarios/failing keeps working as a fixed endpoint.
        const handler = readOnlyRoutes.get(url.pathname);
        if (handler) {
          sendJson(response, 200, handler(report));
          return;
        }
        if (url.pathname.startsWith("/scenarios/")) {
          const id = decodeURIComponent(url.pathname.slice("/scenarios/".length));
          const scenario = getScenario(report, id);
          sendJson(response, scenario ? 200 : 404, scenario ?? { error: `Scenario not found: ${id}` });
          return;
        }
      }

      if (request.method === "POST" && url.pathname === "/run-scenario") {
        const body = await readJsonBody(request);
        const resolvedReportPath = resolveReportPath(reportPath);
        const outcome = await runScenarioById({
          report: loadStoryReport(resolvedReportPath),
          reportPath: resolvedReportPath,
          idOrTitle: String(body.idOrTitle),
          ...runOptionsFromBody(body),
        });
        // A failed scenario is business data, not a transport error — always 200
        // with the structured outcome (consistent with /run-scenarios and
        // /run-changed). `outcome.ok` carries the pass/fail. A genuine lookup
        // miss is reported in `outcome.error`.
        sendJson(response, 200, outcome);
        return;
      }

      if (request.method === "POST" && url.pathname === "/run-scenarios") {
        const body = await readJsonBody(request);
        const resolvedReportPath = resolveReportPath(reportPath);
        const outcomes = await runScenarios({
          report: loadStoryReport(resolvedReportPath),
          reportPath: resolvedReportPath,
          idsOrTitles: Array.isArray(body.idsOrTitles) ? body.idsOrTitles.map(String) : [],
          ...runOptionsFromBody(body),
        });
        sendJson(response, 200, { outcomes });
        return;
      }

      if (request.method === "POST" && url.pathname === "/run-changed") {
        const body = await readJsonBody(request);
        const resolvedReportPath = resolveReportPath(reportPath);
        const result = await runChanged({
          report: loadStoryReport(resolvedReportPath),
          reportPath: resolvedReportPath,
          paths: Array.isArray(body.paths) ? body.paths.map(String) : [],
          ...runOptionsFromBody(body),
        });
        sendJson(response, 200, result);
        return;
      }

      sendJson(response, 404, { error: "Not found" });
    } catch (error) {
      const status = error instanceof BadRequestError ? 400 : 500;
      sendJson(response, status, { error: (error as Error).message });
    }
  });
}

export async function startHttpServer(options: HttpServerOptions = {}): Promise<http.Server> {
  const server = createHttpServer(options);
  const port = options.port ?? 7357;
  const host = options.host ?? "127.0.0.1";
  await new Promise<void>((resolve) => {
    server.listen(port, host, resolve);
  });
  return server;
}

function sendJson(response: http.ServerResponse, statusCode: number, value: unknown): void {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
  });
  response.end(JSON.stringify(value, null, 2));
}

async function readJsonBody(request: http.IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}") as Record<string, unknown>;
}
