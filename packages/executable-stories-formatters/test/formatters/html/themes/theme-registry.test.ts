/**
 * Tests for the theme registry.
 */

import { describe, it, expect } from "vitest";
import { resolveTheme, getAvailableThemes } from "../../../../src/formatters/html/themes/index";

describe("theme registry", () => {
  it("should list all built-in themes", () => {
    const themes = getAvailableThemes();
    expect(themes).toContain("default");
    expect(themes).toContain("corporate");
    expect(themes).toContain("terminal");
    expect(themes).toContain("minimal");
    expect(themes).toContain("dashboard");
    expect(themes).toContain("playful");
    expect(themes).toHaveLength(6);
  });

  it("should resolve each built-in theme by name", () => {
    for (const name of getAvailableThemes()) {
      const theme = resolveTheme(name);
      expect(theme.name).toBe(name);
      expect(theme.label).toBeTruthy();
      expect(theme.css).toBeTruthy();
    }
  });

  it("should throw for unknown theme name", () => {
    expect(() => resolveTheme("nonexistent")).toThrow(/Unknown theme/);
  });

  it("should pass through custom theme objects", () => {
    const custom = {
      name: "custom",
      label: "Custom Theme",
      css: ":root { --background: red; }",
    };
    const resolved = resolveTheme(custom);
    expect(resolved).toBe(custom);
  });

  describe("theme CSS completeness", () => {
    const requiredProperties = [
      "--background", "--foreground", "--primary", "--border",
      "--success", "--error", "--warning", "--pending",
      "--font-sans", "--font-mono",
    ];

    for (const name of getAvailableThemes()) {
      it(`${name} theme CSS should define required custom properties`, () => {
        const theme = resolveTheme(name);
        for (const prop of requiredProperties) {
          expect(theme.css).toContain(prop);
        }
      });

      it(`${name} theme CSS should define :root selector`, () => {
        const theme = resolveTheme(name);
        expect(theme.css).toContain(":root");
      });

      it(`${name} theme CSS should define dark mode selector`, () => {
        const theme = resolveTheme(name);
        expect(theme.css).toContain('[data-theme="dark"]');
      });
    }
  });
});
