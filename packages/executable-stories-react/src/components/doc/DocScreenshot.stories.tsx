import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { DocScreenshot } from "./DocScreenshot";

const meta: Meta<typeof DocScreenshot> = {
  title: "Doc/DocScreenshot",
  component: DocScreenshot,
};
export default meta;

type Story = StoryObj<typeof DocScreenshot>;

// A real (tiny, inline) PNG so the <img> never renders as a broken/empty source.
const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADElEQVR42mP8z8BQDwAFgwJ/lYd9KgAAAABJRU5ErkJggg==";

export const WithAlt: Story = {
  args: { entry: { kind: "screenshot", phase: "static", path: PNG, alt: "Search result card" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const img = canvas.getByRole("img", { name: "Search result card" });
    await expect(img).toBeVisible();
    // The alt also surfaces as a visible caption.
    await expect(canvas.getByText("Search result card")).toBeVisible();
  },
};

// No alt: the image is decorative (empty alt), so it's removed from the a11y
// tree rather than announced with a meaningless filename. Still axe-clean.
export const Decorative: Story = {
  args: { entry: { kind: "screenshot", phase: "static", path: PNG } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole("img")).toBeNull();
  },
};

// A local filesystem path that survived to render time means the report's
// asset bundler couldn't find/copy the file (deleted, moved, or never
// captured). An <img src> pointed at a runner-local path would just 404 — a
// labeled placeholder is more useful than a broken image icon.
export const Unavailable: Story = {
  args: {
    entry: {
      kind: "screenshot",
      phase: "static",
      path: "/home/runner/work/app/app/test-results/dashboard.png",
      alt: "Dashboard overview",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Screenshot unavailable")).toBeVisible();
    await expect(canvas.queryByRole("img")).toBeNull();
  },
};
