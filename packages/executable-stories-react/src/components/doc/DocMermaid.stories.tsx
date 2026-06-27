import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { DocMermaid } from "./DocMermaid";
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
