/**
 * `executable-stories import-openapi <spec>` — API docs that know whether they
 * are tested.
 *
 * Reads an OpenAPI spec and generates MDX API pages. When a story report is
 * supplied, each endpoint shows a coverage badge: ✓ covered by a passing story,
 * ✕ a verifying story is failing, or ⚠ no test exercises it. Confluence API
 * docs are copy-paste and rot; these connect every endpoint to the tests.
 *
 * Endpoints are linked to stories by matching, against each scenario's tags /
 * id / title, any of: the `operationId`, the `METHOD /path` string, or the
 * `/path`. This works for any language's stories because it reads the canonical
 * story report, not framework internals.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { parse as parseYamlString } from "yaml";

export interface ImportOpenApiOptions {
  specPath: string;
  /** Output directory for generated MDX. Default: "src/content/docs/api". */
  outputDir?: string;
  /** Optional story-report.json to compute coverage. */
  runFile?: string;
  force?: boolean;
}

export interface ImportOpenApiResult {
  outputDir: string;
  pageCount: number;
  endpointCount: number;
  coveredCount: number;
  uncoveredCount: number;
}

type CoverageStatus = "covered" | "failing" | "uncovered";

interface Endpoint {
  method: string;
  path: string;
  operationId?: string;
  summary: string;
  tag: string;
}

interface ScenarioLite {
  id?: string;
  title?: string;
  status?: string;
  tags?: string[];
}

/** A story linked to an endpoint, carried through to the API page so it can
 * deep-link into the Scenario Explorer and show the story's own status. */
interface ApiStoryRef {
  id: string;
  title: string;
  status: string;
}

interface EndpointCoverage {
  endpoint: Endpoint;
  status: CoverageStatus;
  stories: ApiStoryRef[];
}

const HTTP_METHODS = ["get", "post", "put", "patch", "delete", "options", "head"];

function parseYaml(raw: string, specPath: string): Record<string, unknown> {
  try {
    return parseYamlString(raw) as Record<string, unknown>;
  } catch (err) {
    throw new Error(`Could not parse YAML spec ${specPath}: ${(err as Error).message}`, {
      cause: err,
    });
  }
}

function parseSpec(specPath: string): Record<string, unknown> {
  if (!fs.existsSync(specPath)) throw new Error(`Spec not found: ${specPath}`);
  const raw = fs.readFileSync(specPath, "utf8");
  const ext = path.extname(specPath).toLowerCase();

  if (ext === ".json") return JSON.parse(raw) as Record<string, unknown>;
  if (ext === ".yaml" || ext === ".yml") return parseYaml(raw, specPath);

  // Unknown extension — try JSON, then YAML.
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return parseYaml(raw, specPath);
  }
}

export function extractEndpoints(spec: Record<string, unknown>): Endpoint[] {
  const paths = (spec.paths ?? {}) as Record<string, Record<string, unknown>>;
  const endpoints: Endpoint[] = [];

  for (const [route, item] of Object.entries(paths)) {
    if (!item || typeof item !== "object") continue;
    for (const method of HTTP_METHODS) {
      const op = (item as Record<string, unknown>)[method] as
        | Record<string, unknown>
        | undefined;
      if (!op || typeof op !== "object") continue;
      const tags = Array.isArray(op.tags) && op.tags.length > 0 ? (op.tags as string[]) : ["API"];
      endpoints.push({
        method: method.toUpperCase(),
        path: route,
        operationId: typeof op.operationId === "string" ? op.operationId : undefined,
        summary:
          (typeof op.summary === "string" && op.summary) ||
          (typeof op.description === "string" && op.description) ||
          "",
        tag: String(tags[0]),
      });
    }
  }
  return endpoints;
}

function loadScenarios(runFile?: string): ScenarioLite[] {
  if (!runFile) return [];
  if (!fs.existsSync(runFile)) throw new Error(`Run file not found: ${runFile}`);
  const report = JSON.parse(fs.readFileSync(runFile, "utf8")) as {
    features?: Array<{ scenarios?: ScenarioLite[] }>;
  };
  return (report.features ?? []).flatMap((f) => f.scenarios ?? []);
}

/** References an endpoint can be linked by. */
export function endpointRefs(endpoint: Endpoint): string[] {
  const refs = [
    endpoint.operationId,
    `${endpoint.method} ${endpoint.path}`,
    endpoint.path,
  ].filter((r): r is string => Boolean(r));
  return refs;
}

function scenarioMatchesEndpoint(scenario: ScenarioLite, refs: string[]): boolean {
  const tags = scenario.tags ?? [];
  return refs.some(
    (ref) => scenario.id === ref || scenario.title === ref || tags.includes(ref),
  );
}

