/**
 * Unit tests for renderSummary (fn(args, deps)).
 */

import { describe, it, expect } from "vitest";
import { renderSummary } from "../../../../src/formatters/html/renderers/summary";

describe("renderSummary", () => {
  it("renders all four cards with counts", () => {
    const html = renderSummary(
      { total: 10, passed: 7, failed: 2, skipped: 1 },
      {},
    );

    expect(html).toContain('<div class="summary">');
    expect(html).toContain("Total");
    expect(html).toContain('<div class="value">10</div>');
    expect(html).toContain("Passed");
    expect(html).toContain('<div class="value">7</div>');
    expect(html).toContain("Failed");
    expect(html).toContain('<div class="value">2</div>');
    expect(html).toContain("Skipped");
    expect(html).toContain('<div class="value">1</div>');
  });

  it("renders zero counts", () => {
    const html = renderSummary(
      { total: 0, passed: 0, failed: 0, skipped: 0 },
      {},
    );
    expect(html).toContain("summary-card");
    expect(html).toContain('<div class="value">0</div>');
  });
});
