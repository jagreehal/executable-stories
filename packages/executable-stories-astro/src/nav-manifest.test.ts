import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import type { RawTestCase } from "executable-stories-core";
import { describe, expect, it } from "vitest";

import { navFingerprint, navManifestPath, syncNavManifest, toRootPath } from "./nav-manifest.js";

function tc(sourceFile: string, scenario: string, status: "pass" | "fail", order: number): RawTestCase {
  return {
    title: scenario,
    titlePath: [sourceFile, scenario],
    sourceFile,
    sourceLine: order + 1,
    status,
    durationMs: 1,
    story: { scenario, steps: [], suitePath: ["Suite"], tags: [], sourceOrder: order },
  };
}

function run(cases: RawTestCase[]) {
  return { schemaVersion: 1, startedAtMs: 1000, finishedAtMs: 2000, projectRoot: "/proj", testCases: cases };
}

/** A temp project root with a run JSON inside it; returns both paths. */
function project(cases: RawTestCase[]): { root: string; source: string } {
  const root = mkdtempSync(path.join(tmpdir(), "es-nav-manifest-"));
  const source = path.join(root, "raw-run.json");
  writeFileSync(source, JSON.stringify(run(cases)));
  return { root, source };
}

describe("syncNavManifest", () => {
  it("writes the manifest on first sync and reports the change", () => {
    const { root, source } = project([tc("a.test.ts", "logs in", "pass", 0)]);
    expect(syncNavManifest(root, { source })).toBe(true);
    expect(existsSync(navManifestPath(root))).toBe(true);
  });

  it("is a no-op when the nav tree is unchanged (no restart loop on startup)", () => {
    const { root, source } = project([tc("a.test.ts", "logs in", "pass", 0)]);
    expect(syncNavManifest(root, { source })).toBe(true);
    // The integration re-syncs at every config load; same tree -> no write.
    expect(syncNavManifest(root, { source })).toBe(false);
  });

  it("rewrites when a scenario is added, so the sidebar refresh fires", () => {
    const { root, source } = project([tc("a.test.ts", "logs in", "pass", 0)]);
    syncNavManifest(root, { source });
    writeFileSync(
      source,
      JSON.stringify(run([tc("a.test.ts", "logs in", "pass", 0), tc("a.test.ts", "logs out", "pass", 1)])),
    );
    expect(syncNavManifest(root, { source })).toBe(true);
  });

  it("ignores status-only changes — the red/green loop must stay restart-free", () => {
    const { root, source } = project([tc("a.test.ts", "logs in", "pass", 0)]);
    syncNavManifest(root, { source });
    writeFileSync(source, JSON.stringify(run([tc("a.test.ts", "logs in", "fail", 0)])));
    expect(syncNavManifest(root, { source })).toBe(false);
  });

  it("fingerprints an unreadable run JSON as an empty tree without throwing", () => {
    expect(navFingerprint({ source: "/no/such/run.json" })).toBe("[]");
  });
});

describe("toRootPath", () => {
  it("resolves URL, file: string, plain path, and undefined", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "es-root-"));
    expect(toRootPath(pathToFileURL(dir))).toBe(dir);
    expect(toRootPath(pathToFileURL(dir).href)).toBe(dir);
    expect(toRootPath(dir)).toBe(dir);
    expect(toRootPath(undefined)).toBe(process.cwd());
  });
});
