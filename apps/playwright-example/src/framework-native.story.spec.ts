/**
 * Comprehensive demonstration of framework-native test patterns in Playwright.
 *
 * Patterns covered:
 * - doc.story() for framework-native tests
 * - Using Playwright's test() with doc.story()
 * - Mixing native tests with story()
 * - Playwright-specific features with stories
 */
import { test, expect } from "@playwright/test";
import { story, given, when, then, doc, steps, step } from "playwright-executable-stories";
import { add, subtract, multiply } from "./calculator.js";

// ============================================================================
// doc.story() for Framework-Native Tests
// ============================================================================

test("Framework-native test with doc.story()", async () => {
  doc.story("Calculator addition via framework-native test");

  const result = add(5, 3);
  expect(result).toBe(8);
});

test("Another framework-native test", async () => {
  doc.story("Calculator subtraction via framework-native test");

  const result = subtract(10, 4);
  expect(result).toBe(6);
});

test("Framework-native test with multiple operations", async () => {
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
  given("numbers are ready", async () => {});
  when("addition is performed", async () => {});
  then("result is correct", async () => {
    expect(add(1, 1)).toBe(2);
  });
});

// ============================================================================
// Mixing Native Tests with story()
// ============================================================================

test.describe("Calculator operations - mixed patterns", () => {
  // Framework-native test
  test("simple addition check", async () => {
    doc.story("Basic addition sanity check");
    expect(add(1, 1)).toBe(2);
  });

  // Story-based test
  story("Addition with story pattern", () => {
    let a: number, b: number, result: number;

    given("two positive numbers", async () => {
      a = 5;
      b = 3;
    });

    when("they are added", async () => {
      result = add(a, b);
    });

    then("the sum is returned", async () => {
      expect(result).toBe(8);
    });
  });

  // Another framework-native test
  test("multiplication check", async () => {
    doc.story("Basic multiplication sanity check");
    expect(multiply(2, 3)).toBe(6);
  });
});

// ============================================================================
// Using steps/step Objects
// ============================================================================

story("Using steps object", () => {
  doc.note("The steps object provides all step functions");

  let value: number;

  steps.given("initial value", async () => {
    value = 10;
  });

  steps.when("value is doubled", async () => {
    value = value * 2;
  });

  steps.then("value equals 20", async () => {
    expect(value).toBe(20);
  });

  steps.doc.kv("Final Value", 20);
});

story("Using step prefix (singular)", () => {
  doc.note("step.* is an alias for steps.*");

  let message: string;

  step.given("message is set", async () => {
    message = "Hello";
  });

  step.when("message is appended", async () => {
    message += ", World!";
  });

  step.then("message is complete", async () => {
    expect(message).toBe("Hello, World!");
  });
});

// ============================================================================
// Playwright Hooks with Stories
// NOTE: In story model, each step is a separate test, so beforeEach runs before each step
// ============================================================================

test.describe("Stories with Playwright hooks", () => {
  let _setupCount = 0;

  test.beforeEach(() => {
    _setupCount++;
  });

  test.afterEach(() => {
    // Cleanup if needed
  });

  story("Story demonstrating hook behavior", () => {
    // State should be managed within the story, not via hooks
    let localState = 0;

    given("state starts at zero", async () => {
      expect(localState).toBe(0);
    });

    when("state is modified", async () => {
      localState = 42;
    });

    then("state reflects changes", async () => {
      // Note: In story model, state is shared across steps within the same story
      expect(localState).toBe(42);
    });
  });

  story("Another story with independent state", () => {
    const localState = 0;

    given("state starts fresh for each story", async () => {
      expect(localState).toBe(0);
    });

    then("each story has its own state", async () => {
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

  when("admin panel is accessed", async () => {
    // Only this step has implementation
  });

  then("admin features are visible", async () => {
    expect(true).toBe(true);
  });

  then("audit log is updated"); // Documentation-only assertion
});

// ============================================================================
// Playwright Matchers with Stories
// ============================================================================

story("Using Playwright matchers in story steps", () => {
  doc.note("All Playwright matchers work normally in story steps");

  interface User {
    id: number;
    name: string;
    email: string;
    roles: string[];
  }

  let user: User;

  given("a user object", async () => {
    user = {
      id: 1,
      name: "John Doe",
      email: "john@example.com",
      roles: ["user", "admin"],
    };
  });

  then("toBe works", async () => {
    expect(user.id).toBe(1);
  });

  then("toEqual works for objects", async () => {
    expect(user.roles).toEqual(["user", "admin"]);
  });

  then("toContain works for arrays", async () => {
    expect(user.roles).toContain("admin");
  });

  then("toMatch works for strings", async () => {
    expect(user.email).toMatch(/@example\.com$/);
  });

  then("toHaveLength works", async () => {
    expect(user.roles).toHaveLength(2);
  });

  then("toBeDefined and toBeTruthy work", async () => {
    expect(user.name).toBeDefined();
    expect(user.name).toBeTruthy();
  });
});

// ============================================================================
// Playwright Page Fixtures with Stories
// ============================================================================

story.skip("Using Playwright page fixture in stories", () => {
  // NOTE: Skipped - page state doesn't persist across steps in story model
  doc.note("Playwright fixtures are available in step callbacks");

  given("page is available", async ({ page }) => {
    expect(page).toBeDefined();
  });

  when("page content is set", async ({ page }) => {
    await page.setContent("<html><body><h1>Test</h1></body></html>");
  });

  then("page can be queried", async ({ page }) => {
    const heading = await page.textContent("h1");
    expect(heading).toBe("Test");
  });
});

story("Using multiple Playwright fixtures", () => {
  doc.note("All standard Playwright fixtures work in stories");

  given("all fixtures are available", async ({ page, context, browser }) => {
    expect(page).toBeDefined();
    expect(context).toBeDefined();
    expect(browser).toBeDefined();
  });

  when("browser info is captured", async ({ browserName }) => {
    doc.runtime.kv("Browser", browserName);
    expect(browserName).toBeDefined();
  });

  then("test completes with fixtures", async () => {
    expect(true).toBe(true);
  });
});

// ============================================================================
// Combining Framework-Native with doc API
// ============================================================================

test("Framework-native test with full doc API", async () => {
  doc.story("Comprehensive framework-native test");

  doc.note("This test uses doc API methods in a framework-native test");
  doc.tag(["framework-native", "comprehensive"]);
  doc.kv("Test Type", "Native");

  doc.json("Test Configuration", {
    framework: "playwright",
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

test("Framework-native test without doc.story()", async () => {
  // This is a regular Playwright test that won't appear in story docs
  // but still works normally
  expect(add(1, 1)).toBe(2);
});

// ============================================================================
// Story with options
// ============================================================================

story(
  "Story with options",
  { tags: ["playwright", "options"], ticket: "PW-001" },
  () => {
    doc.note("Story options work in Playwright");

    given("setup with options", async () => {});
    when("action with options", async () => {});
    then("assertion with options", async () => {
      expect(true).toBe(true);
    });
  }
);

// ============================================================================
// Nested describe with framework-native tests
// ============================================================================

test.describe("Edge cases", () => {
  test.describe("positive numbers", () => {
    test("adds two positives", async () => {
      doc.story("Add two positive numbers");
      expect(add(1, 2)).toBe(3);
    });
  });

  test.describe("zero", () => {
    test("add with zero", async () => {
      doc.story("Add with zero");
      expect(add(0, 5)).toBe(5);
    });
  });
});
