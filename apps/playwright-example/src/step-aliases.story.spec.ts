/**
 * Comprehensive demonstration of ALL step function aliases in Playwright.
 *
 * Step aliases provide semantic alternatives to given/when/then:
 * - AAA Pattern: arrange, act, assert
 * - Alternative: setup, execute, verify
 * - Context/Action: context, action
 *
 * All aliases support the same modifiers: .skip, .only, .todo, .fixme, .fail, .slow
 */
import {
  story,
  // BDD Keywords
  given,
  when,
  then,
  and,
  but,
  // AAA Pattern
  arrange,
  act,
  assert,
  // Alternative aliases
  setup,
  context,
  execute,
  action,
  verify,
  doc,
} from "playwright-executable-stories";
import { expect } from "@playwright/test";

// ============================================================================
// AAA Pattern: Arrange-Act-Assert
// ============================================================================

story("AAA Pattern: Arrange-Act-Assert", () => {
  doc.note("Classic testing pattern using arrange/act/assert aliases");
  doc.tag("aaa-pattern");

  let calculator: { add: (a: number, b: number) => number };
  let result: number;

  arrange("calculator is initialized", async () => {
    calculator = {
      add: (a, b) => a + b,
    };
  });

  arrange("input values are prepared", async () => {
    // Additional arrangement
  });

  act("addition is performed", async () => {
    result = calculator.add(5, 3);
  });

  assert("result equals expected value", async () => {
    expect(result).toBe(8);
  });

  assert("result is a number", async () => {
    expect(typeof result).toBe("number");
  });
});

// ============================================================================
// Setup-Execute-Verify Pattern
// ============================================================================

