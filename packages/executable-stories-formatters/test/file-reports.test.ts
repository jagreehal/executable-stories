/**
 * Incremental report state.
 *
 * A filtered run (`vitest run one-file`, `vitest -t "one scenario"`, an MCP
 * `run_scenario` call) reports only what it ran. Without accumulated state the
 * generated report silently shrinks to that subset and every other scenario
 * disappears from the docs.
 *
 * Tested at the public seam: hand `ReportGenerator.generate()` a run and read
 * the files it wrote. The filesystem is injected, so these are behavioural
 * tests, not assertions about how sharding is implemented.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, it, expect, vi } from "vitest";

import { ReportGenerator, type GenerateDeps } from "../src/index";
import type { Logger } from "../src/types/options";
import { stubs } from "./stubs";

/**
 * In-memory filesystem standing in for the real one. Injected at the same
 * boundary `push` already injects (`readFile` / `listDir`), so no internal
 * collaborator is mocked.
 */
function memFs(seed: Record<string, string> = {}) {
  const files = new Map<string, string>(Object.entries(seed));
  const deps: Partial<GenerateDeps> = {
    logger: { warn: vi.fn() } as unknown as Logger,
    writeFile: async (filePath: string, contents: string) => {
      files.set(filePath, contents);
    },
    removeFile: async (filePath: string) => {
      files.delete(filePath);
    },
    readFile: (filePath: string) => {
      const found = files.get(filePath);
      if (found === undefined) throw new Error(`ENOENT: ${filePath}`);
      return found;
    },
    listDir: (dir: string) => {
      const prefix = `${dir}/`;
      const names = [...files.keys()]
        .filter((key) => key.startsWith(prefix))
        .map((key) => key.slice(prefix.length))
        .filter((rest) => !rest.includes("/"));
      return names.length > 0 ? names.sort() : undefined;
    },
  };
  return { files, deps };
}

/**
 * Shard writing creates its directory for real, the same way report writing
 * already does, so the output directory is a temp one rather than a `reports/`
 * folder left behind in the package.
 */
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), "es-by-file-")).replace(/\\/g, "/");

function caseIn(sourceFile: string, scenario: string, id: string) {
  return stubs.testCaseResult({
    id,
    sourceFile,
    story: stubs.storyMeta({ scenario }),
  });
}

