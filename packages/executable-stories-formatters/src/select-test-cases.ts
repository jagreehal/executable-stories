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

export function selectTestCases(
  args: SelectTestCasesArgs,
  deps: SelectTestCasesDeps
): TestCaseResult[] {
  const include = args.include ?? [];
  const exclude = args.exclude ?? [];
  const includeTags = args.includeTags ?? [];
  const excludeTags = args.excludeTags ?? [];
  const sortMode = args.sortTestCases ?? "none";

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
