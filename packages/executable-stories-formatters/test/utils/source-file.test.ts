import { describe, it, expect } from "vitest";
import { cleanTestStem, humanizeSourceFile } from "executable-stories-core/utils/source-file";

describe("cleanTestStem", () => {
  it("strips the story test extension chain", () => {
    expect(cleanTestStem("tests/unit/convert-currency.story.test.ts")).toBe("convert-currency");
    expect(cleanTestStem("a/b/login.story.spec.ts")).toBe("login");
    expect(cleanTestStem("checkout.story.cy.ts")).toBe("checkout");
  });

  it("strips plain test/spec extensions", () => {
    expect(cleanTestStem("math.test.ts")).toBe("math");
    expect(cleanTestStem("util.spec.js")).toBe("util");
  });

  it("preserves meaningful infixes so sibling variants stay distinct", () => {
    expect(cleanTestStem("send-money.msw.story.test.ts")).toBe("send-money.msw");
    expect(cleanTestStem("send-money.spans.story.test.ts")).toBe("send-money.spans");
  });

  it("drops only the final extension when there's no test marker", () => {
    expect(cleanTestStem("notes.md")).toBe("notes");
    expect(cleanTestStem("plain")).toBe("plain");
  });
});

describe("humanizeSourceFile", () => {
  it("title-cases the clean stem", () => {
    expect(humanizeSourceFile("tests/unit/convert-currency.story.test.ts")).toBe("Convert Currency");
    expect(humanizeSourceFile("send-money.msw.story.test.ts")).toBe("Send Money Msw");
  });
});
