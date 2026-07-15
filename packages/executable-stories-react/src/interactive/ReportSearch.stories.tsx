import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { ReportSearch, type ReportSearchProps } from "./ReportSearch";

/**
 * ReportSearch is a controlled input (value/onChange). A small stateful wrapper
 * holds the value so the input behaves the way it does inside ReportInteractive.
 */
function StatefulSearch(props: Partial<ReportSearchProps>) {
  const [value, setValue] = useState(props.value ?? "");
  return (
    <ReportSearch
      {...props}
      value={value}
      onChange={(next) => {
        setValue(next);
        props.onChange?.(next);
      }}
    />
  );
}

const meta: Meta<typeof ReportSearch> = {
  title: "Interactive/ReportSearch",
  component: ReportSearch,
};
export default meta;

type Story = StoryObj<typeof ReportSearch>;

export const Empty: Story = {
  render: (args) => <StatefulSearch {...args} matchedCount={5} totalCount={5} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("searchbox", { name: "Search" });
    await expect(input).toHaveValue("");
    // At rest the count is hidden — the "All N" status tab already shows the total.
    await expect(canvas.queryByText(/total|of \d/)).toBeNull();
  },
};

// Typing updates the controlled value and switches the counts to "matched of total".
export const TypingUpdatesValue: Story = {
  render: (args) => <StatefulSearch {...args} matchedCount={2} totalCount={5} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("searchbox", { name: "Search" });
    await userEvent.type(input, "checkout");
    await expect(input).toHaveValue("checkout");
    await expect(canvas.getByText("2 of 5 scenarios")).toBeVisible();
  },
};

// Pressing Escape with a non-empty value clears the input.
export const EscapeClears: Story = {
  render: (args) => <StatefulSearch {...args} value="checkout" matchedCount={2} totalCount={5} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("searchbox", { name: "Search" });
    await expect(input).toHaveValue("checkout");
    input.focus();
    await userEvent.keyboard("{Escape}");
    await expect(input).toHaveValue("");
  },
};
