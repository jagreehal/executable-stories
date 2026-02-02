/**
 * Guardrails for doc.story overload behavior.
 */
import { describe, it, expect } from "vitest";
import { doc } from "../index.js";

describe("doc.story overload", () => {
  it("throws when called with no arguments (aligns with lint rule)", () => {
    const docAny = doc as unknown as { story: (...args: unknown[]) => void };
    expect(() => docAny.story()).toThrow(/requires the task argument/i);
  });
});
