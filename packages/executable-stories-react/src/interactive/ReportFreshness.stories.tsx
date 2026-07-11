import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { ReportFreshness } from "./ReportFreshness";

const NOW = 1_750_000_000_000;
const DAY = 86_400_000;

const meta: Meta<typeof ReportFreshness> = {
  title: "Interactive/ReportFreshness",
  component: ReportFreshness,
};
export default meta;

type Story = StoryObj<typeof ReportFreshness>;

// A recent run reads as a quiet one-line trust signal, not a banner.
export const Fresh: Story = {
  args: {
    lastRunMs: NOW - 2 * 3_600_000,
    ciUrl: "https://github.com/acme/shop/actions/runs/42",
    staleAfterDays: 7,
    nowMs: NOW,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/Verified 2 hours ago/)).toBeVisible();
    await expect(canvas.getByRole("link", { name: "View CI run" })).toBeVisible();
  },
};

// Past the threshold the signal escalates to a warning banner: living
// documentation stops being trustworthy when it stops being recent.
export const Stale: Story = {
  args: {
    lastRunMs: NOW - 12 * DAY,
    ciUrl: "https://github.com/acme/shop/actions/runs/42",
    staleAfterDays: 7,
    nowMs: NOW,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("status", { name: "Report freshness" })).toBeVisible();
    await expect(canvas.getByText(/Last verified 12 days ago/)).toBeVisible();
  },
};

// staleAfterDays: 0 disables the warning entirely — old runs still show the
// quiet verified line so readers keep the timestamp.
export const WarningDisabled: Story = {
  args: {
    lastRunMs: NOW - 100 * DAY,
    staleAfterDays: 0,
    nowMs: NOW,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/Verified 100 days ago/)).toBeVisible();
  },
};
