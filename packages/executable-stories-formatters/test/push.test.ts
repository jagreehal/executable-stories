/**
 * Tests for the `push` subcommand — fn(args, deps) with injected fetch,
 * file access, and git, so no network or repo is touched.
 */

import { describe, expect, it, vi } from "vitest";

import { repoSlugFromRemote, runPush, type PushDeps } from "../src/push";
import { stubs } from "./stubs";

const STORY_REPORT = {
  schemaVersion: "1.0",
  runId: "r1",
  startedAtMs: 0,
  finishedAtMs: 5,
  durationMs: 5,
  projectRoot: "/repo",
  summary: { total: 0, passed: 0, failed: 0, skipped: 0, pending: 0, durationMs: 5 },
  features: [],
};

function makeDeps(overrides: Partial<PushDeps> = {}) {
  const fetchFn = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ runId: "run-42" }), { status: 201 }),
  );
  const deps: PushDeps = {
    readFile: vi.fn().mockReturnValue(JSON.stringify(STORY_REPORT)),
    fetchFn: fetchFn as unknown as typeof fetch,
    git: vi.fn((args: string[]) => {
      if (args[0] === "config") return "git@github.com:acme/api.git";
      if (args.includes("--abbrev-ref")) return "main";
      return "deadbeef";
    }),
    env: {},
    log: vi.fn(),
    error: vi.fn(),
    ...overrides,
  };
  return { deps, fetchFn };
}

describe("repoSlugFromRemote", () => {
  it("parses ssh and https remotes", () => {
    expect(repoSlugFromRemote("git@github.com:acme/api.git")).toBe("acme/api");
    expect(repoSlugFromRemote("https://github.com/acme/api.git")).toBe("acme/api");
    expect(repoSlugFromRemote("https://gitlab.com/acme/api")).toBe("acme/api");
    expect(repoSlugFromRemote("")).toBeUndefined();
  });
});

describe("runPush", () => {
  it("posts a StoryReport verbatim with git-inferred metadata", async () => {
    const { deps, fetchFn } = makeDeps();
    const code = await runPush(["run.json", "--key", "es_test"], deps);

    expect(code).toBe(0);
    const [url, init] = fetchFn.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe("https://app.executablestories.com/api/v1/runs");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer es_test");
    const payload = JSON.parse(init.body as string);
    expect(payload).toMatchObject({
      repo: "acme/api",
      branch: "main",
      gitSha: "deadbeef",
      source: "serve",
    });
    expect(payload.report.schemaVersion).toBe("1.0");
    expect(deps.log).toHaveBeenCalledWith(expect.stringContaining("run-42"));
  });

  it("converts a raw run through the standard pipeline before pushing", async () => {
    const { deps, fetchFn } = makeDeps({
      readFile: vi.fn().mockReturnValue(JSON.stringify(stubs.rawRun())),
    });
    const code = await runPush(["raw.json", "--key", "es_test"], deps);

    expect(code).toBe(0);
    const [, init] = fetchFn.mock.calls[0] as [URL, RequestInit];
    const payload = JSON.parse(init.body as string);
    expect(payload.report.schemaVersion).toBe("1.0");
    expect(Array.isArray(payload.report.features)).toBe(true);
  });

  it("honours --url, --repo, --branch, --git-sha and the env key", async () => {
    const { deps, fetchFn } = makeDeps({
      env: { EXECUTABLE_STORIES_API_KEY: "es_env" },
    });
    const code = await runPush(
      ["run.json", "--url", "http://localhost:4517", "--repo", "other/repo", "--branch", "b", "--git-sha", "s"],
      deps,
    );

    expect(code).toBe(0);
    const [url, init] = fetchFn.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe("http://localhost:4517/api/v1/runs");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer es_env");
    expect(JSON.parse(init.body as string)).toMatchObject({
      repo: "other/repo",
      branch: "b",
      gitSha: "s",
    });
  });

  it("returns usage errors without touching the network", async () => {
    const noKey = makeDeps();
    expect(await runPush(["run.json"], noKey.deps)).toBe(4);
    expect(noKey.fetchFn).not.toHaveBeenCalled();

    const noRepo = makeDeps({ git: vi.fn(() => undefined) });
    expect(await runPush(["run.json", "--key", "es_test"], noRepo.deps)).toBe(4);

    const noFile = makeDeps();
    expect(await runPush(["--key", "es_test"], noFile.deps)).toBe(4);
  });

  it("surfaces a rejection with status and Retry-After", async () => {
    const { deps } = makeDeps({
      fetchFn: vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { type: "RATE_LIMITED" } }), {
          status: 429,
          headers: { "Retry-After": "60" },
        }),
      ) as unknown as typeof fetch,
    });
    const code = await runPush(["run.json", "--key", "es_test"], deps);

    expect(code).toBe(1);
    expect(deps.error).toHaveBeenCalledWith(expect.stringContaining("429"));
    expect(deps.error).toHaveBeenCalledWith(expect.stringContaining("retry after 60s"));
  });
});
