/**
 * Unit tests for renderErrorBox (fn(args, deps)).
 */

import { describe, it, expect } from "vitest";
import { renderErrorBox } from "../../../../src/formatters/html/renderers/error-box";

describe("renderErrorBox", () => {
  it("renders message only", () => {
    const deps = { escapeHtml: (s: string) => s };
    const html = renderErrorBox({ message: "Something broke" }, deps);

    expect(html).toContain('<div class="error-box">');
    expect(html).toContain("Something broke");
  });

  it("passes message and stack through escapeHtml", () => {
    const escaped: string[] = [];
    const deps = {
      escapeHtml: (s: string) => {
        escaped.push(s);
        return `[${s}]`;
      },
    };
    renderErrorBox(
      { message: "Error", stack: "at foo (bar.ts:1:1)" },
      deps,
    );

    expect(escaped).toContain("Error");
    expect(escaped).toContain("at foo (bar.ts:1:1)");
  });

  it("includes stack when provided", () => {
    const html = renderErrorBox(
      { message: "Fail", stack: "  at line 1" },
      { escapeHtml: (s) => s },
    );
    expect(html).toContain("Fail");
    expect(html).toContain("at line 1");
  });
});
