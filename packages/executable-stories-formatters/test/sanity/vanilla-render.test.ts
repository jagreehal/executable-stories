/**
 * Sanity check: prove the StoryReport schema renders to semantic HTML
 * using only vanilla TypeScript — no React, no framework imports.
 *
 * This guards against accidental React-bias in the public contract.
 * A renderer for Svelte/Vue/Solid/plain JS should be trivially derivable
 * from the same data; if this test gets awkward, the schema is wrong.
 */

import { describe, it, expect } from "vitest";
import { toStoryReport } from "../../src/converters/story-report";
import type {
  ReportDocEntry,
  ReportFeature,
  ReportScenario,
  ReportStep,
  StoryReport,
} from "../../src/types/story-report";
import type { TestCaseResult, TestRunResult } from "../../src/types/test-result";

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderDocEntry(entry: ReportDocEntry): string {
  switch (entry.kind) {
    case "note":
      return `<p class="es-note">${escape(entry.text)}</p>`;
    case "tag":
      return `<ul class="es-tags">${entry.names.map((n) => `<li>${escape(n)}</li>`).join("")}</ul>`;
    case "kv":
      return `<dl class="es-kv"><dt>${escape(entry.label)}</dt><dd>${escape(String(entry.value))}</dd></dl>`;
    case "code":
      return `<figure class="es-code"><figcaption>${escape(entry.label)}</figcaption><pre><code${entry.lang ? ` class="language-${escape(entry.lang)}"` : ""}>${escape(entry.content)}</code></pre></figure>`;
    case "table": {
      const head = entry.columns.map((c) => `<th>${escape(c)}</th>`).join("");
      const body = entry.rows.map((r) => `<tr>${r.map((c) => `<td>${escape(c)}</td>`).join("")}</tr>`).join("");
      return `<figure class="es-table"><figcaption>${escape(entry.label)}</figcaption><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></figure>`;
    }
    case "link":
      return `<a class="es-link" href="${escape(entry.url)}">${escape(entry.label)}</a>`;
    case "section":
      return `<section class="es-section"><h4>${escape(entry.title)}</h4><pre class="es-markdown">${escape(entry.markdown)}</pre></section>`;
    case "mermaid":
      return `<figure class="es-mermaid"${entry.title ? ` aria-label="${escape(entry.title)}"` : ""}><pre data-mermaid>${escape(entry.code)}</pre></figure>`;
    case "screenshot":
      return `<figure class="es-screenshot"><img src="${escape(entry.path)}" alt="${escape(entry.alt ?? "")}" />${entry.alt ? `<figcaption>${escape(entry.alt)}</figcaption>` : ""}</figure>`;
    case "custom":
      return `<div class="es-custom" data-type="${escape(entry.type)}"><pre>${escape(JSON.stringify(entry.data))}</pre></div>`;
  }
}

function renderStep(step: ReportStep): string {
  const error = step.errorMessage ? `<p class="es-step-error">${escape(step.errorMessage)}</p>` : "";
  const docs = step.docEntries.length > 0 ? `<div class="es-step-docs">${step.docEntries.map(renderDocEntry).join("")}</div>` : "";
  return `<li id="${escape(step.id)}" class="es-step es-step-${escape(step.status)}"><span class="es-step-keyword">${escape(step.keyword)}</span> <span class="es-step-text">${escape(step.text)}</span>${error}${docs}</li>`;
}

function renderScenario(scenario: ReportScenario): string {
  const error = scenario.errorMessage
    ? `<p class="es-scenario-error" role="alert">${escape(scenario.errorMessage)}</p>`
    : "";
  const docs = scenario.docEntries.length > 0
    ? `<div class="es-scenario-docs">${scenario.docEntries.map(renderDocEntry).join("")}</div>`
    : "";
  const steps = scenario.steps.length > 0
    ? `<ol class="es-steps">${scenario.steps.map(renderStep).join("")}</ol>`
    : "";
  const tags = scenario.tags.length > 0
    ? `<ul class="es-tags" aria-label="Tags">${scenario.tags.map((t) => `<li>${escape(t)}</li>`).join("")}</ul>`
    : "";
  return `<article id="${escape(scenario.id)}" class="es-scenario es-status-${escape(scenario.status)}" aria-labelledby="${escape(scenario.id)}-title"><h3 id="${escape(scenario.id)}-title">${escape(scenario.title)}</h3>${tags}${error}${docs}${steps}</article>`;
}

function renderFeature(feature: ReportFeature): string {
  return `<section id="${escape(feature.id)}" class="es-feature" aria-labelledby="${escape(feature.id)}-title"><h2 id="${escape(feature.id)}-title">${escape(feature.title)}</h2><p class="es-feature-source">${escape(feature.sourceFile)}</p>${feature.scenarios.map(renderScenario).join("")}</section>`;
}

function renderReport(report: StoryReport): string {
  return `<main class="es-report" aria-label="Test report"><header class="es-report-header"><h1>Story Report</h1><p>${report.summary.total} scenario(s) · ${report.summary.passed} passed · ${report.summary.failed} failed</p></header>${report.features.map(renderFeature).join("")}</main>`;
}

