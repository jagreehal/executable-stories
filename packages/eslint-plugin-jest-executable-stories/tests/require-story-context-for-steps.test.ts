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
      "jest-executable-stories/require-story-context-for-steps": "error" as const,
    },
  },
];

describe("require-story-context-for-steps", () => {
  it("allows steps inside story callback", () => {
    const code = `
      import { story, given, when, then } from "jest-executable-stories";
      story("Login", () => {
        given("a user", () => {});
        when("they sign in", () => {});
        then("they see the dashboard", () => {});
      });
    `;
    const messages = linter.verify(code, config);
    expect(messages).toHaveLength(0);
  });

  it("allows steps inside doc.story callback", () => {
    const code = `
      import { doc, given } from "jest-executable-stories";
      doc.story("Login", () => {
        given("a user", () => {});
      });
    `;
    const messages = linter.verify(code, config);
    expect(messages).toHaveLength(0);
  });

  it("allows steps via steps/step object inside story callback", () => {
    const code = `
      import { story, steps, step } from "jest-executable-stories";
      story("Login", () => {
        steps.given("a user", () => {});
        step.then("ok", () => {});
      });
    `;
    const messages = linter.verify(code, config);
    expect(messages).toHaveLength(0);
  });

  it("allows steps inside a named callback passed to story()", () => {
    const code = `
      import { story, given } from "jest-executable-stories";
      const defineSteps = () => {
        given("a user", () => {});
      };
      story("Login", defineSteps);
    `;
    const messages = linter.verify(code, config);
    expect(messages).toHaveLength(0);
  });

  it("allows steps inside a member expression callback passed to story()", () => {
    const code = `
      import { story, given } from "jest-executable-stories";
      const handlers = {
        define() {
          given("a user", () => {});
        }
      };
      story("Login", handlers.define);
    `;
    const messages = linter.verify(code, config);
    expect(messages).toHaveLength(0);
  });

  it("reports step call outside story callback", () => {
    const code = `
      import { given } from "jest-executable-stories";
      given("a user", () => {});
    `;
    const messages = linter.verify(code, config);
    expect(messages).toHaveLength(1);
    expect(messages[0].ruleId).toBe(
      "jest-executable-stories/require-story-context-for-steps",
    );
  });
});
