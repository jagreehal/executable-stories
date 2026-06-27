import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { DocHtml } from "./DocHtml";

const meta: Meta<typeof DocHtml> = {
  title: "Doc/DocHtml",
  component: DocHtml,
};
export default meta;

type Story = StoryObj<typeof DocHtml>;

// Inline `content` is rendered via the iframe's `srcdoc` inside a
// `sandbox="allow-scripts"` frame, so embedded markup is isolated from the
// report DOM. The iframe carries a `title` for assistive tech.
export const InlineContent: Story = {
  args: {
    entry: {
      kind: "html",
      phase: "static",
      title: "Embedded result card",
      height: 220,
      content:
        '<div style="font-family:system-ui;padding:16px;border:1px solid #ddd;border-radius:8px"><strong>Wireless Mouse</strong><br/>$29.99 — in stock</div>',
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The caption shows the title; the iframe is reachable by its accessible name.
    await expect(canvas.getByText("Embedded result card")).toBeVisible();
    await expect(canvas.getByTitle("Embedded result card")).toBeInTheDocument();
  },
};

// A remote URL (scheme-validated) renders via `src`, plus an "open in new tab"
// affordance with an explicit aria-label.
export const RemoteUrl: Story = {
  args: {
    entry: {
      kind: "html",
      phase: "static",
      title: "Live dashboard",
      url: "https://example.com/embed/dashboard",
      height: 300,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Live dashboard")).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Open in new tab" })).toBeVisible();
  },
};
