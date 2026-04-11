import { describe, it, expect } from "vitest";
import { getCssOnlyThemes, getAvailableThemes } from "../../../../src/formatters/html/themes/index";

describe("getCssOnlyThemes", () => {
  it("returns only themes without buildBody or generateTemplate overrides", () => {
    const themes = getCssOnlyThemes();
    for (const theme of themes) {
      expect(theme.buildBody).toBeUndefined();
      expect(theme.generateTemplate).toBeUndefined();
    }
  });

  it("returns at least the default theme", () => {
    const themes = getCssOnlyThemes();
    const names = themes.map((t) => t.name);
    expect(names).toContain("default");
  });

  it("returns fewer or equal themes than getAvailableThemes", () => {
    const all = getAvailableThemes();
    const cssOnly = getCssOnlyThemes();
    expect(cssOnly.length).toBeLessThanOrEqual(all.length);
  });
});
