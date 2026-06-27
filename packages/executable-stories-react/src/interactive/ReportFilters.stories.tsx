import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { ReportFilters, type ReportFiltersProps } from "./ReportFilters";
import type { StatusFilter } from "./filter";

const STATUSES: ReportFiltersProps["statuses"] = [
  { key: "all", label: "All", count: 5 },
  { key: "passed", label: "Passed", count: 2 },
  { key: "failed", label: "Failed", count: 1 },
  { key: "skipped", label: "Skipped", count: 1 },
  { key: "pending", label: "Pending", count: 1 },
];

const TAGS = ["checkout", "payments", "search"];

/**
 * ReportFilters is presentational — the parent owns status + active tags. A
 * stateful wrapper holds both so the chips actually toggle in the story.
 */
function StatefulFilters(props: Partial<ReportFiltersProps>) {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  return (
    <ReportFilters
      statuses={props.statuses ?? STATUSES}
      tags={props.tags ?? TAGS}
      status={status}
      onStatus={setStatus}
      activeTags={activeTags}
      onToggleTag={(tag) =>
        setActiveTags((prev) =>
          prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
        )
      }
    />
  );
}

const meta: Meta<typeof ReportFilters> = {
  title: "Interactive/ReportFilters",
  component: ReportFilters,
};
export default meta;

type Story = StoryObj<typeof ReportFilters>;

export const Default: Story = {
  render: (args) => <StatefulFilters {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Status group and tag list both render.
    await expect(canvas.getByRole("group", { name: "Filter by status" })).toBeVisible();
    await expect(canvas.getByLabelText("Filter by tag")).toBeVisible();
    await expect(canvas.getByRole("button", { name: /Failed/ })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "checkout" })).toBeVisible();
  },
};

// Clicking a status chip marks it pressed; clicking a tag chip toggles it on.
export const ToggleChips: Story = {
  render: (args) => <StatefulFilters {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const failed = canvas.getByRole("button", { name: /Failed/ });
    await expect(failed).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(failed);
    await expect(failed).toHaveAttribute("aria-pressed", "true");

    const tag = canvas.getByRole("button", { name: "payments" });
    await expect(tag).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(tag);
    await expect(tag).toHaveAttribute("aria-pressed", "true");
  },
};
