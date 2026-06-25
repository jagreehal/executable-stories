/**
 * SSR proof: <Report> renders to fully semantic HTML on the server with
 * no client mounting required. This is the contract the living-documentation
 * use case (Next.js RSC, Astro islands, static export, AI-readable docs)
 * depends on.
 */

import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { Report } from "../src/components/Report";
import { passingReport, mixedReport, minimalReport } from "./fixtures/sample-report";
import { err } from "../src/result";

function ssr(node: JSX.Element): string {
  return renderToString(node);
}

describe("Report — server-side rendering", () => {
  it("renders a fully-formed <main> landmark", () => {
    const html = ssr(<Report report={passingReport} />);
    expect(html).toContain("<main");
    expect(html).toContain('aria-label="Test report"');
    expect(html).toContain("class=\"es-report\"");
  });

  it("emits one <section> per feature with stable id + heading + source path", () => {
    const html = ssr(<Report report={mixedReport} />);
    expect(html).toMatch(/<section[^>]*id="feature-todos"/);
    expect(html).toMatch(/<section[^>]*id="feature-auth"/);
    expect(html).toContain("<h2");
    expect(html).toContain("Todos");
    expect(html).toContain("Auth");
    expect(html).toContain("src/todos.story.test.ts");
    expect(html).toContain("src/auth.story.test.ts");
  });

  it("emits one scenario card per scenario with stable id and aria-labelledby", () => {
    const html = ssr(<Report report={mixedReport} />);
    expect(html).toMatch(/id="feature-todos--delete"[^>]*aria-labelledby="feature-todos--delete-title"/);
    expect(html).toMatch(/data-status="failed"/);
  });

  it("emits scenario steps as a semantic ordered list with keyword + text in plain text", () => {
    const html = ssr(<Report report={passingReport} />);
    expect(html).toContain("<ol");
    expect(html).toContain("Given");
    expect(html).toContain("no todos exist");
  });

  it("emits failure error messages with role=alert visible in static HTML", () => {
    const html = ssr(<Report report={mixedReport} />);
    expect(html).toContain('role="alert"');
    expect(html).toContain("Expected list to be empty after deletion");
  });

  it("does not crash on Result.ok=false; renders the schema-error block", () => {
    const html = ssr(
      <Report
        report={err({ message: "boom", code: "VALIDATION_FAILED", issues: [{ path: "/a", message: "bad" }] })}
      />,
    );
    expect(html).toContain("Report could not be displayed");
    expect(html).toContain("boom");
  });

  it("does not crash on an empty report; emits the empty-state element", () => {
    const html = ssr(<Report report={minimalReport} />);
    expect(html).toContain('data-slot="empty"');
    expect(html).toContain("No scenarios in this report.");
  });

  it("renders DocEntry kinds to semantic elements (greppable by AI/screen-readers)", () => {
    const report = {
      ...passingReport,
      features: [
        {
          ...passingReport.features[0]!,
          scenarios: [
            {
              ...passingReport.features[0]!.scenarios[0]!,
              docEntries: [
                { kind: "note" as const, text: "introductory note", phase: "static" as const },
                { kind: "kv" as const, label: "endpoint", value: "/api", phase: "static" as const },
                { kind: "code" as const, label: "snippet", content: "let x = 1", lang: "ts", phase: "static" as const },
                { kind: "link" as const, label: "Spec", url: "https://example.com", phase: "static" as const },
                { kind: "section" as const, title: "Background", markdown: "**bold**", phase: "static" as const },
                { kind: "mermaid" as const, code: "graph TD\nA-->B", phase: "static" as const },
              ],
            },
          ],
        },
      ],
    };

    const html = ssr(<Report report={report} />);
    expect(html).toContain("introductory note");
    expect(html).toContain("<dt");
    expect(html).toContain("endpoint");
    expect(html).toContain("<pre");
    expect(html).toContain("let x = 1");
    expect(html).toContain("language-ts");
    expect(html).toMatch(/href="https:\/\/example\.com"/);
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("data-mermaid");
    expect(html).toContain("graph TD");
  });

  it("never emits a <script> tag — markup-only", () => {
    const html = ssr(<Report report={mixedReport} />);
    expect(html).not.toMatch(/<script[^>]*>/i);
  });
});
