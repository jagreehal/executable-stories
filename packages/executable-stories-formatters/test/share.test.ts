/**
 * Tests for the `share` subcommand — fn(args, deps) with injected fetch and
 * file access, so no network and no disk are touched.
 */

import { describe, expect, it, vi } from "vitest";

import { contentTypeFor, planAssets, resolveReport, runShare, type ShareDeps } from "../src/share";

const REPORT = {
  schemaVersion: "1.0",
  runId: "r1",
  startedAtMs: 0,
  finishedAtMs: 5,
  durationMs: 5,
  projectRoot: "/repo",
  summary: { total: 1, passed: 1, failed: 0, skipped: 0, pending: 0, durationMs: 5 },
  features: [
    {
      id: "f1",
      name: "Checkout",
      scenarios: [
        {
          id: "f1--s1",
          name: "Buys a hat",
          status: "passed",
          tags: [],
          attachments: [],
          docEntries: [
            { kind: "screenshot", path: "assets/basket.png", phase: "then" },
            { kind: "video", path: "assets/run.webm", phase: "then" },
          ],
          steps: [],
        },
      ],
    },
  ],
};

function makeDeps(overrides: Partial<ShareDeps> = {}) {
  const fetchFn = vi.fn(async (input: URL | string) => {
    const url = String(input);
    if (url.endsWith("/api/v1/shares")) {
      return new Response(
        JSON.stringify({
          id: "sh_abc",
          url: "https://app.executablestories.com/s/sh_abc",
          uploads: [
            { path: "assets/basket.png", url: "https://store.example/put/1" },
            { path: "assets/run.webm", url: "https://store.example/put/2" },
          ],
        }),
        { status: 201 },
      );
    }
    return new Response("{}", { status: 200 });
  });
  const deps: ShareDeps = {
    readFile: vi.fn().mockReturnValue(JSON.stringify(REPORT)),
    readBinary: vi.fn().mockReturnValue(new Uint8Array([1, 2, 3]) as Uint8Array<ArrayBuffer>),
    fileSize: vi.fn().mockReturnValue(1024),
    listDir: vi.fn().mockReturnValue(undefined),
    fetchFn: fetchFn as unknown as typeof fetch,
    env: { EXECUTABLE_STORIES_API_KEY: "es_test" },
    log: vi.fn(),
    error: vi.fn(),
    ...overrides,
  };
  return { deps, fetchFn };
}

function htmlWith(report: unknown): string {
  return `<!DOCTYPE html><html><body><div id="es-report-root"></div><script type="application/json" id="es-report-data">${JSON.stringify(report)}</script></body></html>`;
}

