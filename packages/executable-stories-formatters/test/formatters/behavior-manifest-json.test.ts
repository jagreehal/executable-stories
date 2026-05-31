import Ajv2020 from "ajv/dist/2020";
import { describe, expect, it } from "vitest";
import * as fs from "node:fs";

import { canonicalizeRun } from "../../src/converters/acl/index";
import {
  BehaviorManifestJsonFormatter,
  toBehaviorManifest,
} from "../../src/formatters/behavior-manifest-json";
import { createMultipleTestCasesRun } from "../fixtures/raw-runs/basic";
import { toStoryReport } from "../../src/converters/story-report";

describe("BehaviorManifestJsonFormatter", () => {
  it("emits schema-valid manifest that matches scenario count", () => {
    const run = canonicalizeRun(createMultipleTestCasesRun());
    const manifest = new BehaviorManifestJsonFormatter().toManifest(run);

    expect(manifest.summary.total).toBe(run.testCases.length);
    expect(manifest.sourceFiles).toHaveLength(1);
    expect(manifest.tags.map((tag) => tag.name)).toContain("auth");
    expect(manifest.debugger.some((issue) => issue.code === "missing-docs")).toBe(true);
    expect(manifest.debugger.some((issue) => issue.code === "missing-covers")).toBe(true);

    const scenarioSchema = JSON.parse(
      fs.readFileSync("schemas/scenario-index-v1.json", "utf8"),
    );
    const manifestSchema = JSON.parse(
      fs.readFileSync("schemas/behavior-manifest-v1.json", "utf8"),
    );
    const ajv = new Ajv2020({ strict: false });
    ajv.addSchema(scenarioSchema, "scenario-index-v1.json");
    const validate = ajv.compile(manifestSchema);
    expect(validate(manifest)).toBe(true);
  });

  it("accepts StoryReport v1 as source", () => {
    const report = toStoryReport(canonicalizeRun(createMultipleTestCasesRun()));

    expect(toBehaviorManifest(report).summary.total).toBe(report.summary.total);
  });
});
