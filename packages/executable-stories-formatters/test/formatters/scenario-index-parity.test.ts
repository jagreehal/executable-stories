import { describe, expect, it } from "vitest";

import { canonicalizeRun } from "executable-stories-core/converters/acl/canonicalize";
import { toStoryReport } from "executable-stories-core/converters/story-report";
import { listScenarioSummaries } from "executable-stories-core/report-queries";
import { toScenarioIndex } from "../../src/formatters/scenario-index-json";
import { createMultipleTestCasesRun } from "../fixtures/raw-runs/basic";

/**
 * `ScenarioSummary` (core, browser-safe) and `ScenarioIndexItem` (here) answer
 * the same question over two transports: WebMCP tools registered by the HTML
 * report, and the MCP server / scenario-index artifact.
 *
 * They cannot be one type. `hash` comes from `scenarioContentHash`, which is
 * node-only (`node:crypto`), so a browser bundle must not reach it. `hash` is
 * therefore the ONLY licensed difference, and these tests fail the moment a
 * field is added to one side and not the other.
 */
describe("ScenarioSummary / ScenarioIndexItem parity", () => {
  const report = toStoryReport(canonicalizeRun(createMultipleTestCasesRun()));
  const indexItems = toScenarioIndex(report).scenarios;
  const summaries = listScenarioSummaries(report);

  it("covers the same scenarios in the same order", () => {
    expect(summaries.map((s) => s.id)).toEqual(indexItems.map((s) => s.id));
  });

  it("differs by the node-only hash field and nothing else", () => {
    for (const [i, item] of indexItems.entries()) {
      const summary = summaries[i];
      expect(summary).toBeDefined();
      expect(new Set(Object.keys(item))).toEqual(new Set([...Object.keys(summary!), "hash"]));
    }
  });

  it("agrees on the value of every shared field", () => {
    for (const [i, item] of indexItems.entries()) {
      const { hash: _hash, ...withoutHash } = item;
      expect(summaries[i]).toEqual(withoutHash);
    }
  });

  it("applies filters identically", () => {
    for (const filters of [
      { statuses: ["failed"] as const },
      { tags: ["password-reset"] },
      { sourceFiles: ["login.test.ts"] },
      { statuses: ["passed"] as const, tags: ["auth"] },
    ]) {
      expect(listScenarioSummaries(report, { ...filters }).map((s) => s.id)).toEqual(
        toScenarioIndex(report, { ...filters }).scenarios.map((s) => s.id),
      );
    }
  });
});
