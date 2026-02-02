/**
 * Comprehensive demonstration of error handling and failure scenarios in Playwright.
 *
 * Patterns covered:
 * - Expected failures with .fail modifier (Playwright-specific)
 * - Conditional skipping
 * - Todo for incomplete tests
 * - Fixme for known issues
 * - Error documentation
 * - Exception testing patterns
 */
import { story, given, when, then, and, doc } from "playwright-executable-stories";
import { expect } from "@playwright/test";

// ============================================================================
// Expected Failures with .fail (Playwright-specific)
// ============================================================================

story("Expected failures with .fail modifier", () => {
  doc.note("The .fail modifier expects the step to fail (Playwright-specific)");
  doc.tag(["error-handling", "fail"]);

  given("a function that throws", async () => {
    // Setup
  });

  when.fail("the function is called and throws", async () => {
    throw new Error("This error is expected");
  });

  then("test continues after expected failure", async () => {
    expect(true).toBe(true);
  });
});

story("Multiple expected failures in sequence", () => {
  doc.note("Multiple steps can be marked as expected failures");

  given.fail("setup that throws", async () => {
    throw new Error("Setup error");
  });

  when.fail("action that throws", async () => {
    throw new Error("Action error");
  });

  then.fail("assertion that throws", async () => {
    throw new Error("Assertion error");
  });

  and("normal step after failures", async () => {
    expect(true).toBe(true);
  });
});

// ============================================================================
// Fixme for Known Issues (Playwright-specific)
// ============================================================================

story("Fixme modifier for known issues", () => {
  doc.note("The .fixme modifier marks tests with known issues (Playwright-specific)");
  doc.tag(["fixme", "known-issue"]);

  given("setup for fixme test", async () => {
    // Setup
  });

  when.fixme("action with known bug", async () => {
    // This would fail due to a known bug
  });

  then("test continues after fixme step", async () => {
    expect(true).toBe(true);
  });
});

/* eslint-disable playwright-executable-stories/require-story-context-for-steps -- story.fixme callback */
story.fixme("Entire story marked as fixme", () => {
  doc.note("This entire story has a known issue");

  given("this won't run until fixed", async () => {});
  when("bug is present", async () => {});
  then("test would fail", async () => {
    expect(false).toBe(true);
  });
});
/* eslint-enable playwright-executable-stories/require-story-context-for-steps */

// ============================================================================
// Error Testing Patterns
// ============================================================================

story("Testing thrown errors with try/catch", () => {
  doc.note("Traditional try/catch pattern for error testing");

  const dangerousOperation = () => {
    throw new Error("Operation failed: invalid input");
  };

  let caughtError: Error | null = null;

  given("a function that will throw", async () => {
    // Function is defined above
  });

  when("the function is called in try/catch", async () => {
    try {
      dangerousOperation();
    } catch (e) {
      caughtError = e as Error;
    }
  });

  then("error is caught", async () => {
    expect(caughtError).not.toBeNull();
  });

  and("error message is correct", async () => {
    expect(caughtError?.message).toBe("Operation failed: invalid input");
  });

  and("error is an instance of Error", async () => {
    expect(caughtError).toBeInstanceOf(Error);
  });
});

story("Testing errors with Playwright toThrow", () => {
  doc.note("Using Playwright's toThrow matcher for clean error assertions");

  const throwingFunction = () => {
    throw new Error("Expected error message");
  };

  const throwingTypeError = () => {
    throw new TypeError("Type mismatch");
  };

  given("functions that throw different errors", async () => {
    // Functions defined above
  });

  then("toThrow matches any error", async () => {
    expect(throwingFunction).toThrow();
  });

  then("toThrow matches specific message", async () => {
    expect(throwingFunction).toThrow("Expected error message");
  });

  then("toThrow matches error type", async () => {
    expect(throwingTypeError).toThrow(TypeError);
  });

  then("toThrow matches with regex", async () => {
    expect(throwingFunction).toThrow(/Expected.*message/);
  });
});

// ============================================================================
// Conditional Skipping
// ============================================================================

