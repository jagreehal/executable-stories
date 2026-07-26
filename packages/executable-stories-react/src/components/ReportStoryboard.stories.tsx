import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { ReportStoryboard } from "./ReportStoryboard";
import { passedScenario } from "../test/fixtures";
import type { ReportStep } from "executable-stories-core";

const meta: Meta<typeof ReportStoryboard> = {
  title: "Report/Storyboard",
  component: ReportStoryboard,
};
export default meta;

type Story = StoryObj<typeof ReportStoryboard>;

// A real (tiny, inline) PNG so the <img> never renders as a broken/empty source.
const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADElEQVR42mP8z8BQDwAFgwJ/lYd9KgAAAABJRU5ErkJggg==";

const shotStep = (index: number, overrides: Partial<ReportStep>, alt?: string): ReportStep => ({
  id: `sb--step-${index}`,
  index,
  keyword: "Given",
  text: `step ${index}`,
  status: "passed",
  durationMs: 10,
  docEntries: [{ kind: "screenshot", phase: "runtime", path: PNG, ...(alt !== undefined && { alt }) }],
  ...overrides,
});

// The checkout walkthrough: three step screenshots become three frames, each
// linking to its step anchor. Alt text is the caption when present.
export const CheckoutJourney: Story = {
  args: {
    scenario: passedScenario({
      steps: [
        shotStep(0, { keyword: "Given", text: "cart has items" }, "Cart with 3 items"),
        shotStep(1, { keyword: "When", text: "user completes checkout" }, "Payment form"),
        shotStep(2, { keyword: "Then", text: "confirmation is shown" }, "Order confirmed"),
      ],
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("region", { name: "Storyboard" })).toBeVisible();
    await expect(canvas.getAllByRole("img")).toHaveLength(3);
    const jump = canvas.getByRole("link", { name: /Jump to step: When user completes checkout/i });
    await expect(jump).toHaveAttribute("href", "#sb--step-1");
    await expect(canvas.getByText("Payment form")).toBeVisible();
  },
};

// A failed step tints its frame glyph; steps without screenshots contribute
// no frame (2 frames from 3 steps).
export const WithFailureAndGaps: Story = {
  args: {
    scenario: passedScenario({
      status: "failed",
      steps: [
        shotStep(0, { keyword: "Given", text: "cart has items" }),
        { id: "sb--step-1", index: 1, keyword: "When", text: "no screenshot here", status: "passed", durationMs: 5, docEntries: [] },
        shotStep(2, { keyword: "Then", text: "payment declined", status: "failed" }),
      ],
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole("listitem")).toHaveLength(2);
    await expect(canvas.getByText("✗")).toBeVisible();
  },
};

// Below the 2-frame threshold the storyboard renders nothing: one screenshot
// is step evidence, not a walkthrough.
export const SingleFrameHidden: Story = {
  args: {
    scenario: passedScenario({
      steps: [shotStep(0, { keyword: "Given", text: "only one shot" })],
    }),
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole("region", { name: "Storyboard" })).toBeNull();
  },
};

// An unresolvable local filesystem path (asset bundling couldn't find the
// file) renders a placeholder frame instead of a broken image.
export const UnresolvedPathPlaceholder: Story = {
  args: {
    scenario: passedScenario({
      steps: [
        shotStep(0, { keyword: "Given", text: "cart has items" }),
        {
          id: "sb--step-1",
          index: 1,
          keyword: "Then",
          text: "confirmation is shown",
          status: "passed",
          durationMs: 5,
          docEntries: [{ kind: "screenshot", phase: "runtime", path: "/tmp/gone.png", alt: "Order confirmed" }],
        },
      ],
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Screenshot unavailable")).toBeVisible();
    await expect(canvas.getAllByRole("img")).toHaveLength(1);
  },
};
