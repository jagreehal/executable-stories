/**
 * Basic test fixture for RawRun data.
 */

import type { RawRun, RawTestCase } from "../../../src/types/raw";
import type { StoryMeta } from "../../../src/types/story";

/** Create a minimal story for testing */
export function createStory(overrides: Partial<StoryMeta> = {}): StoryMeta {
  return {
    scenario: "User logs in successfully",
    steps: [
      { keyword: "Given", text: "user is on login page" },
      { keyword: "When", text: "user enters valid credentials" },
      { keyword: "Then", text: "user sees dashboard" },
    ],
    tags: ["auth", "login"],
    tickets: ["JIRA-123"],
    suitePath: ["Authentication"],
    ...overrides,
  };
}

/** Create a minimal test case for testing */
export function createTestCase(overrides: Partial<RawTestCase> = {}): RawTestCase {
  return {
    title: "User logs in successfully",
    titlePath: ["Authentication", "User logs in successfully"],
    story: createStory(),
    sourceFile: "src/auth/login.test.ts",
    sourceLine: 10,
    status: "pass",
    durationMs: 150,
    ...overrides,
  };
}

/** Create a minimal raw run for testing */
export function createRawRun(overrides: Partial<RawRun> = {}): RawRun {
  return {
    testCases: [createTestCase()],
    startedAtMs: 1704067200000, // 2024-01-01 00:00:00 UTC
    finishedAtMs: 1704067201000, // +1 second
    projectRoot: "/project",
    packageVersion: "1.0.0",
    gitSha: "abc1234",
    ...overrides,
  };
}

/** Create a passing test case */
export function createPassingTestCase(): RawTestCase {
  return createTestCase({
    status: "pass",
    durationMs: 100,
  });
}

/** Create a failing test case */
export function createFailingTestCase(): RawTestCase {
  return createTestCase({
    title: "User login fails with invalid password",
    titlePath: ["Authentication", "User login fails with invalid password"],
    story: createStory({
      scenario: "User login fails with invalid password",
      steps: [
        { keyword: "Given", text: "user is on login page" },
        { keyword: "When", text: "user enters invalid password" },
        { keyword: "Then", text: "user sees error message" },
      ],
    }),
    status: "fail",
    durationMs: 250,
    error: {
      message: "Expected error message to be visible",
      stack: "Error: Expected error message to be visible\n    at login.test.ts:15:5",
    },
  });
}

/** Create a skipped test case */
export function createSkippedTestCase(): RawTestCase {
  return createTestCase({
    title: "User can reset password",
    titlePath: ["Authentication", "User can reset password"],
    story: createStory({
      scenario: "User can reset password",
      steps: [
        { keyword: "Given", text: "user is on forgot password page" },
        { keyword: "When", text: "user enters email" },
        { keyword: "Then", text: "user receives reset email" },
      ],
      tags: ["auth", "password-reset"],
    }),
    status: "skip",
    durationMs: 0,
  });
}

/** Create a run with multiple test cases */
export function createMultipleTestCasesRun(): RawRun {
  return createRawRun({
    testCases: [
      createPassingTestCase(),
      createFailingTestCase(),
      createSkippedTestCase(),
    ],
    finishedAtMs: 1704067202000, // +2 seconds
  });
}

/** Create a run with multiple files */
export function createMultiFileRun(): RawRun {
  return createRawRun({
    testCases: [
      createTestCase({ sourceFile: "src/auth/login.test.ts" }),
      createTestCase({
        title: "User can logout",
        titlePath: ["Authentication", "User can logout"],
        story: createStory({
          scenario: "User can logout",
          steps: [
            { keyword: "Given", text: "user is logged in" },
            { keyword: "When", text: "user clicks logout" },
            { keyword: "Then", text: "user sees login page" },
          ],
        }),
        sourceFile: "src/auth/logout.test.ts",
      }),
      createTestCase({
        title: "Dashboard shows user stats",
        titlePath: ["Dashboard", "Dashboard shows user stats"],
        story: createStory({
          scenario: "Dashboard shows user stats",
          suitePath: ["Dashboard"],
          steps: [
            { keyword: "Given", text: "user is logged in" },
            { keyword: "When", text: "user views dashboard" },
            { keyword: "Then", text: "user sees their stats" },
          ],
          tags: ["dashboard"],
        }),
        sourceFile: "src/dashboard/stats.test.ts",
      }),
    ],
  });
}