story("Conditional skipping based on environment", () => {
  doc.note("Skip steps based on runtime conditions");

  const isCI = process.env.CI === "true";
  const isProduction = process.env.NODE_ENV === "production";

  given("environment is checked", async () => {
    doc.kv("CI Environment", isCI);
    doc.kv("Production", isProduction);
  });

  // This step is always skipped since we're not on Windows
  when.skip("Windows-only operation", async () => {
    // Windows-specific code
  });

  // Conditional logic in normal steps
  when("platform-aware operation", async () => {
    if (process.platform === "win32") {
      // Windows logic
    } else {
      // Unix logic
    }
  });

  then("test completes appropriately", async () => {
    expect(true).toBe(true);
  });
});

story("Skip based on browser", () => {
  doc.note("Skip tests for specific browsers");
  doc.tag("browser-specific");

  given("browser is detected", async ({ browserName }) => {
    doc.runtime.kv("Browser", browserName);
  });

  when.skip("webkit-only feature", async () => {
    // Safari-specific test
  });

  then("test completes for other browsers", async () => {
    expect(true).toBe(true);
  });
});

// ============================================================================
// Todo for Incomplete Tests
// ============================================================================

story("Todo steps for planned functionality", () => {
  doc.note("Mark steps as todo when implementation is pending");
  doc.tag(["todo", "planning"]);

  given("existing functionality is tested", async () => {
    expect(true).toBe(true);
  });

  when.todo("new feature is implemented");

  then.todo("new feature works correctly");

  and.todo("new feature handles edge cases");

  then("existing assertions still pass", async () => {
    expect(true).toBe(true);
  });
});

story("Todo as documentation for future work", () => {
  doc.note("Todo steps serve as documentation for planned work");

  given("current state is stable", async () => {});

  // Phase 1 - Complete
  when("phase 1 feature is used", async () => {
    expect(true).toBe(true);
  });

  // Phase 2 - Planned
  when.todo("phase 2 feature is used");

  // Phase 3 - Future
  when.todo("phase 3 feature is used");

  then("phase 1 works", async () => {
    expect(true).toBe(true);
  });

  then.todo("phase 2 works");

  then.todo("phase 3 works");
});

// ============================================================================
// Error Documentation
// ============================================================================

