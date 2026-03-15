import { beforeEach, describe, expect, it, vi } from "vitest";

import { selectTestCases } from "../src/select-test-cases";
import { stubs } from "./stubs";

describe("selectTestCases", () => {
  beforeEach(() => {
    stubs.setFakerSeed(42);
  });

  it("applies source globs, tags, and sorting consistently", () => {
    const logger = { warn: vi.fn() };
    const selected = selectTestCases(
      {
        testCases: [
          stubs.testCaseResult({
            id: "b",
            sourceFile: "src/auth/login.story.test.ts",
            sourceLine: 20,
            story: stubs.storyMeta({ scenario: "Login fails", tags: ["auth"] }),
            tags: ["auth"],
          }),
          stubs.testCaseResult({
            id: "a",
            sourceFile: "src/auth/login.story.test.ts",
            sourceLine: 10,
            story: stubs.storyMeta({ scenario: "Login works", tags: ["auth", "smoke"] }),
            tags: ["auth", "smoke"],
          }),
          stubs.testCaseResult({
            id: "c",
            sourceFile: "src/billing/payments.story.test.ts",
            sourceLine: 5,
            story: stubs.storyMeta({ scenario: "Payment works", tags: ["billing"] }),
            tags: ["billing"],
          }),
        ],
        include: ["src/auth/**"],
        includeTags: ["smoke", "auth"],
        excludeTags: ["billing"],
        sortTestCases: "source",
      },
      { logger }
    );

    expect(selected.map((tc) => tc.id)).toEqual(["a", "b"]);
    expect(logger.warn).toHaveBeenCalled();
  });
});