describe("resolveReport", () => {
  it("prefers the HTML report: it is the copy the Share button was clicked on", () => {
    const bundled = { ...REPORT, runId: "from-html" };
    const { deps } = makeDeps({
      listDir: vi.fn().mockReturnValue(["index.html", "index.story-report.json"]),
      readFile: vi.fn((file: string) =>
        file.endsWith(".html") ? htmlWith(bundled) : JSON.stringify(REPORT),
      ),
    });
    const resolved = resolveReport("reports", deps);
    expect(resolved.path).toBe("reports/index.html");
    expect(resolved.report.runId).toBe("from-html");
  });

  it("shares a directory that only has an HTML report in it", () => {
    const { deps } = makeDeps({
      listDir: vi.fn().mockReturnValue(["index.html", "assets"]),
      readFile: vi.fn().mockReturnValue(htmlWith(REPORT)),
    });
    expect(resolveReport("reports", deps).report.runId).toBe("r1");
  });

  it("uses bundled paths from a custom-named HTML report", () => {
    const bundled = structuredClone(REPORT);
    bundled.features[0]!.scenarios[0]!.docEntries[0]!.path = "assets/basket-bundled.png";
    const { deps } = makeDeps({
      listDir: vi.fn().mockReturnValue(["custom.html", "custom.story-report.json"]),
      readFile: vi.fn((file: string) =>
        file.endsWith(".html") ? htmlWith(bundled) : JSON.stringify(REPORT),
      ),
      fileSize: vi.fn((file: string) => file.endsWith("basket-bundled.png") ? 10 : undefined),
    });
    const resolved = resolveReport("reports", deps);
    const { assets } = planAssets(resolved.report, "reports", deps);
    expect(assets.map((asset) => asset.path)).toEqual(["assets/basket-bundled.png"]);
  });

  it("skips an HTML page with no report in it, like a colocated index", () => {
    const { deps } = makeDeps({
      listDir: vi.fn().mockReturnValue(["index.html", "index.story-report.json"]),
      readFile: vi.fn((file: string) =>
        file.endsWith(".html") ? "<html><body>a listing</body></html>" : JSON.stringify(REPORT),
      ),
    });
    expect(resolveReport("reports", deps).path).toBe("reports/index.story-report.json");
  });

  it("prefers index.story-report.json over the other reports beside it", () => {
    const { deps } = makeDeps({
      listDir: vi.fn().mockReturnValue(["a.story-report.json", "index.story-report.json", "raw-run.json"]),
    });
    expect(resolveReport("reports", deps).path).toBe("reports/index.story-report.json");
  });

  it("falls back to a raw run when there is no story report", () => {
    const { deps } = makeDeps({ listDir: vi.fn().mockReturnValue(["raw-run.json"]) });
    const rawRun = { schemaVersion: 1, runId: "raw", testCases: [], startedAtMs: 0, finishedAtMs: 1 };
    vi.mocked(deps.readFile).mockReturnValue(JSON.stringify(rawRun));
    expect(resolveReport("reports", deps).path).toBe("reports/raw-run.json");
  });

  it("says what to run when the directory holds no report", () => {
    const { deps } = makeDeps({ listDir: vi.fn().mockReturnValue(["report.md"]) });
    expect(() => resolveReport("reports", deps)).toThrow(/format/);
  });

  it("takes a file path as given", () => {
    const { deps } = makeDeps();
    expect(resolveReport("reports/index.story-report.json", deps).path).toBe(
      "reports/index.story-report.json",
    );
  });
});

describe("planAssets", () => {
  it("types each asset by extension so video plays and images render", () => {
    const { deps } = makeDeps();
    const { assets, missing } = planAssets(REPORT as never, "reports", deps);
    expect(missing).toEqual([]);
    expect(
      assets.map(({ path, contentType, bytes }) => ({ path, contentType, bytes })),
    ).toEqual([
      { path: "assets/basket.png", contentType: "image/png", bytes: 1024 },
      { path: "assets/run.webm", contentType: "video/webm", bytes: 1024 },
    ]);
  });

  it("reports a missing file instead of counting it", () => {
    const { deps } = makeDeps({
      fileSize: vi.fn((p: string) => (p.endsWith("run.webm") ? undefined : 10)),
    });
    const { assets, missing } = planAssets(REPORT as never, "reports", deps);
    expect(assets.map((a) => a.path)).toEqual(["assets/basket.png"]);
    expect(missing).toEqual(["assets/run.webm"]);
  });

  it("falls back to a generic type for anything unusual", () => {
    expect(contentTypeFor("assets/trace.bin")).toBe("application/octet-stream");
  });
});

