/**
 * Tests for the Cypress story API step callbacks.
 *
 * Since the Cypress story API requires Cypress browser globals,
 * we mock Cypress.currentTest and Cypress.spec to test in Vitest.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { StoryMeta, StoryStep } from "../types";

// Mock Cypress globals before importing story-api
const mockCurrentTest = {
  title: "test",
  titlePath: ["Suite", "test"],
};

const mockSpec = {
  relative: "cypress/e2e/test.cy.ts",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).Cypress = {
  currentTest: mockCurrentTest,
  spec: mockSpec,
};

// Import after setting up globals
const { story, getAndClearMeta } = await import("../story-api");

function resetForTest(title: string, titlePath?: string[]) {
  mockCurrentTest.title = title;
  mockCurrentTest.titlePath = titlePath ?? ["Suite", title];
  // Clear previous meta
  getAndClearMeta();
}

describe("step callbacks", () => {
  beforeEach(() => {
    resetForTest("step callback test");
  });

  afterEach(() => {
    getAndClearMeta();
  });

  it("sync callback returns value and records wrapped + durationMs", () => {
    story.init();
    const result = story.given("two numbers", () => ({ a: 5, b: 3 }));

    expect(result).toEqual({ a: 5, b: 3 });

    const payload = getAndClearMeta();
    const meta = payload!.meta;
    expect(meta.steps).toHaveLength(1);
    expect(meta.steps[0].keyword).toBe("Given");
    expect(meta.steps[0].text).toBe("two numbers");
    expect(meta.steps[0].wrapped).toBe(true);
    expect(typeof meta.steps[0].durationMs).toBe("number");
    expect(meta.steps[0].durationMs).toBeGreaterThanOrEqual(0);
  });

  it("async callback returns value via await", async () => {
    story.init();
    const result = await story.when("I fetch data", async () => 42);

    expect(result).toBe(42);

    const payload = getAndClearMeta();
    const step = payload!.meta.steps[0];
    expect(step.keyword).toBe("When");
    expect(step.wrapped).toBe(true);
    expect(typeof step.durationMs).toBe("number");
  });

  it("void callback returns undefined", () => {
    story.init();
    const result = story.then("check passes", () => {
      expect(true).toBe(true);
    });

    expect(result).toBeUndefined();

    const payload = getAndClearMeta();
    expect(payload!.meta.steps[0].wrapped).toBe(true);
  });

  it("error in callback re-throws, step still recorded", () => {
    story.init();
    expect(() =>
      story.when("failing action", () => {
        throw new Error("boom");
      }),
    ).toThrow("boom");

    const payload = getAndClearMeta();
    const meta = payload!.meta;
    expect(meta.steps).toHaveLength(1);
    expect(meta.steps[0].keyword).toBe("When");
    expect(meta.steps[0].wrapped).toBe(true);
    expect(typeof meta.steps[0].durationMs).toBe("number");
  });

  it("backward compat: marker-only still works (no wrapped)", () => {
    story.init();
    story.given("a precondition");

    const payload = getAndClearMeta();
    const step = payload!.meta.steps[0];
    expect(step.keyword).toBe("Given");
    expect(step.wrapped).toBeUndefined();
    expect(step.durationMs).toBeUndefined();
  });

  it("backward compat: inline docs still work", () => {
    story.init();
    story.given("valid credentials", {
      note: "Session cookie is set",
    });

    const payload = getAndClearMeta();
    const step = payload!.meta.steps[0];
    expect(step.wrapped).toBeUndefined();
    expect(step.docs).toHaveLength(1);
    expect(step.docs![0].kind).toBe("note");
  });

  it("integration: mixed markers, callbacks, and docs in one scenario", () => {
    story.init();
    story.given("user is logged in");
    const data = story.when("user submits form", () => ({ id: 1 }));
    story.then("response is valid", () => { expect(data.id).toBe(1); });
    story.and("confirmation appears");

    const payload = getAndClearMeta();
    const steps = payload!.meta.steps;
    expect(steps).toHaveLength(4);
    expect(steps[0].wrapped).toBeUndefined();
    expect(steps[1].wrapped).toBe(true);
    expect(steps[2].wrapped).toBe(true);
    expect(steps[3].wrapped).toBeUndefined();
  });

  it("auto-converts repeated primary callback keywords to And", () => {
    story.init();

    story.given("first precondition", () => 1);
    story.given("second precondition", () => 2);
    story.when("first action", () => "a");
    story.when("second action", () => "b");
    story.then("first assertion", () => true);
    story.then("second assertion", () => true);

    const payload = getAndClearMeta();
    expect(payload!.meta.steps.map((step) => step.keyword)).toEqual([
      "Given",
      "And",
      "When",
      "And",
      "Then",
      "And",
    ]);
  });

  it("auto-converts repeated primary keywords across callback and marker styles", () => {
    story.init();

    story.given("first precondition", () => 1);
    story.given("second precondition marker-only");
    story.when("first action", () => "a");
    story.when("second action marker-only");
    story.then("first assertion", () => true);
    story.then("second assertion marker-only");

    const payload = getAndClearMeta();
    expect(payload!.meta.steps.map((step) => step.keyword)).toEqual([
      "Given",
      "And",
      "When",
      "And",
      "Then",
      "And",
    ]);
  });

  it("auto-converts repeated primary keywords for story.fn, including with markers", () => {
    story.init();

    story.fn("Given", "first precondition", () => 1);
    story.given("second precondition marker-only");
    story.fn("When", "first action", () => "a");
    story.when("second action marker-only");
    story.fn("Then", "first assertion", () => true);
    story.then("second assertion marker-only");

    const payload = getAndClearMeta();
    expect(payload!.meta.steps.map((step) => step.keyword)).toEqual([
      "Given",
      "And",
      "When",
      "And",
      "Then",
      "And",
    ]);
  });

  it("auto-converts repeated primary keywords when using story.fn only", () => {
    story.init();

    story.fn("Given", "first precondition", () => 1);
    story.fn("Given", "second precondition", () => 2);
    story.fn("When", "first action", () => "a");
    story.fn("When", "second action", () => "b");
    story.fn("Then", "first assertion", () => true);
    story.fn("Then", "second assertion", () => true);

    const payload = getAndClearMeta();
    expect(payload!.meta.steps.map((step) => step.keyword)).toEqual([
      "Given",
      "And",
      "When",
      "And",
      "Then",
      "And",
    ]);
  });
});
