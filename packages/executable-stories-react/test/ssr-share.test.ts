/**
 * The Share button is off by default and `--html-share` turns it on. The flag
 * reaches the island as a data attribute, so the assertion is on the attribute
 * the island reads, not on the static markup (the button is interactive-only).
 */

import { describe, it, expect } from "vitest";
import { renderReportToHtml } from "../src/ssr-entry";
import { mixedReport } from "./fixtures/sample-report";

const ISLAND = { islandScript: "/* island */" };

describe("share button", () => {
  it("is off by default: nothing switches it on", () => {
    const html = renderReportToHtml(mixedReport, ISLAND);
    expect(html).not.toContain("data-es-share");
  });

  it("is switched on by share: true", () => {
    const html = renderReportToHtml(mixedReport, { ...ISLAND, share: true });
    expect(html).toContain('data-es-share="true"');
  });

  it("carries the command the CLI stamped", () => {
    const html = renderReportToHtml(mixedReport, {
      ...ISLAND,
      share: true,
      shareCommand: "npx executable-stories share reports/",
    });
    expect(html).toContain('data-es-share-cmd="npx executable-stories share reports/"');
  });

  it("escapes the command rather than breaking out of the attribute", () => {
    const html = renderReportToHtml(mixedReport, {
      ...ISLAND,
      share: true,
      shareCommand: 'share "a b" & <c>',
    });
    expect(html).toContain('data-es-share-cmd="share &quot;a b&quot; &amp; &lt;c&gt;"');
  });

  it("emits no share attributes on a static (non-island) render", () => {
    const html = renderReportToHtml(mixedReport, { share: true });
    expect(html).not.toContain("data-es-share");
  });
});