describe("runShare", () => {
  it("creates the share, uploads every asset, then publishes it", async () => {
    const { deps, fetchFn } = makeDeps();
    const code = await runShare(["reports"], deps);

    expect(code).toBe(0);
    const calls = fetchFn.mock.calls.map(([input, init]) => ({
      url: String(input),
      method: (init as RequestInit | undefined)?.method,
    }));
    expect(calls).toEqual([
      { url: "https://app.executablestories.com/api/v1/shares", method: "POST" },
      { url: "https://store.example/put/1", method: "PUT" },
      { url: "https://store.example/put/2", method: "PUT" },
      { url: "https://app.executablestories.com/api/v1/shares/sh_abc/complete", method: "POST" },
    ]);
    expect(vi.mocked(deps.log).mock.calls.flat().join("\n")).toContain(
      "https://app.executablestories.com/s/sh_abc",
    );
  });

  it("shares to a link by default and to named people when asked", async () => {
    const { deps, fetchFn } = makeDeps();
    await runShare(["reports"], deps);
    const linkBody = JSON.parse((fetchFn.mock.calls[0]![1] as RequestInit).body as string);
    expect(linkBody.visibility).toBe("link");
    expect(linkBody.expiresInDays).toBe(30);

    const second = makeDeps();
    await runShare(["reports", "--emails", "pm@acme.com, qa@acme.com"], second.deps);
    const emailBody = JSON.parse((second.fetchFn.mock.calls[0]![1] as RequestInit).body as string);
    expect(emailBody.visibility).toBe("emails");
    expect(emailBody.allowedEmails).toEqual(["pm@acme.com", "qa@acme.com"]);
  });

  it("sends the report and its asset manifest, not just the JSON", async () => {
    const { deps, fetchFn } = makeDeps();
    await runShare(["reports"], deps);
    const body = JSON.parse((fetchFn.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.report.runId).toBe("r1");
    expect(body.assets.map((a: { path: string }) => a.path)).toEqual([
      "assets/basket.png",
      "assets/run.webm",
    ]);
  });

  it("does not send this machine's project directory with the report", async () => {
    const { deps, fetchFn } = makeDeps();
    await runShare(["reports"], deps);
    const body = JSON.parse((fetchFn.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.report.projectRoot).toBe("");
  });

  it("explains the free-tier limit in the words the user needs", async () => {
    const { deps } = makeDeps({
      fetchFn: vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { type: "SHARE_LIMIT", limit: 3 } }), { status: 409 }),
      ) as unknown as typeof fetch,
    });
    expect(await runShare(["reports"], deps)).toBe(1);
    expect(vi.mocked(deps.error).mock.calls.flat().join("\n")).toContain("Delete one");
  });

  it("does not publish a share whose upload failed", async () => {
    const fetchFn = vi.fn(async (input: URL | string) => {
      const url = String(input);
      if (url.endsWith("/api/v1/shares")) {
        return new Response(
          JSON.stringify({
            id: "sh_abc",
            url: "https://app/s/sh_abc",
            uploads: [{ path: "assets/basket.png", url: "https://store.example/put/1" }],
          }),
          { status: 201 },
        );
      }
      return new Response("nope", { status: 500 });
    });
    const { deps } = makeDeps({ fetchFn: fetchFn as unknown as typeof fetch });

    expect(await runShare(["reports"], deps)).toBe(1);
    expect(fetchFn.mock.calls.some(([u]) => String(u).endsWith("/complete"))).toBe(false);
  });

  it("asks for a key rather than failing at the wire", async () => {
    const { deps, fetchFn } = makeDeps({ env: {} });
    expect(await runShare(["reports"], deps)).toBe(4);
    expect(fetchFn).not.toHaveBeenCalled();
    expect(vi.mocked(deps.error).mock.calls.flat().join("\n")).toContain("EXECUTABLE_STORIES_API_KEY");
  });

  it("rejects nonsense expiry before uploading anything", async () => {
    const { deps, fetchFn } = makeDeps();
    expect(await runShare(["reports", "--expires-days", "soon"], deps)).toBe(4);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe("asset keys never carry local layout", () => {
  const ABSOLUTE_REPORT = {
    ...REPORT,
    features: [
      {
        ...REPORT.features[0],
        scenarios: [
          {
            ...REPORT.features[0].scenarios[0],
            docEntries: [
              // Playwright videos land outside the report directory, as
              // absolute paths. That is the normal case, not an edge one.
              { kind: "video", path: "/Users/someone/clients/acme/out/run.webm", phase: "then" },
              { kind: "screenshot", path: "assets/basket.png", phase: "then" },
            ],
          },
        ],
      },
    ],
  };

  it("keys an outside-the-report asset by name, not by its path on this machine", () => {
    const { deps } = makeDeps();
    const { assets, keyByPath } = planAssets(ABSOLUTE_REPORT as never, "reports", deps);

    expect(assets.map((a) => a.path)).toEqual(["assets/run.webm", "assets/basket.png"]);
    expect(assets[0]?.localPath).toBe("/Users/someone/clients/acme/out/run.webm");
    expect(keyByPath.get("/Users/someone/clients/acme/out/run.webm")).toBe("assets/run.webm");
  });

  it("uploads a report whose paths point at the share, not at this machine", async () => {
    const { deps, fetchFn } = makeDeps({
      readFile: vi.fn().mockReturnValue(JSON.stringify(ABSOLUTE_REPORT)),
    });
    fetchFn.mockImplementation(async (input: URL | string) => {
      const url = String(input);
      if (url.endsWith("/api/v1/shares")) {
        return new Response(
          JSON.stringify({
            id: "sh_abc",
            url: "https://app.executablestories.com/s/sh_abc",
            uploads: [{ path: "assets/run.webm", url: "https://store.example/put/1" }],
          }),
          { status: 201 },
        );
      }
      return new Response("{}", { status: 200 });
    });

    expect(await runShare(["reports/index.story-report.json"], deps)).toBe(0);

    const body = String(fetchFn.mock.calls[0]?.[1]?.body);
    expect(body).not.toContain("/Users/someone");
    expect(body).toContain("assets/run.webm");
  });

  it("keys a missing asset too, so its path on this machine is not shared", async () => {
    const { deps, fetchFn } = makeDeps({
      readFile: vi.fn().mockReturnValue(JSON.stringify(ABSOLUTE_REPORT)),
      fileSize: vi.fn((file: string) => (file.endsWith("run.webm") ? undefined : 10)),
    });
    fetchFn.mockImplementation(async (input: URL | string) => {
      const url = String(input);
      if (url.endsWith("/api/v1/shares")) {
        return new Response(
          JSON.stringify({
            id: "sh_abc",
            url: "https://app.executablestories.com/s/sh_abc",
            uploads: [{ path: "assets/basket.png", url: "https://store.example/put/1" }],
          }),
          { status: 201 },
        );
      }
      return new Response("{}", { status: 200 });
    });

    expect(await runShare(["reports/index.story-report.json"], deps)).toBe(0);

    const body = String(fetchFn.mock.calls[0]?.[1]?.body);
    expect(body).not.toContain("/Users/someone");
    expect(body).toContain("assets/run.webm");
    expect(JSON.parse(body).assets.map((a: { path: string }) => a.path)).toEqual([
      "assets/basket.png",
    ]);
  });

  it("keeps two assets with the same name apart", () => {
    const { deps } = makeDeps();
    const collided = {
      ...REPORT,
      features: [
        {
          ...REPORT.features[0],
          scenarios: [
            {
              ...REPORT.features[0].scenarios[0],
              docEntries: [
                { kind: "video", path: "/a/run.webm", phase: "then" },
                { kind: "screenshot", path: "/b/run.webm", phase: "then" },
              ],
            },
          ],
        },
      ],
    };
    const { assets } = planAssets(collided as never, "reports", deps);
    expect(assets.map((a) => a.path)).toEqual(["assets/run.webm", "assets/run-2.webm"]);
  });

  it("refuses to read a file the report never offered", async () => {
    const { deps, fetchFn } = makeDeps();
    fetchFn.mockImplementation(async (input: URL | string) => {
      const url = String(input);
      if (url.endsWith("/api/v1/shares")) {
        return new Response(
          JSON.stringify({
            id: "sh_abc",
            url: "https://app.executablestories.com/s/sh_abc",
            uploads: [{ path: "../../../.ssh/id_rsa", url: "https://store.example/put/1" }],
          }),
          { status: 201 },
        );
      }
      return new Response("{}", { status: 200 });
    });

    expect(await runShare(["reports/index.story-report.json"], deps)).toBe(1);
    expect(deps.readBinary).not.toHaveBeenCalled();
    expect(deps.error).toHaveBeenCalledWith(expect.stringContaining("did not offer"));
  });
});
