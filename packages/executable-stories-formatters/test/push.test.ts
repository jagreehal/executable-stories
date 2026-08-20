/**
 * Tests for the `push` subcommand — fn(args, deps) with injected fetch,
 * file access, and git, so no network or repo is touched.
 */

import { describe, expect, it, vi } from "vitest";

import { detectFormat, repoSlugFromRemote, runPush, type PushDeps } from "../src/push";
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
    appendFile: vi.fn(),
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

/**
 * A pull_request run on GitHub Actions: the CLI has to take repo/branch/sha
 * from the environment and the base commit from the event payload, because a
 * default depth-1 checkout has no origin/main to diff against.
 */
function makeActionsDeps(overrides: Partial<PushDeps> = {}) {
  const event = {
    pull_request: {
      number: 7,
      html_url: "https://github.com/acme/api/pull/7",
      base: { sha: "base123" },
    },
  };
  return makeDeps({
    env: {
      GITHUB_ACTIONS: "true",
      GITHUB_REPOSITORY: "acme/api",
      GITHUB_HEAD_REF: "feat/checkout",
      GITHUB_REF_NAME: "7/merge",
      GITHUB_SHA: "headsha",
      GITHUB_EVENT_PATH: "/tmp/event.json",
      GITHUB_STEP_SUMMARY: "/tmp/summary.md",
      GITHUB_OUTPUT: "/tmp/output.txt",
    },
    readFile: vi.fn((filePath: string) =>
      filePath === "/tmp/event.json" ? JSON.stringify(event) : JSON.stringify(STORY_REPORT),
    ),
    git: vi.fn((args: string[]) => {
      if (args[0] === "cat-file") return "";
      if (args[0] === "diff") return "src/checkout.ts";
      return "deadbeef";
    }),
    ...overrides,
  });
}

