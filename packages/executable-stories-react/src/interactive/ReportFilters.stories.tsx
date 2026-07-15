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

// A tag-heavy report collapses the tag list to one row (first 12) behind a
// "+N more" toggle, so it doesn't open with a tall grey brick. Expanding
// reveals the rest.
const MANY_TAGS = [
  "auth", "oopsi", "smoke", "integration", "compliance", "platform",
  "expire", "widget", "reference-data", "onboarding", "partner", "e2e",
  "payments", "cleanup", "balances", "royalties", "recipients", "batch",
  "fees", "fx",
];

export const ManyTagsCollapse: Story = {
  render: (args) => <StatefulFilters {...args} />,
  args: { tags: MANY_TAGS },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // 20 tags, limit 12 → 8 hidden behind the toggle; a later tag isn't rendered yet.
    const more = canvas.getByRole("button", { name: "+8 more" });
    await expect(more).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "fx" })).toBeNull();
    // Expanding reveals the rest and flips the toggle to "Show fewer".
    await userEvent.click(more);
    await expect(canvas.getByRole("button", { name: "fx" })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Show fewer" })).toBeVisible();
  },
};