describe("incremental report state", () => {
  it("clears every stale report for a file it prunes, not just the expected name", async () => {
    // Removal targeted the filename the current naming scheme computes, so a
    // report written under any other name survived the prune and put its
    // scenarios back into the next combined view.
    const stale = path.posix.join(OUT, "by-file", "legacy-gone.story-report.json");
    const { files, deps } = memFs({
      [stale]: JSON.stringify({
        projectRoot: "/project",
        runId: "old",
        startedAtMs: 1,
        finishedAtMs: 1,
        durationMs: 0,
        testCases: [caseIn("src/gone.test.ts", "gone behaves", "gone-1")],
      }),
    });
    const onDisk = new Set(["/project/src/kept.test.ts"]);

    await new ReportGenerator(
      { formats: ["markdown" as const], outputDir: OUT, outputName: "pruned-all" },
      { ...deps, fileExists: (p: string) => onDisk.has(p) }
    ).generate(
      stubs.testRunResult({
        testCases: [caseIn("src/kept.test.ts", "kept behaves", "kept-1")],
        projectRoot: "/project",
        runScope: "full" as const,
      })
    );

    expect(files.has(stale)).toBe(false);
    const report = files.get(path.posix.join(OUT, "pruned-all.md")) ?? "";
    expect(report).not.toContain("gone behaves");
  });

  it("does not retire scenarios for a file whose run was incomplete", async () => {
    // A hook that throws before the story is declared leaves the file looking
    // as though its scenarios were deleted. Losing documentation because the
    // suite broke is the worst possible moment to delete it.
    const { files, deps } = memFs();
    const options = {
      formats: ["markdown" as const],
      outputDir: OUT,
      outputName: "incomplete",
    };
    const first = caseIn("src/pay.test.ts", "refuses a negative amount", "pay-1");

    await new ReportGenerator(options, deps).generate(
      stubs.testRunResult({
        testCases: [first, caseIn("src/pay.test.ts", "settles a payment", "pay-2")],
        runScope: "full" as const,
      })
    );

    // The rerun claims full coverage, but says this file's collection broke.
    await new ReportGenerator(options, deps).generate(
      stubs.testRunResult({
        testCases: [first],
        runScope: "full" as const,
        incompleteSourceFiles: ["src/pay.test.ts"],
      })
    );

    const report = files.get(path.posix.join(OUT, "incomplete.md")) ?? "";
    expect(report).toContain("settles a payment");

    const warning = (deps.logger!.warn as ReturnType<typeof vi.fn>).mock.calls
      .map((c) => String(c[0]))
      .find((m) => m.includes("src/pay.test.ts"));
    expect(warning).toMatch(/could not collect/i);
    expect(warning).toContain("settles a payment");
  });

  it("clears out an older report claiming the same test file", async () => {
    // Renaming the report file left the previous name behind, so the directory
    // held two reports for one test file and anything reading it whole counted
    // every scenario twice.
    const { files, deps } = memFs({
      [path.posix.join(OUT, "by-file", "legacy-name.story-report.json")]: JSON.stringify({
        projectRoot: "/repo",
        runId: "old",
        startedAtMs: 1,
        finishedAtMs: 1,
        durationMs: 0,
        testCases: [{ ...caseIn("src/pay.test.ts", "refuses a negative amount", "pay-1") }],
      }),
    });

    await new ReportGenerator(
      { formats: ["markdown" as const], outputDir: OUT, outputName: "dedup" },
      deps
    ).generate(
      stubs.testRunResult({
        testCases: [caseIn("src/pay.test.ts", "refuses a negative amount", "pay-1")],
        runScope: "full" as const,
      })
    );

    const forPay = [...files.keys()].filter((k) => k.includes("/by-file/"));
    expect(forPay).toHaveLength(1);
    expect(forPay[0]).not.toContain("legacy-name");
  });

  it("keeps a filtered run from erasing its file's feature declaration", async () => {
    // Scenarios are kept carefully according to scope, but the declaration was
    // replaced outright, so a focused rerun silently dropped the feature title
    // and narrative it never claimed to know about.
    const { files, deps } = memFs();
    const options = {
      formats: ["markdown" as const],
      outputDir: OUT,
      outputName: "decl",
    };
    const first = caseIn("src/pay.test.ts", "refuses a negative amount", "pay-1");

    await new ReportGenerator(options, deps).generate(
      stubs.testRunResult({
        testCases: [first, caseIn("src/pay.test.ts", "settles a payment", "pay-2")],
        runScope: "full" as const,
        features: [
          {
            sourceFile: "src/pay.test.ts",
            title: "Paying an artist",
            kind: "feature" as const,
            narrative: "Why payouts exist.",
          },
        ],
      })
    );

    await new ReportGenerator(options, deps).generate(
      stubs.testRunResult({ testCases: [first], runScope: "filtered" as const })
    );

    const report = files.get(path.posix.join(OUT, "decl.md")) ?? "";
    expect(report).toContain("Paying an artist");
    expect(report).toContain("Why payouts exist.");
  });

  it("keeps two test files with the same name apart", async () => {
    // Flattening a path into a filename can collide (src/a/b vs src/a-b). Each
    // report records the file it came from, so a collision is detectable rather
    // than a silent overwrite of one suite's results by another's.
    const { files, deps } = memFs();
    const options = { formats: ["markdown" as const], outputDir: OUT, outputName: "collide" };

    await new ReportGenerator(options, deps).generate(
      stubs.testRunResult({
        testCases: [
          caseIn("src/a/b.test.ts", "first behaves", "one"),
          caseIn("src/a-b.test.ts", "second behaves", "two"),
        ],
        runScope: "full" as const,
      })
    );

    const reportPaths = [...files.keys()].filter((k) => k.includes("/by-file/"));
    expect(new Set(reportPaths).size).toBe(2);

    const report = files.get(path.posix.join(OUT, "collide.md")) ?? "";
    expect(report).toContain("first behaves");
    expect(report).toContain("second behaves");
  });

  it("keeps scenarios from source files a later filtered run did not cover", async () => {
    const { files, deps } = memFs();
    const options = {
      formats: ["markdown" as const],
      outputDir: OUT,
      outputName: "index",
    };

    const alpha = caseIn("src/alpha.test.ts", "alpha behaves", "alpha-1");
    const beta = caseIn("src/beta.test.ts", "beta behaves", "beta-1");

    // A full run covering both files.
    await new ReportGenerator(options, deps).generate(
      stubs.testRunResult({ testCases: [alpha, beta] })
    );

    // A focused rerun of alpha only, the shape `vitest run alpha` produces.
    await new ReportGenerator(options, deps).generate(
      stubs.testRunResult({ testCases: [alpha] })
    );

    const report = files.get(path.posix.join(OUT, "index.md")) ?? "";
    expect(report).toContain("alpha behaves");
    expect(report).toContain("beta behaves");
  });

  it("keeps sibling scenarios when one scenario in a file reruns, and takes its new result", async () => {
    const { files, deps } = memFs();
    const options = {
      formats: ["markdown" as const],
      outputDir: OUT,
      outputName: "single",
      markdown: { includeStatusIcons: true, includeErrors: true },
    };

    const first = caseIn("src/pay.test.ts", "refuses a negative amount", "pay-1");
    const second = caseIn("src/pay.test.ts", "settles a valid payment", "pay-2");

    await new ReportGenerator(options, deps).generate(
      stubs.testRunResult({ testCases: [first, second] })
    );

    // The shape `vitest -t` and the MCP `run_scenario` tool produce: one
    // scenario out of a file, this time failing. Such a run flags itself as
    // filtered, since it cannot speak for the rest of its file.
    await new ReportGenerator(options, deps).generate(
      stubs.testRunResult({
        runScope: "filtered" as const,
        testCases: [
          { ...first, status: "failed" as const, errorMessage: "amount was -1" },
        ],
      })
    );

    const report = files.get(path.posix.join(OUT, "single.md")) ?? "";
    expect(report).toContain("settles a valid payment");
    expect(report).toContain("amount was -1");
  });

  it("stamps every scenario with the run that last produced it", async () => {
    const { files, deps } = memFs();
    const options = {
      formats: ["story-report-json" as const],
      outputDir: OUT,
      outputName: "stamped",
    };

    const alpha = caseIn("src/alpha.test.ts", "alpha behaves", "alpha-1");
    const beta = caseIn("src/beta.test.ts", "beta behaves", "beta-1");

    const week1 = Date.UTC(2026, 0, 1);
    const week2 = Date.UTC(2026, 0, 8);

    await new ReportGenerator(options, deps).generate(
      stubs.testRunResult({
        testCases: [alpha, beta],
        startedAtMs: week1,
        finishedAtMs: week1,
        gitSha: "1111111",
      })
    );
    await new ReportGenerator(options, deps).generate(
      stubs.testRunResult({
        testCases: [alpha],
        startedAtMs: week2,
        finishedAtMs: week2,
        gitSha: "2222222",
      })
    );

    const report = JSON.parse(
      files.get(path.posix.join(OUT, "stamped.story-report.json")) ?? "{}"
    ) as {
      features: {
        scenarios: {
          title: string;
          lastRunAtMs?: number;
          lastRunGitSha?: string;
        }[];
      }[];
    };
    const scenarios = report.features.flatMap((feature) => feature.scenarios);
    const carried = scenarios.find((s) => s.title === "beta behaves");
    const rerun = scenarios.find((s) => s.title === "alpha behaves");

    // The scenario that actually reran carries the newer run.
    expect(rerun?.lastRunAtMs).toBe(week2);
    expect(rerun?.lastRunGitSha).toBe("2222222");

    // The one carried over from the shard still reports the run that produced
    // it, so the report can say how old this result is rather than implying it
    // is as fresh as the run that rendered it.
    expect(carried?.lastRunAtMs).toBe(week1);
    expect(carried?.lastRunGitSha).toBe("1111111");
  });

  it("empties a file's report when its last scenario is removed but the file stays", async () => {
    // A report's owner was inferred from the scenarios in it, so a file that
    // went from one scenario to zero never appeared in the run at all. The file
    // still existed, so pruning kept it too, and the scenario was immortal.
    // A run that says which files it covered closes that gap.
    const onDisk = new Set(["/project/src/pay.test.ts"]);
    const { files, deps } = memFs();
    const options = {
      formats: ["markdown" as const],
      outputDir: OUT,
      outputName: "emptied",
    };
    const withDisk = { ...deps, fileExists: (p: string) => onDisk.has(p) };

    await new ReportGenerator(options, withDisk).generate(
      stubs.testRunResult({
        testCases: [caseIn("src/pay.test.ts", "refuses a negative amount", "pay-1")],
        projectRoot: "/project",
        runScope: "full" as const,
        coveredSourceFiles: ["src/pay.test.ts"],
      })
    );

    // The file still exists and still ran; its stories were deleted.
    await new ReportGenerator(options, withDisk).generate(
      stubs.testRunResult({
        testCases: [],
        projectRoot: "/project",
        runScope: "full" as const,
        coveredSourceFiles: ["src/pay.test.ts"],
      })
    );

    const report = files.get(path.posix.join(OUT, "emptied.md")) ?? "";
    expect(report).not.toContain("refuses a negative amount");
  });

  it("drops scenarios whose test file has been deleted", async () => {
    // Only alpha survives on disk; beta's file has been deleted since the run
    // that recorded it.
    const onDisk = new Set(["/project/src/alpha.test.ts"]);
    const { files, deps } = memFs();
    const options = {
      formats: ["markdown" as const],
      outputDir: OUT,
      outputName: "pruned",
    };
    const withDisk = { ...deps, fileExists: (p: string) => onDisk.has(p) };

    const alpha = caseIn("src/alpha.test.ts", "alpha behaves", "alpha-1");
    const beta = caseIn("src/beta.test.ts", "beta behaves", "beta-1");

    await new ReportGenerator(options, withDisk).generate(
      stubs.testRunResult({ testCases: [alpha, beta], projectRoot: "/project" })
    );
    await new ReportGenerator(options, withDisk).generate(
      stubs.testRunResult({ testCases: [alpha], projectRoot: "/project" })
    );

    const report = files.get(path.posix.join(OUT, "pruned.md")) ?? "";
    expect(report).toContain("alpha behaves");
    expect(report).not.toContain("beta behaves");
  });

  it("keeps carried-over scenarios when the source tree cannot be resolved", async () => {
    // Nothing resolves on disk, which is what a run whose projectRoot does not
    // match the shard paths looks like. Pruning on that signal would delete the
    // entire accumulated history, so it must not fire.
    const { files, deps } = memFs();
    const options = {
      formats: ["markdown" as const],
      outputDir: OUT,
      outputName: "unresolvable",
    };
    const noDisk = { ...deps, fileExists: () => false };

    const alpha = caseIn("src/alpha.test.ts", "alpha behaves", "alpha-1");
    const beta = caseIn("src/beta.test.ts", "beta behaves", "beta-1");

    await new ReportGenerator(options, noDisk).generate(
      stubs.testRunResult({ testCases: [alpha, beta], projectRoot: "/project" })
    );
    await new ReportGenerator(options, noDisk).generate(
      stubs.testRunResult({ testCases: [alpha], projectRoot: "/project" })
    );

    const report = files.get(path.posix.join(OUT, "unresolvable.md")) ?? "";
    expect(report).toContain("beta behaves");
  });

  it("converges on the same report whether the suite ran at once or a file at a time", async () => {
    const at = Date.UTC(2026, 2, 3);
    const alpha = caseIn("src/alpha.test.ts", "alpha behaves", "alpha-1");
    const beta = caseIn("src/beta.test.ts", "beta behaves", "beta-1");
    const gamma = caseIn("src/gamma.test.ts", "gamma behaves", "gamma-1");

    const runOf = (testCases: typeof alpha[]) =>
      stubs.testRunResult({
        testCases,
        startedAtMs: at,
        finishedAtMs: at,
        durationMs: 0,
        runId: "fixed-run-id",
        gitSha: "abcdef0",
        packageVersion: "1.0.0",
      });

    const render = async (runs: (typeof alpha)[][], outputName: string) => {
      const { files, deps } = memFs();
      for (const testCases of runs) {
        await new ReportGenerator(
          { formats: ["markdown" as const], outputDir: OUT, outputName },
          deps
        ).generate(runOf(testCases));
      }
      return files.get(path.posix.join(OUT, `${outputName}.md`)) ?? "";
    };

    const atOnce = await render([[alpha, beta, gamma]], "at-once");
    // The same three files, one focused run each, in an order that is not the
    // order they will be reported in.
    const fileAtATime = await render([[gamma], [alpha], [beta]], "at-once");

    expect(fileAtATime).toBe(atOnce);
    expect(atOnce).toContain("gamma behaves");
  });

  it("keeps the feature declaration of a file a later run did not cover", async () => {
    const { files, deps } = memFs();
    const options = {
      formats: ["markdown" as const],
      outputDir: OUT,
      outputName: "features",
    };

    const alpha = caseIn("src/alpha.test.ts", "alpha behaves", "alpha-1");
    const beta = caseIn("src/beta.test.ts", "beta behaves", "beta-1");
    const features = [
      {
        sourceFile: "src/alpha.test.ts",
        title: "Alpha capability",
        kind: "feature" as const,
      },
      {
        sourceFile: "src/beta.test.ts",
        title: "Beta capability",
        kind: "feature" as const,
        narrative: "Why beta exists and who it serves.",
      },
    ];

    await new ReportGenerator(options, deps).generate(
      stubs.testRunResult({ testCases: [alpha, beta], features })
    );
    await new ReportGenerator(options, deps).generate(
      stubs.testRunResult({
        testCases: [alpha],
        features: [features[0]!],
      })
    );

    const report = files.get(path.posix.join(OUT, "features.md")) ?? "";
    expect(report).toContain("Beta capability");
    expect(report).toContain("Why beta exists and who it serves.");
  });

  it("writes each test file's report where it can be seen, listed and deleted", async () => {
    // The reports ARE the storage. Nothing hidden, nothing to explain: one file
    // per test file, named after it, in a directory you can ls.
    const { files, deps } = memFs();
    await new ReportGenerator(
      { formats: ["markdown" as const], outputDir: OUT, outputName: "visible" },
      deps
    ).generate(
      stubs.testRunResult({
        testCases: [caseIn("src/alpha.test.ts", "alpha behaves", "alpha-1")],
        runScope: "full" as const,
      })
    );

    const reportPaths = [...files.keys()].filter((k) => k.includes("/by-file/"));
    expect(reportPaths).toHaveLength(1);
    // Named after the test file it belongs to, so the directory listing tells
    // you what is in the report without opening anything. The digest keeps the
    // name a pure function of the source path.
    expect(reportPaths[0]).toMatch(/\/by-file\/src-alpha-[a-z0-9]+\.story-report\.json$/);
    // No hidden directory, so nothing to self-ignore.
    expect([...files.keys()].some((k) => k.includes(".runs"))).toBe(false);
    expect([...files.keys()].some((k) => k.endsWith(".gitignore"))).toBe(false);
  });

  it("drops a scenario that was renamed, when the run covered its whole file", async () => {
    // Scenario ids carry the title, so a rename reads as a new scenario. A run
    // that covered the whole file is authoritative about what is in it, and
    // must not leave the old title standing next to the new one forever.
    const { files, deps } = memFs();
    const options = {
      formats: ["markdown" as const],
      outputDir: OUT,
      outputName: "renamed",
    };

    await new ReportGenerator(options, deps).generate(
      stubs.testRunResult({
        testCases: [caseIn("src/pay.test.ts", "refuses a negatve amount", "pay-typo")],
        runScope: "full" as const,
      })
    );
    await new ReportGenerator(options, deps).generate(
      stubs.testRunResult({
        testCases: [caseIn("src/pay.test.ts", "refuses a negative amount", "pay-fixed")],
        runScope: "full" as const,
      })
    );

    const report = files.get(path.posix.join(OUT, "renamed.md")) ?? "";
    expect(report).toContain("refuses a negative amount");
    expect(report).not.toContain("refuses a negatve amount");
  });

  it("keeps scenarios a run of unknown scope did not report, and says so", async () => {
    // An adapter that cannot see its own filter reports no scope at all. Such a
    // run must not be trusted to retire anything: it fails stale, keeping the
    // scenarios and naming them, rather than deleting on a guess.
    const { files, deps } = memFs();
    const options = {
      formats: ["markdown" as const],
      outputDir: OUT,
      outputName: "unknown-scope",
    };

    const first = caseIn("src/pay.test.ts", "refuses a negative amount", "pay-1");
    const second = caseIn("src/pay.test.ts", "settles a valid payment", "pay-2");

    await new ReportGenerator(options, deps).generate(
      stubs.testRunResult({ testCases: [first, second], runScope: "full" as const })
    );
    await new ReportGenerator(options, deps).generate(
      stubs.testRunResult({ testCases: [first] })
    );

    const report = files.get(path.posix.join(OUT, "unknown-scope.md")) ?? "";
    expect(report).toContain("settles a valid payment");

    const warning = (deps.logger!.warn as ReturnType<typeof vi.fn>).mock.calls
      .map((c) => String(c[0]))
      .find((m) => m.includes("src/pay.test.ts"));
    expect(warning).toContain("settles a valid payment");
    expect(warning).toMatch(/did not report|scope/i);
  });

  it("names the scenarios it removes when an authoritative run drops them", async () => {
    // Deleting is the one destructive act in the pipeline. It leaves evidence
    // naming the file and every scenario removed, so an adapter that wrongly
    // claims full coverage is observable rather than silent.
    const { files, deps } = memFs();
    const options = {
      formats: ["markdown" as const],
      outputDir: OUT,
      outputName: "removal-warned",
    };

    const kept = caseIn("src/pay.test.ts", "refuses a negative amount", "pay-1");
    const dropped = caseIn("src/pay.test.ts", "settles a valid payment", "pay-2");

    await new ReportGenerator(options, deps).generate(
      stubs.testRunResult({ testCases: [kept, dropped], runScope: "full" as const })
    );
    await new ReportGenerator(options, deps).generate(
      stubs.testRunResult({ testCases: [kept], runScope: "full" as const })
    );

    const report = files.get(path.posix.join(OUT, "removal-warned.md")) ?? "";
    expect(report).not.toContain("settles a valid payment");

    const warning = (deps.logger!.warn as ReturnType<typeof vi.fn>).mock.calls
      .map((c) => String(c[0]))
      .find((m) => m.includes("src/pay.test.ts"));
    expect(warning).toContain("settles a valid payment");
    expect(warning).toMatch(/removing|removed/i);
  });

  it("keeps a file's other scenarios when the run says it filtered by name", async () => {
    // The counterpart: a focused run is NOT authoritative about its file, so
    // the scenarios it did not report must survive.
    const { files, deps } = memFs();
    const options = {
      formats: ["markdown" as const],
      outputDir: OUT,
      outputName: "focused",
    };

    const first = caseIn("src/pay.test.ts", "refuses a negative amount", "pay-1");
    const second = caseIn("src/pay.test.ts", "settles a valid payment", "pay-2");

    await new ReportGenerator(options, deps).generate(
      stubs.testRunResult({ testCases: [first, second] })
    );
    await new ReportGenerator(options, deps).generate(
      stubs.testRunResult({ testCases: [first], runScope: "filtered" as const })
    );

    const report = files.get(path.posix.join(OUT, "focused.md")) ?? "";
    expect(report).toContain("settles a valid payment");
  });
});

