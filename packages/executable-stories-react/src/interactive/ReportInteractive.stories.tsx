import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { ReportInteractive } from "./ReportInteractive";
import { ok } from "../result";
import { kitchenSinkReport } from "../test/kitchen-sink";
import { MermaidDiagram } from "../components/doc/MermaidDiagram";

const meta: Meta<typeof ReportInteractive> = {
  title: "Interactive/ReportInteractive",
  component: ReportInteractive,
};
export default meta;

type Story = StoryObj<typeof ReportInteractive>;

// Wire the mermaid renderer (installed package, no CDN) so the showcase story
// renders diagrams — the plain component leaves `story.mermaid(...)` as readable
// source unless a host provides a renderer (the real report island does).
export const Default: Story = {
  args: { report: kitchenSinkReport(), renderers: { mermaid: (entry) => <MermaidDiagram entry={entry} /> } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The search box is the entry point for the interactive controls.
    await expect(canvas.getByRole("searchbox", { name: "Search" })).toBeVisible();
    // A scenario from the kitchen-sink report is rendered.
    await expect(
      canvas.getByRole("heading", { name: /caps the loyalty discount/i }),
    ).toBeVisible();
  },
};

// Typing in the search narrows the report tree — non-matching scenarios drop out.
export const FiltersOnSearch: Story = {
  args: { report: kitchenSinkReport() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { name: /caps the loyalty discount/i })).toBeVisible();
    await expect(canvas.getByRole("heading", { name: /tolerates a single typo/i })).toBeVisible();

    const input = canvas.getByRole("searchbox", { name: "Search" });
    await userEvent.type(input, "loyalty discount");

    // The matching scenario stays; an unrelated one is filtered away.
    await expect(canvas.getByRole("heading", { name: /caps the loyalty discount/i })).toBeVisible();
    await expect(canvas.queryByRole("heading", { name: /tolerates a single typo/i })).toBeNull();
  },
};

// A Result-wrapped report (e.g. from parseStoryReport) is unwrapped and rendered.
export const ResultWrapped: Story = {
  args: { report: ok(kitchenSinkReport()) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("searchbox", { name: "Search" })).toBeVisible();
    await expect(
      canvas.getByRole("heading", { name: /caps the loyalty discount/i }),
    ).toBeVisible();
  },
};

// hideHeader drops the title block but keeps the search + filter controls — the
// shape an Astro/Starlight page uses when it already renders the page heading.
export const HideHeader: Story = {
  args: { report: kitchenSinkReport(), title: "Story report", hideHeader: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // No top-level report title heading…
    await expect(canvas.queryByRole("heading", { name: "Story report", level: 1 })).toBeNull();
    // …but the search control and scenarios are still present.
    await expect(canvas.getByRole("searchbox", { name: "Search" })).toBeVisible();
    await expect(
      canvas.getByRole("heading", { name: /caps the loyalty discount/i }),
    ).toBeVisible();
  },
};
