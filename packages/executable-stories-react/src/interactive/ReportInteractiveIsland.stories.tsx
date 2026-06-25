import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { ReportInteractiveIsland } from "./ReportInteractiveIsland";
import { kitchenSinkReport } from "../test/kitchen-sink";

const meta: Meta<typeof ReportInteractiveIsland> = {
  title: "Interactive/ReportInteractiveIsland",
  component: ReportInteractiveIsland,
};
export default meta;

type Story = StoryObj<typeof ReportInteractiveIsland>;

/**
 * The island bakes in the syntax-highlighting + mermaid renderers, which load
 * heavy libraries from a CDN at runtime. The asserted "Offline" story disables
 * both so the story stays offline and axe-clean; assertions cover static
 * content only.
 */
export const Offline: Story = {
  args: {
    report: kitchenSinkReport(),
    syntaxHighlighting: false,
    mermaid: false,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("searchbox", { name: "Search" })).toBeVisible();
    await expect(
      canvas.getByRole("heading", { name: /caps the loyalty discount/i }),
    ).toBeVisible();
  },
};

/**
 * Default island with the CDN renderers enabled — the configuration a host like
 * Astro hydrates. play assertions stay on static content so they don't depend on
 * the CDN-loaded mermaid/hljs having finished.
 */
export const Default: Story = {
  args: { report: kitchenSinkReport() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { name: /caps the loyalty discount/i }),
    ).toBeVisible();
  },
};
