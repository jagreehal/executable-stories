/**
 * Comprehensive demonstration of ALL step modifiers available in Playwright.
 *
 * Playwright supports: .skip, .only, .todo, .fixme, .fail, .slow
 * (No .fails or .concurrent - those are Jest/Vitest specific)
 */
import { story, given, when, then, and, but, doc } from "playwright-executable-stories";
import { expect } from "@playwright/test";

// ============================================================================
// Skip Modifier - Skips the step (test will be marked as skipped)
// ============================================================================

story("Skip modifier demonstration", () => {
  doc.note("The .skip modifier skips a step without failing the test suite");

  given("a normal precondition", async () => {
    // This runs normally
  });

  given.skip("a skipped precondition", async () => {
    // This step is skipped
  });

  when("a normal action", async () => {
    // This runs normally
  });

  when.skip("a skipped action", async () => {
    // This step is skipped
  });

  then("a normal assertion", async () => {
    expect(true).toBe(true);
  });

  then.skip("a skipped assertion", async () => {
    // This step is skipped
    expect(true).toBe(false); // Would fail but is skipped
  });

  and.skip("a skipped and step", async () => {
    // This step is skipped
  });

  but.skip("a skipped but step", async () => {
    // This step is skipped
  });
});

// ============================================================================
// Todo Modifier - Marks a step as planned but not implemented
// ============================================================================

story("Todo modifier demonstration", () => {
  doc.note("The .todo modifier marks a step as pending implementation");
  doc.tag(["todo", "planning"]);

  given("setup is complete", async () => {
    // Implemented
  });

  when.todo("user performs an action that is not yet implemented");

  then.todo("expected outcome to be verified later");

  and.todo("additional verification pending");

  but.todo("negative case to be added");
});

// ============================================================================
// Fixme Modifier - Playwright-specific, marks as needing fix
// ============================================================================

story("Fixme modifier demonstration", () => {
  doc.note("The .fixme modifier marks a test as needing a fix (Playwright-specific)");
  doc.tag(["fixme", "playwright"]);

  given("a precondition for fixme test", async () => {
    // Setup
  });

  when.fixme("action that needs fixing", async () => {
    // This step is marked as needing a fix
  });

  then("test continues", async () => {
    expect(true).toBe(true);
  });
});

// ============================================================================
// Fail Modifier - Playwright-specific, expects the step to fail
// ============================================================================

story("Fail modifier demonstration", () => {
  doc.note("The .fail modifier expects the step to fail (Playwright-specific)");
  doc.tag(["fail", "playwright"]);

  given("setup for failing test", async () => {
    // Setup
  });

  when.fail("action that is expected to fail", async () => {
    throw new Error("This failure is expected");
  });

  then("test continues after expected failure", async () => {
    expect(true).toBe(true);
  });
});

// ============================================================================
// Slow Modifier - Playwright-specific, triples timeout
// ============================================================================

story("Slow modifier demonstration", () => {
  doc.note("The .slow modifier triples the test timeout (Playwright-specific)");
  doc.tag(["slow", "playwright"]);

  given("setup for slow test", async () => {
    // Setup
  });

  when.slow("slow action with extended timeout", async () => {
    // This step has triple the normal timeout
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  then("slow test completes", async () => {
    expect(true).toBe(true);
  });
});

// ============================================================================
// Only Modifier - Runs only this step (commented to not affect test suite)
// ============================================================================

// NOTE: .only is commented out to not affect the test suite.
// Uncomment to run only specific steps.

// story("Only modifier demonstration", () => {
//   doc.note("The .only modifier runs only the marked step(s)");
//
//   given("this step would be skipped", async () => {
//     // Skipped when .only is used elsewhere
//   });
//
//   when.only("only this step runs", async () => {
//     // This is the only step that runs
//   });
//
//   then("this step would also be skipped", async () => {
//     expect(true).toBe(true);
//   });
// });

// ============================================================================
// Combined Modifiers in Different Scenarios
// ============================================================================

story("Mixed modifiers in a realistic scenario", () => {
  doc.note("Demonstrates combining modifiers in a real-world scenario");
  doc.tag(["integration", "mixed"]);

  given("user is logged in", async () => {
    // Normal step
  });

  and("user has admin privileges", async () => {
    // Normal step
  });

  when("user accesses admin panel", async () => {
    // Normal action
  });

  then("admin dashboard is displayed", async () => {
    expect(true).toBe(true);
  });

  and.skip("user sees pending notifications", async () => {
    // Skip - notification feature not ready
  });

  when.todo("user clicks on analytics widget");

  then.todo("detailed analytics are shown");

  when.fixme("user exports data", async () => {
    // Needs fixing
  });

  but("no sensitive data is exposed", async () => {
    expect(true).toBe(true);
  });
});

// ============================================================================
// Story-level modifiers
// ============================================================================

story.skip("Entirely skipped story", () => {
  doc.note("This entire story is skipped");

  given("this will not run", async () => {});
  when("this will not run either", async () => {});
  then("and this definitely will not run", async () => {
    expect(false).toBe(true); // Would fail but story is skipped
  });
});

/* eslint-disable playwright-executable-stories/require-story-context-for-steps -- story.fixme/slow are story callbacks */
story.fixme("Story marked as fixme", () => {
  doc.note("This entire story needs fixing");

  given("this won't run until fixed", async () => {});
  then("story is skipped until fixed", async () => {
    expect(true).toBe(true);
  });
});

story.slow("Slow story with extended timeout", () => {
  doc.note("This entire story has triple timeout");

  given("setup for slow operations", async () => {});
  when("slow operations run", async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
  then("slow story completes", async () => {
    expect(true).toBe(true);
  });
});
/* eslint-enable playwright-executable-stories/require-story-context-for-steps */

// Uncomment to test story.only
// story.only("Only this story runs", () => {
//   given("only story test", async () => {});
//   then("only this story executes", async () => {
//     expect(true).toBe(true);
//   });
// });

// ============================================================================
// Playwright Fixtures with Modifiers
// ============================================================================

story("Modifiers with Playwright fixtures", () => {
  doc.note("Modifiers work with Playwright page fixtures");

  given("page is available", async ({ page }) => {
    expect(page).toBeDefined();
  });

  when.skip("skipped step with fixtures", async ({ page }) => {
    await page.goto("https://example.com");
  });

  then("fixtures are accessible in all step types", async ({ page }) => {
    expect(page).toBeDefined();
  });
});
