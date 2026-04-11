import type {
  TestCaseResult,
  TestRunResult,
  StepResult,
} from "../src/types/test-result";
import type { StoryMeta, StoryStep, DocEntry } from "../src/types/story";

function step(keyword: string, text: string): StoryStep {
  return { keyword: keyword as StoryStep["keyword"], text };
}

function stepResult(
  index: number,
  status: "passed" | "failed" | "skipped" = "passed",
  durationMs = 10,
): StepResult {
  return { index, status, durationMs };
}

export function passedScenario(
  overrides: Partial<TestCaseResult> = {},
): TestCaseResult {
  const story: StoryMeta = {
    scenario: "User logs in with valid credentials",
    steps: [
      step("Given", 'a registered user with email "alice@example.com"'),
      step("When", "the user submits valid credentials"),
      step("Then", "the user should see the dashboard"),
    ],
    tags: ["auth", "smoke"],
    suitePath: ["Authentication"],
    sourceOrder: 1,
  };
  return {
    id: "passed-001",
    story,
    sourceFile: "src/auth/login.test.ts",
    sourceLine: 15,
    status: "passed",
    durationMs: 142,
    attachments: [],
    stepResults: [stepResult(0), stepResult(1), stepResult(2)],
    titlePath: ["Authentication"],
    retry: 0,
    retries: 0,
    tags: ["auth", "smoke"],
    ...overrides,
  };
}

export function failedScenario(
  overrides: Partial<TestCaseResult> = {},
): TestCaseResult {
  const story: StoryMeta = {
    scenario: "User sees error for invalid password",
    steps: [
      step("Given", "a registered user"),
      step("When", "the user submits an invalid password"),
      step("Then", "the user should see an error message"),
    ],
    tags: ["auth"],
    suitePath: ["Authentication"],
    sourceOrder: 2,
  };
  return {
    id: "failed-001",
    story,
    sourceFile: "src/auth/login.test.ts",
    sourceLine: 35,
    status: "failed",
    durationMs: 87,
    errorMessage:
      'Expected "Welcome back" to include "Invalid credentials"',
    errorStack:
      'AssertionError: Expected "Welcome back" to include "Invalid credentials"\n    at src/auth/login.test.ts:42:5',
    attachments: [],
    stepResults: [stepResult(0), stepResult(1), stepResult(2, "failed")],
    titlePath: ["Authentication"],
    retry: 0,
    retries: 0,
    tags: ["auth"],
    ...overrides,
  };
}

export function skippedScenario(
  overrides: Partial<TestCaseResult> = {},
): TestCaseResult {
  const story: StoryMeta = {
    scenario: "User resets password via email",
    steps: [
      step("Given", "a registered user"),
      step("When", "the user requests a password reset"),
      step("Then", "a reset email should be sent"),
    ],
    tags: ["auth", "wip"],
    suitePath: ["Authentication"],
    sourceOrder: 3,
  };
  return {
    id: "skipped-001",
    story,
    sourceFile: "src/auth/password.test.ts",
    sourceLine: 10,
    status: "skipped",
    durationMs: 0,
    attachments: [],
    stepResults: [],
    titlePath: ["Authentication"],
    retry: 0,
    retries: 0,
    tags: ["auth", "wip"],
    ...overrides,
  };
}

export function scenarioWithDocs(
  overrides: Partial<TestCaseResult> = {},
): TestCaseResult {
  const docs: DocEntry[] = [
    {
      kind: "note",
      phase: "static",
      text: "This test verifies the calculator API",
    },
    {
      kind: "code",
      phase: "runtime",
      lang: "typescript",
      content: 'const result = add(2, 3);\nexpect(result).toBe(5);',
      label: "Implementation",
    },
    {
      kind: "kv",
      phase: "runtime",
      label: "Environment",
      value: "production",
    },
    {
      kind: "table",
      phase: "static",
      label: "Test Matrix",
      columns: ["Input A", "Input B", "Expected"],
      rows: [
        ["1", "2", "3"],
        ["10", "20", "30"],
        ["-1", "1", "0"],
      ],
    },
    {
      kind: "link",
      phase: "static",
      label: "API Docs",
      url: "https://example.com/docs/calculator",
    },
  ];
  const story: StoryMeta = {
    scenario: "Calculator adds two numbers",
    steps: [
      step("Given", "the calculator is initialized"),
      step("When", 'the user enters "2 + 3"'),
      step("Then", "the result should be 5"),
    ],
    tags: ["calculator", "math"],
    docs,
    suitePath: ["Calculator"],
    sourceOrder: 1,
  };
  return {
    id: "docs-001",
    story,
    sourceFile: "src/calc/add.test.ts",
    sourceLine: 8,
    status: "passed",
    durationMs: 23,
    attachments: [],
    stepResults: [stepResult(0), stepResult(1), stepResult(2)],
    titlePath: ["Calculator"],
    retry: 0,
    retries: 0,
    tags: ["calculator", "math"],
    ...overrides,
  };
}

export function createFixtureRun(
  testCases?: TestCaseResult[],
): TestRunResult {
  const cases = testCases ?? [
    passedScenario(),
    failedScenario(),
    skippedScenario(),
    scenarioWithDocs(),
  ];
  const now = Date.now();
  return {
    testCases: cases,
    startedAtMs: now - 5000,
    finishedAtMs: now,
    durationMs: 5000,
    projectRoot: "/project",
    runId: "fixture-run-001",
    packageVersion: "0.7.4",
    gitSha: "abc123def456",
  };
}
