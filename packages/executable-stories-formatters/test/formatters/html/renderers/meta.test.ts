/**
 * Unit tests for renderMetaInfo (fn(args, deps)).
 */

import { describe, it, expect } from "vitest";
import { renderMetaInfo } from "../../../../src/formatters/html/renderers/meta";

describe("renderMetaInfo", () => {
  it("renders Started and Duration", () => {
    const args = {
      startedAtMs: 1700000000000,
      durationMs: 5000,
    };
    const deps = { escapeHtml: (s: string) => s };
    const html = renderMetaInfo(args, deps);

    expect(html).toContain('<dl class="meta-info">');
    expect(html).toContain("<dt>Started:</dt>");
    expect(html).toMatch(/<dd>\d{4}-\d{2}-\d{2}T/);
    expect(html).toContain("<dt>Duration:</dt>");
    expect(html).toContain("<dd>5.00s</dd>");
  });

  it("passes user content through escapeHtml", () => {
    const escaped: string[] = [];
    const deps = {
      escapeHtml: (s: string) => {
        escaped.push(s);
        return `[${s}]`;
      },
    };
    renderMetaInfo(
      {
        startedAtMs: 0,
        durationMs: 0,
        packageVersion: "1.0.0",
        gitSha: "abc1234",
        ciName: "GitHub Actions",
      },
      deps,
    );

    expect(escaped).toContain("1.0.0");
    expect(escaped).toContain("abc1234");
    expect(escaped).toContain("GitHub Actions");
  });

  it("omits optional fields when absent", () => {
    const html = renderMetaInfo(
      { startedAtMs: 0, durationMs: 0 },
      { escapeHtml: (s) => s },
    );

    expect(html).not.toContain("Version");
    expect(html).not.toContain("Git");
    expect(html).not.toContain("CI");
  });
});