export function computeCoverage(
  endpoints: Endpoint[],
  scenarios: ScenarioLite[],
): EndpointCoverage[] {
  return endpoints.map((endpoint) => {
    const refs = endpointRefs(endpoint);
    const matched = scenarios.filter((s) => scenarioMatchesEndpoint(s, refs));
    let status: CoverageStatus;
    if (matched.length === 0) status = "uncovered";
    else if (matched.some((s) => s.status === "failed")) status = "failing";
    else status = "covered";
    return {
      endpoint,
      status,
      stories: matched.map((s) => ({
        id: s.id ?? s.title ?? "",
        title: s.title ?? s.id ?? "story",
        status: s.status ?? "passed",
      })),
    };
  });
}

function slug(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "api"
  );
}

/** YAML-escape a single-quoted scalar (frontmatter title/description). */
function yamlQuote(value: string): string {
  return value.replace(/'/g, "''");
}

function coverageSummary(rows: EndpointCoverage[]) {
  return {
    total: rows.length,
    covered: rows.filter((r) => r.status === "covered").length,
    failing: rows.filter((r) => r.status === "failing").length,
    uncovered: rows.filter((r) => r.status === "uncovered").length,
  };
}

/**
 * Render an API tag page as MDX that mounts the <ApiOperations> component
 * (method pills, coverage badges, story links into the Explorer). The endpoint
 * data is serialized as a JSON expression — valid JS inside MDX braces — so the
 * component owns all presentation and the generator owns only the data.
 */
function renderTagPage(tag: string, rows: EndpointCoverage[], hasRun: boolean): string {
  const endpoints = rows.map((r) => ({
    method: r.endpoint.method,
    path: r.endpoint.path,
    summary: r.endpoint.summary || "",
    status: r.status,
    stories: r.stories,
  }));
  const summary = coverageSummary(rows);

  return `---
title: 'API — ${yamlQuote(tag)}'
description: 'Endpoints for ${yamlQuote(tag)}, linked to the stories that exercise them.'
---

import ApiOperations from 'executable-stories-astro/components/ApiOperations.astro';

<ApiOperations
  tag={${JSON.stringify(tag)}}
  hasRun={${hasRun}}
  summary={${JSON.stringify(summary)}}
  endpoints={${JSON.stringify(endpoints)}}
/>
`;
}

function renderIndex(
  groups: Map<string, EndpointCoverage[]>,
  hasRun: boolean,
  totals: { endpointCount: number; coveredCount: number; uncoveredCount: number },
): string {
  const rows = [...groups.entries()]
    .map(([tag, eps]) => {
      const covered = eps.filter((e) => e.status === "covered").length;
      const cov = hasRun ? ` | ${covered}/${eps.length} covered` : "";
      return `- [${tag}](./${slug(tag)}/) — ${eps.length} endpoint(s)${cov}`;
    })
    .join("\n");

  const coverageNote = hasRun
    ? `\n**${totals.coveredCount} of ${totals.endpointCount} endpoints** are covered by a passing story.` +
      (totals.uncoveredCount > 0
        ? ` ⚠ ${totals.uncoveredCount} endpoint(s) have no verifying test.`
        : "")
    : "\nRe-run with `--run <story-report.json>` to show per-endpoint test coverage.";

  return `---
title: 'API reference'
description: 'API endpoints generated from OpenAPI, linked to verifying stories.'
---

${coverageNote}

${rows}
`;
}

export async function importOpenApi(options: ImportOpenApiOptions): Promise<ImportOpenApiResult> {
  const spec = parseSpec(options.specPath);
  const endpoints = extractEndpoints(spec);
  if (endpoints.length === 0) {
    throw new Error(`No endpoints found in ${options.specPath} (expected an OpenAPI "paths" object).`);
  }

  const scenarios = loadScenarios(options.runFile);
  const hasRun = Boolean(options.runFile);
  const coverage = computeCoverage(endpoints, scenarios);

  const groups = new Map<string, EndpointCoverage[]>();
  for (const item of coverage) {
    const list = groups.get(item.endpoint.tag) ?? [];
    list.push(item);
    groups.set(item.endpoint.tag, list);
  }

  const outputDir = options.outputDir ?? path.join("src", "content", "docs", "api");
  if (fs.existsSync(outputDir) && !options.force) {
    const entries = fs.readdirSync(outputDir);
    if (entries.length > 0) {
      throw new Error(`Output directory "${outputDir}" is not empty. Use --force to overwrite.`);
    }
  }
  fs.mkdirSync(outputDir, { recursive: true });

  // Index page
  const coveredCount = coverage.filter((c) => c.status === "covered").length;
  const uncoveredCount = coverage.filter((c) => c.status === "uncovered").length;
  fs.writeFileSync(
    path.join(outputDir, "index.mdx"),
    renderIndex(groups, hasRun, { endpointCount: endpoints.length, coveredCount, uncoveredCount }),
    "utf8",
  );

  // One page per tag group
  for (const [tag, rows] of groups) {
    const dir = path.join(outputDir, slug(tag));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.mdx"), renderTagPage(tag, rows, hasRun), "utf8");
  }

  return {
    outputDir,
    pageCount: groups.size + 1,
    endpointCount: endpoints.length,
    coveredCount,
    uncoveredCount,
  };
}
