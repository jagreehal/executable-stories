import { expect, test } from '@playwright/test';
import { story } from 'executable-stories-playwright';
import { add, divide, multiply, subtract } from './calculator.js';

test.describe('Calculator', () => {
  // Specified but not built yet: renders as a planned scenario in the report.
  test.fixme('Calculator rejects non-numeric input', async () => {});

  // A story that starts, then bails at runtime. It is a skipped scenario, not a
  // planned one, and it must appear exactly once.
  test('Calculator handles very large numbers', async ({}, testInfo) => {
    story.init(testInfo);
    story.given('two very large numbers');
    test.fixme(true, 'overflow handling is not finished');
    story.then('the result does not overflow');
  });

  test('Calculator adds two numbers', async ({}, testInfo) => {
    story.init(testInfo);

    story.given('two numbers 5 and 3');
    const a = 5;
    const b = 3;

    story.when('the numbers are added');
    const result = add(a, b);

    story.then('the result is 8');
    expect(result).toBe(8);
  });

  test('Calculator subtracts two numbers', async ({}, testInfo) => {
    story.init(testInfo);

    story.given('two numbers 10 and 4');
    const a = 10;
    const b = 4;

    story.when('the second is subtracted from the first');
    const result = subtract(a, b);

    story.then('the result is 6');
    expect(result).toBe(6);
  });

  test('Calculator multiplies two numbers', async ({}, testInfo) => {
    story.init(testInfo);

    story.given('two numbers 7 and 6');
    const a = 7;
    const b = 6;

    story.note('This is a note3');

    story.when('the numbers are multiplied');
    const result = multiply(a, b);

    story.then('the result is 42');
    expect(result).toBe(42);
  });

  test('Calculator divides two numbers', async ({}, testInfo) => {
    story.init(testInfo);

    story.given('two numbers 20 and 4');
    const a = 20;
    const b = 4;

    story.when('the first is divided by the second');
    const result = divide(a, b);

    story.then('the result is 5');
    expect(result).toBe(5);
  });

  test('Calculator throws error on division by zero', async ({}, testInfo) => {
    story.init(testInfo);

    story.note('Division by zero should throw an error');

    story.given('a number 10 and zero');
    const a = 10;
    const b = 0;
    let error: Error | null = null;

    story.when('division is attempted');
    try {
      divide(a, b);
    } catch (e) {
      error = e as Error;
    }

    story.then('an error is thrown');
    expect(error).not.toBeNull();
    expect(error?.message).toBe('Cannot divide by zero');
  });
});
