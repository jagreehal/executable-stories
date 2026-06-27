import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  extractEndpoints,
  endpointRefs,
  computeCoverage,
  importOpenApi,
} from "../src/import-openapi";

const SPEC = {
  openapi: "3.0.0",
  info: { title: "Pay", version: "1" },
  paths: {
    "/api/transfer": {
      post: { operationId: "createTransfer", summary: "Create a transfer", tags: ["Transfers"] },
    },
    "/api/health": {
      get: { operationId: "health", summary: "Health check", tags: ["Ops"] },
    },
  },
};

describe("extractEndpoints", () => {
  it("flattens paths × methods into endpoints", () => {
    const eps = extractEndpoints(SPEC);
    expect(eps).toHaveLength(2);
    expect(eps[0]).toMatchObject({ method: "POST", path: "/api/transfer", tag: "Transfers" });
  });

  it("defaults the tag to API when none is present", () => {
    const eps = extractEndpoints({ paths: { "/x": { get: {} } } });
    expect(eps[0].tag).toBe("API");
  });
});

describe("endpointRefs", () => {
  it("offers operationId, METHOD path, and path", () => {
    const refs = endpointRefs({ method: "POST", path: "/api/transfer", operationId: "createTransfer", summary: "", tag: "Transfers" });
    expect(refs).toContain("createTransfer");
    expect(refs).toContain("POST /api/transfer");
    expect(refs).toContain("/api/transfer");
  });
});

describe("computeCoverage", () => {
  const endpoints = extractEndpoints(SPEC);

  it("marks an endpoint covered when a passing story matches a ref", () => {
    const cov = computeCoverage(endpoints, [
      { id: "s1", title: "sends money", status: "passed", tags: ["createTransfer"] },
    ]);
    const transfer = cov.find((c) => c.endpoint.path === "/api/transfer")!;
    expect(transfer.status).toBe("covered");
    expect(transfer.stories).toEqual([
      { id: "s1", title: "sends money", status: "passed" },
    ]);
  });

  it("marks failing when a matched story failed", () => {
    const cov = computeCoverage(endpoints, [
      { id: "s1", title: "t", status: "failed", tags: ["createTransfer"] },
    ]);
    expect(cov.find((c) => c.endpoint.path === "/api/transfer")!.status).toBe("failing");
  });

  it("marks uncovered when nothing matches", () => {
    const cov = computeCoverage(endpoints, []);
    expect(cov.every((c) => c.status === "uncovered")).toBe(true);
  });
});

describe("importOpenApi", () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "es-openapi-"));
  });
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("generates an index plus one page per tag with a coverage matrix", async () => {
    const specPath = path.join(dir, "spec.json");
    const runPath = path.join(dir, "run.json");
    const out = path.join(dir, "api");
    fs.writeFileSync(specPath, JSON.stringify(SPEC));
    fs.writeFileSync(
      runPath,
      JSON.stringify({ features: [{ scenarios: [{ id: "s1", title: "sends money", status: "passed", tags: ["createTransfer"] }] }] }),
    );

    const result = await importOpenApi({ specPath, outputDir: out, runFile: runPath });
    expect(result.endpointCount).toBe(2);
    expect(result.coveredCount).toBe(1);
    expect(result.uncoveredCount).toBe(1);
    expect(result.pageCount).toBe(3); // index + Transfers + Ops

    const transfersPage = fs.readFileSync(path.join(out, "transfers", "index.mdx"), "utf8");
    // The page mounts the <ApiOperations> component and passes the endpoint
    // data; presentation (badges, method pills) lives in the component.
    expect(transfersPage).toContain("import ApiOperations from 'executable-stories-astro/components/ApiOperations.astro'");
    expect(transfersPage).toContain("<ApiOperations");
    expect(transfersPage).toContain("hasRun={true}");
    expect(transfersPage).toContain('"status":"covered"');
    // The verifying story is carried with its id so it can deep-link the Explorer.
    expect(transfersPage).toContain('"id":"s1"');
    expect(transfersPage).toContain("sends money");
    expect(fs.existsSync(path.join(out, "index.mdx"))).toBe(true);
  });

  it("works without a run file (docs only, no coverage column)", async () => {
    const specPath = path.join(dir, "spec.json");
    const out = path.join(dir, "api");
    fs.writeFileSync(specPath, JSON.stringify(SPEC));
    const result = await importOpenApi({ specPath, outputDir: out });
    expect(result.coveredCount).toBe(0);
    const page = fs.readFileSync(path.join(out, "transfers", "index.mdx"), "utf8");
    // No run → the component is told there's no coverage to show.
    expect(page).toContain("hasRun={false}");
    expect(page).toContain("<ApiOperations");
  });

  it("parses a YAML spec", async () => {
    const specPath = path.join(dir, "spec.yaml");
    const out = path.join(dir, "api");
    fs.writeFileSync(
      specPath,
      [
        "openapi: 3.0.0",
        "paths:",
        "  /api/transfer:",
        "    post:",
        "      operationId: createTransfer",
        "      summary: Create a transfer",
        "      tags: [Transfers]",
      ].join("\n"),
    );
    const result = await importOpenApi({ specPath, outputDir: out });
    expect(result.endpointCount).toBe(1);
    expect(fs.existsSync(path.join(out, "transfers", "index.mdx"))).toBe(true);
  });

  it("throws on a spec with no endpoints", async () => {
    const specPath = path.join(dir, "empty.json");
    fs.writeFileSync(specPath, JSON.stringify({ openapi: "3.0.0", paths: {} }));
    await expect(importOpenApi({ specPath, outputDir: path.join(dir, "api") })).rejects.toThrow(/No endpoints/);
  });
});
