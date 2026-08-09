import { describe, it, expect } from "vitest";
import * as path from "node:path";

import { runSyncCommand, type SyncCliDeps } from "../../src/sync/run";
import {
  DEFAULT_LOCKFILE_PATH,
  parseLockfile,
  serializeLockfile,
} from "../../src/sync/lockfile";
import { createRawRun } from "../fixtures/raw-runs/basic";

interface Harness {
  deps: Partial<SyncCliDeps>;
  written: Map<string, string>;
  out: string[];
  err: string[];
  requests: string[];
}

function harness(options: { cases?: unknown[]; env?: Record<string, string | undefined> } = {}): Harness {
  const written = new Map<string, string>();
  const out: string[] = [];
  const err: string[] = [];
  const requests: string[] = [];

  const fetchFn = (async (input: RequestInfo | URL) => {
    const url = String(input);
    requests.push(url);
    if (url.includes("get_cases/")) {
      return new Response(JSON.stringify({ cases: options.cases ?? [] }), { status: 200 });
    }
    if (url.includes("add_case/")) {
      return new Response(JSON.stringify({ id: 501, title: "created" }), { status: 200 });
    }
    if (url.includes("update_case/")) {
      return new Response(JSON.stringify({ id: 501, title: "created" }), { status: 200 });
    }
    if (url.includes("add_run/")) return new Response(JSON.stringify({ id: 9 }), { status: 200 });
    if (url.includes("add_results_for_cases/")) {
      return new Response(JSON.stringify([{ id: 1 }]), { status: 200 });
    }
    return new Response("{}", { status: 200 });
  }) as typeof globalThis.fetch;

  return {
    written,
    out,
    err,
    requests,
    deps: {
      // Every file this command touches goes through these three, so the whole
      // suite runs against the map above and never reaches a disk.
      readFile: (file) => written.get(file) ?? JSON.stringify(createRawRun()),
      fileExists: (file) => written.has(file),
      writeFile: (file, contents) => written.set(file, contents),
      fetchFn,
      env: options.env ?? { TESTRAIL_USERNAME: "qa@acme.test", TESTRAIL_API_KEY: "key" },
      log: (message) => out.push(message),
      error: (message) => err.push(message),
      loadConfigFn: async () => ({
        sync: { testrail: { url: "https://acme.testrail.io", projectId: 1, sectionId: 3 } },
      }),
    },
  };
}

describe("coverage command", () => {
  it("writes both artifacts and prints the summary", async () => {
    const h = harness({
      cases: [{ id: 1, title: "Some manual case", custom_steps_separated: [] }],
    });

    const code = await runSyncCommand("coverage", ["testrail", "run.json"], h.deps);

    expect(code).toBe(0);
    expect([...h.written.keys()]).toEqual([
      path.join("reports", "sync-coverage.testrail.json"),
      path.join("reports", "sync-coverage.testrail.md"),
    ]);
    expect(h.out.join("\n")).toContain("manual only");
  });

  it("never calls a write endpoint", async () => {
    const h = harness();

    await runSyncCommand("coverage", ["testrail", "run.json"], h.deps);

    expect(h.requests.some((url) => url.includes("add_"))).toBe(false);
    expect(h.requests.some((url) => url.includes("update_"))).toBe(false);
  });

  it("explains that a StoryReport is the wrong input", async () => {
    const h = harness();
    h.deps.readFile = () => JSON.stringify({ schemaVersion: "1.0" });

    const code = await runSyncCommand("coverage", ["testrail", "report.json"], h.deps);

    expect(code).toBe(4);
    expect(h.err.join("\n")).toContain("raw run");
  });
});

