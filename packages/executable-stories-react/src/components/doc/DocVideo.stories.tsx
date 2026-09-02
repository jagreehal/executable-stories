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
      path: "videos/search-demo.webm",
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
      path: "videos/search-demo.webm",
      poster: "screenshots/search-result.png",
      caption: "Completing checkout end to end",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Completing checkout end to end")).toBeVisible();
  },
};

// A local filesystem path that survived to render time means the report's
// asset bundler couldn't find/copy the file — same story as DocScreenshot's
// Unavailable case.
export const Unavailable: Story = {
  args: {
    entry: {
      kind: "video",
      phase: "static",
      path: "/home/runner/work/app/app/test-results/checkout-flow.webm",
      caption: "Completing checkout end to end",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Video unavailable")).toBeVisible();
    await expect(canvasElement.querySelector("video")).toBeNull();
  },
};
