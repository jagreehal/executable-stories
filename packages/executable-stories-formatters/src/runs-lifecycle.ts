/**
 * Lifecycle for the per-file reports under `<outputDir>/by-file/`.
 *
 * The directory is plain and visible, so `ls` and `rm` already answer most
 * questions about it. What a listing cannot show is how old each file's results
 * are, and that is the question behind "why does the combined report still say
 * this passes" — the file is right there, its contents are simply from a run
 * three weeks ago.
 *
 * Neither command changes how a report is produced.
 */
import path from "node:path";

import type { TestRunResult } from "executable-stories-core/types/test-result";

import { byFileDirFor } from "./file-reports";

export interface RunsLifecycleDeps {
  readFile: (filePath: string) => string;
  listDir: (dir: string) => string[] | undefined;
  removeFile: (filePath: string) => void;
  logger: { warn(msg: string): void };
}

/** What one test file's report looks like from the outside. */
export interface AccumulatedFile {
  sourceFile: string;
  scenarios: number;
  /** When this file's newest scenario last ran, or undefined if none say. */
  lastRunAtMs?: number;
  lastRunGitSha?: string;
}

export interface RunsStatusReport {
  /** Path of the reports directory, for the reader to go look. */
  directory: string;
  exists: boolean;
  files: AccumulatedFile[];
  totalScenarios: number;
  /** Reports that could not be parsed. Named, never silently skipped. */
  unreadable: string[];
  /** Human-readable rendering, what the CLI prints. */
  text: string;
}

/** Human-readable age. Mirrors the report's own wording. */
function relativeAge(thenMs: number, nowMs: number): string {
  const deltaMs = Math.max(0, nowMs - thenMs);
  const minutes = Math.floor(deltaMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function readFileReports(
  dir: string,
  deps: RunsLifecycleDeps
): { files: AccumulatedFile[]; unreadable: string[]; names: string[] } {
  const names = (deps.listDir(dir) ?? []).filter((n) => n.endsWith(".json")).sort();
  const files: AccumulatedFile[] = [];
  const unreadable: string[] = [];

  for (const name of names) {
    const filePath = path.posix.join(dir, name);
    try {
      const run = JSON.parse(deps.readFile(filePath)) as TestRunResult;
      const testCases = run.testCases ?? [];
      const sourceFile = testCases[0]?.sourceFile;
      if (!sourceFile) {
        unreadable.push(filePath);
        continue;
      }
      const stamps = testCases
        .map((tc) => tc.lastRunAtMs)
        .filter((ms): ms is number => typeof ms === "number");
      files.push({
        sourceFile,
        scenarios: testCases.length,
        ...(stamps.length > 0 ? { lastRunAtMs: Math.max(...stamps) } : {}),
        ...(testCases[0]?.lastRunGitSha ? { lastRunGitSha: testCases[0].lastRunGitSha } : {}),
      });
    } catch {
      unreadable.push(filePath);
    }
  }

  files.sort((a, b) => a.sourceFile.localeCompare(b.sourceFile));
  return { files, unreadable, names };
}

/**
 * What the report would be built from right now: every test file the state
 * holds, how many scenarios each contributes, and how old those results are.
 */
export function runsStatus(
  args: { outputDir: string; nowMs: number },
  deps: RunsLifecycleDeps
): RunsStatusReport {
  const directory = byFileDirFor(args.outputDir);
  const { files, unreadable, names } = readFileReports(directory, deps);
  const exists = names.length > 0 || unreadable.length > 0;
  const totalScenarios = files.reduce((sum, f) => sum + f.scenarios, 0);

  const lines: string[] = [];
  if (!exists) {
    lines.push(
      `No per-file reports in ${directory}.`,
      "Your next test run writes them, one per test source file."
    );
  } else {
    lines.push(`Reports in ${directory}, one per test source file:`, "");
    for (const file of files) {
      const age =
        file.lastRunAtMs === undefined
          ? "age unknown"
          : relativeAge(file.lastRunAtMs, args.nowMs);
      const sha = file.lastRunGitSha ? ` @ ${file.lastRunGitSha.slice(0, 8)}` : "";
      const count = `${file.scenarios} scenario${file.scenarios === 1 ? "" : "s"}`;
      lines.push(`  ${file.sourceFile}  ${count}, last ran ${age}${sha}`);
    }
    lines.push(
      "",
      `${totalScenarios} scenario${totalScenarios === 1 ? "" : "s"} across ${files.length} file${files.length === 1 ? "" : "s"}.`
    );
    if (unreadable.length > 0) {
      lines.push("", "Unreadable, and therefore not in the report:");
      for (const file of unreadable) lines.push(`  ${file}`);
    }
    lines.push(
      "",
      `Combine them with: executable-stories format ${directory} --format html`,
      "Start over with: executable-stories runs reset"
    );
  }

  return { directory, exists, files, totalScenarios, unreadable, text: lines.join("\n") };
}

export interface RunsResetResult {
  directory: string;
  removed: number;
  text: string;
}

/**
 * Delete every per-file report. The next full test run writes them again.
 *
 * Removes only this directory's reports; anything rendered beside it in the
 * output folder is the user's own output and is left alone.
 */
export function runsReset(
  args: { outputDir: string },
  deps: RunsLifecycleDeps
): RunsResetResult {
  const directory = byFileDirFor(args.outputDir);
  const names = (deps.listDir(directory) ?? []).filter((n) => n.endsWith(".json"));

  for (const name of names) deps.removeFile(path.posix.join(directory, name));

  const text =
    names.length === 0
      ? `Nothing to reset: no per-file reports in ${directory}.`
      : `Removed ${names.length} per-file report${names.length === 1 ? "" : "s"} from ${directory}.\n` +
        "Run your full test suite to write them again.";

  return { directory, removed: names.length, text };
}