describe("the report says when it was assembled from several runs", () => {
  it("names the span of runs behind it, and stays quiet for a single run", async () => {
    // A reader handed this file should not have to know about a hidden
    // directory to understand why it holds a scenario that did not just run.
    const single = memFs();
    const options = {
      formats: ["markdown" as const],
      outputDir: OUT,
      outputName: "provenance",
      markdown: { includeMetadata: true },
    };

    const week1 = Date.UTC(2026, 0, 1);
    const week2 = Date.UTC(2026, 0, 8);

    await new ReportGenerator(options, single.deps).generate(
      stubs.testRunResult({
        testCases: [caseIn("src/alpha.test.ts", "alpha behaves", "alpha-1")],
        startedAtMs: week1,
        finishedAtMs: week1,
        runScope: "full" as const,
      })
    );
    // One run in, nothing to disclose.
    expect(single.files.get(path.posix.join(OUT, "provenance.md")) ?? "").not.toMatch(
      /accumulated/i
    );

    await new ReportGenerator(options, single.deps).generate(
      stubs.testRunResult({
        testCases: [caseIn("src/beta.test.ts", "beta behaves", "beta-1")],
        startedAtMs: week2,
        finishedAtMs: week2,
        runScope: "full" as const,
      })
    );

    const report = single.files.get(path.posix.join(OUT, "provenance.md")) ?? "";
    expect(report).toMatch(/accumulated/i);
    expect(report).toContain("2 runs");
  });
});
