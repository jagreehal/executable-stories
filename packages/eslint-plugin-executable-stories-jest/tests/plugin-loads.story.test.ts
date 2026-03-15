import { Linter } from "eslint";
import { describe, expect, it } from "vitest";
import { story } from "executable-stories-vitest";
import plugin from "../src/index.js";

describe("ESLint Plugin: executable-stories-jest", () => {
  it("loads and exposes the recommended config with all rules", ({ task }) => {
    story.init(task);

    story.given("the jest ESLint plugin is imported");
    const linter = new Linter({ configType: "flat" });

    story.when("the recommended config is applied");
    const config = [
      {
        plugins: {
          "executable-stories-jest": plugin,
        },
        rules: {
          "executable-stories-jest/require-init-before-steps": "error" as const,
          "executable-stories-jest/require-story-context-for-steps":
            "error" as const,
          "executable-stories-jest/require-test-context-for-doc-story":
            "error" as const,
        },
      },
    ];

    story.then("valid code produces no lint errors");
    const messages = linter.verify("const x = 1;", config);
    expect(messages).toHaveLength(0);

    story.and("the plugin exposes three rules");
    expect(Object.keys(plugin.rules!)).toHaveLength(3);
    expect(plugin.rules).toHaveProperty("require-init-before-steps");
    expect(plugin.rules).toHaveProperty("require-story-context-for-steps");
    expect(plugin.rules).toHaveProperty("require-test-context-for-doc-story");
  });
});
