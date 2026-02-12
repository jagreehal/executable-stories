/**
 * Tests for sourceOrder tracking in the story API.
 *
 * sourceOrder is critical for maintaining scenario order in generated docs.
 * Each call to story.init() increments a module-scoped counter, ensuring
 * scenarios appear in the order they were defined in source code.
 */
import { describe, it, expect } from "vitest";
import { story } from "../story-api";
import type { StoryMeta } from "../types";

function getStoryMeta(task: { meta: object }): StoryMeta {
  return (task.meta as { story: StoryMeta }).story;
}

describe("sourceOrder tracking", () => {
  /**
   * These tests run in a specific order to verify the counter increments.
   * Each test gets a higher sourceOrder than the previous.
   */

  it("first test gets sourceOrder 0 or higher", ({ task }) => {
    story.init(task);
    const meta = getStoryMeta(task);

    expect(meta.sourceOrder).toBeDefined();
    expect(typeof meta.sourceOrder).toBe("number");
    expect(meta.sourceOrder).toBeGreaterThanOrEqual(0);
  });

  it("second test gets a higher sourceOrder", ({ task }) => {
    story.init(task);
    const meta = getStoryMeta(task);

    expect(meta.sourceOrder).toBeDefined();
    expect(typeof meta.sourceOrder).toBe("number");
    // This should be at least 1 higher than the first test in this file
    // (exact value depends on test execution order across files)
    expect(meta.sourceOrder).toBeGreaterThanOrEqual(1);
  });

  it("third test continues incrementing", ({ task }) => {
    story.init(task);
    const meta = getStoryMeta(task);

    expect(meta.sourceOrder).toBeDefined();
    expect(typeof meta.sourceOrder).toBe("number");
    expect(meta.sourceOrder).toBeGreaterThanOrEqual(2);
  });

  describe("nested describe", () => {
    it("sourceOrder continues incrementing in nested describes", ({ task }) => {
      story.init(task);
      const meta = getStoryMeta(task);

      expect(meta.sourceOrder).toBeDefined();
      expect(typeof meta.sourceOrder).toBe("number");
    });

    it("and again", ({ task }) => {
      story.init(task);
      const meta = getStoryMeta(task);

      expect(meta.sourceOrder).toBeDefined();
      expect(typeof meta.sourceOrder).toBe("number");
    });
  });
});

describe("sourceOrder relative ordering", () => {
  /**
   * Test that sourceOrder values are monotonically increasing within a file.
   */
  const collectedOrders: number[] = [];

  it("collect order A", ({ task }) => {
    story.init(task);
    const meta = getStoryMeta(task);
    collectedOrders.push(meta.sourceOrder!);
    expect(meta.sourceOrder).toBeDefined();
  });

  it("collect order B", ({ task }) => {
    story.init(task);
    const meta = getStoryMeta(task);
    collectedOrders.push(meta.sourceOrder!);
    expect(meta.sourceOrder).toBeDefined();
  });

  it("collect order C", ({ task }) => {
    story.init(task);
    const meta = getStoryMeta(task);
    collectedOrders.push(meta.sourceOrder!);
    expect(meta.sourceOrder).toBeDefined();
  });

  it("verifies ordering is monotonically increasing", () => {
    // This test runs after the above tests have collected their orders
    expect(collectedOrders.length).toBe(3);

    // Each subsequent order should be greater than the previous
    for (let i = 1; i < collectedOrders.length; i++) {
      expect(collectedOrders[i]).toBeGreaterThan(collectedOrders[i - 1]);
    }
  });
});
