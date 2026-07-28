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

// A step whose evidence is `story.state()` snapshots rather than a screenshot.
const stateStep = (
  index: number,
  overrides: Partial<ReportStep>,
  states: { label?: string; value: unknown }[]
): ReportStep => ({
  id: `sb--step-${index}`,
  index,
  keyword: "Given",
  text: `step ${index}`,
  status: "passed",
  durationMs: 10,
  docEntries: states.map((s) => ({ kind: "state", phase: "runtime", ...s })),
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

// A data-only walkthrough: no screenshots at all — the basket snapshot IS the
// frame. First frame shows the snapshot ("first capture"), later frames lead
// with the changed fields (added/removed/changed rows) computed by core.
export const DataOnlyBasket: Story = {
  args: {
    scenario: passedScenario({
      steps: [
        stateStep(0, { keyword: "Given", text: "an empty basket" }, [
          { label: "Basket", value: { items: [], total: 0 } },
        ]),
        stateStep(1, { keyword: "When", text: "the user adds a book" }, [
          { label: "Basket", value: { items: [{ sku: "book", qty: 1 }], total: 12 } },
        ]),
        stateStep(2, { keyword: "Then", text: "the total reflects the book" }, [
          { label: "Basket", value: { items: [{ sku: "book", qty: 2 }], total: 24 } },
        ]),
      ],
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("region", { name: "Storyboard" })).toBeVisible();
    // No screenshots anywhere.
    await expect(canvas.queryByRole("img")).toBeNull();
    await expect(canvas.getByText("first capture")).toBeVisible();
    // Frame 2: item added + total changed, as highlighted rows.
    await expect(canvas.getByText('+ items[0]: {"sku":"book","qty":1}')).toBeVisible();
    await expect(canvas.getByText("total: 0 → 12")).toBeVisible();
    // Frame 3: qty and total change.
    await expect(canvas.getByText("items[0].qty: 1 → 2")).toBeVisible();
    // Captionless frames still link to their step anchors.
    const jump = canvas.getByRole("link", { name: /Jump to step: When the user adds a book/i });
    await expect(jump).toHaveAttribute("href", "#sb--step-1");
  },
};

// A frame can hold both: the screen the user saw AND what the order record
// now says. Screenshot stays the visual, state card sits beneath it.
export const ScreenshotWithState: Story = {
  args: {
    scenario: passedScenario({
      steps: [
        stateStep(0, { keyword: "Given", text: "an order is drafted" }, [
          { label: "Order", value: { status: "draft" } },
        ]),
        {
          id: "sb--step-1",
          index: 1,
          keyword: "When",
          text: "the user submits the order",
          status: "passed",
          durationMs: 10,
          docEntries: [
            { kind: "screenshot", phase: "runtime", path: PNG, alt: "Confirmation screen" },
            { kind: "state", phase: "runtime", label: "Order", value: { status: "submitted" } },
          ],
        },
      ],
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("img", { name: "Confirmation screen" })).toBeVisible();
    await expect(canvas.getByText('status: "draft" → "submitted"')).toBeVisible();
  },
};

// Two labels = two lanes. "Basket" keeps its slot frame after frame even when
// only "Inventory" changed, so the eye can track one entity across the strip.
export const MultiLane: Story = {
  args: {
    scenario: passedScenario({
      steps: [
        stateStep(0, { keyword: "Given", text: "a stocked shop" }, [
          { label: "Basket", value: { items: 0 } },
          { label: "Inventory", value: { book: 5 } },
        ]),
        stateStep(1, { keyword: "When", text: "the user adds a book" }, [
          { label: "Basket", value: { items: 1 } },
          { label: "Inventory", value: { book: 4 } },
        ]),
      ],
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("Basket")).toHaveLength(2);
    await expect(canvas.getAllByText("Inventory")).toHaveLength(2);
    await expect(canvas.getByText("items: 0 → 1")).toBeVisible();
    await expect(canvas.getByText("book: 5 → 4")).toBeVisible();
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
