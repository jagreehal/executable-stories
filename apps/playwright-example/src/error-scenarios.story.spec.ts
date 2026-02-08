/**
 * Comprehensive demonstration of error handling and failure scenarios.
 *
 * Patterns covered:
 * - Error documentation
 * - Exception testing patterns (try/catch, toThrow)
 * - Async error handling
 * - Custom error types
 *
 * Note: The .fails modifier is not available; use try/catch or expect().rejects for expected failures.
 * Use try/catch or expect().toThrow() patterns instead.
 */
import { expect, test } from '@playwright/test';
import { story } from 'executable-stories-playwright';

test.describe('Error Scenarios', () => {
  // ============================================================================
  // Error Testing Patterns
  // ============================================================================

  test('Testing thrown errors with try/catch', async ({}, testInfo) => {
    story.init(testInfo);
    story.note('Traditional try/catch pattern for error testing');

    const dangerousOperation = () => {
      throw new Error('Operation failed: invalid input');
    };

    let caughtError: Error | null = null;

    story.given('a function that will throw');
    // Function is defined above

    story.when('the function is called in try/catch');
    try {
      dangerousOperation();
    } catch (e) {
      caughtError = e as Error;
    }

    story.then('error is caught');
    expect(caughtError).not.toBeNull();

    story.and('error message is correct');
    expect(caughtError?.message).toBe('Operation failed: invalid input');

    story.and('error is an instance of Error');
    expect(caughtError).toBeInstanceOf(Error);
  });

  test('Testing errors with Jest toThrow', async ({}, testInfo) => {
    story.init(testInfo);
    story.note("Using Jest's toThrow matcher for clean error assertions");

    const throwingFunction = () => {
      throw new Error('Expected error message');
    };

    const throwingTypeError = () => {
      throw new TypeError('Type mismatch');
    };

    story.given('functions that throw different errors');
    // Functions defined above

    story.then('toThrow matches any error');
    expect(throwingFunction).toThrow();

    story.then('toThrow matches specific message');
    expect(throwingFunction).toThrow('Expected error message');

    story.then('toThrow matches error type');
    expect(throwingTypeError).toThrow(TypeError);

    story.then('toThrow matches with regex');
    expect(throwingFunction).toThrow(/Expected.*message/);
  });

  // ============================================================================
  // .fails modifier is not supported - this section shows the try/catch alternative
  // ============================================================================

  test.skip('Expected failures with .fails modifier (use try/catch or toThrow instead)', async ({}, testInfo) => {
    story.init(testInfo);
    story.note(
      'Step-level .fails is not supported; use try/catch or expect().rejects.',
    );
    story.note('Use try/catch or expect().toThrow() patterns instead');
    expect(true).toBe(true);
  });

  // ============================================================================
  // Error Documentation
  // ============================================================================

  test('Documenting error scenarios', async ({}, testInfo) => {
    story.init(testInfo);
    story.note('Error scenarios should be well documented');
    story.tag(['error-documentation']);

    interface ValidationResult {
      valid: boolean;
      errors: string[];
    }

    const validate = (input: string): ValidationResult => {
      const errors: string[] = [];
      if (!input) errors.push('Input is required');
      if (input.length < 3) errors.push('Input too short');
      if (input.length > 100) errors.push('Input too long');
      return { valid: errors.length === 0, errors };
    };

    story.given('a validation function');
    story.code({
      label: 'Validation Rules',
      content: `- Input is required
- Minimum length: 3
- Maximum length: 100`,
      lang: 'markdown',
    });

    story.when('empty input is validated');
    const emptyResult = validate('');
    expect(emptyResult.valid).toBe(false);
    expect(emptyResult.errors).toContain('Input is required');

    story.when('short input is validated');
    const shortResult = validate('ab');
    expect(shortResult.valid).toBe(false);
    expect(shortResult.errors).toContain('Input too short');

    story.when('valid input is validated');
    const validResult = validate('valid input');
    expect(validResult.valid).toBe(true);
    expect(validResult.errors).toHaveLength(0);

    story.then('all error cases are documented');
    story.table({
      label: 'Error Scenarios',
      columns: ['Input', 'Expected Errors'],
      rows: [
        ['(empty)', 'Input is required, Input too short'],
        ['ab', 'Input too short'],
        ['valid input', 'None'],
      ],
    });
  });

  // ============================================================================
  // Async Error Handling
  // ============================================================================

  test('Async error handling patterns', async ({}, testInfo) => {
    story.init(testInfo);
    story.note('Testing errors in async operations');

    const asyncOperation = async (shouldFail: boolean): Promise<string> => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      if (shouldFail) {
        throw new Error('Async operation failed');
      }
      return 'success';
    };

    story.given('an async function that can fail');

    story.when('async error is caught with try/catch');
    let error: Error | null = null;
    try {
      await asyncOperation(true);
    } catch (e) {
      error = e as Error;
    }
    expect(error?.message).toBe('Async operation failed');

    story.when('async error is caught with rejects');
    await expect(asyncOperation(true)).rejects.toThrow(
      'Async operation failed',
    );

    story.then('successful async operation works');
    const result = await asyncOperation(false);
    expect(result).toBe('success');
  });

  // ============================================================================
  // Custom Error Types
  // ============================================================================

  test('Testing custom error types', async ({}, testInfo) => {
    story.init(testInfo);
    story.note('Testing application-specific error classes');

    class ValidationError extends Error {
      constructor(
        message: string,
        public field: string,
        public code: string,
      ) {
        super(message);
        this.name = 'ValidationError';
      }
    }

    class NetworkError extends Error {
      constructor(
        message: string,
        public statusCode: number,
      ) {
        super(message);
        this.name = 'NetworkError';
      }
    }

    story.given('custom error classes exist');
    story.code({
      label: 'Error Classes',
      content: `class ValidationError extends Error {
  field: string;
  code: string;
}

class NetworkError extends Error {
  statusCode: number;
}`,
      lang: 'typescript',
    });

    story.when('validation error is thrown');
    const throwValidationError = async () => {
      throw new ValidationError('Invalid email', 'email', 'INVALID_FORMAT');
    };

    try {
      await throwValidationError();
    } catch (e) {
      const validationError = e as ValidationError;
      expect(validationError.name).toBe('ValidationError');
      expect(validationError.field).toBe('email');
      expect(validationError.code).toBe('INVALID_FORMAT');
    }

    story.when('network error is thrown');
    const throwNetworkError = async () => {
      throw new NetworkError('Not Found', 404);
    };

    try {
      await throwNetworkError();
    } catch (e) {
      const networkError = e as NetworkError;
      expect(networkError.name).toBe('NetworkError');
      expect(networkError.statusCode).toBe(404);
    }

    story.then('custom errors are properly typed');
    expect(true).toBe(true);
  });

  // ============================================================================
  // Skipped Story - use test.skip for whole test
  // ============================================================================

  test.skip('Entire story skipped for maintenance', async ({}, testInfo) => {
    story.init(testInfo);
    story.note('This story is skipped during maintenance');

    story.given("this won't run");
    throw new Error('Should not execute');
  });

  // ============================================================================
  // Error Boundary Testing
  // ============================================================================

  test('Error recovery and fallback patterns', async ({}, testInfo) => {
    story.init(testInfo);
    story.note('Testing graceful degradation and recovery');

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

    story.given('a safe wrapper function');

    story.when('successful operation is wrapped');
    const successResult = safeOperation(() => 42);
    expect(successResult.success).toBe(true);
    expect(successResult.data).toBe(42);
    expect(successResult.error).toBeUndefined();

    story.when('failing operation is wrapped');
    const failResult = safeOperation(() => {
      throw new Error('Operation failed');
    });
    expect(failResult.success).toBe(false);
    expect(failResult.data).toBeUndefined();
    expect(failResult.error).toBe('Operation failed');

    story.then('errors are handled gracefully');
    story.table({
      label: 'Error Handling Patterns',
      columns: ['Pattern', 'Use Case'],
      rows: [
        ['try/catch', 'Runtime error capture'],
        ['toThrow', 'Error assertion'],
        ['Result type', 'Graceful degradation'],
      ],
    });
  });
});
