/**
 * Refactor Guide: From existing Jest tests to executable-stories.
 * Use describe/it + story.init() + story.given/when/then (markers only).
 */
import { describe, expect, it, test } from '@jest/globals';
import { story } from 'executable-stories-jest';
import { add, multiply, subtract } from './calculator.js';

// ═══════════════════════════════════════════════════════════════════════════════
// PART 1: EXISTING (NO LIBRARY)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Part 1: Existing (no library)', () => {
  test('Step 0 — Starting point: plain test, no story, no docs', () => {
    expect(add(2, 3)).toBe(5);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PART 2: INTRODUCE story.init() + story.given/when/then
// ═══════════════════════════════════════════════════════════════════════════════

describe('Part 2: Introduce story (it + story.init)', () => {
  it('Calculator adds two numbers', () => {
    story.init();
    story.given('two numbers 2 and 3');
    const a = 2;
    const b = 3;
    story.when('they are added');
    const result = add(a, b);
    story.then('the result is 5');
    expect(result).toBe(5);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PART 3: FRAMEWORK-NATIVE WITH story.init()
// ═══════════════════════════════════════════════════════════════════════════════

describe('Part 3: Framework-native with story.init()', () => {
  test('Step 2 — Keep test(), add story.init(): existing test appears in docs', () => {
    story.init();
    expect(subtract(10, 4)).toBe(6);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PART 4: FULL PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Part 4: Full patterns', () => {
  it('Calculator multiplies two numbers', () => {
    story.init();
    story.given('two numbers 7 and 6');
    story.when('they are multiplied');
    story.then('the result is 42');
    expect(multiply(7, 6)).toBe(42);
  });

  test('Step 3b — Framework-native test with story.init() in the same describe', () => {
    story.init();
    expect(multiply(7, 6)).toBe(42);
  });

  it('Calculator adds with a note', () => {
    story.init();
    story.note(
      'Using small numbers; the note appears in the generated Markdown.',
    );
    story.given('two numbers 1 and 2');
    story.when('they are added');
    story.then('the result is 3');
    expect(add(1, 2)).toBe(3);
  });
});
