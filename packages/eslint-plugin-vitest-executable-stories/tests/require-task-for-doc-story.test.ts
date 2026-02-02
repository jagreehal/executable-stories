import { describe, it, expect } from "vitest";
import { Linter } from "eslint";
import plugin from "../src/index.js";

const linter = new Linter({ configType: "flat" });

const config = [
  {
    plugins: {
      "vitest-executable-stories": plugin,
    },
    rules: {
      "vitest-executable-stories/require-task-for-doc-story": "error" as const,
    },
  },
];

describe("require-task-for-doc-story", () => {
  describe("valid cases", () => {
    it("allows doc.story with two arguments", () => {
      const code = `
        import { doc } from "vitest-executable-stories";
        doc.story("My story", task);
      `;
      const messages = linter.verify(code, config);
      expect(messages).toHaveLength(0);
    });

    it("allows doc.story with two arguments (different variable name)", () => {
      const code = `
        import { doc } from "vitest-executable-stories";
        doc.story("Title", t);
      `;
      const messages = linter.verify(code, config);
      expect(messages).toHaveLength(0);
    });

    it("allows code without doc.story", () => {
      const code = `it("test", () => { expect(1).toBe(1); });`;
      const messages = linter.verify(code, config);
      expect(messages).toHaveLength(0);
    });

    it("allows doc.story with callback (second arg is function)", () => {
      const code = `
        import { doc } from "vitest-executable-stories";
        doc.story("Title", (steps) => { steps.given("a", () => {}); });
      `;
      const messages = linter.verify(code, config);
      expect(messages).toHaveLength(0);
    });

    it("ignores doc.story without relevant import", () => {
      const code = `doc.story("Title");`;
      const messages = linter.verify(code, config);
      expect(messages).toHaveLength(0);
    });
  });

  describe("invalid cases", () => {
    it("reports doc.story with zero arguments", () => {
      const code = `
        import { doc } from "vitest-executable-stories";
        doc.story();
      `;
      const messages = linter.verify(code, config);
      expect(messages).toHaveLength(1);
      expect(messages[0].ruleId).toBe(
        "vitest-executable-stories/require-task-for-doc-story",
      );
    });

    it("reports doc.story with one argument", () => {
      const code = `
        import { doc } from "vitest-executable-stories";
        doc.story("My story");
      `;
      const messages = linter.verify(code, config);
      expect(messages).toHaveLength(1);
      expect(messages[0].ruleId).toBe(
        "vitest-executable-stories/require-task-for-doc-story",
      );
      expect(messages[0].message).toContain("task");
    });

    it("reports doc.story with single string arg", () => {
      const code = `
        import { doc } from "vitest-executable-stories";
        doc.story("Title");
      `;
      const messages = linter.verify(code, config);
      expect(messages).toHaveLength(1);
      expect(messages[0].ruleId).toBe(
        "vitest-executable-stories/require-task-for-doc-story",
      );
    });

    it("reports multiple doc.story with one arg", () => {
      const code = `
        import { doc } from "vitest-executable-stories";
        doc.story("First");
        doc.story("Second");
      `;
      const messages = linter.verify(code, config);
      expect(messages).toHaveLength(2);
    });
  });
});
