import { describe, it, expect } from "vitest";
import { Linter } from "eslint";
import plugin from "../src/index.js";

const linter = new Linter({ configType: "flat" });

describe("eslint-plugin-vitest-executable-stories", () => {
  it("plugin loads and config applies", () => {
    const config = [
      {
        plugins: {
          "vitest-executable-stories": plugin,
        },
        rules: {},
      },
    ];
    const messages = linter.verify("const x = 1;", config);
    expect(messages).toHaveLength(0);
  });
});
