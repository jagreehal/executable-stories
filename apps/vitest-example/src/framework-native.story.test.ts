/**
 * Comprehensive demonstration of framework-native test patterns in Vitest.
 *
 * Patterns covered:
 * - doc.story() for framework-native tests with task
 * - Using Vitest's it() with doc.story()
 * - Mixing native tests with story()
 * - Vitest-specific features with stories
 */
import { it, expect, describe, beforeEach, afterEach } from "vitest";
import { story, doc, type StepsApi } from "vitest-executable-stories";
import { given, when, steps, step } from "vitest-executable-stories";
import { add, subtract, multiply } from "./calculator.js";

// Note: 'then' is not exported directly due to conflict with Promise.then
// Use step.then, steps.then, or verify/assert aliases instead
const { then } = step;

// ============================================================================
// doc.story() for Framework-Native Tests (with task)
// ============================================================================

it("Framework-native test with doc.story()", ({ task }) => {
  doc.story("Calculator addition via framework-native test", task);

  const result = add(5, 3);
  expect(result).toBe(8);
});

it("Another framework-native test", ({ task }) => {
  doc.story("Calculator subtraction via framework-native test", task);

  const result = subtract(10, 4);
  expect(result).toBe(6);
});

it("Framework-native test with multiple operations", ({ task }) => {
  doc.story("Multiple calculator operations in one test", task);

  expect(add(2, 3)).toBe(5);
  expect(subtract(10, 5)).toBe(5);
  expect(multiply(4, 3)).toBe(12);
});

// ============================================================================
// doc.story() with Full story() API
// ============================================================================

// doc.story can also be used like story() with a callback
doc.story("doc.story() used as story() replacement", (stepApi: StepsApi) => {
  stepApi.given("numbers are ready", () => {});
  stepApi.when("addition is performed", () => {});
  stepApi.then("result is correct", () => {
    expect(add(1, 1)).toBe(2);
  });
});

// ============================================================================
// Mixing Native Tests with story()
// ============================================================================

describe("Calculator operations - mixed patterns", () => {
  // Framework-native test
  it("simple addition check", ({ task }) => {
    doc.story("Basic addition sanity check", task);
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
  it("multiplication check", ({ task }) => {
    doc.story("Basic multiplication sanity check", task);
    expect(multiply(2, 3)).toBe(6);
  });
});

// ============================================================================
// Callback Parameter Pattern (Vitest-specific)
// ============================================================================

story("Using callback parameter object", (stepsApi: StepsApi) => {
  stepsApi.doc.note("The story callback receives a steps object");
  const { given, when, then, doc: stepDoc } = stepsApi;

  let value: number;

  given("initial value", () => {
    value = 10;
  });

  when("value is doubled", () => {
    value = value * 2;
  });

  then("value equals 20", () => {
    expect(value).toBe(20);
  });

  stepDoc.kv("Final Value", 20);
  void stepDoc; // use stepDoc from destructured variable
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
// Vitest Hooks with Stories
// NOTE: In story model, each step is a separate test, so beforeEach runs before each step
// ============================================================================

describe("Stories with Vitest hooks", () => {
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
// Vitest Matchers with Stories
// ============================================================================

story("Using Vitest matchers in story steps", () => {
  doc.note("All Vitest matchers work normally in story steps");

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
// Vitest it.each Patterns
// ============================================================================

describe("Parameterized tests with it.each", () => {
  it.each([
    { a: 1, b: 2, expected: 3 },
    { a: 5, b: 5, expected: 10 },
    { a: -1, b: 1, expected: 0 },
  ])("add($a, $b) should return $expected", ({ a, b, expected }) => {
    // Note: it.each doesn't easily support doc.story with task context
    // Use regular story() for documented parameterized tests
    expect(add(a, b)).toBe(expected);
  });
});

// ============================================================================
// Combining Framework-Native with doc API
// ============================================================================

it("Framework-native test with full doc API", ({ task }) => {
  // NOTE: In Vitest, doc.story() creates the story context but doc.* methods
  // after doc.story() must use a different approach - use story() instead
  doc.story("Comprehensive framework-native test", task);
  // doc.* methods after doc.story() are not supported in Vitest framework-native tests
  // Use story() with callback for full doc API support

  const result = add(100, 200);
  expect(result).toBe(300);
});

// Full doc API in framework-native context (use story callback pattern)
story("Full doc API demonstration", () => {
  doc.note("This story uses all doc API methods");
  doc.tag(["framework-native", "comprehensive"]);
  doc.kv("Test Type", "Story");

  doc.json("Test Configuration", {
    framework: "vitest",
    pattern: "story-callback",
    hasStory: true,
  });

  doc.table(
    "Supported Patterns",
    ["Pattern", "Supported"],
    [
      ["doc.story(title, task)", "Yes"],
      ["doc.note()", "Yes"],
      ["doc.kv()", "Yes"],
      ["doc.json()", "Yes"],
      ["doc.table()", "Yes"],
    ]
  );

  given("configuration is documented", () => {});

  then("test passes with rich documentation", () => {
    const result = add(100, 200);
    expect(result).toBe(300);
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

story("Story with documentation only", () => {
  doc.note("A story can exist with minimal implementation");
  doc.tag("edge-case");
  doc.kv("Has Steps", true);
  // Vitest requires at least one step/test in a story
  then("documentation is generated", () => {
    expect(true).toBe(true);
  });
});

it("Framework-native test without doc.story()", () => {
  // This is a regular Vitest test that won't appear in story docs
  // but still works normally
  expect(add(1, 1)).toBe(2);
});

// ============================================================================
// Story with options and callback parameter
// ============================================================================

story(
  "Story with options and callback parameter",
  { tags: ["vitest", "callback"], ticket: "VIT-001" },
  (stepsApi: StepsApi) => {
    doc.note("Combining options with callback parameter pattern");
    const { given: gv, when: wh, then: th } = stepsApi;

    gv("setup via callback", () => {});
    wh("action via callback", () => {});
    th("assertion via callback", () => {
      expect(true).toBe(true);
    });
  }
);

// ============================================================================
// Nested describe with framework-native it + doc.story
// ============================================================================

describe("Edge cases", () => {
  describe("positive numbers", () => {
    it("adds two positives", ({ task }) => {
      doc.story("Add two positive numbers", task);
      expect(add(1, 2)).toBe(3);
    });
  });

  describe("zero", () => {
    it("add with zero", ({ task }) => {
      doc.story("Add with zero", task);
      expect(add(0, 5)).toBe(5);
    });
  });
});
