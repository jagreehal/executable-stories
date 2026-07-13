import { afterEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { Server } from "node:http";
import type { StoryReport } from "executable-stories-formatters";

import { createHttpServer } from "../src/http.js";

describe("HTTP server", () => {
  let server: Server | undefined;

  afterEach(async () => {
    if (server) {
      await new Promise<void>((resolve) => server?.close(() => resolve()));
      server = undefined;
    }
  });

  it("serves health and StoryReport read endpoints", async () => {
    const reportPath = writeReport(createReport());
    server = createHttpServer({ reportPath });
    const baseUrl = await listen(server);

    expect(await getJson(`${baseUrl}/health`)).toEqual({
      ok: true,
      name: "executable-stories-mcp",
    });

    const scenarios = (await getJson(`${baseUrl}/scenarios`)) as Array<{ id: string }>;
    expect(scenarios).toHaveLength(1);
    expect(scenarios[0].id).toBe("scenario-pass");

    const index = (await getJson(`${baseUrl}/scenario-index`)) as { scenarios: unknown[] };
    expect(index.scenarios).toHaveLength(1);

    const manifest = (await getJson(`${baseUrl}/manifest`)) as { summary: { total: number } };
    expect(manifest.summary.total).toBe(1);

    const filtered = (await getJson(`${baseUrl}/scenarios?status=failed`)) as unknown[];
    expect(filtered).toHaveLength(0);

    const covering = (await getJson(`${baseUrl}/scenarios/covering?path=src/auth/login.ts`)) as Array<{
      id: string;
    }>;
    expect(covering.map((s) => s.id)).toEqual(["scenario-pass"]);
  });
});

async function listen(server: Server): Promise<string> {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Expected TCP address");
  return `http://127.0.0.1:${address.port}`;
}

async function getJson(url: string): Promise<unknown> {
  const response = await fetch(url);
  expect(response.ok).toBe(true);
  return response.json();
}

function writeReport(report: StoryReport): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "es-mcp-http-"));
  const reportPath = path.join(dir, "story-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report), "utf8");
  return reportPath;
}

function createReport(): StoryReport {
  return {
    schemaVersion: "1.0",
    runId: "run-1",
    startedAtMs: 1,
    finishedAtMs: 2,
    durationMs: 1,
    projectRoot: "/repo",
    summary: { total: 1, passed: 1, failed: 0, skipped: 0, pending: 0, durationMs: 1 },
    features: [
      {
        id: "feature-auth",
        title: "Auth",
        sourceFile: "src/auth.story.test.ts",
        summary: { total: 1, passed: 1, failed: 0, skipped: 0, pending: 0, durationMs: 1 },
        scenarios: [
          {
            id: "scenario-pass",
            title: "Login succeeds",
            status: "passed",
            durationMs: 1,
            tags: ["auth"],
            covers: ["src/auth/**"],
            retry: 0,
            retries: 0,
            docEntries: [],
            steps: [],
            attachments: [],
          },
        ],
      },
    ],
  };
}
