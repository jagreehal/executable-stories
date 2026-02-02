import { describe, it, expect } from "vitest";
import { Linter } from "eslint";
import plugin from "../src/index.js";

const linter = new Linter({ configType: "flat" });

describe("eslint-plugin-jest-executable-stories", () => {
  it("plugin loads and config applies", () => {
    const config = [
      {
        plugins: {
          "jest-executable-stories": plugin,
        },
        rules: {},
      },
    ];
    const messages = linter.verify("const x = 1;", config);
    expect(messages).toHaveLength(0);
  });
});
