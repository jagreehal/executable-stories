/**
 * Comprehensive demonstration of framework-native test patterns.
 *
 * Patterns covered:
 * - doc.story() for framework-native tests
 * - Using Jest's test() with doc.story()
 * - Mixing native tests with story()
 * - Jest-specific features with stories
 */
import { test, expect, describe, beforeEach, afterEach } from "@jest/globals";
import { story, given, when, then, doc, steps, step } from "jest-executable-stories";
import { add, subtract, multiply } from "./calculator.js";

// ============================================================================
// doc.story() for Framework-Native Tests
// ============================================================================

test("Framework-native test with doc.story()", () => {
  doc.story("Calculator addition via framework-native test");

  const result = add(5, 3);
  expect(result).toBe(8);
});

test("Another framework-native test", () => {
  doc.story("Calculator subtraction via framework-native test");

  const result = subtract(10, 4);
  expect(result).toBe(6);
});

test("Framework-native test with multiple operations", () => {
  doc.story("Multiple calculator operations in one test");

  expect(add(2, 3)).toBe(5);
  expect(subtract(10, 5)).toBe(5);
  expect(multiply(4, 3)).toBe(12);
});

// ============================================================================
// doc.story() with Full story() API
// ============================================================================

// doc.story can also be used like story() with a callback
doc.story("doc.story() used as story() replacement", () => {
  given("numbers are ready", () => {});
  when("addition is performed", () => {});
  then("result is correct", () => {
    expect(add(1, 1)).toBe(2);
  });
});

// ============================================================================
// Mixing Native Tests with story()
// ============================================================================

describe("Calculator operations - mixed patterns", () => {
  // Verification: Jest's currentTestName format for suite-path extraction (see AGENTS.md).
  // Observed: currentTestName is space-separated (e.g. "Describe title test name"), no " > ", so suitePath is undefined and docs are flat.
  test("verify currentTestName format for docs", () => {
    const currentTestName = expect.getState().currentTestName;
    expect(typeof currentTestName).toBe("string");
    expect(currentTestName).toContain("Calculator operations - mixed patterns");
    expect(currentTestName).toContain("verify currentTestName format for docs");
  });

  // Framework-native test
  test("simple addition check", () => {
    doc.story("Basic addition sanity check");
    expect(add(1, 1)).toBe(2);
  });

  // Story-based test
  story("Addition with story pattern", () => {
    let a: number, b: number, result: number;

    given("two positive numbers", () => {
      a = 5;
      b = 3;
    });

    when("they are added", () => {
      result = add(a, b);
    });

    then("the sum is returned", () => {
      expect(result).toBe(8);
    });
  });

  // Another framework-native test
  test("multiplication check", () => {
    doc.story("Basic multiplication sanity check");
    expect(multiply(2, 3)).toBe(6);
  });
});

// ============================================================================
// Using steps/step Objects
// ============================================================================

story("Using steps parameter object", (s) => {
  doc.note("The story callback receives a steps object");

  let value: number;

  s.given("initial value", () => {
    value = 10;
  });

  s.when("value is doubled", () => {
    value = value * 2;
  });

  s.then("value equals 20", () => {
    expect(value).toBe(20);
  });

  s.doc.kv("Final Value", 20);
});

story("Using step prefix (singular)", () => {
  doc.note("step.* is an alias for steps.*");

  let message: string;

  step.given("message is set", () => {
    message = "Hello";
  });

  step.when("message is appended", () => {
    message += ", World!";
  });

  step.then("message is complete", () => {
    expect(message).toBe("Hello, World!");
  });
});

story("Using steps object from module", () => {
  doc.note("Module-level steps object for global access");

  let count: number;

  steps.given("count starts at zero", () => {
    count = 0;
  });

  steps.when("count is incremented", () => {
    count++;
  });

  steps.then("count equals one", () => {
    expect(count).toBe(1);
  });
});

// ============================================================================
// Jest Hooks with Stories
// NOTE: In story model, each step is a separate test, so beforeEach runs before each step
// ============================================================================

