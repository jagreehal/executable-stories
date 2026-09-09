import type { SortTestCasesMode, Logger } from "./types/options";
import type { TestCaseResult } from "executable-stories-core/types/test-result";

export interface SelectTestCasesArgs {
  testCases: TestCaseResult[];
  include?: string[];
  exclude?: string[];
  includeTags?: string[];
  excludeTags?: string[];
  sortTestCases?: SortTestCasesMode;
}

export interface SelectTestCasesDeps {
  logger: Logger;
}

export function matchesPattern(pattern: string, sourceFile: string): boolean {
  const normalizedPattern = pattern.replace(/\\/g, "/");
  const normalizedFile = sourceFile.replace(/\\/g, "/");

  const regexStr = normalizedPattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "{{GLOBSTAR}}")
    .replace(/\*/g, "[^/]*")
    .replace(/{{GLOBSTAR}}/g, ".*");

  const regex = new RegExp(`^${regexStr}$`);
  return regex.test(normalizedFile);
}

function filterTestCasesByGlobs(
  testCases: TestCaseResult[],
  include: string[],
  exclude: string[],
  logger: Logger
): TestCaseResult[] {
  if (include.length === 0 && exclude.length === 0) return testCases;

  const filtered: TestCaseResult[] = [];
  for (const tc of testCases) {
    const sourceFile = tc.sourceFile.replace(/\\/g, "/");

    if (include.length > 0) {
      const included = include.some((pattern) => matchesPattern(pattern, sourceFile));
      if (!included) continue;
    }

    if (exclude.length > 0) {
      const excluded = exclude.some((pattern) => matchesPattern(pattern, sourceFile));
      if (excluded) continue;
    }

    filtered.push(tc);
  }

  const dropped = testCases.length - filtered.length;
  if (dropped > 0) {
    logger.warn(
      `Filtered ${dropped} test case(s) by include/exclude globs (${filtered.length} included)`
    );
  }

  return filtered;
}

function filterTestCasesByTags(
  testCases: TestCaseResult[],
  includeTags: string[],
  excludeTags: string[],
  logger: Logger
): TestCaseResult[] {
  if (includeTags.length === 0 && excludeTags.length === 0) return testCases;

  const filtered: TestCaseResult[] = [];
  for (const tc of testCases) {
    if (includeTags.length > 0) {
      const included = tc.tags.some((tag) => includeTags.includes(tag));
      if (!included) continue;
    }

    if (excludeTags.length > 0) {
      const excluded = tc.tags.some((tag) => excludeTags.includes(tag));
      if (excluded) continue;
    }

    filtered.push(tc);
  }

  const dropped = testCases.length - filtered.length;
  if (dropped > 0) {
    logger.warn(
      `Filtered ${dropped} test case(s) by include/exclude tags (${filtered.length} included)`
    );
  }

  return filtered;
}

function sortTestCases(
  testCases: TestCaseResult[],
  sortMode: SortTestCasesMode
): TestCaseResult[] {
  if (sortMode === "none") return testCases;

  return [...testCases].sort((a, b) => {
    if (sortMode === "id") {
      return a.id.localeCompare(b.id);
    }

    if (a.sourceFile !== b.sourceFile) {
      return a.sourceFile.localeCompare(b.sourceFile);
    }
    if (a.sourceLine !== b.sourceLine) {
      return a.sourceLine - b.sourceLine;
    }
    if (a.story.scenario !== b.story.scenario) {
      return a.story.scenario.localeCompare(b.story.scenario);
    }
    return a.id.localeCompare(b.id);
  });
}

/**
 * A selector that matches nothing filters nothing, and says so to no one: the
 * run looks filtered, the report is the whole suite, and the usual cause is a
 * path that moved or a tag that was renamed since the flag was written. Name
 * every such selector once, so a stale filter is visible instead of silent.
 */
function warnUnmatchedSelectors(
  testCases: TestCaseResult[],
  selectors: { flag: string; values: string[]; matches: (value: string, tc: TestCaseResult) => boolean }[],
  logger: Logger
): void {
  const unmatched: string[] = [];
  for (const { flag, values, matches } of selectors) {
    for (const value of values) {
      if (!testCases.some((tc) => matches(value, tc))) {
        unmatched.push(`${flag} "${value}"`);
      }
    }
  }
  if (unmatched.length === 0) return;

  logger.warn(
    `${unmatched.length} selector(s) matched no test case and filtered nothing: ${unmatched.join(", ")}. ` +
      `The path or tag each names may have moved or been renamed.`
  );
}

export function selectTestCases(
  args: SelectTestCasesArgs,
  deps: SelectTestCasesDeps
): TestCaseResult[] {
  const include = args.include ?? [];
  const exclude = args.exclude ?? [];
  const includeTags = args.includeTags ?? [];
  const excludeTags = args.excludeTags ?? [];
  const sortMode = args.sortTestCases ?? "none";

  const byGlob = (pattern: string, tc: TestCaseResult) =>
    matchesPattern(pattern, tc.sourceFile.replace(/\\/g, "/"));
  const byTag = (tag: string, tc: TestCaseResult) => tc.tags.includes(tag);
  warnUnmatchedSelectors(
    args.testCases,
    [
      { flag: "--include", values: include, matches: byGlob },
      { flag: "--exclude", values: exclude, matches: byGlob },
      { flag: "--include-tags", values: includeTags, matches: byTag },
      { flag: "--exclude-tags", values: excludeTags, matches: byTag },
    ],
    deps.logger
  );

  let selected = filterTestCasesByGlobs(
    args.testCases,
    include,
    exclude,
    deps.logger
  );

  selected = filterTestCasesByTags(
    selected,
    includeTags,
    excludeTags,
    deps.logger
  );

  return sortTestCases(selected, sortMode);
}
