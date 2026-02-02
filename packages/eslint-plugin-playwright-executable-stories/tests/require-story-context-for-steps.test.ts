import { describe, it, expect } from "vitest";
import { Linter } from "eslint";
import plugin from "../src/index.js";

const linter = new Linter({ configType: "flat" });

const config = [
  {
    plugins: {
      "playwright-executable-stories": plugin,
    },
    rules: {
      "playwright-executable-stories/require-story-context-for-steps": "error" as const,
    },
  },
];

describe("require-story-context-for-steps", () => {
  it("allows steps inside story callback", () => {
    const code = `
      import { story, given, when, then } from "playwright-executable-stories";
      story("Login", () => {
        given("a user", async () => {});
        when("they sign in", async () => {});
        then("they see the dashboard", async () => {});
      });
    `;
    const messages = linter.verify(code, config);
    expect(messages).toHaveLength(0);
  });

  it("allows steps inside doc.story callback", () => {
    const code = `
      import { doc, given } from "playwright-executable-stories";
      doc.story("Login", () => {
        given("a user", async () => {});
      });
    `;
    const messages = linter.verify(code, config);
    expect(messages).toHaveLength(0);
  });

  it("allows steps via steps/step object inside story callback", () => {
    const code = `
      import { story, steps, step } from "playwright-executable-stories";
      story("Login", () => {
        steps.given("a user", async () => {});
        step.then("ok", async () => {});
      });
    `;
    const messages = linter.verify(code, config);
    expect(messages).toHaveLength(0);
  });

  it("allows steps inside a named callback passed to story()", () => {
    const code = `
      import { story, given } from "playwright-executable-stories";
      const defineSteps = () => {
        given("a user", async () => {});
      };
      story("Login", defineSteps);
    `;
    const messages = linter.verify(code, config);
    expect(messages).toHaveLength(0);
  });

  it("allows steps inside a member expression callback passed to story()", () => {
    const code = `
      import { story, given } from "playwright-executable-stories";
      const handlers = {
        define() {
          given("a user", async () => {});
        }
      };
      story("Login", handlers.define);
    `;
    const messages = linter.verify(code, config);
    expect(messages).toHaveLength(0);
  });

  it("reports step call outside story callback", () => {
    const code = `
      import { given } from "playwright-executable-stories";
      given("a user", async () => {});
    `;
    const messages = linter.verify(code, config);
    expect(messages).toHaveLength(1);
    expect(messages[0].ruleId).toBe(
      "playwright-executable-stories/require-story-context-for-steps",
    );
  });
});
