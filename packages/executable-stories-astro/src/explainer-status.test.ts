import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { scenarioContentHash } from "executable-stories-core/explainer";

import { auditExplainerFrontmatter, explainerBannerHtml } from "./explainer-status.js";
import { buildStoryEntries } from "./loader.js";

/** Minimal raw run with one scenario. */
function rawRun(stepText: string, scenario = "User logs in") {
  return {
    schemaVersion: "1.0",
    projectRoot: "/repo",
    startedAtMs: 1000,
    finishedAtMs: 2000,
    testCases: [
      {
        title: scenario,
        sourceFile: "src/login.story.test.ts",
        sourceLine: 1,
        status: "pass",
        story: {
          scenario,
          steps: [{ keyword: "given" as const, text: stepText, status: "pass" }],
        },
      },
    ],
  };
}

describe("auditExplainerFrontmatter", () => {
  let dir: string;
  let runPath: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "es-explainer-"));
    runPath = path.join(dir, "raw-run.json");
  });
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  function writeRun(stepText: string): { id: string; title: string; hash: string } {
    const raw = rawRun(stepText);
    fs.writeFileSync(runPath, JSON.stringify(raw), "utf8");
    const entry = buildStoryEntries(raw, { inputType: "raw" })[0];
    return { id: entry.id, title: entry.title, hash: scenarioContentHash(entry) };
  }

  function frontmatterFor(scenario: { id: string; title: string; hash: string }) {
    return {
      title: "Login explained",
      explainer: {
        version: 1,
        generated: "2026-07-13",
        scenarios: [scenario],
      },
    };
  }

  it("audits fresh and links the scenario's story page", () => {
    const scenario = writeRun("a precondition");
    const audit = auditExplainerFrontmatter(frontmatterFor(scenario), { source: runPath });
    expect(audit?.status).toBe("fresh");
    expect(audit?.scenarios[0].href).toBe("/stories/user-logs-in/");

    const banner = explainerBannerHtml(audit!, "2026-07-13");
    expect(banner).toContain('data-status="fresh"');
    expect(banner).toContain('href="/stories/user-logs-in/"');
    expect(banner).toContain("written 2026-07-13");
  });

  it("flips stale when the cited behaviour changes", () => {
    const scenario = writeRun("a precondition");
    writeRun("a different precondition"); // overwrite the run with drifted content
    const stale = auditExplainerFrontmatter(
      frontmatterFor(scenario),
      { source: runPath },
    );
    // Recompute the ref against the ORIGINAL hash: keep the old hash, new run.
    expect(stale).toBeDefined();
    // The overwritten run changed the step text, so the original hash no longer matches.
    const audit = auditExplainerFrontmatter(frontmatterFor(scenario), { source: runPath });
    expect(audit?.status).toBe("stale");
    expect(audit?.scenarios[0].status).toBe("changed");
    expect(explainerBannerHtml(audit!)).toContain('data-status="stale"');
  });

  it("respects a custom routeBase in deep links", () => {
    const scenario = writeRun("a precondition");
    const audit = auditExplainerFrontmatter(frontmatterFor(scenario), {
      source: runPath,
      routeBase: "/behaviour",
    });
    expect(audit?.scenarios[0].href).toBe("/behaviour/user-logs-in/");
  });

  it("audits against an empty-but-valid run: citations go missing, banner goes stale", () => {
    const scenario = writeRun("a precondition");
    // Every scenario deleted — the run is valid but empty. The explainer must
    // surface as stale, not silently lose its banner.
    fs.writeFileSync(
      runPath,
      JSON.stringify({ ...rawRun("x"), testCases: [] }),
      "utf8",
    );
    const audit = auditExplainerFrontmatter(frontmatterFor(scenario), { source: runPath });
    expect(audit?.status).toBe("stale");
    expect(audit?.scenarios[0].status).toBe("missing");
    expect(explainerBannerHtml(audit!)).toContain('data-status="stale"');
  });

  it("never audits against sampleSource (sample data would fabricate staleness)", () => {
    const scenario = writeRun("a precondition");
    const samplePath = path.join(dir, "sample-run.json");
    fs.renameSync(runPath, samplePath); // real run gone, only the sample remains
    const audit = auditExplainerFrontmatter(frontmatterFor(scenario), {
      source: runPath,
      sampleSource: samplePath,
    });
    expect(audit).toBeUndefined();
  });

  it("returns undefined without an explainer block or without a readable run", () => {
    const scenario = writeRun("a precondition");
    expect(auditExplainerFrontmatter({ title: "Plain doc" }, { source: runPath })).toBeUndefined();
    expect(
      auditExplainerFrontmatter(frontmatterFor(scenario), { source: path.join(dir, "missing.json") }),
    ).toBeUndefined();
  });

  it("escapes scenario titles in the banner", () => {
    const raw = rawRun("a precondition", `<img src=x onerror=alert(1)>`);
    fs.writeFileSync(runPath, JSON.stringify(raw), "utf8");
    const entry = buildStoryEntries(raw, { inputType: "raw" })[0];
    const audit = auditExplainerFrontmatter(
      {
        explainer: {
          version: 1,
          scenarios: [{ id: entry.id, title: entry.title, hash: scenarioContentHash(entry) }],
        },
      },
      { source: runPath },
    );
    const banner = explainerBannerHtml(audit!);
    expect(banner).not.toContain("<img");
    expect(banner).toContain("&lt;img");
  });
});
