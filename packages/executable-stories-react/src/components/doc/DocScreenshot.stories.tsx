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
