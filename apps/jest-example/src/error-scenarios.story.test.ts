/**
 * Comprehensive demonstration of error handling and failure scenarios.
 *
 * Patterns covered:
 * - Expected failures with .fails modifier
 * - Conditional skipping
 * - Todo for incomplete tests
 * - Error documentation
 * - Exception testing patterns
 */
import { story, given, when, then, and, doc } from "jest-executable-stories";

// ============================================================================
// Expected Failures with .fails
// ============================================================================

story("Expected failures with .fails modifier", () => {
  doc.note("The .fails modifier expects the step to throw an error");
  doc.tag("error-handling", "fails");

  given("a function that throws", () => {
    // Setup
  });

  when.fails("the function is called and throws", () => {
    throw new Error("This error is expected");
  });

  then("test continues after expected failure", () => {
    expect(true).toBe(true);
  });
});

story("Multiple expected failures in sequence", () => {
  doc.note("Multiple steps can be marked as expected failures");

  given.fails("setup that throws", () => {
    throw new Error("Setup error");
  });

  when.fails("action that throws", () => {
    throw new Error("Action error");
  });

  then.fails("assertion that throws", () => {
    throw new Error("Assertion error");
  });

  and("normal step after failures", () => {
    expect(true).toBe(true);
  });
});

// ============================================================================
// Error Testing Patterns
// ============================================================================

story("Testing thrown errors with try/catch", () => {
  doc.note("Traditional try/catch pattern for error testing");

  const dangerousOperation = () => {
    throw new Error("Operation failed: invalid input");
  };

  let caughtError: Error | null = null;

  given("a function that will throw", () => {
    // Function is defined above
  });

  when("the function is called in try/catch", () => {
    try {
      dangerousOperation();
    } catch (e) {
      caughtError = e as Error;
    }
  });

  then("error is caught", () => {
    expect(caughtError).not.toBeNull();
  });

  and("error message is correct", () => {
    expect(caughtError?.message).toBe("Operation failed: invalid input");
  });

  and("error is an instance of Error", () => {
    expect(caughtError).toBeInstanceOf(Error);
  });
});

story("Testing errors with Jest toThrow", () => {
  doc.note("Using Jest's toThrow matcher for clean error assertions");

  const throwingFunction = () => {
    throw new Error("Expected error message");
  };

  const throwingTypeError = () => {
    throw new TypeError("Type mismatch");
  };

  given("functions that throw different errors", () => {
    // Functions defined above
  });

  then("toThrow matches any error", () => {
    expect(throwingFunction).toThrow();
  });

  then("toThrow matches specific message", () => {
    expect(throwingFunction).toThrow("Expected error message");
  });

  then("toThrow matches error type", () => {
    expect(throwingTypeError).toThrow(TypeError);
  });

  then("toThrow matches with regex", () => {
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

  given("environment is checked", () => {
    doc.kv("CI Environment", isCI);
    doc.kv("Production", isProduction);
  });

  // This step is always skipped since we're not on Windows
  when.skip("Windows-only operation", () => {
    // Windows-specific code
  });

  // Conditional logic in normal steps
  when("platform-aware operation", () => {
    if (process.platform === "win32") {
      // Windows logic
    } else {
      // Unix logic
    }
  });

  then("test completes appropriately", () => {
    expect(true).toBe(true);
  });
});

story("Skip based on feature flags", () => {
  doc.note("Skip tests for features not yet enabled");
  doc.tag("feature-flag");

  const featureFlags = {
    newUI: false,
    betaFeatures: false,
    experimentalAPI: true,
  };

  given("feature flags are configured", () => {
    doc.json("Feature Flags", featureFlags);
  });

  when.skip("new UI is used", () => {
    // Skipped because newUI is false
  });

  when.skip("beta feature is accessed", () => {
    // Skipped because betaFeatures is false
  });

  when("experimental API is called", () => {
    // This runs because experimentalAPI is true
    expect(featureFlags.experimentalAPI).toBe(true);
  });

  then("only enabled features are tested", () => {
    expect(true).toBe(true);
  });
});

// ============================================================================
// Todo for Incomplete Tests
// ============================================================================

story("Todo steps for planned functionality", () => {
  doc.note("Mark steps as todo when implementation is pending");
  doc.tag("todo", "planning");

  given("existing functionality is tested", () => {
    expect(true).toBe(true);
  });

  when.todo("new feature is implemented");

  then.todo("new feature works correctly");

  and.todo("new feature handles edge cases");

  then("existing assertions still pass", () => {
    expect(true).toBe(true);
  });
});

story("Todo as documentation for future work", () => {
  doc.note("Todo steps serve as documentation for planned work");

  given("current state is stable", () => {});

  // Phase 1 - Complete
  when("phase 1 feature is used", () => {
    expect(true).toBe(true);
  });

  // Phase 2 - Planned
  when.todo("phase 2 feature is used");

  // Phase 3 - Future
  when.todo("phase 3 feature is used");

  then("phase 1 works", () => {
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

  given("a validation function", () => {
    doc.code(
      "Validation Rules",
      `- Input is required
- Minimum length: 3
- Maximum length: 100`,
      "markdown"
    );
  });

  when("empty input is validated", () => {
    const result = validate("");
    // doc.json("Validation Result (empty)", result);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Input is required");
  });

  when("short input is validated", () => {
    const result = validate("ab");
    // doc.json("Validation Result (short)", result);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Input too short");
  });

  when("valid input is validated", () => {
    const result = validate("valid input");
    // doc.json("Validation Result (valid)", result);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  then("all error cases are documented", () => {
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

  given("an async function that can fail", () => {});

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

  given("custom error classes exist", () => {
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

  when("validation error is thrown", () => {
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

  when("network error is thrown", () => {
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

  then("custom errors are properly typed", () => {
    expect(true).toBe(true);
  });
});

// ============================================================================
// Skipped Story
// ============================================================================

story.skip("Entire story skipped for maintenance", () => {
  doc.note("This story is skipped during maintenance");

  given("this won't run", () => {
    throw new Error("Should not execute");
  });

  then("nothing is tested", () => {
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

  given("a safe wrapper function", () => {});

  when("successful operation is wrapped", () => {
    const result = safeOperation(() => 42);
    expect(result.success).toBe(true);
    expect(result.data).toBe(42);
    expect(result.error).toBeUndefined();
  });

  when("failing operation is wrapped", () => {
    const result = safeOperation(() => {
      throw new Error("Operation failed");
    });
    expect(result.success).toBe(false);
    expect(result.data).toBeUndefined();
    expect(result.error).toBe("Operation failed");
  });

  then("errors are handled gracefully", () => {
    doc.table(
      "Error Handling Patterns",
      ["Pattern", "Use Case"],
      [
        [".fails", "Expected test failures"],
        ["try/catch", "Runtime error capture"],
        ["toThrow", "Error assertion"],
        ["Result type", "Graceful degradation"],
      ]
    );
  });
});