describe("Stories with Jest hooks", () => {
  let _setupCount = 0;

  beforeEach(() => {
    _setupCount++;
  });

  afterEach(() => {
    // Cleanup if needed
  });

  story("Story demonstrating hook behavior", () => {
    // State should be managed within the story, not via hooks
    let localState = 0;

    given("state starts at zero", () => {
      expect(localState).toBe(0);
    });

    when("state is modified", () => {
      localState = 42;
    });

    then("state reflects changes", () => {
      // Note: In story model, state is shared across steps within the same story
      expect(localState).toBe(42);
    });
  });

  story("Another story with independent state", () => {
    const localState = 0;

    given("state starts fresh for each story", () => {
      expect(localState).toBe(0);
    });

    then("each story has its own state", () => {
      expect(localState).toBe(0);
    });
  });
});

// ============================================================================
// Optional Step Callbacks
// ============================================================================

story("Optional step callbacks for documentation-only steps", () => {
  doc.note("Steps without callbacks are valid for documentation purposes");

  given("user is logged in"); // No callback - documentation only
  given("user has admin role"); // No callback

  when("admin panel is accessed", () => {
    // Only this step has implementation
  });

  then("admin features are visible", () => {
    expect(true).toBe(true);
  });

  then("audit log is updated"); // Documentation-only assertion
});

// ============================================================================
// Jest Matchers with Stories
// ============================================================================

story("Using Jest matchers in story steps", () => {
  doc.note("All Jest matchers work normally in story steps");

  interface User {
    id: number;
    name: string;
    email: string;
    roles: string[];
  }

  let user: User;

  given("a user object", () => {
    user = {
      id: 1,
      name: "John Doe",
      email: "john@example.com",
      roles: ["user", "admin"],
    };
  });

  then("toBe works", () => {
    expect(user.id).toBe(1);
  });

  then("toEqual works for objects", () => {
    expect(user.roles).toEqual(["user", "admin"]);
  });

  then("toContain works for arrays", () => {
    expect(user.roles).toContain("admin");
  });

  then("toMatch works for strings", () => {
    expect(user.email).toMatch(/@example\.com$/);
  });

  then("toHaveLength works", () => {
    expect(user.roles).toHaveLength(2);
  });

  then("toHaveProperty works", () => {
    expect(user).toHaveProperty("email");
    expect(user).toHaveProperty("name", "John Doe");
  });

  then("toBeDefined and toBeTruthy work", () => {
    expect(user.name).toBeDefined();
    expect(user.name).toBeTruthy();
  });
});

// ============================================================================
// Jest describe.each / test.each Patterns
// ============================================================================

describe("Parameterized tests with describe.each", () => {
  describe.each([
    { a: 1, b: 2, expected: 3 },
    { a: 5, b: 5, expected: 10 },
    { a: -1, b: 1, expected: 0 },
  ])("add($a, $b)", ({ a, b, expected }) => {
    test(`should return ${expected}`, () => {
      doc.story(`Addition: ${a} + ${b} = ${expected}`);
      expect(add(a, b)).toBe(expected);
    });
  });
});

// ============================================================================
// Combining Framework-Native with doc API
// ============================================================================

test("Framework-native test with full doc API", () => {
  doc.story("Comprehensive framework-native test");

  doc.note("This test uses doc API methods in a framework-native test");
  doc.tag("framework-native", "comprehensive");
  doc.kv("Test Type", "Native");

  doc.json("Test Configuration", {
    framework: "jest",
    pattern: "native",
    hasStory: true,
  });

  doc.table(
    "Supported Patterns",
    ["Pattern", "Supported"],
    [
      ["doc.story()", "Yes"],
      ["doc.note()", "Yes"],
      ["doc.kv()", "Yes"],
      ["doc.json()", "Yes"],
      ["doc.table()", "Yes"],
    ]
  );

  const result = add(100, 200);
  expect(result).toBe(300);
});

// ============================================================================
// Edge Cases
// ============================================================================

story("Story with no steps", () => {
  doc.note("A story can exist with only documentation");
  doc.tag("edge-case");
  doc.kv("Has Steps", false);
  // No given/when/then - just documentation
});

test("Framework-native test without doc.story()", () => {
  // This is a regular Jest test that won't appear in story docs
  // but still works normally
  expect(add(1, 1)).toBe(2);
});
