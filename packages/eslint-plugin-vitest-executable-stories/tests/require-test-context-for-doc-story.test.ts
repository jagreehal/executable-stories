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
      "vitest-executable-stories/require-test-context-for-doc-story": "error" as const,
    },
  },
];

describe("require-test-context-for-doc-story", () => {
  it("allows doc.story(title) inside test callback", () => {
    const code = `
      import { doc } from "vitest-executable-stories";
      import { test } from "vitest";
      test("native", () => {
        doc.story("Title");
      });
    `;
    const messages = linter.verify(code, config);
    expect(messages).toHaveLength(0);
  });

  it("allows doc.story(title) inside it callback", () => {
    const code = `
      import { doc } from "vitest-executable-stories";
      it("native", () => {
        doc.story("Title");
      });
    `;
    const messages = linter.verify(code, config);
    expect(messages).toHaveLength(0);
  });

  it("allows doc.story(title) inside test.each callback", () => {
    const code = `
      import { doc } from "vitest-executable-stories";
      test.each([1, 2])("native %s", () => {
        doc.story("Title");
      });
    `;
    const messages = linter.verify(code, config);
    expect(messages).toHaveLength(0);
  });

  it("allows doc.story(title, callback) outside tests", () => {
    const code = `
      import { doc } from "vitest-executable-stories";
      doc.story("Title", (steps) => {
        steps.given("a user", () => {});
      });
    `;
    const messages = linter.verify(code, config);
    expect(messages).toHaveLength(0);
  });

  it("allows doc.story(title, callbackIdentifier) outside tests", () => {
    const code = `
      import { doc } from "vitest-executable-stories";
      const defineSteps = (steps) => {
        steps.given("a user", () => {});
      };
      doc.story("Title", defineSteps);
    `;
    const messages = linter.verify(code, config);
    expect(messages).toHaveLength(0);
  });

  it("allows doc.story(title) in a named test callback", () => {
    const code = `
      import { doc } from "vitest-executable-stories";
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
      import { doc } from "vitest-executable-stories";
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
      import { doc } from "vitest-executable-stories";
      doc.story("Title");
    `;
    const messages = linter.verify(code, config);
    expect(messages).toHaveLength(1);
    expect(messages[0].ruleId).toBe(
      "vitest-executable-stories/require-test-context-for-doc-story",
    );
  });

  it("reports doc.story(title, task) outside test", () => {
    const code = `
      import { doc } from "vitest-executable-stories";
      doc.story("Title", task);
    `;
    const messages = linter.verify(code, config);
    expect(messages).toHaveLength(1);
    expect(messages[0].ruleId).toBe(
      "vitest-executable-stories/require-test-context-for-doc-story",
    );
  });

  it("reports doc.story() with no arguments", () => {
    const code = `
      import { doc } from "vitest-executable-stories";
      doc.story();
    `;
    const messages = linter.verify(code, config);
    expect(messages).toHaveLength(1);
    expect(messages[0].message).toContain("requires a title");
  });
});
