/**
 * Generate design-library.html: showcase all HTML report components
 * for CSS/layout tweaking. Run: pnpm run generate:design-library
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  escapeHtml,
  generateHtmlTemplate,
  CSS_STYLES,
  renderMetaInfo,
  renderSummary,
  renderErrorBox,
  renderAttachments,
  renderDocNote,
  renderDocTag,
  renderDocKv,
  renderDocCode,
  renderDocTable,
  renderDocLink,
  renderDocSection,
  renderDocMermaid,
  renderDocScreenshot,
  renderDocCustom,
  renderDocEntry,
  renderSteps,
  renderScenario,
  renderFeature,
  getStatusIcon,
} from "../src/formatters/html/index";
import type { TestCaseResult } from "../src/types/test-result";
import type { DocEntry } from "../src/types/story";

const docEntryDeps = {
  escapeHtml,
  syntaxHighlighting: false,
  markdownEnabled: true,
  mermaidEnabled: true,
};

function renderDocs(docs: DocEntry[] | undefined, containerClass: string): string {
  if (!docs || docs.length === 0) return "";
  const entries = docs.map((e) => renderDocEntry(e, docEntryDeps)).join("");
  return `<div class="${containerClass}">${entries}</div>`;
}

function main() {

  const stepsDeps = {
    escapeHtml,
    getStatusIcon,
    renderDocs,
  };

  const scenarioDeps = {
    escapeHtml,
    getStatusIcon,
    startCollapsed: false,
    renderSteps: (args: { steps: unknown[]; stepResults: unknown[] }) =>
      renderSteps(args as never, stepsDeps),
    renderDocs,
    renderErrorBox: (args: { message: string; stack?: string }) =>
      renderErrorBox(args, { escapeHtml }),
    renderAttachments: (args: { attachments: unknown[] }) =>
      renderAttachments(args as never, {
        escapeHtml,
        embedScreenshots: true,
      }),
    embedScreenshots: true,
  };

  const featureDeps = {
    escapeHtml,
    startCollapsed: false,
    renderScenario: (args: { tc: TestCaseResult }) =>
      renderScenario(args, scenarioDeps),
    scenarioDeps,
  };

  const fixtureTc: TestCaseResult = {
    id: "design-1",
    story: {
      scenario: "Sample scenario for design library",
      steps: [
        { keyword: "Given", text: "user is on login page", docs: undefined },
        { keyword: "When", text: "user enters valid credentials", docs: undefined },
        { keyword: "And", text: "user submits the form", docs: undefined },
        { keyword: "Then", text: "user sees dashboard", docs: undefined },
      ],
      docs: [
        { kind: "note", text: "Story-level note.", phase: "static" },
        { kind: "tag", names: ["smoke", "auth"], phase: "static" },
      ],
      meta: {
        otel: {
          traceId: "abc123def456789012345678deadbeef",
        },
      },
    },
    sourceFile: "src/auth/login.test.ts",
    sourceLine: 1,
    status: "passed",
    durationMs: 150,
    attachments: [
      {
        name: "screenshot.png",
        mediaType: "image/png",
        body: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        contentEncoding: "BASE64",
      },
      {
        name: "trace.zip",
        mediaType: "application/zip",
        body: "https://example.com/trace.zip",
        contentEncoding: "IDENTITY",
      },
    ],
    stepResults: [
      { index: 0, status: "passed", durationMs: 10 },
      { index: 1, status: "passed", durationMs: 50 },
      { index: 2, status: "passed", durationMs: 20 },
      { index: 3, status: "passed", durationMs: 70 },
    ],
    titlePath: ["Authentication"],
    retry: 0,
    retries: 0,
    tags: ["smoke", "auth"],
  };

  const sections: string[] = [];

  sections.push("<h2 id=\"meta-info\">Meta info</h2>");
  sections.push(
    renderMetaInfo(
      {
        startedAtMs: Date.now() - 5000,
        durationMs: 5000,
        packageVersion: "1.0.0",
        gitSha: "abc1234",
        ciName: "GitHub Actions",
      },
      { escapeHtml },
    ),
  );

  sections.push("<h2 id=\"example-diagram\">Example Diagram</h2>");
  sections.push(
    `<div class="doc-mermaid doc-mermaid-live">
  <pre class="mermaid">flowchart TD
  A[Start] --> B{Build?}
  B -->|Yes| C[Render Mermaid]
  B -->|No| D[Show text]
</pre>
</div>`,
  );

  sections.push("<h2 id=\"summary\">Summary</h2>");
  sections.push(
    renderSummary(
      { total: 10, passed: 7, failed: 2, skipped: 1 },
      {},
    ),
  );

  sections.push("<h2 id=\"error-box\">Error box</h2>");
  sections.push(
    renderErrorBox(
      {
        message: "Expected element to be visible",
        stack: "Error: Expected element to be visible\n    at login.test.ts:15:5",
      },
      { escapeHtml },
    ),
  );

  sections.push("<h2 id=\"attachments\">Attachments</h2>");
  sections.push(
    renderAttachments(
      {
        attachments: [
          {
            name: "screenshot.png",
            mediaType: "image/png",
            body: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
            contentEncoding: "BASE64",
          },
          {
            name: "recording.mp4",
            mediaType: "video/mp4",
            body: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
            contentEncoding: "IDENTITY",
          },
          {
            name: "trace.zip",
            mediaType: "application/zip",
            body: "https://example.com/trace.zip",
            contentEncoding: "IDENTITY",
          },
        ],
      },
      { escapeHtml, embedScreenshots: true },
    ),
  );

  sections.push("<h2 id=\"doc-note\">Doc: note</h2>");
  sections.push(
    renderDocNote(
      { kind: "note", text: "A short note for the design library.", phase: "static" },
      docEntryDeps,
    ),
  );

  sections.push("<h2 id=\"doc-tag\">Doc: tag</h2>");
  sections.push(
    renderDocTag(
      { kind: "tag", names: ["smoke", "regression", "auth"], phase: "static" },
      docEntryDeps,
    ),
  );

  sections.push("<h2 id=\"doc-kv\">Doc: kv</h2>");
  sections.push(
    renderDocKv(
      { kind: "kv", label: "Environment", value: "staging", phase: "static" },
      docEntryDeps,
    ),
  );

  sections.push("<h2 id=\"doc-code\">Doc: code</h2>");
  sections.push(
    renderDocCode(
      {
        kind: "code",
        label: "Example",
        content: "const x = 1;\nconsole.log(x);",
        lang: "typescript",
        phase: "static",
      },
      docEntryDeps,
    ),
  );

  sections.push("<h2 id=\"doc-table\">Doc: table</h2>");
  sections.push(
    renderDocTable(
      {
        kind: "table",
        label: "Results",
        columns: ["Name", "Status"],
        rows: [
          ["Login", "Pass"],
          ["Logout", "Pass"],
        ],
        phase: "static",
      },
      docEntryDeps,
    ),
  );

  sections.push("<h2 id=\"doc-link\">Doc: link</h2>");
  sections.push(
    renderDocLink(
      {
        kind: "link",
        label: "Requirements",
        url: "https://example.com/reqs",
        phase: "static",
      },
      docEntryDeps,
    ),
  );

  sections.push("<h2 id=\"doc-section\">Doc: section</h2>");
  sections.push(
    renderDocSection(
      {
        kind: "section",
        title: "Overview",
        markdown: "## Overview\n\nThis is **markdown** content.",
        phase: "static",
      },
      docEntryDeps,
    ),
  );

  sections.push("<h2 id=\"doc-mermaid\">Doc: mermaid</h2>");
  sections.push(
    renderDocMermaid(
      {
        kind: "mermaid",
        code: "graph LR\n  A --> B\n  B --> C",
        title: "Flow",
        phase: "static",
      },
      docEntryDeps,
    ),
  );

  sections.push("<h2 id=\"doc-screenshot\">Doc: screenshot</h2>");
  sections.push(
    renderDocScreenshot(
      {
        kind: "screenshot",
        path: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        alt: "Login screen",
        phase: "static",
      },
      docEntryDeps,
    ),
  );

  sections.push("<h2 id=\"doc-custom\">Doc: custom</h2>");
  sections.push(
    renderDocCustom(
      {
        kind: "custom",
        type: "CustomPayload",
        data: { foo: 1, bar: "baz" },
        phase: "static",
      },
      docEntryDeps,
    ),
  );

  sections.push("<h2 id=\"steps\">Steps</h2>");
  sections.push(
    renderSteps(
      {
        steps: fixtureTc.story.steps,
        stepResults: fixtureTc.stepResults,
      },
      stepsDeps,
    ),
  );

  sections.push("<h2 id=\"scenario\">Scenario (with trace badge)</h2>");
  sections.push(renderScenario({ tc: fixtureTc }, scenarioDeps));

  sections.push("<h2 id=\"feature\">Feature</h2>");
  sections.push(
    renderFeature(
      { file: "src/auth/login.test.ts", testCases: [fixtureTc] },
      featureDeps,
    ),
  );

  const body = sections.join("\n\n");
  const html = generateHtmlTemplate(
    "Design Library – Executable Stories HTML Report",
    CSS_STYLES,
    body,
    {
      includeSearch: true,
      includeDarkMode: true,
      syntaxHighlighting: true,
      mermaidEnabled: true,
      markdownEnabled: true,
    },
  );

  const outPath = join(process.cwd(), "design-library.html");
  writeFileSync(outPath, html, "utf-8");
  console.log(`Wrote ${outPath}`);
}

try {
  main();
} catch (err) {
  console.error(err);
  process.exit(1);
}
