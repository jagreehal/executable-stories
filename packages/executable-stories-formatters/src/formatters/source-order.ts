import type { TestCaseResult } from "executable-stories-core";

/**
 * Order two scenarios by where they sit in their source file.
 *
 * `story.sourceOrder` counts `story.init()` calls, so it records the order
 * tests *ran*. Under parallel workers that is not the order they were written:
 * each worker is its own process and restarts the counter at zero, so the
 * numbers both scramble and collide. `sourceLine` comes from the framework's
 * own location for the test and says where it actually is.
 *
 * Scenarios from different files are grouped by file before this runs, so
 * comparing bare line numbers is safe; the file name breaks ties only when a
 * caller sorts across files.
 */
export function bySourcePosition(a: TestCaseResult, b: TestCaseResult): number {
  if (a.sourceLine !== b.sourceLine) return a.sourceLine - b.sourceLine;
  if (a.sourceFile !== b.sourceFile) return a.sourceFile < b.sourceFile ? -1 : 1;
  return (a.story.sourceOrder ?? 0) - (b.story.sourceOrder ?? 0);
}

/** Earliest source line in a group, for ordering the groups themselves. */
export function earliestSourceLine(cases: TestCaseResult[]): number {
  return Math.min(...cases.map((c) => c.sourceLine));
}
