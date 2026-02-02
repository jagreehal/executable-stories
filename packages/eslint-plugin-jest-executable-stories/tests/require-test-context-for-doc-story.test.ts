import { describe, it, expect } from "vitest";
import { Linter } from "eslint";
import plugin from "../src/index.js";

const linter = new Linter({ configType: "flat" });

const config = [
  {
    plugins: {
      "jest-executable-stories": plugin,
    },
    rules: {
      "jest-executable-stories/require-test-context-for-doc-story": "error" as const,
    },
  },
];

describe("require-test-context-for-doc-story", () => {
  it("allows doc.story(title) inside test callback", () => {
    const code = `
      import { doc } from "jest-executable-stories";
      import { test } from "@jest/globals";
      test("native", () => {
        doc.story("Title");
      });
    `;
    const messages = linter.verify(code, config);
    expect(messages).toHaveLength(0);
  });

  it("allows doc.story(title) inside it callback", () => {
    const code = `
      import { doc } from "jest-executable-stories";
      it("native", () => {
        doc.story("Title");
      });
    `;
    const messages = linter.verify(code, config);
    expect(messages).toHaveLength(0);
  });

  it("allows doc.story(title) inside test.each callback", () => {
    const code = `
      import { doc } from "jest-executable-stories";
      test.each([1, 2])("native %s", () => {
        doc.story("Title");
      });
    `;
    const messages = linter.verify(code, config);
    expect(messages).toHaveLength(0);
  });

  it("allows doc.story(title, callback) outside tests", () => {
    const code = `
      import { doc } from "jest-executable-stories";
      doc.story("Title", (steps) => {
        steps.given("a user", () => {});
      });
    `;
    const messages = linter.verify(code, config);
    expect(messages).toHaveLength(0);
  });

  it("allows doc.story(title) in a named test callback", () => {
    const code = `
      import { doc } from "jest-executable-stories";
      const run = () => {
        doc.story("Title");
      };
      test("native", run);
    `;
    const messages = linter.verify(code, config);
    expect(messages).toHaveLength(0);
  });

  it("allows doc.story(title) in a member expression test callback", () => {
    const code = `
      import { doc } from "jest-executable-stories";
      const handlers = {
        run() {
          doc.story("Title");
        }
      };
      test("native", handlers.run);
    `;
    const messages = linter.verify(code, config);
    expect(messages).toHaveLength(0);
  });

  it("reports doc.story(title) outside test", () => {
    const code = `
      import { doc } from "jest-executable-stories";
      doc.story("Title");
    `;
    const messages = linter.verify(code, config);
    expect(messages).toHaveLength(1);
    expect(messages[0].ruleId).toBe(
      "jest-executable-stories/require-test-context-for-doc-story",
    );
  });

  it("reports doc.story() with no arguments", () => {
    const code = `
      import { doc } from "jest-executable-stories";
      doc.story();
    `;
    const messages = linter.verify(code, config);
    expect(messages).toHaveLength(1);
    expect(messages[0].message).toContain("requires a title");
  });
});
