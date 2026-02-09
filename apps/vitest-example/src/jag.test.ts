/**
 * Comprehensive demonstration of framework-native test patterns in Vitest.
 *
 * Patterns covered:
 * - story.init(task) for framework-native tests
 * - Using Vitest's it() with story.init(task)
 * - Mixing native tests with story markers
 */
import { story } from 'executable-stories-vitest';
import { describe, expect, it } from 'vitest';
import { add, multiply } from './calculator.js';

describe('Calculator operations - mixed patterns', () => {
  // Framework-native test
  it('simple addition check', ({ task }) => {
    story.init(task);

    story.note('NOTE!!!!');

    expect(add(1, 1)).toBe(2);
  });

  // Another framework-native test
  it('multiplication check', ({ task }) => {
    story.init(task);
    expect(multiply(2, 3)).toBe(6);
  });
});
