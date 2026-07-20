import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  DEFAULT_RUN_FILES,
  diagnoseRunFile,
  findDefaultRunFile,
  formatDoctorReport,
} from "../src/run-file";

function project(files: Record<string, unknown | string> = {}): string {
  const root = mkdtempSync(path.join(tmpdir(), "es-run-file-"));
  for (const [rel, contents] of Object.entries(files)) {
    const abs = path.join(root, rel);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, typeof contents === "string" ? contents : JSON.stringify(contents));
  }
  return root;
}

const VALID_RUN = {
  schemaVersion: 1,
  projectRoot: "/proj",
  testCases: [
    { title: "a", sourceFile: "a.test.ts", status: "pass", durationMs: 1 },
    { title: "b", sourceFile: "a.test.ts", status: "fail", durationMs: 1 },
  ],
};

function check(root: string, label: string, file?: string) {
  return diagnoseRunFile(file, root).checks.find((c) => c.label === label);
}

describe("findDefaultRunFile", () => {
  it("prefers the non-JS adapter path over the JS reporter path", () => {
    const root = project({
      [DEFAULT_RUN_FILES[0]]: VALID_RUN,
      [DEFAULT_RUN_FILES[1]]: VALID_RUN,
    });
    expect(findDefaultRunFile(root)).toBe(DEFAULT_RUN_FILES[0]);
  });

  it("falls back to the JS reporter path", () => {
    const root = project({ [DEFAULT_RUN_FILES[1]]: VALID_RUN });
    expect(findDefaultRunFile(root)).toBe(DEFAULT_RUN_FILES[1]);
  });

  it("returns undefined when neither exists, so callers can report usage", () => {
    expect(findDefaultRunFile(project())).toBeUndefined();
  });
});

describe("diagnoseRunFile", () => {
  it("reports a healthy run with its status breakdown", () => {
    const root = project({ [DEFAULT_RUN_FILES[0]]: VALID_RUN });
    const report = diagnoseRunFile(undefined, root);
    expect(report.healthy).toBe(true);
    expect(check(root, "schemaVersion")?.status).toBe("ok");
    expect(check(root, "testCases")?.detail).toContain("2 (1 pass, 1 fail)");
  });

  it("fails, with an upgrade fix, when the adapter is NEWER than the CLI", () => {
    // The cross-language drift case: six adapters release independently of the
    // CLI, so this must be a named check rather than a deep validation error.
    const root = project({ [DEFAULT_RUN_FILES[0]]: { ...VALID_RUN, schemaVersion: 2 } });
    const c = check(root, "schemaVersion");
    expect(c?.status).toBe("fail");
    expect(c?.detail).toContain("file is v2, this CLI supports v1");
    expect(c?.fix).toContain("executable-stories-formatters@latest");
    expect(diagnoseRunFile(undefined, root).healthy).toBe(false);
  });

  it("only warns when the adapter is OLDER than the CLI", () => {
    const root = project({ [DEFAULT_RUN_FILES[0]]: { ...VALID_RUN, schemaVersion: 0 } });
    expect(check(root, "schemaVersion")?.status).toBe("warn");
    // A warning must not make the file unhealthy.
    expect(diagnoseRunFile(undefined, root).healthy).toBe(true);
  });

  it("catches a half-written file rather than letting format fail deep", () => {
    const root = project({ [DEFAULT_RUN_FILES[0]]: '{"schemaVersion": 1, "testCa' });
    const report = diagnoseRunFile(undefined, root);
    expect(report.healthy).toBe(false);
    expect(report.checks.find((c) => c.label === "json")?.status).toBe("fail");
  });

  it("distinguishes a missing schemaVersion from a wrong one", () => {
    const root = project({ [DEFAULT_RUN_FILES[0]]: { projectRoot: "/p", testCases: [] } });
    const c = check(root, "schemaVersion");
    expect(c?.status).toBe("fail");
    expect(c?.detail).toBe("missing");
    expect(c?.fix).toContain("--input-type canonical");
  });

  it("warns on an empty run — valid, but the reports will be empty", () => {
    const root = project({ [DEFAULT_RUN_FILES[0]]: { ...VALID_RUN, testCases: [] } });
    expect(check(root, "testCases")?.status).toBe("warn");
    expect(diagnoseRunFile(undefined, root).healthy).toBe(true);
  });

  it("reports a present $schema pointer, and nudges when absent", () => {
    const withPointer = project({
      [DEFAULT_RUN_FILES[0]]: { $schema: "https://executable-stories.dev/schemas/raw-run.schema.json", ...VALID_RUN },
    });
    expect(check(withPointer, "$schema")?.status).toBe("ok");

    const without = project({ [DEFAULT_RUN_FILES[0]]: VALID_RUN });
    expect(check(without, "$schema")?.status).toBe("warn");
  });

  it("fails cleanly when an explicitly-named file does not exist", () => {
    const report = diagnoseRunFile("nope.json", project());
    expect(report.healthy).toBe(false);
    expect(report.checks[0].detail).toContain("does not exist");
  });
});

describe("formatDoctorReport", () => {
  it("shows fixes for problems only, and ends with a verdict", () => {
    const root = project({ [DEFAULT_RUN_FILES[0]]: { ...VALID_RUN, schemaVersion: 2 } });
    const text = formatDoctorReport(diagnoseRunFile(undefined, root));
    expect(text).toContain("✖ schemaVersion");
    expect(text).toContain("→ Your adapter is newer than the CLI");
    expect(text).toContain("Run file has problems");
    // A passing check carries no arrow line.
    expect(text).toMatch(/✔ json\s+parses\n/);
  });
});
