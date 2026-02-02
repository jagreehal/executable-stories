/**
 * Refactor Guide: From existing Jest tests to executable-stories
 *
 * This guide teaches executable-stories patterns ONE CONCEPT AT A TIME.
 * Each step introduces exactly one new idea.
 *
 * Original code we're refactoring:
 * ```
 * import { test, expect } from "@jest/globals";
 * import { add, subtract } from "./calculator.js";
 *
 * test("addition works", () => {
 *   expect(add(2, 3)).toBe(5);
 * });
 *
 * test("subtraction works", () => {
 *   expect(subtract(10, 4)).toBe(6);
 * });
 * ```
 *
 * No story structure, no generated docs. We'll add both without throwing away existing tests.
 */
import { test, expect, describe } from "@jest/globals";
import { story, given, when, then, doc } from "jest-executable-stories";
import { add, subtract, multiply } from "./calculator.js";

// ═══════════════════════════════════════════════════════════════════════════════
// PART 1: EXISTING (NO LIBRARY)
// ═══════════════════════════════════════════════════════════════════════════════
// Plain Jest tests. No executable-stories imports used yet.

describe("Part 1: Existing (no library)", () => {
  test("Step 0 — Starting point: plain test, no story, no docs", () => {
    /**
     * WHAT: A normal Jest test that asserts calculator behavior.
     *
     * WHY THIS IS THE BASELINE:
     * - Tests pass and give confidence
     * - No user-story docs are generated
     * - Stakeholders don't see readable Given/When/Then
     *
     * BEFORE: (this step — we're here)
     * AFTER:  Part 2 adds story() so the same scenario generates Markdown docs.
     */
    expect(add(2, 3)).toBe(5);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PART 2: INTRODUCE story()
// ═══════════════════════════════════════════════════════════════════════════════
// Same scenario expressed as Given/When/Then; reporter generates docs.
// (story() is describe() under the hood — it must run at describe level, not inside test().)

describe("Part 2: Introduce story()", () => {
  /**
   * Step 1 — WHAT: Express the scenario as story() with given(), when(), then().
   * WHY: One source of truth; reporter generates Markdown; docs stay in sync.
   * BEFORE: plain test("addition works", () => { expect(add(2,3)).toBe(5); })
   * AFTER:  story("Calculator adds", () => { given(...); when(...); then(...); })
   */
  story("Calculator adds two numbers", () => {
    let a: number, b: number, result: number;

    given("two numbers 2 and 3", () => {
      a = 2;
      b = 3;
    });

    when("they are added", () => {
      result = add(a, b);
    });

    then("the result is 5", () => {
      expect(result).toBe(5);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PART 3: FRAMEWORK-NATIVE WITH doc.story()
// ═══════════════════════════════════════════════════════════════════════════════
// Keep existing test(); add doc.story() so it appears in the story report.

describe("Part 3: Framework-native with doc.story()", () => {
  test("Step 2 — Keep test(), add doc.story(): existing test appears in docs", () => {
    /**
     * WHAT: Keep your existing test() but call doc.story("title") inside it.
     *
     * WHY THIS IS BETTER:
     * - No need to rewrite tests as story() with given/when/then
     * - The test still runs as one Jest test
     * - The reporter adds it to the story report as a one-step story
     *
     * BEFORE: test("subtraction works", () => { expect(subtract(10,4)).toBe(6); })
     * AFTER:  test("...", () => { doc.story("Calculator subtracts"); expect(...); })
     */
    doc.story("Calculator subtracts two numbers");
    expect(subtract(10, 4)).toBe(6);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PART 4: FULL PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════
// Mix story() and framework-native test(); optional doc.note() for rich docs.

describe("Part 4: Full patterns", () => {
  // Step 3a — story() with given/when/then (at describe level; cannot call story() inside test())
  story("Calculator multiplies two numbers", () => {
    given("two numbers 7 and 6", () => {});
    when("they are multiplied", () => {});
    then("the result is 42", () => {
      expect(multiply(7, 6)).toBe(42);
    });
  });

  test("Step 3b — Framework-native test with doc.story() in the same describe", () => {
    doc.story("Calculator multiplies (framework-native)");
    expect(multiply(7, 6)).toBe(42);
  });

  // Step 3c — story() with doc.note() for rich docs (at describe level)
  story("Calculator adds with a note", () => {
    doc.note("Using small numbers; the note appears in the generated Markdown.");
    given("two numbers 1 and 2", () => {});
    when("they are added", () => {});
    then("the result is 3", () => {
      expect(add(1, 2)).toBe(3);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PART 5: GENERATED DOCS
// ═══════════════════════════════════════════════════════════════════════════════
// After running: pnpm test (or npx jest)
// Open: src/refactor-guide.story.docs.md
// The reporter writes colocated Markdown with all stories from this file.
