import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { ReportBackToTop } from "./ReportBackToTop";

/**
 * The button tracks window scroll, so the story renders a long page inside a
 * focusable <main> (as ReportInteractive does) and scrolls the story iframe.
 */
const meta: Meta<typeof ReportBackToTop> = {
  title: "Interactive/ReportBackToTop",
  component: ReportBackToTop,
  render: () => (
    <main tabIndex={-1} aria-label="Test report" className="outline-none">
      <p className="p-6 text-sm text-muted-foreground">
        Scroll down a screen and the button fades in above the bottom-right corner.
      </p>
      <div style={{ height: "400vh" }} />
      <ReportBackToTop />
    </main>
  ),
};
export default meta;

type Story = StoryObj<typeof ReportBackToTop>;

// At the top of the page there is nothing to go back to: hidden and unreachable by Tab.
export const HiddenAtTop: Story = {
  play: async ({ canvasElement }) => {
    window.scrollTo(0, 0);
    // By attribute: a `visibility: hidden` button has no accessible name to query by role.
    const button = canvasElement.querySelector<HTMLElement>('button[aria-label="Back to top"]');
    await waitFor(() => expect(button).not.toBeVisible());
  },
};

// A screen down it shows; clicking jumps instantly and hands focus to <main>,
// since the button hides again and focus would otherwise drop to <body>.
export const JumpsToTopAndKeepsFocus: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    window.scrollTo(0, window.innerHeight * 2);
    const button = await canvas.findByRole("button", { name: "Back to top" });
    await waitFor(() => expect(button).toBeVisible());
    await userEvent.click(button);
    await expect(window.scrollY).toBe(0);
    await expect(document.activeElement).toBe(canvas.getByRole("main"));
  },
};
