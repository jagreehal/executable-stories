import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor, within } from "storybook/test";
import { DocMermaid } from "./DocMermaid";
import { MermaidDiagram } from "./MermaidDiagram";
import type { ReportDocMermaid } from "executable-stories-core";

const meta: Meta<typeof DocMermaid> = {
  title: "Doc/DocMermaid",
  component: DocMermaid,
};
export default meta;

type Story = StoryObj<typeof DocMermaid>;

const entry: ReportDocMermaid = {
  kind: "mermaid",
  phase: "static",
  title: "Discount pipeline",
  code: "flowchart LR\n  Cart --> Loyalty --> Cap[Cap at 30%] --> Total",
};

// With no `renderers.mermaid` in context, `DocMermaid` renders the readable
// `MermaidSource` — a semantic `<pre data-mermaid>` that screen readers, AI
// agents, and no-JS views all get. This is the default / universal fallback.
export const StaticSource: Story = {
  args: { entry },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Discount pipeline")).toBeVisible();
    await expect(canvas.getByText(/flowchart LR/)).toBeVisible();
  },
};

export const Untitled: Story = {
  args: { entry: { ...entry, title: undefined } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The figure still gets an accessible name ("Diagram") even without a title.
    await expect(canvas.getByRole("figure", { name: "Diagram" })).toBeInTheDocument();
    await expect(canvas.getByText(/flowchart LR/)).toBeVisible();
  },
};

/**
 * The diagram drawn, which is what `renderers.mermaid` is for. The stories
 * above cover the fallback source; this covers the picture.
 */
export const Drawn: Story = {
  render: () => (
    <MermaidDiagram
      entry={{
        ...entry,
        // Two lines in one label: the shape the architecture section uses.
        code: "flowchart LR\n  Cart[\"Cart<br/>2 scenarios\"] --> Total[\"Total<br/>2 scenarios\"]",
      }}
    />
  ),
  play: async ({ canvasElement }) => {
    await waitFor(
      async () => {
        await expect(canvasElement.querySelector("svg")).not.toBeNull();
      },
      { timeout: 10_000 },
    );
    const svg = canvasElement.querySelector("svg")!;
    await expect(svg.textContent).toContain("Cart");
    await expect(svg.textContent).toContain("2 scenarios");
  },
};
