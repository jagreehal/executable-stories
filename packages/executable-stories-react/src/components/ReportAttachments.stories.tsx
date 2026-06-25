import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReportAttachment } from "executable-stories-core";
import { expect, within } from "storybook/test";
import { ReportAttachments } from "./ReportAttachments";

const meta: Meta<typeof ReportAttachments> = {
  title: "Report/Attachments",
  component: ReportAttachments,
};
export default meta;

type Story = StoryObj<typeof ReportAttachments>;

// 1×1 transparent PNG — embeds inline as an <img>.
const PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADElEQVR42mP8z8BQDwAFgwJ/lYd9KgAAAABJRU5ErkJggg==";

const attachments: ReportAttachment[] = [
  { name: "checkout-screenshot.png", mediaType: "image/png", body: PNG, contentEncoding: "BASE64" },
  { name: "trace.json", mediaType: "application/json", body: '{"requestId":"abc123"}', contentEncoding: "IDENTITY" },
];

// Mixed attachments: a base64 image renders inline with an alt + caption; a
// non-image becomes a labelled data-URI download link.
export const Populated: Story = {
  args: { attachments },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const group = canvas.getByRole("group", { name: "Attachments" });
    await expect(within(group).getByRole("img", { name: "checkout-screenshot.png" })).toBeVisible();
    await expect(within(group).getByRole("link", { name: /trace\.json/ })).toBeVisible();
  },
};

// No attachments → the component renders nothing.
export const Empty: Story = {
  args: { attachments: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole("group", { name: "Attachments" })).toBeNull();
  },
};
