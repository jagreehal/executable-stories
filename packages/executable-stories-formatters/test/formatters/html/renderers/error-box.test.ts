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

  it("strips ANSI escape codes from message and stack", () => {
    // Reproduces the Playwright failure rendering: "[2mexpect([22m..."
    const ansiMessage =
      "Error: [2mexpect([22m[31mreceived[39m[2m).[22mtoBe([32mexpected[39m)";
    const ansiStack = "    at [34m/runner/work/spec.ts:1:1[39m";
    const html = renderErrorBox(
      { message: ansiMessage, stack: ansiStack },
      { escapeHtml: (s) => s },
    );
    expect(html).toContain("Error: expect(received).toBe(expected)");
    expect(html).toContain("at /runner/work/spec.ts:1:1");
    expect(html).not.toMatch(/\[/);
    expect(html).not.toContain("[2m");
    expect(html).not.toContain("[22m");
  });
});
