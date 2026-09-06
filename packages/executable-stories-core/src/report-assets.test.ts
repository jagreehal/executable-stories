import { describe, expect, it } from "vitest";
import { collectReportAssets, rewriteReportAssets } from "./report-assets.js";
import type { ReportDocEntry, StoryReport } from "./types/story-report.js";

function reportWith(
  scenarioEntries: ReportDocEntry[],
  stepEntries: ReportDocEntry[] = [],
): StoryReport {
  return {
    schemaVersion: "1",
    runId: "run-1",
    startedAt: "2026-09-06T00:00:00.000Z",
    finishedAt: "2026-09-06T00:00:01.000Z",
    summary: { total: 1, passed: 1, failed: 0, skipped: 0, pending: 0, unasserted: 0 },
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
            docEntries: scenarioEntries,
            attachments: [],
            steps: [
              {
                id: "f1--s1--0",
                index: 0,
                keyword: "Given",
                text: "a hat",
                status: "passed",
                docEntries: stepEntries,
              },
            ],
          },
        ],
      },
    ],
  } as unknown as StoryReport;
}

describe("collectReportAssets", () => {
  it("finds screenshots, videos, posters and html fragments at every depth", () => {
    const report = reportWith(
      [
        { kind: "screenshot", path: "assets/basket.png", phase: "then" },
        {
          kind: "video",
          path: "assets/run.webm",
          poster: "assets/run.jpg",
          phase: "then",
          children: [{ kind: "screenshot", path: "assets/nested.png", phase: "then" }],
        },
      ] as unknown as ReportDocEntry[],
      [{ kind: "html", path: "assets/invoice.html", phase: "when" }] as unknown as ReportDocEntry[],
    );
    expect(collectReportAssets(report)).toEqual([
      "assets/basket.png",
      "assets/run.webm",
      "assets/run.jpg",
      "assets/nested.png",
      "assets/invoice.html",
    ]);
  });

  it("skips what already resolves anywhere, and repeats nothing", () => {
    const report = reportWith([
      { kind: "screenshot", path: "https://cdn.example.com/a.png", phase: "then" },
      { kind: "html", url: "https://example.com/live", phase: "then" },
      { kind: "screenshot", path: "assets/a.png", phase: "then" },
      { kind: "screenshot", path: "assets/a.png", phase: "then" },
    ] as unknown as ReportDocEntry[]);
    expect(collectReportAssets(report)).toEqual(["assets/a.png"]);
  });
});

describe("rewriteReportAssets", () => {
  it("re-points local paths and leaves the original report untouched", () => {
    const report = reportWith([
      { kind: "video", path: "assets/run.webm", poster: "assets/run.jpg", phase: "then" },
      { kind: "screenshot", path: "https://cdn.example.com/a.png", phase: "then" },
    ] as unknown as ReportDocEntry[]);

    const hosted = rewriteReportAssets(report, (p) => `/s/abc/assets/${p}`);
    const entries = hosted.features[0]!.scenarios[0]!.docEntries as unknown as Array<
      Record<string, string>
    >;
    expect(entries[0]!.path).toBe("/s/abc/assets/assets/run.webm");
    expect(entries[0]!.poster).toBe("/s/abc/assets/assets/run.jpg");
    expect(entries[1]!.path).toBe("https://cdn.example.com/a.png");

    const original = report.features[0]!.scenarios[0]!.docEntries as unknown as Array<
      Record<string, string>
    >;
    expect(original[0]!.path).toBe("assets/run.webm");
  });
});

describe("path classification", () => {
  it("treats a Windows drive letter as a path, not a URL scheme", () => {
    const report = reportWith([
      { kind: "screenshot", path: String.raw`C:\shots\basket.png`, phase: "then" },
      { kind: "video", path: "C:/shots/run.webm", phase: "then" },
    ] as unknown as ReportDocEntry[]);
    expect(collectReportAssets(report)).toEqual([
      String.raw`C:\shots\basket.png`,
      "C:/shots/run.webm",
    ]);
  });

  it("leaves anything that already resolves for a remote viewer alone", () => {
    const report = reportWith([
      { kind: "screenshot", path: "https://cdn.example/a.png", phase: "then" },
      { kind: "screenshot", path: "data:image/png;base64,AAA", phase: "then" },
      { kind: "screenshot", path: "//cdn.example/b.png", phase: "then" },
    ] as unknown as ReportDocEntry[]);
    expect(collectReportAssets(report)).toEqual([]);
  });

  it("collects a POSIX absolute path — it is still a file on this machine", () => {
    const report = reportWith([
      { kind: "video", path: "/var/out/run.webm", phase: "then" },
    ] as unknown as ReportDocEntry[]);
    expect(collectReportAssets(report)).toEqual(["/var/out/run.webm"]);
  });
});
