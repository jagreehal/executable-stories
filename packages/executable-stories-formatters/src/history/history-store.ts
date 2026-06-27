/**
 * History store: load, save, update (fn(args, deps) pattern).
 */

import type { TestRunResult } from "executable-stories-core/types/test-result";
import type { HistoryEntry, HistoryStore, TestHistory } from "./types";

// ============================================================================
// Load
// ============================================================================

export interface LoadHistoryArgs {
  filePath: string;
}

export interface LoadHistoryDeps {
  readFile: (path: string) => string | undefined;
  logger: { warn(msg: string): void };
}

function emptyStore(): HistoryStore {
  return { version: 1, maxRuns: 10, tests: {}, lastUpdated: 0 };
}

export function loadHistory(args: LoadHistoryArgs, deps: LoadHistoryDeps): HistoryStore {
  const content = deps.readFile(args.filePath);
  if (content === undefined) {
    return emptyStore();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    deps.logger.warn(`Failed to parse history file: ${args.filePath}`);
    return emptyStore();
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    (parsed as Record<string, unknown>).version !== 1
  ) {
    deps.logger.warn(
      `Unknown history version in ${args.filePath}, expected version 1`,
    );
    return emptyStore();
  }

  const obj = parsed as Record<string, unknown>;
  if (typeof obj.tests !== "object" || obj.tests === null || Array.isArray(obj.tests)) {
    deps.logger.warn(
      `Malformed history store in ${args.filePath}: tests must be a non-null object`,
    );
    return emptyStore();
  }

  return parsed as HistoryStore;
}

// ============================================================================
// Save
// ============================================================================

export interface SaveHistoryArgs {
  filePath: string;
  store: HistoryStore;
}

export interface SaveHistoryDeps {
  writeFile: (path: string, content: string) => void;
}

export function saveHistory(args: SaveHistoryArgs, deps: SaveHistoryDeps): void {
  deps.writeFile(args.filePath, JSON.stringify(args.store, null, 2));
}

// ============================================================================
// Update (pure function, no deps)
// ============================================================================

export interface UpdateHistoryArgs {
  store: HistoryStore;
  run: TestRunResult;
  maxRuns: number;
}

export function updateHistory(args: UpdateHistoryArgs): HistoryStore {
  const { store, run, maxRuns } = args;
  const newTests: Record<string, TestHistory> = { ...store.tests };

  for (const tc of run.testCases) {
    const entry: HistoryEntry = {
      runId: run.runId,
      timestamp: run.startedAtMs,
      status: tc.status,
      durationMs: tc.durationMs,
      ci: run.ci
        ? {
            provider: undefined,
            branch: run.ci.branch,
            commitSha: run.ci.commitSha,
          }
        : undefined,
    };

    const existing = newTests[tc.id];
    if (existing) {
      const updatedEntries = [...existing.entries, entry];
      // Trim per-test entries to maxRuns (keep latest)
      const trimmed =
        updatedEntries.length > maxRuns
          ? updatedEntries.slice(updatedEntries.length - maxRuns)
          : updatedEntries;
      newTests[tc.id] = {
        ...existing,
        testName: tc.story.scenario,
        sourceFile: tc.sourceFile,
        sourceLine: tc.sourceLine,
        entries: trimmed,
      };
    } else {
      newTests[tc.id] = {
        testId: tc.id,
        testName: tc.story.scenario,
        sourceFile: tc.sourceFile,
        sourceLine: tc.sourceLine,
        entries: [entry],
      };
    }
  }

  return {
    version: 1,
    maxRuns,
    tests: newTests,
    lastUpdated: Date.now(),
  };
}
