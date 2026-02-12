/**
 * Unit tests for renderTagBar (fn(args, deps)).
 */

import { describe, it, expect } from "vitest";
import { renderTagBar } from "../../../../src/formatters/html/renderers/tag-bar";
import { escapeHtml } from "../../../../src/formatters/html/template";

const deps = { escapeHtml };

describe("renderTagBar", () => {
  it("renders a pill for each tag", () => {
    const html = renderTagBar({ tags: ["smoke", "auth", "regression"], totalScenarios: 5 }, deps);

    expect(html).toContain('data-tag="smoke"');
    expect(html).toContain('data-tag="auth"');
    expect(html).toContain('data-tag="regression"');
    expect(html).toContain(">smoke</button>");
    expect(html).toContain(">auth</button>");
    expect(html).toContain(">regression</button>");
  });

  it("returns empty string when tags array is empty", () => {
    const html = renderTagBar({ tags: [], totalScenarios: 0 }, deps);

    expect(html).toBe("");
  });

  it("escapes HTML in tag names", () => {
    const html = renderTagBar({ tags: ['<script>alert("xss")</script>'], totalScenarios: 1 }, deps);

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("includes clear button", () => {
    const html = renderTagBar({ tags: ["smoke"], totalScenarios: 1 }, deps);

    expect(html).toContain('class="tag-bar-clear"');
    expect(html).toContain("Clear</button>");
  });

  it("includes data-tag attributes matching tag text", () => {
    const html = renderTagBar({ tags: ["feature:auth"], totalScenarios: 3 }, deps);

    expect(html).toContain('data-tag="feature:auth"');
    expect(html).toContain(">feature:auth</button>");
  });

  it("includes filter results counter with total", () => {
    const html = renderTagBar({ tags: ["smoke"], totalScenarios: 12 }, deps);

    expect(html).toContain('class="filter-results"');
    expect(html).toContain('class="visible-count"');
    expect(html).toContain('class="total-count">12</span>');
  });

  it("includes tag-bar container with label", () => {
    const html = renderTagBar({ tags: ["smoke"], totalScenarios: 1 }, deps);

    expect(html).toContain('class="tag-bar"');
    expect(html).toContain('class="tag-bar-label"');
    expect(html).toContain("Filter by tag");
  });

  it("uses button elements for pills", () => {
    const html = renderTagBar({ tags: ["a", "b"], totalScenarios: 2 }, deps);

    const pillMatches = html.match(/<button type="button" class="tag-pill"/g);
    expect(pillMatches).toHaveLength(2);
  });
});
