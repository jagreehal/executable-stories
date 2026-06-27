import { describe, it, expect } from "vitest";

import { resolveThemeCss } from "./theme.js";

describe("resolveThemeCss", () => {
  it("returns an empty string when there is no theme to apply", () => {
    expect(resolveThemeCss(undefined)).toBe("");
    expect(resolveThemeCss({})).toBe("");
    expect(resolveThemeCss({ preset: "default" })).toBe("");
  });

  it("maps the accent shorthand to the --es-accent token", () => {
    expect(resolveThemeCss({ accent: "#0b7285" })).toBe(":root{--es-accent:#0b7285;}");
  });

  it("expands a built-in preset into its token set", () => {
    const css = resolveThemeCss({ preset: "terminal" });
    expect(css).toContain("--es-accent:#22c55e;");
    expect(css).toContain("--es-pass:#16a34a;");
    expect(css.startsWith(":root{")).toBe(true);
  });

  it("lets accent and explicit tokens override the preset", () => {
    const css = resolveThemeCss({
      preset: "terminal",
      accent: "#ff0000",
      tokens: { pass: "#000000" },
    });
    expect(css).toContain("--es-accent:#ff0000;"); // accent wins over preset
    expect(css).toContain("--es-pass:#000000;"); // explicit token wins over preset
  });

  it("sanitises values so they cannot break out of the <style> tag", () => {
    const css = resolveThemeCss({ accent: "#fff;}</style><script>" });
    expect(css).not.toContain("</style>");
    expect(css).not.toContain("<script>");
    // The value's own `;`/`}`/`<`/`>` are stripped; only the wrapper's braces remain.
    expect(css).toBe(":root{--es-accent:#fff/stylescript;}");
  });
});
