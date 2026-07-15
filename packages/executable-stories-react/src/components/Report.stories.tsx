import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { Report } from "./Report";
import { MermaidDiagram } from "./doc/MermaidDiagram";
import { reportFixture } from "../test/fixtures";
import { kitchenSinkReport } from "../test/kitchen-sink";

const meta: Meta<typeof Report> = {
  title: "Report/Report",
  component: Report,
  // Draw mermaid diagrams (not just the source block) so the report renders the
  // way a consumer who wires up the shipped renderer would see it.
  args: {
    renderers: { mermaid: (entry) => <MermaidDiagram entry={entry} /> },
  },
};
export default meta;

type Story = StoryObj<typeof Report>;

export const FullReport: Story = {
  args: { report: reportFixture() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("main", { name: "Test report" })).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "Checkout", level: 2 })).toBeVisible();
    // Summary renders as stat cards (Total/Passed/Failed/…), not a text line.
    await expect(canvas.getByLabelText("Run summary")).toHaveTextContent(/Total/);
    await expect(within(canvas.getByLabelText("Run summary")).getByText("Passed")).toBeVisible();
  },
};

/**
 * Kitchen sink — every doc kind (note, tag, kv, code, table, link, section,
 * mermaid, screenshot, video, html, custom), all four statuses, tickets, an
 * OTel trace waterfall, run/CI/coverage meta, and inline attachments across two
 * features. The single most comprehensive render of the report component.
 */
export const KitchenSink: Story = {
  args: { report: kitchenSinkReport() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { name: "Checkout", level: 2 })).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "Search", level: 2 })).toBeVisible();
    // A doc table renders its cells.
    await expect(canvas.getByText("Discount tiers")).toBeVisible();
    // The failed scenario surfaces its error as an alert.
    await expect(canvas.getAllByRole("alert")[0]).toHaveTextContent(/received \{ id/);
    // A ticket badge renders.
    await expect(canvas.getByText("SHOP-101")).toBeVisible();
  },
};

export const EmptyReport: Story = {
  args: {
    report: reportFixture({
      features: [],
      summary: { total: 0, passed: 0, failed: 0, skipped: 0, pending: 0, durationMs: 0 },
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("No scenarios in this report.")).toBeVisible();
  },
};
