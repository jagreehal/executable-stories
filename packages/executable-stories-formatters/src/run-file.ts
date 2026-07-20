/**
 * Where the run JSON lives, and whether it is healthy.
 *
 * Two conventions exist because the adapters reach the CLI differently:
 *   - the non-JS adapters (Go, Ruby, Rust, pytest, JUnit5, xUnit) cannot import
 *     the formatters library, so they write `.executable-stories/raw-run.json`
 *     and hand off to this CLI;
 *   - the JS reporters format in-process and write `reports/raw-run.json` only
 *     when `rawRunPath` is set.
 *
 * Commands resolve these in order when no path is given, which is what makes
 * `executable-stories format` work with no arguments.
 */
import fs from "node:fs";
import path from "node:path";

/** Conventional run-JSON locations, in resolution order. */
export const DEFAULT_RUN_FILES = [".executable-stories/raw-run.json", "reports/raw-run.json"] as const;

/** The highest raw-run schemaVersion this CLI understands. */
export const SUPPORTED_RAW_RUN_SCHEMA = 1;

/** First conventional run file that exists, relative to `cwd`. */
export function findDefaultRunFile(cwd = process.cwd()): string | undefined {
  for (const candidate of DEFAULT_RUN_FILES) {
    if (fs.existsSync(path.resolve(cwd, candidate))) return candidate;
  }
  return undefined;
}

/** One thing `doctor` checked, and how it went. */
export interface DoctorCheck {
  label: string;
  status: "ok" | "warn" | "fail";
  detail: string;
  /** What to do about it — omitted when the check passed. */
  fix?: string;
}

export interface DoctorReport {
  checks: DoctorCheck[];
  /** True when nothing failed (warnings are tolerable). */
  healthy: boolean;
}

/** Human counts pulled off a raw run, for the doctor summary. */
function summarizeCases(testCases: unknown): { total: number; byStatus: Record<string, number> } | undefined {
  if (!Array.isArray(testCases)) return undefined;
  const byStatus: Record<string, number> = {};
  for (const tc of testCases) {
    const status = (tc as { status?: unknown })?.status;
    const key = typeof status === "string" ? status : "unknown";
    byStatus[key] = (byStatus[key] ?? 0) + 1;
  }
  return { total: testCases.length, byStatus };
}

/**
 * Diagnose a run JSON without generating anything: does it exist, is it valid
 * JSON, does its `schemaVersion` match what this CLI supports, and does it
 * actually carry test cases.
 *
 * The schema check is the point of the command. Adapters ship independently of
 * the CLI across six languages, so a newer adapter can emit a shape this CLI
 * cannot read — today that surfaces as a confusing validation error deep in
 * `format`. Here it is a named, actionable check.
 */
export function diagnoseRunFile(file: string | undefined, cwd = process.cwd()): DoctorReport {
  const checks: DoctorCheck[] = [];

  const resolved = file ?? findDefaultRunFile(cwd);
  if (!resolved) {
    checks.push({
      label: "run file",
      status: "fail",
      detail: `not found at ${DEFAULT_RUN_FILES.join(" or ")}`,
      fix: "Run your tests first. Non-JS adapters write .executable-stories/raw-run.json; in a JS reporter set rawRunPath.",
    });
    return { checks, healthy: false };
  }

  const abs = path.resolve(cwd, resolved);
  if (!fs.existsSync(abs)) {
    checks.push({
      label: "run file",
      status: "fail",
      detail: `${resolved} does not exist`,
      fix: "Check the path, or run your tests to produce it.",
    });
    return { checks, healthy: false };
  }

  const stat = fs.statSync(abs);
  checks.push({
    label: "run file",
    status: "ok",
    detail: `${resolved} (${stat.size} bytes, modified ${stat.mtime.toISOString()})`,
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(abs, "utf8"));
  } catch (err) {
    checks.push({
      label: "json",
      status: "fail",
      detail: `not parseable: ${(err as Error).message}`,
      fix: "The file may have been read mid-write. Re-run your tests, then try again.",
    });
    return { checks, healthy: false };
  }
  checks.push({ label: "json", status: "ok", detail: "parses" });

  const obj = parsed as Record<string, unknown>;
  const version = obj.schemaVersion;
  if (version === undefined) {
    checks.push({
      label: "schemaVersion",
      status: "fail",
      detail: "missing",
      fix: `Expected schemaVersion ${SUPPORTED_RAW_RUN_SCHEMA}. Is this a raw run file (not a canonical one)? For canonical input pass --input-type canonical.`,
    });
  } else if (typeof version !== "number") {
    checks.push({
      label: "schemaVersion",
      status: "fail",
      detail: `expected a number, got ${JSON.stringify(version)}`,
      fix: "Regenerate the file with a current adapter.",
    });
  } else if (version > SUPPORTED_RAW_RUN_SCHEMA) {
    // The cross-language drift case: adapter newer than CLI.
    checks.push({
      label: "schemaVersion",
      status: "fail",
      detail: `file is v${version}, this CLI supports v${SUPPORTED_RAW_RUN_SCHEMA}`,
      fix: "Your adapter is newer than the CLI. Upgrade: npm install -D executable-stories-formatters@latest",
    });
  } else if (version < SUPPORTED_RAW_RUN_SCHEMA) {
    checks.push({
      label: "schemaVersion",
      status: "warn",
      detail: `file is v${version}, this CLI supports v${SUPPORTED_RAW_RUN_SCHEMA}`,
      fix: "Older adapter than the CLI — usually fine, but upgrading the adapter keeps the shapes aligned.",
    });
  } else {
    checks.push({ label: "schemaVersion", status: "ok", detail: `v${version}` });
  }

  const summary = summarizeCases(obj.testCases);
  if (!summary) {
    checks.push({
      label: "testCases",
      status: "fail",
      detail: "missing or not an array",
      fix: "The adapter wrote a file with no test cases. Check that its writer ran after the suite finished.",
    });
  } else if (summary.total === 0) {
    checks.push({
      label: "testCases",
      status: "warn",
      detail: "0 test cases — reports will be empty",
      fix: "Did the run filter everything out, or fail before any test executed?",
    });
  } else {
    const breakdown = Object.entries(summary.byStatus)
      .map(([k, v]) => `${v} ${k}`)
      .join(", ");
    checks.push({ label: "testCases", status: "ok", detail: `${summary.total} (${breakdown})` });
  }

  // A $schema pointer is optional, but its presence means editors validate the
  // file as the adapter writes it — worth nudging toward.
  if (typeof obj.$schema === "string") {
    checks.push({ label: "$schema", status: "ok", detail: obj.$schema });
  } else {
    checks.push({
      label: "$schema",
      status: "warn",
      detail: "absent — editors can't validate this file as you write it",
      fix: "Upgrade the adapter: current writers emit a $schema pointer.",
    });
  }

  return { checks, healthy: checks.every((c) => c.status !== "fail") };
}

/** Render a doctor report as aligned terminal lines. */
export function formatDoctorReport(report: DoctorReport): string {
  const icon = { ok: "✔", warn: "!", fail: "✖" } as const;
  const width = Math.max(...report.checks.map((c) => c.label.length));
  const lines = report.checks.map((c) => {
    const head = `${icon[c.status]} ${c.label.padEnd(width)}  ${c.detail}`;
    return c.fix && c.status !== "ok" ? `${head}\n  → ${c.fix}` : head;
  });
  lines.push("", report.healthy ? "Run file looks healthy." : "Run file has problems (see above).");
  return lines.join("\n");
}