story("Setup-Execute-Verify Pattern", () => {
  doc.note("Alternative naming using setup/execute/verify");
  doc.tag("sev-pattern");

  let service: { process: (data: string) => string };
  let output: string;

  setup("service is configured", async () => {
    service = {
      process: (data) => data.toUpperCase(),
    };
  });

  setup("dependencies are mocked", async () => {
    // Additional setup
  });

  execute("service processes input", async () => {
    output = service.process("hello");
  });

  verify("output is transformed correctly", async () => {
    expect(output).toBe("HELLO");
  });

  verify("output is not empty", async () => {
    expect(output.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Context-Action Pattern
// ============================================================================

story("Context-Action Pattern", () => {
  doc.note("Using context to establish state and action for operations");
  doc.tag("context-action");

  let state: { user: { name: string; role: string } };
  let actionResult: boolean;

  context("user context is established", async () => {
    state = {
      user: { name: "Alice", role: "admin" },
    };
  });

  context("permissions are set", async () => {
    // Additional context
  });

  action("user performs privileged operation", async () => {
    actionResult = state.user.role === "admin";
  });

  then("operation succeeds", async () => {
    expect(actionResult).toBe(true);
  });
});

// ============================================================================
// Mixed Patterns - Combining Aliases
// ============================================================================

story("Mixed pattern usage", () => {
  doc.note("Different aliases can be combined in the same story");
  doc.tag("mixed");

  let data: number[];
  let sum: number;

  // Using BDD style for setup
  given("initial data exists", async () => {
    data = [1, 2, 3, 4, 5];
  });

  // Using AAA style for additional arrangement
  arrange("data is validated", async () => {
    expect(data.length).toBeGreaterThan(0);
  });

  // Using context for state establishment
  context("sum accumulator is initialized", async () => {
    sum = 0;
  });

  // Using execute for operation
  execute("sum is calculated", async () => {
    sum = data.reduce((a, b) => a + b, 0);
  });

  // Using verify for assertion
  verify("sum is correct", async () => {
    expect(sum).toBe(15);
  });

  // Using assert for additional check
  assert("sum is positive", async () => {
    expect(sum).toBeGreaterThan(0);
  });
});

// ============================================================================
// Aliases with Modifiers (Playwright-specific)
// ============================================================================

story("Aliases support all Playwright modifiers", () => {
  doc.note("All aliases support .skip, .todo, .fixme, .fail, .slow modifiers");

  // arrange modifiers
  arrange("normal arrangement", async () => {});
  arrange.skip("skipped arrangement", async () => {});
  arrange.todo("todo arrangement");
  arrange.fixme("fixme arrangement", async () => {});

  // act modifiers
  act("normal action", async () => {});
  act.skip("skipped action", async () => {});
  act.todo("todo action");

  // assert modifiers
  assert("normal assertion", async () => {
    expect(true).toBe(true);
  });
  assert.skip("skipped assertion", async () => {});
  assert.todo("todo assertion");

  // setup modifiers
  setup.skip("skipped setup", async () => {});
  setup.todo("todo setup");

  // execute modifiers
  execute.skip("skipped execution", async () => {});
  execute.todo("todo execution");

  // verify modifiers
  verify("final verification", async () => {
    expect(true).toBe(true);
  });
  verify.skip("skipped verification", async () => {});
  verify.todo("todo verification");

  // context modifiers
  context.skip("skipped context", async () => {});
  context.todo("todo context");

  // action modifiers
  action.skip("skipped action step", async () => {});
  action.todo("todo action step");
});

// ============================================================================
// Slow Modifier with Aliases (Playwright-specific)
// ============================================================================

story("Aliases with slow modifier", () => {
  doc.note("The .slow modifier works with all aliases (Playwright only)");

  arrange("setup complete", async () => {});

  arrange.slow("slow arrangement", async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  act.slow("slow action", async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  assert.slow("slow assertion", async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(true).toBe(true);
  });

  verify("all slow operations complete", async () => {
    expect(true).toBe(true);
  });
});

// ============================================================================
// Fail Modifier with Aliases (Playwright-specific)
// ============================================================================

story("Aliases with fail modifier", () => {
  doc.note("The .fail modifier works with all aliases (Playwright only)");

  arrange("setup complete", async () => {});

  arrange.fail("arrangement that should fail", async () => {
    throw new Error("Expected arrangement error");
  });

  act.fail("action that should fail", async () => {
    throw new Error("Expected action error");
  });

  assert.fail("assertion that should fail", async () => {
    throw new Error("Expected assertion error");
  });

  verify("test continues after expected failures", async () => {
    expect(true).toBe(true);
  });
});

// ============================================================================
// Aliases with Playwright Fixtures
// ============================================================================

story.skip("Using aliases with Playwright fixtures", () => {
  // NOTE: Skipped - page state doesn't persist across steps in story model
  doc.note("All aliases have access to Playwright fixtures");

  arrange("page fixture is available in arrange", async ({ page }) => {
    expect(page).toBeDefined();
  });

  act("page fixture is available in act", async ({ page }) => {
    await page.setContent("<h1>Test</h1>");
  });

  assert("page fixture is available in assert", async ({ page }) => {
    const title = await page.locator("h1").textContent();
    expect(title).toBe("Test");
  });
});

// ============================================================================
// Real-World Example Using Aliases
// ============================================================================

story("User registration flow using aliases", () => {
  doc.note("Realistic example using arrange/act/assert pattern");
  doc.tag(["user-flow", "registration"]);

  interface User {
    email: string;
    password: string;
    name: string;
  }

  interface RegistrationResult {
    success: boolean;
    userId?: string;
    error?: string;
  }

  let _userData: User;
  let result: RegistrationResult;

  // Arrange phase
  arrange("valid user data is prepared", async () => {
    _userData = {
      email: "test@example.com",
      password: "SecurePass123!",
      name: "Test User",
    };
  });

  arrange("email is unique in the system", async () => {
    // Mock database check
  });

  // Act phase
  act("registration is submitted", async () => {
    // Simulate registration
    result = {
      success: true,
      userId: "user-123",
    };
  });

  // Assert phase
  assert("registration succeeds", async () => {
    expect(result.success).toBe(true);
  });

  assert("user ID is generated", async () => {
    expect(result.userId).toBeDefined();
    expect(result.userId).toMatch(/^user-/);
  });

  assert("no error is returned", async () => {
    expect(result.error).toBeUndefined();
  });
});

// ============================================================================
// Comparing All Alias Styles Side by Side
// ============================================================================

story("All alias styles comparison", () => {
  doc.note("Comparison of all available step function aliases");

  doc.table(
    "Step Function Aliases",
    ["Purpose", "BDD Style", "AAA Pattern", "Alternative 1", "Alternative 2"],
    [
      ["Setup/Context", "given", "arrange", "setup", "context"],
      ["Action/Execute", "when", "act", "execute", "action"],
      ["Verify/Assert", "then", "assert", "verify", "-"],
      ["Continue", "and", "-", "-", "-"],
      ["Negative", "but", "-", "-", "-"],
    ]
  );

  // BDD Style
  given("BDD given step", async () => {});
  when("BDD when step", async () => {});
  then("BDD then step", async () => {
    expect(true).toBe(true);
  });

  // AAA Pattern
  arrange("AAA arrange step", async () => {});
  act("AAA act step", async () => {});
  assert("AAA assert step", async () => {
    expect(true).toBe(true);
  });

  // Alternative 1
  setup("alternative setup step", async () => {});
  execute("alternative execute step", async () => {});
  verify("alternative verify step", async () => {
    expect(true).toBe(true);
  });

  // Alternative 2
  context("alternative context step", async () => {});
  action("alternative action step", async () => {});

  // And/But
  and("continuation step", async () => {});
  but("negative case step", async () => {
    expect(true).toBe(true);
  });
});
