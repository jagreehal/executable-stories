import { story } from 'executable-stories-vitest';
import { describe, expect, it } from 'vitest';
import { add, divide, multiply, subtract } from './calculator.js';

describe('Wrapped Steps (fn/expect)', () => {
  it('Calculator adds two numbers using fn and expect', ({ task }) => {
    story.init(task);

    const a = story.fn('Given', 'number a is 5', () => 5);
    const b = story.fn('Given', 'number b is 3', () => 3);

    const result = story.fn('When', 'the numbers are added', () => add(a, b));

    story.expect('the result is 8', () => {
      expect(result).toBe(8);
    });
  });

  it('Calculator subtracts using fn with timing', ({ task }) => {
    story.init(task);

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

  it('Calculator division by zero captured in fn', ({ task }) => {
    story.init(task);

    story.fn('Given', 'a number 10 and zero', () => {});

    story.expect('division by zero throws an error', () => {
      expect(() => divide(10, 0)).toThrow('Cannot divide by zero');
    });
  });

  it('Mixed markers and wrapped steps', ({ task }) => {
    story.init(task);

    story.given('the calculator is ready');

    const result = story.fn('When', 'we multiply 7 by 6', () => multiply(7, 6));

    story.expect('the result is 42', () => {
      expect(result).toBe(42);
    });

    story.and('the result is a positive number');
    expect(result).toBeGreaterThan(0);
  });

  it('Async fn wraps async operations with timing', async ({ task }) => {
    story.init(task);

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
