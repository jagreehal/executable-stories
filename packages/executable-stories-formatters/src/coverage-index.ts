import { matchesPattern } from "./select-test-cases";
import type { ScenarioIndex, ScenarioIndexItem } from "./formatters/scenario-index-json";

/** Strip a leading "./" so query paths and covers globs compare on equal footing. */
function normalizePath(path: string): string {
  return path.replace(/^\.\//, "");
}

/**
 * Return scenarios whose declared `covers` globs match any of the given paths.
 * Accepts many paths so callers can pass a whole changed-file list (e.g. a git diff).
 * Results are deduped (filter preserves index order, so each scenario appears once).
 */
export function scenariosCoveringPaths(
  index: ScenarioIndex,
  paths: string[],
): ScenarioIndexItem[] {
  const queries = paths.map(normalizePath);
  return index.scenarios.filter((scenario) =>
    scenario.covers.some((glob) =>
      queries.some((path) => matchesPattern(normalizePath(glob), path)),
    ),
  );
}