/** Everything the run wrote to one Actions file, as one string. */
function written(deps: PushDeps, filePath: string): string {
  return (deps.appendFile as unknown as { mock: { calls: [string, string][] } }).mock.calls
    .filter(([target]) => target === filePath)
    .map(([, text]) => text)
    .join("");
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
      source: "local",
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

  it("sends changed files when --base is given", async () => {
    const { deps, fetchFn } = makeDeps({
      git: vi.fn((args: string[]) => {
        if (args[0] === "config") return "git@github.com:acme/api.git";
        if (args[0] === "diff") return "src/checkout.ts\nsrc/cart/totals.ts";
        if (args.includes("--abbrev-ref")) return "main";
        return "deadbeef";
      }),
    });
    expect(await runPush(["run.json", "--key", "es_test", "--base", "origin/main"], deps)).toBe(0);
    const [, init] = fetchFn.mock.calls[0] as [URL, RequestInit];
    expect(JSON.parse(init.body as string)).toMatchObject({
      changedFiles: ["src/checkout.ts", "src/cart/totals.ts"],
      baseSha: "deadbeef",
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

  it("prints the run URL and the scope the cloud recommends", async () => {
    const { deps } = makeDeps({
      fetchFn: vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            runId: "run-42",
            url: "https://app.executablestories.com/runs/run-42",
            recommendations: [
              { title: "Customer pays", confidence: "high", reason: "its test file changed" },
            ],
          }),
          { status: 201 },
        ),
      ) as unknown as typeof fetch,
    });
    expect(await runPush(["run.json", "--key", "es_test"], deps)).toBe(0);
    expect(deps.log).toHaveBeenCalledWith("https://app.executablestories.com/runs/run-42");
    expect(deps.log).toHaveBeenCalledWith(expect.stringContaining("Customer pays"));
    expect(deps.log).toHaveBeenCalledWith(expect.stringContaining("its test file changed"));
  });

  it("--gate exits 5 and names every blocking reason", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ runId: "run-42" }), { status: 201 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: "blocked",
            blocking: ["2 cases failed on the latest execution."],
            warnings: ["1 case blocked."],
          }),
          { status: 200 },
        ),
      );
    const { deps } = makeDeps({ fetchFn: fetchFn as unknown as typeof fetch });

    expect(await runPush(["run.json", "--key", "es_test", "--gate"], deps)).toBe(5);
    const [gateUrl] = fetchFn.mock.calls[1] as [URL];
    expect(gateUrl.toString()).toContain("/api/v1/releases/gate?repo=acme%2Fapi&sha=deadbeef");
    expect(deps.error).toHaveBeenCalledWith(expect.stringContaining("BLOCKED"));
    expect(deps.error).toHaveBeenCalledWith(expect.stringContaining("2 cases failed"));
    expect(deps.log).toHaveBeenCalledWith(expect.stringContaining("1 case blocked."));
  });

  it("--gate passes a clear gate and does not fail on a commit with no release", async () => {
    const clear = makeDeps({
      fetchFn: vi
        .fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({ runId: "r" }), { status: 201 }))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ status: "clear", blocking: [] }), { status: 200 }),
        ) as unknown as typeof fetch,
    });
    expect(await runPush(["run.json", "--key", "es_test", "--gate"], clear.deps)).toBe(0);

    const none = makeDeps({
      fetchFn: vi
        .fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({ runId: "r" }), { status: 201 }))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ status: "no-release" }), { status: 200 }),
        ) as unknown as typeof fetch,
    });
    expect(await runPush(["run.json", "--key", "es_test", "--gate"], none.deps)).toBe(0);
    expect(none.deps.log).toHaveBeenCalledWith(expect.stringContaining("nothing to gate on"));
  });

  it("--gate reports an unreachable or erroring gate as a failure, not a pass", async () => {
    const { deps } = makeDeps({
      fetchFn: vi
        .fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({ runId: "r" }), { status: 201 }))
        .mockResolvedValueOnce(new Response("nope", { status: 500 })) as unknown as typeof fetch,
    });
    expect(await runPush(["run.json", "--key", "es_test", "--gate"], deps)).toBe(1);
    expect(deps.error).toHaveBeenCalledWith(expect.stringContaining("500"));
  });

  it("takes repo, branch, sha, base commit and PR from the Actions environment", async () => {
    const { deps, fetchFn } = makeActionsDeps();
    expect(await runPush(["run.json", "--key", "es_test"], deps)).toBe(0);

    const [, init] = fetchFn.mock.calls[0] as [URL, RequestInit];
    expect(JSON.parse(init.body as string)).toMatchObject({
      repo: "acme/api",
      // GITHUB_HEAD_REF, not the synthetic "7/merge" ref.
      branch: "feat/checkout",
      gitSha: "headsha",
      source: "action",
      baseSha: "base123",
      changedFiles: ["src/checkout.ts"],
      prNumber: 7,
      prUrl: "https://github.com/acme/api/pull/7",
    });
    expect(deps.git).toHaveBeenCalledWith(["diff", "--name-only", "base123...HEAD"]);
  });

  it("fetches a base commit a shallow checkout does not have", async () => {
    const { deps } = makeActionsDeps({
      git: vi.fn((args: string[]) => {
        if (args[0] === "cat-file") return undefined; // object missing locally
        if (args[0] === "diff") return "src/checkout.ts";
        return "deadbeef";
      }),
    });
    expect(await runPush(["run.json", "--key", "es_test"], deps)).toBe(0);
    expect(deps.git).toHaveBeenCalledWith(["fetch", "--depth=1", "origin", "base123"]);
  });

  it("writes the run URL, the scope table, and ingest-run-id to the Actions files", async () => {
    const { deps } = makeActionsDeps({
      fetchFn: vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            runId: "run-42",
            url: "https://app.executablestories.com/runs/run-42",
            recommendations: [
              { title: "Pay | refund", confidence: "high", reason: "its test file changed" },
            ],
          }),
          { status: 201 },
        ),
      ) as unknown as typeof fetch,
    });
    expect(await runPush(["run.json", "--key", "es_test"], deps)).toBe(0);

    const summary = written(deps, "/tmp/summary.md");
    expect(summary).toContain("[View this run](https://app.executablestories.com/runs/run-42)");
    expect(summary).toContain("| Confidence | Case | Why |");
    // A raw pipe would end the cell early and shear off the rest of the row.
    expect(summary).toContain("| high | Pay \\| refund | its test file changed |");
    expect(written(deps, "/tmp/output.txt")).toBe("ingest-run-id=run-42\n");
  });

  it("still reports the run id when the gate blocks — the run did ingest", async () => {
    const { deps } = makeActionsDeps({
      fetchFn: vi
        .fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({ runId: "run-42" }), { status: 201 }))
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ status: "blocked", blocking: ["2 cases failed."] }),
            { status: 200 },
          ),
        ) as unknown as typeof fetch,
    });
    expect(await runPush(["run.json", "--key", "es_test", "--gate"], deps)).toBe(5);

    expect(written(deps, "/tmp/output.txt")).toBe("ingest-run-id=run-42\n");
    expect(written(deps, "/tmp/summary.md")).toContain("Release gate: blocked");
    expect(deps.error).toHaveBeenCalledWith("::error::Release gate: 2 cases failed.");
  });

  it("stays out of the Actions files when not running under Actions", async () => {
    const { deps, fetchFn } = makeDeps();
    expect(await runPush(["run.json", "--key", "es_test"], deps)).toBe(0);
    expect(deps.appendFile).not.toHaveBeenCalled();
    const [, init] = fetchFn.mock.calls[0] as [URL, RequestInit];
    expect(JSON.parse(init.body as string).source).toBe("local");
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

describe("detectFormat", () => {
  it("reads XML as JUnit, by content and by extension", () => {
    expect(detectFormat("results.txt", '<?xml version="1.0"?><testsuites/>')).toBe("junit");
    expect(detectFormat("out.XML", "  <testsuite/>")).toBe("junit");
  });

  it("reads a top-level array as Allure results", () => {
    expect(detectFormat("results.json", '[{"name":"t","status":"passed"}]')).toBe("allure");
  });

  it("reads suites-without-schemaVersion as Playwright", () => {
    expect(detectFormat("pw.json", '{"config":{},"suites":[]}')).toBe("playwright");
  });

  it("prefers a declared schemaVersion over any other hint", () => {
    // A StoryReport can legitimately carry a "suites" key one day; the
    // declaration is the authority.
    expect(detectFormat("r.json", '{"schemaVersion":"1.0","suites":[]}')).toBe("story");
  });

  it("falls back to story so the existing pipeline reports the real error", () => {
    expect(detectFormat("junk.json", "not json at all")).toBe("story");
  });
});

describe("push --format and --force", () => {
  it("sends JUnit XML verbatim to the junit endpoint with metadata in the query", async () => {
    const { deps, fetchFn } = makeDeps({
      readFile: vi.fn().mockReturnValue("<testsuites><testsuite/></testsuites>"),
    });
    const code = await runPush(["results.xml", "--key", "es_test"], deps);
    expect(code).toBe(0);
    const [url, init] = fetchFn.mock.calls[0]!;
    expect(String(url)).toContain("/api/v1/runs/junit?");
    expect(String(url)).toContain("repo=acme%2Fapi");
    expect(String(url)).toContain("sha=deadbeef");
    expect((init as RequestInit).headers).toMatchObject({ "Content-Type": "application/xml" });
    // Verbatim: conversion lives on the server so it cannot drift between
    // versions of this CLI in the wild.
    expect((init as RequestInit).body).toBe("<testsuites><testsuite/></testsuites>");
  });

  it("honours an explicit --format over detection", async () => {
    const { deps, fetchFn } = makeDeps({
      readFile: vi.fn().mockReturnValue('[{"name":"t"}]'),
    });
    await runPush(["results.json", "--key", "es_test", "--format", "playwright"], deps);
    expect(String(fetchFn.mock.calls[0]![0])).toContain("/api/v1/runs/playwright?");
  });

  it("rejects an unknown --format instead of guessing", async () => {
    const { deps, fetchFn } = makeDeps();
    expect(await runPush(["r.json", "--key", "es_test", "--format", "nonsense"], deps)).toBe(4);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("still sends StoryReport to the native endpoint", async () => {
    const { deps, fetchFn } = makeDeps();
    await runPush(["report.json", "--key", "es_test"], deps);
    expect(String(fetchFn.mock.calls[0]![0])).toMatch(/\/api\/v1\/runs$/);
  });

  it("--force swallows a rejected push", async () => {
    const { deps } = makeDeps({
      fetchFn: vi.fn().mockResolvedValue(new Response("nope", { status: 500 })) as never,
    });
    expect(await runPush(["report.json", "--key", "es_test", "--force"], deps)).toBe(0);
    const { deps: strict } = makeDeps({
      fetchFn: vi.fn().mockResolvedValue(new Response("nope", { status: 500 })) as never,
    });
    expect(await runPush(["report.json", "--key", "es_test"], strict)).toBe(1);
  });

  it("--force swallows an unreachable endpoint", async () => {
    const { deps } = makeDeps({
      fetchFn: vi.fn().mockRejectedValue(new Error("ECONNREFUSED")) as never,
    });
    expect(await runPush(["report.json", "--key", "es_test", "--force"], deps)).toBe(0);
  });

  it("--force does not forgive a blocked gate", async () => {
    // The wire is forgivable; the verdict is not. A forced push that hid a
    // blocked release would make --gate worthless.
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ runId: "r" }), { status: 201 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: "blocked", blocking: ["policy X"] }), {
          status: 200,
        }),
      );
    const { deps } = makeDeps({ fetchFn: fetchFn as never });
    expect(await runPush(["report.json", "--key", "es_test", "--gate", "--force"], deps)).toBe(5);
  });
});
