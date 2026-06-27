import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReportDocEntry } from "executable-stories-core";
import { expect, within } from "storybook/test";
import { ReportDocEntries } from "./ReportDocEntries";

const meta: Meta<typeof ReportDocEntries> = {
  title: "Report/DocEntries",
  component: ReportDocEntries,
};
export default meta;

type Story = StoryObj<typeof ReportDocEntries>;

// A mix of doc kinds. Section markdown is left untitled and headings are kept out
// of the entries so a bare render (no surrounding h1/h2) stays heading-order
// clean — the report nests these under a scenario card in real use. Mermaid
// renders as its readable <pre> source (no renderer override supplied); custom
// renders its data as JSON (no custom renderer registered).
const entries: ReportDocEntry[] = [
  { phase: "static", kind: "note", text: "Seeded from the standard fixture cart." },
  { phase: "static", kind: "tag", names: ["regression-guard", "finance-approved"] },
  { phase: "static", kind: "kv", label: "Requested discount", value: 0.45 },
  { phase: "static", kind: "code", label: "Pricing call", lang: "ts", content: "const total = applyDiscount(cart, { loyalty: 0.45 });" },
  {
    phase: "static",
    kind: "table",
    label: "Discount tiers",
    columns: ["Requested", "Applied", "Saving"],
    rows: [
      ["20%", "20%", "$24.00"],
      ["45%", "30%", "$36.00"],
    ],
  },
  { phase: "static", kind: "link", label: "Pricing policy", url: "https://example.com/policy" },
  { phase: "static", kind: "mermaid", title: "Discount pipeline", code: "flowchart LR\n  Cart --> Cap[Cap at 30%] --> Total" },
  { phase: "static", kind: "custom", type: "ranking-debug", data: { query: "wireles mouse", topScore: 0.94 } },
];

export const Mixed: Story = {
  args: { entries },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Seeded from the standard fixture cart.")).toBeVisible();
    // The doc table renders with proper column headers.
    await expect(canvas.getByRole("columnheader", { name: "Requested" })).toBeVisible();
    await expect(canvas.getByText("Discount tiers")).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Pricing policy" })).toBeVisible();
  },
};

// Empty array → the component renders nothing.
export const Empty: Story = {
  args: { entries: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole("table")).toBeNull();
  },
};
