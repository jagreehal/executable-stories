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
 */
import { it, expect, describe } from "vitest";
import { story, doc, type StepsApi } from "vitest-executable-stories";
import { add, subtract, multiply } from "./calculator.js";

// ═══════════════════════════════════════════════════════════════════════════════
// PART 1: EXISTING (NO LIBRARY)
// ═══════════════════════════════════════════════════════════════════════════════
// Plain Vitest tests. No executable-stories imports used yet.

describe("Part 1: Existing (no library)", () => {
  it("Step 0 — Starting point: plain test, no story, no docs", () => {
    /**
     * WHAT: A normal Vitest test that asserts calculator behavior.
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
// (story() is describe() under the hood — it must run at describe level, not inside it().)

describe("Part 2: Introduce story()", () => {
  /**
   * Step 1 — WHAT: Express the scenario as story() with steps.given(), steps.when(), steps.then().
   * WHY: One source of truth; reporter generates Markdown; docs stay in sync.
   * BEFORE: plain it("addition works", () => { expect(add(2,3)).toBe(5); })
   * AFTER:  story("Calculator adds", (steps) => { steps.given(...); steps.when(...); steps.then(...); })
   */
  story("Calculator adds two numbers", (steps: StepsApi) => {
    let a: number, b: number, result: number;

    steps.given("two numbers 2 and 3", () => {
      a = 2;
      b = 3;
    });

    steps.when("they are added", () => {
      result = add(a, b);
    });

    steps.then("the result is 5", () => {
      expect(result).toBe(5);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PART 3: FRAMEWORK-NATIVE WITH doc.story()
// ═══════════════════════════════════════════════════════════════════════════════
// Keep existing it(); add doc.story("title", task) so it appears in the story report.

describe("Part 3: Framework-native with doc.story()", () => {
  it("Step 2 — Keep it(), add doc.story(title, task): existing test appears in docs", ({ task }) => {
    /**
     * WHAT: Keep your existing it() but call doc.story("title", task) inside it.
     *
     * WHY THIS IS BETTER:
     * - No need to rewrite tests as story() with given/when/then
     * - The test still runs as one Vitest test
     * - The reporter adds it to the story report as a one-step story
     *
     * BEFORE: it("subtraction works", () => { expect(subtract(10,4)).toBe(6); })
     * AFTER:  it("...", ({ task }) => { doc.story("Calculator subtracts", task); expect(...); })
     */
    doc.story("Calculator subtracts two numbers", task);
    expect(subtract(10, 4)).toBe(6);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PART 4: FULL PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════
// Mix story() and framework-native it(); optional doc.note() for rich docs.

describe("Part 4: Full patterns", () => {
  // Step 3a — story() with given/when/then (at describe level; cannot call story() inside it())
  story("Calculator multiplies two numbers", (steps: StepsApi) => {
    steps.given("two numbers 7 and 6", () => {});
    steps.when("they are multiplied", () => {});
    steps.then("the result is 42", () => {
      expect(multiply(7, 6)).toBe(42);
    });
  });

  it("Step 3b — Framework-native test with doc.story() in the same describe", ({ task }) => {
    doc.story("Calculator multiplies (framework-native)", task);
    expect(multiply(7, 6)).toBe(42);
  });

  // Step 3c — story() with doc.note() for rich docs (at describe level)
  story("Calculator adds with a note", (steps: StepsApi) => {
    steps.doc.note("Using small numbers; the note appears in the generated Markdown.");
    steps.given("two numbers 1 and 2", () => {});
    steps.when("they are added", () => {});
    steps.then("the result is 3", () => {
      expect(add(1, 2)).toBe(3);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PART 5: GENERATED DOCS
// ═══════════════════════════════════════════════════════════════════════════════
// After running: pnpm test (or npx vitest run)
// Open: src/refactor-guide.story.docs.md
// The reporter writes colocated Markdown with all stories from this file.
