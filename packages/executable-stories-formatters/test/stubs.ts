/**
 * Test stub factories for executable-stories-formatters.
 *
 * Uses factory pattern with override support for flexible test data creation.
 */

import { faker } from "@faker-js/faker";
import type { StoryMeta, StoryStep, DocEntry } from "../src/types/story";
import type {
  RawRun,
  RawTestCase,
  TestRunResult,
  TestCaseResult,
  TestStatus,
  CoverageSummary,
} from "../src/index";

// ============================================================================
// Seed for reproducible tests
// ============================================================================

/**
 * Set faker seed for reproducible test data.
 */
export function setFakerSeed(seed: number): void {
  faker.seed(seed);
}

// ============================================================================
// Step Stubs
// ============================================================================

/**
 * Create a story step.
 */
export function createStep(overrides: Partial<StoryStep> = {}): StoryStep {
  return {
    keyword: faker.helpers.arrayElement(["Given", "When", "Then", "And", "But"]) as StoryStep["keyword"],
    text: faker.lorem.sentence(),
    ...overrides,
  };
}

/**
 * Create a set of BDD steps (Given, When, Then).
 */
export function createBddSteps(): StoryStep[] {
  return [
    { keyword: "Given", text: faker.lorem.sentence() },
    { keyword: "When", text: faker.lorem.sentence() },
    { keyword: "Then", text: faker.lorem.sentence() },
  ];
}

// ============================================================================
// Doc Entry Stubs
// ============================================================================

/**
 * Create a note doc entry.
 */
export function createNoteEntry(overrides: Partial<DocEntry & { kind: "note" }> = {}): DocEntry {
  return {
    kind: "note",
    phase: "static",
    text: faker.lorem.sentence(),
    ...overrides,
  } as DocEntry;
}

/**
 * Create a code doc entry.
 */
export function createCodeEntry(overrides: Partial<DocEntry & { kind: "code" }> = {}): DocEntry {
  return {
    kind: "code",
    phase: "runtime",
    lang: "typescript",
    content: `const x = ${faker.number.int({ min: 1, max: 100 })};`,
    ...overrides,
  } as DocEntry;
}

// ============================================================================
// Story Meta Stubs
// ============================================================================

/**
 * Create a story meta object.
 */
export function createStoryMeta(overrides: Partial<StoryMeta> = {}): StoryMeta {
  return {
    scenario: faker.lorem.sentence(),
    steps: createBddSteps(),
    tags: [faker.word.noun(), faker.word.noun()],
    tickets: [`JIRA-${faker.number.int({ min: 100, max: 999 })}`],
    suitePath: [faker.word.noun()],
    sourceOrder: faker.number.int({ min: 1, max: 100 }),
    ...overrides,
  };
}

// ============================================================================
// Raw Test Case Stubs
// ============================================================================

/**
 * Create a raw test case.
 */
export function createRawTestCase(overrides: Partial<RawTestCase> = {}): RawTestCase {
  const story = overrides.story ?? createStoryMeta();
  return {
    title: story.scenario,
    titlePath: story.suitePath ? [...story.suitePath, story.scenario] : [story.scenario],
    story,
    sourceFile: `src/${faker.word.noun()}/${faker.word.noun()}.test.ts`,
    sourceLine: faker.number.int({ min: 1, max: 200 }),
    status: "pass",
    durationMs: faker.number.int({ min: 10, max: 500 }),
    ...overrides,
  };
}

/**
 * Create a passing raw test case.
 */
export function createPassingRawTestCase(overrides: Partial<RawTestCase> = {}): RawTestCase {
  return createRawTestCase({
    status: "pass",
    ...overrides,
  });
}

/**
 * Create a failing raw test case.
 */
export function createFailingRawTestCase(overrides: Partial<RawTestCase> = {}): RawTestCase {
  return createRawTestCase({
    status: "fail",
    error: {
      message: `Expected ${faker.word.noun()} to equal ${faker.word.noun()}`,
      stack: `Error: Expected value\n    at ${faker.system.filePath()}:${faker.number.int({ min: 1, max: 100 })}`,
    },
    ...overrides,
  });
}

/**
 * Create a skipped raw test case.
 */
export function createSkippedRawTestCase(overrides: Partial<RawTestCase> = {}): RawTestCase {
  return createRawTestCase({
    status: "skip",
    durationMs: 0,
    ...overrides,
  });
}

// ============================================================================
// Raw Run Stubs
// ============================================================================

/**
 * Create a raw run.
 */
export function createRawRun(overrides: Partial<RawRun> = {}): RawRun {
  const startedAtMs = faker.date.recent().getTime();
  return {
    testCases: [createRawTestCase()],
    startedAtMs,
    finishedAtMs: startedAtMs + faker.number.int({ min: 100, max: 5000 }),
    projectRoot: "/project",
    packageVersion: `${faker.number.int({ min: 1, max: 5 })}.${faker.number.int({ min: 0, max: 9 })}.${faker.number.int({ min: 0, max: 9 })}`,
    gitSha: faker.git.commitSha(),
    ...overrides,
  };
}

