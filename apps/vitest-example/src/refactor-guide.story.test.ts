/**
 * Refactor Guide: From existing Vitest tests to executable-stories
 *
 * This guide teaches executable-stories patterns ONE CONCEPT AT A TIME.
 * Each step introduces exactly one new idea.
 *
 * Original code we're refactoring:
 * ```
 * import { it, expect } from "vitest";
 * import { add, subtract } from "./calculator.js";
 *
 * it("addition works", () => {
 *   expect(add(2, 3)).toBe(5);
 * });
 *
 * it("subtraction works", () => {
 *   expect(subtract(10, 4)).toBe(6);
 * });
 * ```
 *
 * No story structure, no generated docs. We'll add both without throwing away existing tests.
 *
 * Pattern: it() + story.init(task) + story.given/when/then (markers only).
 */
import { story } from 'executable-stories-vitest';
import { describe, expect, it } from 'vitest';
import { add, multiply, subtract } from './calculator.js';

// ═══════════════════════════════════════════════════════════════════════════════
// PART 1: EXISTING (NO LIBRARY)
// ═══════════════════════════════════════════════════════════════════════════════
// Plain Vitest tests. No executable-stories imports used yet.

describe('Part 1: Existing (no library)', () => {
  it('Step 0 — Starting point: plain test, no story, no docs', () => {
    /**
     * WHAT: A normal Vitest test that asserts calculator behavior.
     *
     * WHY THIS IS THE BASELINE:
     * - Tests pass and give confidence
     * - No user-story docs are generated
     * - Stakeholders don't see readable Given/When/Then
     *
     * BEFORE: (this step — we're here)
     * AFTER:  Part 2 adds story.init(task) so the same scenario generates Markdown docs.
     */
    expect(add(2, 3)).toBe(5);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PART 2: INTRODUCE story.init(task)
// ═══════════════════════════════════════════════════════════════════════════════
// Same scenario expressed as Given/When/Then; reporter generates docs.

describe('Part 2: Introduce story.init(task)', () => {
  /**
   * Step 1 — WHAT: Express the scenario with story.init(task) + story.given/when/then.
   * WHY: One source of truth; reporter generates Markdown; docs stay in sync.
   * BEFORE: plain it("addition works", () => { expect(add(2,3)).toBe(5); })
   * AFTER:  it("title", ({ task }) => { story.init(task); story.given(...); ... })
   */
  it('Calculator adds two numbers', ({ task }) => {
    story.init(task);

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
// PART 3: FRAMEWORK-NATIVE WITH story.init(task)
// ═══════════════════════════════════════════════════════════════════════════════
// Keep existing it(); add story.init(task) so it appears in the story report.

describe('Part 3: Framework-native with story.init(task)', () => {
  it('Step 2 — Keep it(), add story.init(task): existing test appears in docs', ({
    task,
  }) => {
    /**
     * WHAT: Keep your existing it() but call story.init(task) inside it.
     *
     * WHY THIS IS BETTER:
     * - No need to rewrite tests with given/when/then
     * - The test still runs as one Vitest test
     * - The reporter adds it to the story report
     *
     * BEFORE: it("subtraction works", () => { expect(subtract(10,4)).toBe(6); })
     * AFTER:  it("...", ({ task }) => { story.init(task); expect(...); })
     */
    story.init(task);
    expect(subtract(10, 4)).toBe(6);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PART 4: FULL PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════
// Mix story patterns with framework-native it(); optional story.note() for rich docs.

describe('Part 4: Full patterns', () => {
  // Step 3a — it() with story.init(task) + given/when/then markers
  it('Calculator multiplies two numbers', ({ task }) => {
    story.init(task);
    story.given('two numbers 7 and 6');
    story.when('they are multiplied');
    story.then('the result is 42');
    expect(multiply(7, 6)).toBe(42);
  });

  it('Step 3b — Framework-native test with story.init(task) in the same describe', ({
    task,
  }) => {
    story.init(task);
    expect(multiply(7, 6)).toBe(42);
  });

  // Step 3c — it() with story.note() for rich docs
  it('Calculator adds with a note', ({ task }) => {
    story.init(task);
    story.note(
      'Using small numbers; the note appears in the generated Markdown.',
    );
    story.given('two numbers 1 and 2');
    story.when('they are added');
    story.then('the result is 3');
    expect(add(1, 2)).toBe(3);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PART 5: GENERATED DOCS
// ═══════════════════════════════════════════════════════════════════════════════
// After running: pnpm test (or npx vitest run)
// Open: src/refactor-guide.story.docs.md
// The reporter writes colocated Markdown with all stories from this file.
