/**
 * Comprehensive demonstration of ALL step modifiers available in Vitest.
 *
 * Vitest supports: .skip, .only, .todo, .fails, .concurrent
 */
import { story, type StepsApi } from "vitest-executable-stories";
import { given, when, and, but, doc, step } from "vitest-executable-stories";
import { expect } from "vitest";

// Note: 'then' is not exported directly due to conflict with Promise.then
// Use step.then or verify/assert aliases instead
const { then } = step;

// ============================================================================
// Skip Modifier - Skips the step (test will be marked as skipped)
// ============================================================================

story("Skip modifier demonstration", () => {
  doc.note("The .skip modifier skips a step without failing the test suite");

  given("a normal precondition", () => {
    // This runs normally
  });

  given.skip("a skipped precondition", () => {
    // This step is skipped
  });

  when("a normal action", () => {
    // This runs normally
  });

  when.skip("a skipped action", () => {
    // This step is skipped
  });

  then("a normal assertion", () => {
    expect(true).toBe(true);
  });

  then.skip("a skipped assertion", () => {
    // This step is skipped
    expect(true).toBe(false); // Would fail but is skipped
  });

  and.skip("a skipped and step", () => {
    // This step is skipped
  });

  but.skip("a skipped but step", () => {
    // This step is skipped
  });
});

// ============================================================================
// Todo Modifier - Marks a step as planned but not implemented
// ============================================================================

story("Todo modifier demonstration", () => {
  doc.note("The .todo modifier marks a step as pending implementation");
  doc.tag(["todo", "planning"]);

  given("setup is complete", () => {
    // Implemented
  });

  when.todo("user performs an action that is not yet implemented");

  then.todo("expected outcome to be verified later");

  and.todo("additional verification pending");

  but.todo("negative case to be added");
});

// ============================================================================
// Fails Modifier - Expects the step to throw an error
// ============================================================================

story("Fails modifier demonstration", () => {
  doc.note("The .fails modifier expects the step to throw an error");
  doc.tag("error-handling");

  given("a precondition that should throw", () => {
    // Setup
  });

  when.fails("an action that throws an error", () => {
    throw new Error("Expected error in when step");
  });

  given.fails("a precondition that throws", () => {
    throw new Error("Expected error in given step");
  });

  then.fails("an assertion that throws", () => {
    throw new Error("Expected error in then step");
  });

  then("normal step continues after expected failures", () => {
    expect(true).toBe(true);
  });
});

// ============================================================================
// Concurrent Modifier - Runs steps concurrently (Vitest-specific)
// ============================================================================

story("Concurrent modifier demonstration", () => {
  doc.note("The .concurrent modifier runs steps in parallel (Vitest only)");
  doc.tag(["concurrent", "vitest"]);

  given("setup for concurrent steps", () => {
    // Setup
  });

  when.concurrent("first concurrent action", async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
  });

  when.concurrent("second concurrent action", async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
  });

  when.concurrent("third concurrent action", async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
  });

  then("all concurrent actions complete", () => {
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
//   given("this step would be skipped", () => {
//     // Skipped when .only is used elsewhere
//   });
//
//   when.only("only this step runs", () => {
//     // This is the only step that runs
//   });
//
//   then("this step would also be skipped", () => {
//     expect(true).toBe(true);
//   });
// });

// ============================================================================
// Combined Modifiers in Different Scenarios
// ============================================================================

story("Mixed modifiers in a realistic scenario", () => {
  doc.note("Demonstrates combining modifiers in a real-world scenario");
  doc.tag(["integration", "mixed"]);

  given("user is logged in", () => {
    // Normal step
  });

  and("user has admin privileges", () => {
    // Normal step
  });

  when("user accesses admin panel", () => {
    // Normal action
  });

  then("admin dashboard is displayed", () => {
    expect(true).toBe(true);
  });

  and.skip("user sees pending notifications", () => {
    // Skip - notification feature not ready
  });

  when.todo("user clicks on analytics widget");

  then.todo("detailed analytics are shown");

  but("no sensitive data is exposed", () => {
    expect(true).toBe(true);
  });
});

// ============================================================================
// Story-level modifiers
// ============================================================================

story.skip("Entirely skipped story", () => {
  doc.note("This entire story is skipped");

  given("this will not run", () => {});
  when("this will not run either", () => {});
  then("and this definitely will not run", () => {
    expect(false).toBe(true); // Would fail but story is skipped
  });
});

// ============================================================================
// Using callback parameter pattern (Vitest-specific)
// ============================================================================

story("Modifiers via callback parameter", (stepsApi: StepsApi) => {
  doc.note("Using destructured steps from callback parameter");
  const { given: gv, when: wh, then: th } = stepsApi;

  gv("normal step via callback", () => {});

  gv.skip("skipped step via callback", () => {});

  wh.todo("todo step via callback");

  wh.fails("failing step via callback", () => {
    throw new Error("Expected error");
  });

  wh.concurrent("concurrent step via callback", async () => {
    await new Promise((resolve) => setTimeout(resolve, 5));
  });

  th("assertion via callback", () => {
    expect(true).toBe(true);
  });
});

// Uncomment to test story.only
// story.only("Only this story runs", () => {
//   given("only story test", () => {});
//   then("only this story executes", () => {
//     expect(true).toBe(true);
//   });
// });
