import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { canonicalizeRun } from "executable-stories-core/converters/acl/index";
import { toStoryReport } from "executable-stories-core/converters/story-report";
import { listScenarios } from "../../src/list-scenarios";
import type { RawRun } from "executable-stories-core/types/raw";
import { validateStoryReport } from "../../src/validation/story-report-validator";

const examplesDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../schemas/examples",
);

const fixtures = ["go", "rust", "pytest", "junit5", "dotnet"] as const;

describe("cross-language RawRun parity", () => {
  for (const name of fixtures) {
    it(`${name}.json canonicalizes to valid StoryReport v1 and JSON index`, () => {
      const raw = JSON.parse(
        readFileSync(resolve(examplesDir, `${name}.json`), "utf8"),
      ) as RawRun;

      const canonical = canonicalizeRun(raw);
      expect(canonical.testCases.length).toBeGreaterThan(0);

      const report = toStoryReport(canonical);
      const validation = validateStoryReport(report);
      expect(validation.valid).toBe(true);
      expect(report.features.length).toBeGreaterThan(0);

      const indexJson = listScenarios(
        { testCases: canonical.testCases, format: "json" },
        {},
      );
      const index = JSON.parse(indexJson) as Array<Record<string, unknown>>;
      expect(index.length).toBeGreaterThan(0);
      expect(index[0]).toHaveProperty("steps");
      expect(index[0]).toHaveProperty("docKinds");
      expect(index[0]).toHaveProperty("covers");
      expect(index[0].covers).toEqual(["src/auth/login.*"]);
    });
  }
});
