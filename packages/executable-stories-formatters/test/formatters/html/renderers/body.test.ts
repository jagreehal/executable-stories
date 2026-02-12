/**
 * Unit tests for buildBody (fn(args, deps)).
 */

import { describe, it, expect } from "vitest";
import { buildBody } from "../../../../src/formatters/html/renderers/body";
import { renderMetaInfo } from "../../../../src/formatters/html/renderers/meta";
import { renderSummary } from "../../../../src/formatters/html/renderers/summary";
import { renderTagBar } from "../../../../src/formatters/html/renderers/tag-bar";
import { renderFeature } from "../../../../src/formatters/html/renderers/feature";
import { getStatusIcon } from "../../../../src/formatters/html/renderers/status";
import { renderScenario } from "../../../../src/formatters/html/renderers/scenario";
import { renderSteps } from "../../../../src/formatters/html/renderers/steps";
import { renderDocEntry } from "../../../../src/formatters/html/renderers/doc-entries";
import { renderErrorBox } from "../../../../src/formatters/html/renderers/error-box";
import { renderAttachments } from "../../../../src/formatters/html/renderers/attachments";
import { escapeHtml } from "../../../../src/formatters/html/template";

describe("buildBody", () => {
  const docEntryDeps = {
    escapeHtml,
    syntaxHighlighting: false,
    markdownEnabled: false,
    mermaidEnabled: false,
  };
  const renderDocs = (docs: unknown, containerClass: string) => {
    if (!Array.isArray(docs) || docs.length === 0) return "";
    const entries = (docs as { kind: string }[])
      .map((entry) => renderDocEntry(entry as never, docEntryDeps))
      .join("");
    return `<div class="${containerClass}">${entries}</div>`;
  };
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
        embedScreenshots: false,
      }),
    embedScreenshots: false,
  };
  const featureDeps = {
    escapeHtml,
    startCollapsed: false,
    renderScenario: (args: { tc: unknown }) =>
      renderScenario(args as never, scenarioDeps),
    scenarioDeps,
  };
  const tagBarDeps = { escapeHtml };
  const bodyDeps = {
    renderMetaInfo,
    renderSummary,
    renderTagBar,
    renderFeature,
    metaDeps: { escapeHtml },
    summaryDeps: {},
    tagBarDeps,
    featureDeps,
  };

  it("includes meta info and summary", () => {
    const run = {
      testCases: [],
      startedAtMs: 0,
      finishedAtMs: 1000,
      durationMs: 1000,
      projectRoot: "/",
      runId: "run-1",
    } as never;
    const html = buildBody({ run }, bodyDeps);

    expect(html).toContain("meta-info");
    expect(html).toContain("summary");
  });

  it("includes feature when test cases present", () => {
    const run = {
      testCases: [
        {
          id: "id-1",
          story: {
            scenario: "A scenario",
            steps: [{ keyword: "Given", text: "step", docs: undefined }],
            docs: undefined,
          },
          sourceFile: "foo.test.ts",
          sourceLine: 1,
          status: "passed",
          durationMs: 0,
          attachments: [],
          stepResults: [{ index: 0, status: "passed", durationMs: 0 }],
          titlePath: [],
          retry: 0,
          retries: 0,
          tags: [],
        },
      ],
      startedAtMs: 0,
      finishedAtMs: 1000,
      durationMs: 1000,
      projectRoot: "/",
      runId: "run-1",
    } as never;
    const html = buildBody({ run }, bodyDeps);

    expect(html).toContain("feature");
    expect(html).toContain("scenario");
    expect(html).toContain("A scenario");
  });
});
