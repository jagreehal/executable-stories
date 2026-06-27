import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { ReportShortcutsHelp } from "./ReportShortcutsHelp";

const meta: Meta<typeof ReportShortcutsHelp> = {
  title: "Interactive/ReportShortcutsHelp",
  component: ReportShortcutsHelp,
  args: { onClose: () => {} },
};
export default meta;

type Story = StoryObj<typeof ReportShortcutsHelp>;

/**
 * The help is a native <dialog> opened via showModal(). Its content lives in the
 * top layer rather than the story canvas, so assertions query document.body. The
 * dialog carries an aria-label, satisfying the "dialog needs a title" a11y rule.
 */
export const Open: Story = {
  args: { open: true },
  play: async () => {
    const body = within(document.body);
    const dialog = body.getByRole("dialog", { name: "Keyboard shortcuts" });
    await expect(dialog).toBeVisible();
    // A representative shortcut row renders.
    await expect(within(dialog).getByText("Focus search")).toBeVisible();
    await expect(within(dialog).getByRole("button", { name: "Close" })).toBeVisible();
  },
};

// Closed: the dialog is in the DOM but not visible/open.
export const Closed: Story = {
  args: { open: false },
  play: async () => {
    const body = within(document.body);
    const dialog = body.queryByRole("dialog", { name: "Keyboard shortcuts" });
    // A non-open <dialog> is hidden from the accessibility tree.
    await expect(dialog).toBeNull();
  },
};
