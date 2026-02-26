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
    expect(html).toContain("Clear all</button>");
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

    expect(html).toContain('class="tag-bar tag-bar-collapsed"');
    expect(html).toContain('class="tag-bar-label"');
    expect(html).toContain("Filter by tag");
  });

  it("uses button elements for pills with aria-pressed", () => {
    const html = renderTagBar({ tags: ["a", "b"], totalScenarios: 2 }, deps);

    const pillMatches = html.match(/<button type="button" class="tag-pill" /g);
    expect(pillMatches).toHaveLength(2);
  });

  it("renders toggle button with aria-expanded and aria-controls", () => {
    const html = renderTagBar({ tags: ["smoke"], totalScenarios: 1 }, deps);

    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-controls="tag-pills-region"');
    expect(html).toContain('class="tag-bar-toggle"');
  });

  it("renders pills container with id, role, and aria-label", () => {
    const html = renderTagBar({ tags: ["smoke"], totalScenarios: 1 }, deps);

    expect(html).toContain('id="tag-pills-region"');
    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label="Tag filters"');
  });

  it("renders tag pills with aria-pressed attribute", () => {
    const html = renderTagBar({ tags: ["smoke", "auth"], totalScenarios: 2 }, deps);

    const pressedMatches = html.match(/aria-pressed="false"/g);
    expect(pressedMatches).toHaveLength(2);
  });

  it("renders selected count badge with aria-live", () => {
    const html = renderTagBar({ tags: ["smoke"], totalScenarios: 1 }, deps);

    expect(html).toContain('class="tag-bar-count"');
    expect(html).toContain('aria-live="polite"');
  });

  it("renders chevron icon in toggle button", () => {
    const html = renderTagBar({ tags: ["smoke"], totalScenarios: 1 }, deps);

    expect(html).toContain('class="tag-bar-chevron"');
  });

  it("renders clear button with aria-label", () => {
    const html = renderTagBar({ tags: ["smoke"], totalScenarios: 1 }, deps);

    expect(html).toContain('aria-label="Clear all tag filters"');
    expect(html).toContain("Clear all</button>");
  });

  it("renders filter-results with aria-live", () => {
    const html = renderTagBar({ tags: ["smoke"], totalScenarios: 5 }, deps);

    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('class="filter-results"');
  });

  it("renders tag-bar with collapsed class by default", () => {
    const html = renderTagBar({ tags: ["smoke"], totalScenarios: 1 }, deps);

    expect(html).toContain('class="tag-bar tag-bar-collapsed"');
  });
});
