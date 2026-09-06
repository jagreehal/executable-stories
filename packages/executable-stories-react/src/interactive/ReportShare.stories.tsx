import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { fn } from "storybook/test";
import { ReportShare } from "./ReportShare";

const meta: Meta<typeof ReportShare> = {
  title: "Interactive/ReportShare",
  component: ReportShare,
  args: { onCopy: fn() },
};
export default meta;

type Story = StoryObj<typeof ReportShare>;

// Closed: only the trigger shows. The dialog is not in the a11y tree yet.
export const Closed: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", { name: "Share this report" })).toBeVisible();
    await expect(
      within(document.body).queryByRole("dialog", { name: "Share this report" }),
    ).toBeNull();
  },
};

/**
 * Opening shows the command and copies it on demand. The dialog is opened via
 * showModal(), so it renders in the top layer and assertions query document.body.
 */
export const Opened: Story = {
  args: { command: "npx executable-stories share reports/" },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Share this report" }));

    const dialog = within(document.body).getByRole("dialog", { name: "Share this report" });
    await expect(dialog).toBeVisible();
    await expect(
      within(dialog).getByText("npx executable-stories share reports/"),
    ).toBeVisible();

    await userEvent.click(within(dialog).getByRole("button", { name: "Copy" }));
    await expect(args.onCopy).toHaveBeenCalledWith(
      "npx executable-stories share reports/",
      "Command copied",
    );
  },
};

// The command is whatever the CLI stamped in, not a fixed string.
export const CustomCommand: Story = {
  args: { command: "pnpm exec executable-stories share dist/report" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Share this report" }));
    const dialog = within(document.body).getByRole("dialog", { name: "Share this report" });
    await expect(
      within(dialog).getByText("pnpm exec executable-stories share dist/report"),
    ).toBeVisible();
  },
};
