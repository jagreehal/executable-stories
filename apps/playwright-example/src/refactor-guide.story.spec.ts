/**
 * Refactor Guide: From existing Playwright tests to executable-stories
 *
 * This guide teaches executable-stories patterns ONE CONCEPT AT A TIME.
 * Each step introduces exactly one new idea.
 *
 * Original code we're refactoring:
 * ```
 * import { test, expect } from "@playwright/test";
 * import { add, subtract } from "./calculator.js";
 *
 * test("addition works", async () => {
 *   expect(add(2, 3)).toBe(5);
 * });
 *
 * test("subtraction works", async () => {
 *   expect(subtract(10, 4)).toBe(6);
 * });
 * ```
 *
 * No story structure, no generated docs. We'll add both without throwing away existing tests.
 * (Using calculator only so steps stay sync; no page needed.)
 */
import { test, expect } from "@playwright/test";
import { story, given, when, then, doc } from "playwright-executable-stories";
import { add, subtract, multiply } from "./calculator.js";

// ═══════════════════════════════════════════════════════════════════════════════
// PART 1: EXISTING (NO LIBRARY)
// ═══════════════════════════════════════════════════════════════════════════════
// Plain Playwright tests. No executable-stories imports used yet.

test.describe("Part 1: Existing (no library)", () => {
  test("Step 0 — Starting point: plain test, no story, no docs", async () => {
    /**
     * WHAT: A normal Playwright test that asserts calculator behavior.
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
// (story() is test.describe() under the hood — it must run at describe level, not inside test().)

test.describe("Part 2: Introduce story()", () => {
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

test.describe("Part 3: Framework-native with doc.story()", () => {
  test("Step 2 — Keep test(), add doc.story(): existing test appears in docs", async () => {
    /**
     * WHAT: Keep your existing test() but call doc.story("title") inside it.
     *
     * WHY THIS IS BETTER:
     * - No need to rewrite tests as story() with given/when/then
     * - The test still runs as one Playwright test
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

test.describe("Part 4: Full patterns", () => {
  // Step 3a — story() with given/when/then (at describe level; cannot call story() inside test())
  story("Calculator multiplies two numbers", () => {
    given("two numbers 7 and 6", () => {});
    when("they are multiplied", () => {});
    then("the result is 42", () => {
      expect(multiply(7, 6)).toBe(42);
    });
  });

  test("Step 3b — Framework-native test with doc.story() in the same describe", async () => {
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
// After running: pnpm test (or npx playwright test)
// Open: src/refactor-guide.story.docs.md (or colocated path per reporter config)
// The reporter writes colocated Markdown with all stories from this file.
