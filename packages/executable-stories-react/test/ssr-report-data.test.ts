/**
 * The embedded run JSON is the machine-readable copy of the report inside the
 * HTML file. It used to ride along with the interactive island; it now ships
 * whenever there is a report to ship, so a JS-less render is still something an
 * agent can parse rather than prose it has to guess at.
 */

import { describe, it, expect } from "vitest";
import { renderReportToHtml } from "../src/ssr-entry";
import { mixedReport } from "./fixtures/sample-report";
import { err } from "../src/result";

const DATA_SCRIPT = '<script type="application/json" id="es-report-data">';

describe("embedded report JSON", () => {
  it("is emitted with the interactive island", () => {
    const html = renderReportToHtml(mixedReport, { islandScript: "/* island */" });
    expect(html).toContain(DATA_SCRIPT);
    expect(html).toContain('id="es-report-root"');
  });

  it("is emitted without the island too", () => {
    const html = renderReportToHtml(mixedReport, {});
    expect(html).toContain(DATA_SCRIPT);
    expect(html).not.toContain("es-report-root");
  });

  it("round-trips the run, not a summary of it", () => {
    const html = renderReportToHtml(mixedReport, {});
    const json = html.split(DATA_SCRIPT)[1]?.split("</script>")[0] ?? "";
    const parsed = JSON.parse(json) as typeof mixedReport;
    expect(parsed.runId).toBe(mixedReport.runId);
    expect(parsed.features.flatMap((f) => f.scenarios).map((s) => s.id)).toEqual([
      "feature-todos--add",
      "feature-todos--delete",
      "feature-auth--login",
    ]);
  });

  it("emits nothing when there is no report to emit", () => {
    const html = renderReportToHtml(err("broken"), {});
    expect(html).not.toContain(DATA_SCRIPT);
  });
});
