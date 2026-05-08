import { describe, expect, it } from 'vitest';
import { story } from 'executable-stories-vitest';

describe('vite-plus example', () => {
  it('adds two numbers', ({ task }) => {
    story.init(task);
    let result = 0;

    story.given('two numbers 2 and 3');
    story.when('they are added', () => {
      result = 2 + 3;
    });
    story.then('the sum is 5', () => {
      expect(result).toBe(5);
    });
  });
});
