import { expect, test } from '@playwright/test';
import { story } from 'executable-stories-playwright';
import { add, divide, multiply, subtract } from './calculator.js';

test.describe('Wrapped Steps (fn/expect)', () => {
  test('Calculator adds two numbers using fn and expect', async ({}, testInfo) => {
    story.init(testInfo);

    const a = story.fn('Given', 'number a is 5', () => 5);
    const b = story.fn('Given', 'number b is 3', () => 3);

    const result = story.fn('When', 'the numbers are added', () => add(a, b));

    story.expect('the result is 8', () => {
      expect(result).toBe(8);
    });
  });

  test('Calculator subtracts using fn with timing', async ({}, testInfo) => {
    story.init(testInfo);

    const nums = story.fn('Given', 'two numbers 10 and 4', () => ({
      a: 10,
      b: 4,
    }));

    const result = story.fn('When', 'the second is subtracted from the first', () =>
      subtract(nums.a, nums.b),
    );

    story.expect('the result is 6', () => {
      expect(result).toBe(6);
    });
  });

  test('Calculator division by zero captured in fn', async ({}, testInfo) => {
    story.init(testInfo);

    story.fn('Given', 'a number 10 and zero', () => {});

    story.expect('division by zero throws an error', () => {
      expect(() => divide(10, 0)).toThrow('Cannot divide by zero');
    });
  });

  test('Mixed markers and wrapped steps', async ({}, testInfo) => {
    story.init(testInfo);

    story.given('the calculator is ready');

    const result = story.fn('When', 'we multiply 7 by 6', () => multiply(7, 6));

    story.expect('the result is 42', () => {
      expect(result).toBe(42);
    });

    story.and('the result is a positive number');
    expect(result).toBeGreaterThan(0);
  });

  test('Async fn wraps async operations with timing', async ({}, testInfo) => {
    story.init(testInfo);

    const data = await story.fn('Given', 'data fetched asynchronously', async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { a: 5, b: 3 };
    });

    const result = await story.fn('When', 'async addition is performed', async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return add(data.a, data.b);
    });

    await story.expect('the async result is 8', async () => {
      expect(result).toBe(8);
    });
  });
});
