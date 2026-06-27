import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { DocVideo } from "./DocVideo";

const meta: Meta<typeof DocVideo> = {
  title: "Doc/DocVideo",
  component: DocVideo,
};
export default meta;

type Story = StoryObj<typeof DocVideo>;

// Video bytes are never inlined; `path` is a URL/relative path resolved beside
// the report. A real-looking https URL passes the scheme allow-list so the
// <video src> is populated (an unsafe scheme would yield an empty, src-less frame).
export const WithCaption: Story = {
  args: {
    entry: {
      kind: "video",
      phase: "static",
      path: "https://example.com/videos/search-demo.webm",
      caption: "Typing a query and selecting a result",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Typing a query and selecting a result")).toBeVisible();
  },
};

export const WithPoster: Story = {
  args: {
    entry: {
      kind: "video",
      phase: "static",
      path: "videos/checkout-flow.webm",
      poster: "screenshots/checkout-poster.png",
      caption: "Completing checkout end to end",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Completing checkout end to end")).toBeVisible();
  },
};
