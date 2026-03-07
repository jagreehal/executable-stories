import { Linter } from "eslint";
import { describe, expect, it } from "vitest";
import { story } from "executable-stories-vitest";
import plugin from "../src/index.js";

describe("ESLint Plugin: executable-stories-vitest", () => {
  it("loads and exposes the recommended config with all rules", ({ task }) => {
    story.init(task);

    story.given("the vitest ESLint plugin is imported");
    const linter = new Linter({ configType: "flat" });

    story.when("the recommended config is applied");
    const config = [
      {
        plugins: {
          "executable-stories-vitest": plugin,
        },
        rules: {
          "executable-stories-vitest/require-task-for-story-init":
            "error" as const,
          "executable-stories-vitest/require-test-context-for-story-init":
            "error" as const,
          "executable-stories-vitest/require-init-before-steps":
            "error" as const,
        },
      },
    ];

    story.then("valid code produces no lint errors");
    const messages = linter.verify("const x = 1;", config);
    expect(messages).toHaveLength(0);

    story.and("the plugin exposes three rules");
    expect(Object.keys(plugin.rules!)).toHaveLength(3);
    expect(plugin.rules).toHaveProperty("require-task-for-story-init");
    expect(plugin.rules).toHaveProperty(
      "require-test-context-for-story-init",
    );
    expect(plugin.rules).toHaveProperty("require-init-before-steps");
  });
});