function makeTestCase(overrides: Partial<TestCaseResult> = {}): TestCaseResult {
  return {
    id: "case-1",
    story: { scenario: "Adds a todo", steps: [{ keyword: "Given", text: "no todos" }] },
    sourceFile: "/repo/src/todos.test.ts",
    sourceLine: 1,
    status: "passed",
    durationMs: 100,
    attachments: [],
    stepResults: [{ index: 0, status: "passed", durationMs: 100 }],
    titlePath: ["Todos"],
    retry: 0,
    retries: 0,
    tags: [],
    ...overrides,
  };
}

function makeRun(): TestRunResult {
  return {
    runId: "run-1",
    startedAtMs: 1000,
    finishedAtMs: 2000,
    durationMs: 1000,
    projectRoot: "/repo",
    testCases: [
      makeTestCase({
        id: "1",
        story: {
          scenario: "Adds a todo",
          docs: [
            { kind: "note", text: "Validated against happy path.", phase: "static" },
            { kind: "kv", label: "endpoint", value: "/api/todos", phase: "static" },
            { kind: "code", label: "Request", content: '{"title":"buy milk"}', lang: "json", phase: "static" },
            { kind: "table", label: "Headers", columns: ["Name", "Value"], rows: [["Content-Type", "application/json"]], phase: "static" },
            { kind: "link", label: "Spec", url: "https://example.com/spec", phase: "static" },
            { kind: "section", title: "Background", markdown: "_Why this matters_", phase: "static" },
            { kind: "mermaid", code: "graph TD\nA-->B", title: "Flow", phase: "static" },
            { kind: "screenshot", path: "screenshots/added.png", alt: "Todo added", phase: "runtime" },
            { kind: "custom", type: "chart", data: { type: "bar", points: [1, 2, 3] }, phase: "runtime" },
          ],
          steps: [
            { keyword: "Given", text: "the todo list is empty" },
            { keyword: "When", text: "the user adds 'buy milk'" },
            { keyword: "Then", text: "the list contains 'buy milk'" },
          ],
        },
        stepResults: [
          { index: 0, status: "passed", durationMs: 10 },
          { index: 1, status: "passed", durationMs: 80 },
          { index: 2, status: "passed", durationMs: 10 },
        ],
      }),
      makeTestCase({
        id: "2",
        status: "failed",
        errorMessage: "Expected list to be empty",
        story: { scenario: "Removes a todo", steps: [{ keyword: "Given", text: "a todo exists" }] },
        stepResults: [{ index: 0, status: "failed", durationMs: 50, errorMessage: "boom" }],
      }),
    ],
  };
}

describe("Vanilla HTML rendering of StoryReport", () => {
  const report = toStoryReport(makeRun());
  const html = renderReport(report);

  it("emits a single <main> landmark with aria-label", () => {
    expect(html).toMatch(/<main class="es-report" aria-label="Test report"/);
  });

  it("emits <section> per feature with stable id", () => {
    expect(html).toContain(`id="${report.features[0]!.id}"`);
    expect(html).toMatch(/<section[^>]*class="es-feature"/);
  });

  it("emits <article> per scenario with stable id and aria-labelledby", () => {
    const sId = report.features[0]!.scenarios[0]!.id;
    expect(html).toContain(`<article id="${sId}"`);
    expect(html).toContain(`aria-labelledby="${sId}-title"`);
  });

  it("emits an <ol> of <li> steps with keyword and text", () => {
    expect(html).toContain("<ol class=\"es-steps\">");
    expect(html).toContain("Given");
    expect(html).toContain("the todo list is empty");
  });

  it("renders every DocEntry kind to a recognizable semantic element", () => {
    expect(html).toContain("<p class=\"es-note\">");
    expect(html).toContain("<dl class=\"es-kv\">");
    expect(html).toContain("<figure class=\"es-code\">");
    expect(html).toContain("language-json");
    expect(html).toContain("<figure class=\"es-table\">");
    expect(html).toContain("<a class=\"es-link\"");
    expect(html).toContain("<section class=\"es-section\">");
    expect(html).toContain("<figure class=\"es-mermaid\"");
    expect(html).toContain("data-mermaid");
    expect(html).toContain("<figure class=\"es-screenshot\">");
    expect(html).toContain("<div class=\"es-custom\"");
  });

  it("surfaces failure error messages with role=alert", () => {
    expect(html).toContain("role=\"alert\"");
    expect(html).toContain("Expected list to be empty");
  });

  it("escapes user-controlled text", () => {
    const xssRun = makeRun();
    xssRun.testCases[0]!.story.scenario = "<script>alert('xss')</script>";
    const xssReport = toStoryReport(xssRun);
    const xssHtml = renderReport(xssReport);
    expect(xssHtml).not.toContain("<script>alert");
    expect(xssHtml).toContain("&lt;script&gt;");
  });
});