describe("sync command", () => {
  it("plans without writing when --apply is absent", async () => {
    const h = harness();

    const code = await runSyncCommand("sync", ["testrail", "run.json"], h.deps);

    expect(code).toBe(0);
    expect(h.out.join("\n")).toContain("+ create");
    expect(h.out.join("\n")).toContain("Run the same command with --apply");
    expect(h.requests.some((url) => url.includes("add_case/"))).toBe(false);
  });

  it("creates the case and records the binding under --apply", async () => {
    const h = harness();

    const code = await runSyncCommand("sync", ["testrail", "run.json", "--apply"], h.deps);

    expect(code).toBe(0);
    expect(h.requests.some((url) => url.includes("add_case/"))).toBe(true);

    const lock = parseLockfile(h.written.get(DEFAULT_LOCKFILE_PATH)!, DEFAULT_LOCKFILE_PATH);
    expect(Object.values(lock.providers["testrail"]!)[0]).toMatchObject({
      caseId: "501",
      owned: true,
    });
  });

  it("reads an existing binding rather than creating the case again", async () => {
    const h = harness({
      cases: [{ id: 501, title: "created", custom_steps_separated: [] }],
    });

    // Seed a lockfile, then run against it: the fingerprint is whatever the
    // first run recorded, so take it from there rather than hard-coding a hash.
    await runSyncCommand("sync", ["testrail", "run.json", "--apply"], h.deps);
    h.requests.length = 0;

    const code = await runSyncCommand("sync", ["testrail", "run.json", "--apply"], h.deps);

    expect(code).toBe(0);
    expect(h.requests.some((url) => url.includes("add_case/"))).toBe(false);
  });

  it("keeps the lockfile off disk when the caller injects its own file access", async () => {
    const h = harness();

    await runSyncCommand("sync", ["testrail", "run.json", "--apply"], h.deps);

    // The write went to the injected map, not through node:fs. An embedder with
    // a virtual filesystem gets the binding; nothing is written behind its back.
    expect(h.written.has(DEFAULT_LOCKFILE_PATH)).toBe(true);
    expect(h.written.get(DEFAULT_LOCKFILE_PATH)).toBe(
      serializeLockfile(parseLockfile(h.written.get(DEFAULT_LOCKFILE_PATH)!, "x")),
    );
  });

  it("rejects an unknown provider by name", async () => {
    const h = harness();

    const code = await runSyncCommand("sync", ["zephyr", "run.json"], h.deps);

    expect(code).toBe(4);
    expect(h.err.join("\n")).toContain("Unknown provider");
  });

  it("rejects an attach policy it does not have", async () => {
    const h = harness();

    const code = await runSyncCommand("sync", ["testrail", "run.json", "--attach", "sometimes"], h.deps);

    expect(code).toBe(4);
  });

  it("names the missing environment variable instead of failing on a 401", async () => {
    const h = harness({ env: {} });

    const code = await runSyncCommand("sync", ["testrail", "run.json"], h.deps);

    expect(code).toBe(4);
    expect(h.err.join("\n")).toContain("TESTRAIL_USERNAME");
  });

  it("says how to configure a provider that has no config block", async () => {
    const h = harness();
    h.deps.loadConfigFn = async () => ({});

    const code = await runSyncCommand("sync", ["testrail", "run.json"], h.deps);

    expect(code).toBe(4);
    expect(h.err.join("\n")).toContain("--init");
  });

  it("prints a config template under --init without touching the network", async () => {
    const h = harness();

    const code = await runSyncCommand("sync", ["testrail", "--init"], h.deps);

    expect(code).toBe(0);
    expect(h.out.join("\n")).toContain("TESTRAIL_API_KEY");
    expect(h.requests).toHaveLength(0);
  });

  it("exits non-zero when a write fails", async () => {
    const h = harness();
    h.deps.fetchFn = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("get_cases/")) {
        return new Response(JSON.stringify({ cases: [] }), { status: 200 });
      }
      if (url.includes("add_case/")) {
        return new Response(JSON.stringify({ error: "Field :title is required." }), { status: 400 });
      }
      return new Response("{}", { status: 200 });
    }) as typeof globalThis.fetch;

    const code = await runSyncCommand(
      "sync",
      ["testrail", "run.json", "--apply"],
      h.deps,
    );

    expect(code).toBe(1);
    expect(h.err.join("\n")).toContain("stale system of record");
  });

  it("treats a failed write as advisory under --continue-on-error", async () => {
    const h = harness();
    h.deps.fetchFn = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("get_cases/")) {
        return new Response(JSON.stringify({ cases: [] }), { status: 200 });
      }
      if (url.includes("add_case/")) return new Response("{}", { status: 500 });
      return new Response("{}", { status: 200 });
    }) as typeof globalThis.fetch;

    const code = await runSyncCommand(
      "sync",
      ["testrail", "run.json", "--apply", "--continue-on-error"],
      h.deps,
    );

    expect(code).toBe(0);
  });
});
