import { renderDocCustom } from "../../src/formatters/html/renderers/doc-entries";
import { escapeHtml } from "../../src/formatters/html/template";
import type { Meta, StoryObj } from "@storybook/html";

const meta: Meta = { title: "Doc Entries/Custom" };
export default meta;

const deps = {
  escapeHtml,
  syntaxHighlighting: false,
  markdownEnabled: false,
  mermaidEnabled: false,
};

const greenPng =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNg+M/wHwAEAQH/QtOZbAAAAABJRU5ErkJggg==";
const redPng =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==";
const yellowPng =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4//8/AwAI/AL+W0Y9JAAAAABJRU5ErkJggg==";

export const VisualDiff: StoryObj = {
  name: "Visual diff (baseline / actual / diff)",
  render: () =>
    renderDocCustom(
      {
        kind: "custom",
        phase: "runtime",
        type: "visual",
        data: {
          status: "regressed",
          baseline: `data:image/png;base64,${greenPng}`,
          actual: `data:image/png;base64,${redPng}`,
          diff: `data:image/png;base64,${yellowPng}`,
        },
      },
      deps,
    ),
};

export const GenericPayload: StoryObj = {
  name: "Generic custom payload (JSON dump)",
  render: () =>
    renderDocCustom(
      {
        kind: "custom",
        phase: "runtime",
        type: "perf-metric",
        data: {
          lcp: 1240,
          fcp: 410,
          inp: 88,
          measurements: { count: 5, p95: 1500 },
        },
      },
      deps,
    ),
};