/**
 * Create a raw run with multiple test cases.
 */
export function createMultiTestCaseRun(count: number = 3, overrides: Partial<RawRun> = {}): RawRun {
  const testCases = Array.from({ length: count }, () => createRawTestCase());
  return createRawRun({
    testCases,
    ...overrides,
  });
}

/**
 * Create a raw run with mixed statuses.
 */
export function createMixedStatusRun(overrides: Partial<RawRun> = {}): RawRun {
  return createRawRun({
    testCases: [
      createPassingRawTestCase(),
      createFailingRawTestCase(),
      createSkippedRawTestCase(),
    ],
    ...overrides,
  });
}

/**
 * Create a raw run with multiple source files.
 */
export function createMultiFileRun(fileCount: number = 2, testsPerFile: number = 2): RawRun {
  const testCases: RawTestCase[] = [];
  for (let i = 0; i < fileCount; i++) {
    const sourceFile = `src/features/feature-${i + 1}.test.ts`;
    for (let j = 0; j < testsPerFile; j++) {
      testCases.push(
        createRawTestCase({
          sourceFile,
          story: createStoryMeta({
            scenario: `Scenario ${j + 1} of file ${i + 1}`,
            suitePath: [`Feature ${i + 1}`],
            sourceOrder: j + 1,
          }),
        })
      );
    }
  }
  return createRawRun({ testCases });
}

// ============================================================================
// Canonical Test Case Stubs
// ============================================================================

/**
 * Create a canonical test case result.
 */
export function createTestCaseResult(overrides: Partial<TestCaseResult> = {}): TestCaseResult {
  const story = overrides.story ?? createStoryMeta();
  const status: TestStatus = (overrides.status as TestStatus) ?? "passed";
  return {
    id: faker.string.hexadecimal({ length: 12, casing: "lower" }).slice(2),
    story,
    sourceFile: `src/${faker.word.noun()}.test.ts`,
    sourceLine: faker.number.int({ min: 1, max: 200 }),
    status,
    durationMs: faker.number.int({ min: 10, max: 500 }),
    attachments: [],
    stepResults: story.steps.map((_, index) => ({
      index,
      status,
      durationMs: faker.number.int({ min: 1, max: 50 }),
    })),
    titlePath: story.suitePath ?? [],
    retry: 0,
    retries: 0,
    tags: story.tags ?? [],
    ...overrides,
  };
}

// ============================================================================
// Canonical Test Run Stubs
// ============================================================================

/**
 * Create a canonical test run result.
 */
export function createTestRunResult(overrides: Partial<TestRunResult> = {}): TestRunResult {
  const startedAtMs = faker.date.recent().getTime();
  const finishedAtMs = startedAtMs + faker.number.int({ min: 100, max: 5000 });
  return {
    testCases: [createTestCaseResult()],
    startedAtMs,
    finishedAtMs,
    durationMs: finishedAtMs - startedAtMs,
    projectRoot: "/project",
    runId: faker.string.hexadecimal({ length: 16, casing: "lower" }).slice(2),
    packageVersion: `${faker.number.int({ min: 1, max: 5 })}.0.0`,
    gitSha: faker.git.commitSha(),
    ...overrides,
  };
}

/**
 * Create a test run with coverage summary.
 */
export function createTestRunWithCoverage(overrides: Partial<TestRunResult> = {}): TestRunResult {
  const coverage: CoverageSummary = {
    statementsPct: faker.number.int({ min: 60, max: 100 }),
    branchesPct: faker.number.int({ min: 50, max: 95 }),
    functionsPct: faker.number.int({ min: 70, max: 100 }),
    linesPct: faker.number.int({ min: 65, max: 100 }),
  };
  return createTestRunResult({
    coverage,
    ...overrides,
  });
}

// ============================================================================
// Exported Stub Factory Object
// ============================================================================

/**
 * Stub factory object for convenient access to all stub functions.
 */
export const stubs = {
  // Steps
  step: createStep,
  bddSteps: createBddSteps,

  // Doc entries
  noteEntry: createNoteEntry,
  codeEntry: createCodeEntry,

  // Story meta
  storyMeta: createStoryMeta,

  // Raw test cases
  rawTestCase: createRawTestCase,
  passingRawTestCase: createPassingRawTestCase,
  failingRawTestCase: createFailingRawTestCase,
  skippedRawTestCase: createSkippedRawTestCase,

  // Raw runs
  rawRun: createRawRun,
  multiTestCaseRun: createMultiTestCaseRun,
  mixedStatusRun: createMixedStatusRun,
  multiFileRun: createMultiFileRun,

  // Canonical test cases
  testCaseResult: createTestCaseResult,

  // Canonical test runs
  testRunResult: createTestRunResult,
  testRunWithCoverage: createTestRunWithCoverage,

  // Utilities
  setFakerSeed,
};
