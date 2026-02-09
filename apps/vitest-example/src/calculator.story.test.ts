import { story } from 'executable-stories-vitest';
import { describe, expect, it } from 'vitest';
import { add, divide, multiply, subtract } from './calculator.js';

describe('Calculator', () => {
  it('adds two numbers', ({ task }) => {
    story.init(task);

    story.given('two numbers 5 and 3');
    const a = 5;
    const b = 3;

    story.when('I add them together');
    const result = add(a, b);

    story.then('the result is 8');
    expect(result).toBe(8);
  });

  it('subtracts two numbers', ({ task }) => {
    story.init(task);

    story.given('two numbers 10 and 4');
    const a = 10;
    const b = 4;

    story.when('the second is subtracted from the first');
    const result = subtract(a, b);

    story.then('the result is 6');
    expect(result).toBe(6);
  });

  it('multiplies two numbers', ({ task }) => {
    story.init(task);

    story.given('two numbers 7 and 6');
    const a = 7;
    const b = 6;

    story.when('the numbers are multiplied');
    const result = multiply(a, b);

    story.then('the result is 42');
    expect(result).toBe(42);
  });

  it('divides two numbers', ({ task }) => {
    story.init(task);

    story.given('two numbers 20 and 4');
    const a = 20;
    const b = 4;

    story.when('the first is divided by the second');
    const result = divide(a, b);

    story.then('the result is 5');
    expect(result).toBe(5);
  });

  it('throws error on division by zero', ({ task }) => {
    story.init(task);

    story.given('a number 10 and zero');
    const a = 10;
    const b = 0;

    story.note('Division by zero should throw an error');

    story.when('division is attempted');
    let error: Error | null = null;
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
