import { describe, it, expect } from "vitest";

import { analyzeSync, projectBehaviours } from "../../src/sync/engine";
import { emptyLockfile, hashCaseBody, setEntry } from "../../src/sync/lockfile";
import {
  buildCoverageJson,
  renderCoverageMarkdown,
  renderCoverageText,
  renderPlan,
} from "../../src/sync/report";
import type { RemoteCase } from "../../src/sync/port";
import { fakeProvider, makeCase, makeRun } from "./helpers";

const config = {};

async function analyze(cases: RemoteCase[] = []) {
  return analyzeSync({
    run: makeRun([makeCase()]),
    provider: fakeProvider({ cases }),
    lockfile: emptyLockfile(),
    config,
  });
}

describe("coverage text", () => {
  it("leads with the counts a QA lead needs", async () => {
    const analysis = await analyze([
      { id: "1", url: "u", title: "User signs in" },
      { id: "2", url: "u", title: "Unrelated admin flow" },
    ]);

    const text = renderCoverageText(analysis);

    expect(text).toContain("Fake project (2 cases)");
    expect(text).toMatch(/1 {2}duplicated/);
    expect(text).toMatch(/1 {2}manual only/);
    expect(text).toMatch(/1 {2}untracked/);
  });

  it("names the section with the most overlap", async () => {
    const analysis = await analyze([
      { id: "1", url: "u", title: "User signs in", section: "Checkout" },
    ]);
    // The duplicate is not bound, so no section is "automated" yet.
    expect(renderCoverageText(analysis)).not.toContain("Biggest overlap");
  });
});

describe("coverage markdown", () => {
  it("puts retirable cases in their own table with a link", async () => {
    const analysis = await analyze([
      { id: "1", url: "https://acme.testrail.io/cases/1", title: "User signs in" },
    ]);

    const markdown = renderCoverageMarkdown(analysis);

    expect(markdown).toContain("## Retire these first");
    expect(markdown).toContain("[1](https://acme.testrail.io/cases/1)");
    expect(markdown).toContain("exact title");
  });

  it("escapes a pipe in a case title so the table survives", async () => {
    const analysis = await analyze([{ id: "1", url: "u", title: "a | b" }]);

    expect(renderCoverageMarkdown(analysis)).toContain("a \\| b");
  });

  it("lists stories that have no case", async () => {
    const analysis = await analyze();

    expect(renderCoverageMarkdown(analysis)).toContain("## Stories with no case");
    expect(renderCoverageMarkdown(analysis)).toContain("User signs in");
  });
});

describe("coverage json", () => {
  it("carries a schema marker and the per-case classification", async () => {
    const analysis = await analyze([{ id: "1", url: "u", title: "User signs in" }]);

    const json = buildCoverageJson(analysis);

    expect(json.schema).toBe("executable-stories/sync-coverage/v1");
    expect(json.cases[0]).toMatchObject({ id: "1", classification: "duplicated" });
    expect(json.untrackedScenarios).toEqual(["User signs in"]);
  });
});

describe("plan", () => {
  it("reads like a terraform plan and says how to apply it", async () => {
    const analysis = await analyze();

    const plan = renderPlan(analysis, { dryRun: true });

    expect(plan).toMatch(/\+ create\s+1 cases/);
    expect(plan).toContain("Run the same command with --apply");
  });

  it("omits the apply hint once the plan has been applied", async () => {
    const analysis = await analyze();

    expect(renderPlan(analysis, { dryRun: false })).not.toContain("--apply to make these changes");
  });

  it("lists every case it refused to overwrite", async () => {
    const run = makeRun([makeCase()]);
    const [behaviour] = projectBehaviours(run, config);
    const lockfile = emptyLockfile();
    setEntry(lockfile, "fake", behaviour!.fingerprint, {
      caseId: "42",
      url: "https://fake/42",
      hash: hashCaseBody(behaviour!.body),
      title: "User signs in",
      owned: true,
    });

    const analysis = await analyzeSync({
      run,
      provider: fakeProvider({
        cases: [
          {
            id: "42",
            url: "https://fake/42",
            title: "User signs in",
            body: { ...behaviour!.body, description: "edited by hand" },
          },
        ],
      }),
      lockfile,
      config,
    });

    const plan = renderPlan(analysis, { dryRun: true });

    expect(plan).toContain("! skipped");
    expect(plan).toContain("Nothing overwrites them.");
    expect(plan).toContain("https://fake/42");
  });

  it("shows the attachment upload size before anything is sent", async () => {
    const attachment = {
      name: "run.webm",
      mediaType: "video/webm",
      body: Buffer.alloc(2048).toString("base64"),
      contentEncoding: "BASE64" as const,
    };
    const run = makeRun([makeCase({ status: "failed", attachments: [attachment] })]);
    const [behaviour] = projectBehaviours(run, config);
    const lockfile = emptyLockfile();
    setEntry(lockfile, "fake", behaviour!.fingerprint, {
      caseId: "42",
      url: "u",
      hash: hashCaseBody(behaviour!.body),
      title: "t",
      owned: true,
    });

    const analysis = await analyzeSync({
      run,
      provider: fakeProvider({ cases: [{ id: "42", url: "u", title: "t", body: behaviour!.body }] }),
      lockfile,
      config,
    });

    expect(renderPlan(analysis, { dryRun: true })).toMatch(/↑ upload\s+1 attachments \(1 video, 2.0 KB\)/);
  });
});