story("Documenting error scenarios", () => {
  doc.note("Error scenarios should be well documented");
  doc.tag("error-documentation");

  interface ValidationResult {
    valid: boolean;
    errors: string[];
  }

  const validate = (input: string): ValidationResult => {
    const errors: string[] = [];
    if (!input) errors.push("Input is required");
    if (input.length < 3) errors.push("Input too short");
    if (input.length > 100) errors.push("Input too long");
    return { valid: errors.length === 0, errors };
  };

  given("a validation function", async () => {
    doc.code(
      "Validation Rules",
      `- Input is required
- Minimum length: 3
- Maximum length: 100`,
      "markdown"
    );
  });

  when("empty input is validated", async () => {
    const result = validate("");
    doc.runtime.json("Validation Result (empty)", result);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Input is required");
  });

  when("short input is validated", async () => {
    const result = validate("ab");
    doc.runtime.json("Validation Result (short)", result);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Input too short");
  });

  when("valid input is validated", async () => {
    const result = validate("valid input");
    doc.runtime.json("Validation Result (valid)", result);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  then("all error cases are documented", async () => {
    doc.table(
      "Error Scenarios",
      ["Input", "Expected Errors"],
      [
        ["(empty)", "Input is required, Input too short"],
        ["ab", "Input too short"],
        ["valid input", "None"],
      ]
    );
  });
});

// ============================================================================
// Async Error Handling
// ============================================================================

story("Async error handling patterns", () => {
  doc.note("Testing errors in async operations");

  const asyncOperation = async (shouldFail: boolean): Promise<string> => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    if (shouldFail) {
      throw new Error("Async operation failed");
    }
    return "success";
  };

  given("an async function that can fail", async () => {});

  when("async error is caught with try/catch", async () => {
    let error: Error | null = null;
    try {
      await asyncOperation(true);
    } catch (e) {
      error = e as Error;
    }
    expect(error?.message).toBe("Async operation failed");
  });

  when("async error is caught with rejects", async () => {
    await expect(asyncOperation(true)).rejects.toThrow("Async operation failed");
  });

  then("successful async operation works", async () => {
    const result = await asyncOperation(false);
    expect(result).toBe("success");
  });
});

// ============================================================================
// Custom Error Types
// ============================================================================

story("Testing custom error types", () => {
  doc.note("Testing application-specific error classes");

  class ValidationError extends Error {
    constructor(
      message: string,
      public field: string,
      public code: string
    ) {
      super(message);
      this.name = "ValidationError";
    }
  }

  class NetworkError extends Error {
    constructor(
      message: string,
      public statusCode: number
    ) {
      super(message);
      this.name = "NetworkError";
    }
  }

  given("custom error classes exist", async () => {
    doc.code(
      "Error Classes",
      `class ValidationError extends Error {
  field: string;
  code: string;
}

class NetworkError extends Error {
  statusCode: number;
}`,
      "typescript"
    );
  });

  when("validation error is thrown", async () => {
    const throwValidationError = () => {
      throw new ValidationError("Invalid email", "email", "INVALID_FORMAT");
    };

    try {
      throwValidationError();
    } catch (e) {
      const error = e as ValidationError;
      expect(error.name).toBe("ValidationError");
      expect(error.field).toBe("email");
      expect(error.code).toBe("INVALID_FORMAT");
    }
  });

  when("network error is thrown", async () => {
    const throwNetworkError = () => {
      throw new NetworkError("Not Found", 404);
    };

    try {
      throwNetworkError();
    } catch (e) {
      const error = e as NetworkError;
      expect(error.name).toBe("NetworkError");
      expect(error.statusCode).toBe(404);
    }
  });

  then("custom errors are properly typed", async () => {
    expect(true).toBe(true);
  });
});

// ============================================================================
// Skipped Story
// ============================================================================

story.skip("Entire story skipped for maintenance", () => {
  doc.note("This story is skipped during maintenance");

  given("this won't run", async () => {
    throw new Error("Should not execute");
  });

  then("nothing is tested", async () => {
    throw new Error("Should not execute");
  });
});

// ============================================================================
// Error Boundary Testing
// ============================================================================

story("Error recovery and fallback patterns", () => {
  doc.note("Testing graceful degradation and recovery");

  interface Result<T> {
    success: boolean;
    data?: T;
    error?: string;
  }

  const safeOperation = <T>(operation: () => T): Result<T> => {
    try {
      return { success: true, data: operation() };
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
  };

  given("a safe wrapper function", async () => {});

  when("successful operation is wrapped", async () => {
    const result = safeOperation(() => 42);
    expect(result.success).toBe(true);
    expect(result.data).toBe(42);
    expect(result.error).toBeUndefined();
  });

  when("failing operation is wrapped", async () => {
    const result = safeOperation(() => {
      throw new Error("Operation failed");
    });
    expect(result.success).toBe(false);
    expect(result.data).toBeUndefined();
    expect(result.error).toBe("Operation failed");
  });

  then("errors are handled gracefully", async () => {
    doc.table(
      "Error Handling Patterns",
      ["Pattern", "Use Case", "Playwright"],
      [
        [".fail", "Expected failures", "Yes"],
        [".fixme", "Known issues", "Yes"],
        ["try/catch", "Runtime capture", "Standard"],
        ["toThrow", "Error assertion", "Standard"],
        ["Result type", "Graceful degradation", "Pattern"],
      ]
    );
  });
});

// ============================================================================
// Page-Level Error Handling
// ============================================================================

story.skip("Page-level error handling", () => {
  // NOTE: Skipped - page state doesn't persist across steps in story model
  doc.note("Handling errors from page interactions");

  given("a page with error-prone content", async ({ page }) => {
    await page.setContent(`
      <html>
        <body>
          <button id="error-btn">Throw Error</button>
          <script>
            document.getElementById('error-btn').addEventListener('click', () => {
              throw new Error('Page error!');
            });
          </script>
        </body>
      </html>
    `);
  });

  when("page error is expected", async ({ page }) => {
    const errors: Error[] = [];
    page.on("pageerror", (error) => errors.push(error));

    await page.click("#error-btn");
    await page.waitForTimeout(100);

    expect(errors.length).toBeGreaterThan(0);
    doc.runtime.kv("Errors captured", errors.length);
  });

  then("page errors can be asserted", async () => {
    expect(true).toBe(true);
  });
});
