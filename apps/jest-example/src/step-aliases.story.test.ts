/**
 * Comprehensive demonstration of ALL step function aliases.
 *
 * Step aliases provide semantic alternatives to given/when/then:
 * - AAA Pattern: arrange, act, assert
 * - Alternative: setup, execute, verify
 * - Context/Action: context, action
 *
 * All aliases support the same modifiers: .skip, .only, .todo, .fails
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
} from "jest-executable-stories";

// ============================================================================
// AAA Pattern: Arrange-Act-Assert
// ============================================================================

story("AAA Pattern: Arrange-Act-Assert", () => {
  doc.note("Classic testing pattern using arrange/act/assert aliases");
  doc.tag("aaa-pattern");

  let calculator: { add: (a: number, b: number) => number };
  let result: number;

  arrange("calculator is initialized", () => {
    calculator = {
      add: (a, b) => a + b,
    };
  });

  arrange("input values are prepared", () => {
    // Additional arrangement
  });

  act("addition is performed", () => {
    result = calculator.add(5, 3);
  });

  assert("result equals expected value", () => {
    expect(result).toBe(8);
  });

  assert("result is a number", () => {
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

  setup("service is configured", () => {
    service = {
      process: (data) => data.toUpperCase(),
    };
  });

  setup("dependencies are mocked", () => {
    // Additional setup
  });

  execute("service processes input", () => {
    output = service.process("hello");
  });

  verify("output is transformed correctly", () => {
    expect(output).toBe("HELLO");
  });

  verify("output is not empty", () => {
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

  context("user context is established", () => {
    state = {
      user: { name: "Alice", role: "admin" },
    };
  });

  context("permissions are set", () => {
    // Additional context
  });

  action("user performs privileged operation", () => {
    actionResult = state.user.role === "admin";
  });

  then("operation succeeds", () => {
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
  given("initial data exists", () => {
    data = [1, 2, 3, 4, 5];
  });

  // Using AAA style for additional arrangement
  arrange("data is validated", () => {
    expect(data.length).toBeGreaterThan(0);
  });

  // Using context for state establishment
  context("sum accumulator is initialized", () => {
    sum = 0;
  });

  // Using execute for operation
  execute("sum is calculated", () => {
    sum = data.reduce((a, b) => a + b, 0);
  });

  // Using verify for assertion
  verify("sum is correct", () => {
    expect(sum).toBe(15);
  });

  // Using assert for additional check
  assert("sum is positive", () => {
    expect(sum).toBeGreaterThan(0);
  });
});

// ============================================================================
// Aliases with Modifiers
// ============================================================================

story("Aliases support all modifiers", () => {
  doc.note("All aliases support .skip, .todo, and .fails modifiers");

  // arrange modifiers
  arrange("normal arrangement", () => {});
  arrange.skip("skipped arrangement", () => {});
  arrange.todo("todo arrangement");

  // act modifiers
  act("normal action", () => {});
  act.skip("skipped action", () => {});
  act.todo("todo action");

  // assert modifiers
  assert("normal assertion", () => {
    expect(true).toBe(true);
  });
  assert.skip("skipped assertion", () => {});
  assert.todo("todo assertion");

  // setup modifiers
  setup.skip("skipped setup", () => {});
  setup.todo("todo setup");

  // execute modifiers
  execute.skip("skipped execution", () => {});
  execute.todo("todo execution");

  // verify modifiers
  verify("final verification", () => {
    expect(true).toBe(true);
  });
  verify.skip("skipped verification", () => {});
  verify.todo("todo verification");

  // context modifiers
  context.skip("skipped context", () => {});
  context.todo("todo context");

  // action modifiers
  action.skip("skipped action step", () => {});
  action.todo("todo action step");
});

// ============================================================================
// Fails Modifier with Aliases
// ============================================================================

story("Aliases with fails modifier", () => {
  doc.note("The .fails modifier works with all aliases");

  arrange("setup complete", () => {});

  arrange.fails("arrangement that should fail", () => {
    throw new Error("Expected arrangement error");
  });

  act.fails("action that should fail", () => {
    throw new Error("Expected action error");
  });

  assert.fails("assertion that should fail", () => {
    throw new Error("Expected assertion error");
  });

  verify("test continues after expected failures", () => {
    expect(true).toBe(true);
  });
});

// ============================================================================
// Steps Object Style
// ============================================================================

story("Using steps parameter for aliases", (steps) => {
  doc.note("Aliases are also available via the steps parameter");

  steps.arrange("arrange via steps", () => {});
  steps.act("act via steps", () => {});
  steps.assert("assert via steps", () => {
    expect(true).toBe(true);
  });

  steps.setup("setup via steps", () => {});
  steps.execute("execute via steps", () => {});
  steps.verify("verify via steps", () => {
    expect(true).toBe(true);
  });

  steps.context("context via steps", () => {});
  steps.action("action via steps", () => {});
});

// ============================================================================
// Real-World Example Using Aliases
// ============================================================================

story("User registration flow using aliases", () => {
  doc.note("Realistic example using arrange/act/assert pattern");
  doc.tag("user-flow", "registration");

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
  arrange("valid user data is prepared", () => {
    _userData = {
      email: "test@example.com",
      password: "SecurePass123!",
      name: "Test User",
    };
  });

  arrange("email is unique in the system", () => {
    // Mock database check
  });

  // Act phase
  act("registration is submitted", () => {
    // Simulate registration
    result = {
      success: true,
      userId: "user-123",
    };
  });

  // Assert phase
  assert("registration succeeds", () => {
    expect(result.success).toBe(true);
  });

  assert("user ID is generated", () => {
    expect(result.userId).toBeDefined();
    expect(result.userId).toMatch(/^user-/);
  });

  assert("no error is returned", () => {
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
  given("BDD given step", () => {});
  when("BDD when step", () => {});
  then("BDD then step", () => {
    expect(true).toBe(true);
  });

  // AAA Pattern
  arrange("AAA arrange step", () => {});
  act("AAA act step", () => {});
  assert("AAA assert step", () => {
    expect(true).toBe(true);
  });

  // Alternative 1
  setup("alternative setup step", () => {});
  execute("alternative execute step", () => {});
  verify("alternative verify step", () => {
    expect(true).toBe(true);
  });

  // Alternative 2
  context("alternative context step", () => {});
  action("alternative action step", () => {});

  // And/But
  and("continuation step", () => {});
  but("negative case step", () => {
    expect(true).toBe(true);
  });
});
