import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor, within } from "storybook/test";
import { DocHtml } from "./DocHtml";

const meta: Meta<typeof DocHtml> = {
  title: "Doc/DocHtml",
  component: DocHtml,
};
export default meta;

type Story = StoryObj<typeof DocHtml>;

// Inline `content` is rendered via the iframe's `srcdoc` inside a
// `sandbox="allow-scripts"` frame, so embedded markup is isolated from the
// report DOM. The iframe carries a `title` for assistive tech.
export const InlineContent: Story = {
  args: {
    entry: {
      kind: "html",
      phase: "static",
      title: "Embedded result card",
      height: 220,
      content:
        '<div style="font-family:system-ui;padding:16px;border:1px solid #ddd;border-radius:8px"><strong>Wireless Mouse</strong><br/>$29.99 — in stock</div>',
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The caption shows the title; the iframe is reachable by its accessible name.
    await expect(canvas.getByText("Embedded result card")).toBeVisible();
    await expect(canvas.getByTitle("Embedded result card")).toBeInTheDocument();
  },
};

// A remote URL (scheme-validated) renders via `src`, plus an "open in new tab"
// affordance with an explicit aria-label.
export const RemoteUrl: Story = {
  args: {
    entry: {
      kind: "html",
      phase: "static",
      title: "Live dashboard",
      url: "https://example.com/embed/dashboard",
      height: 300,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Live dashboard")).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Open in new tab" })).toBeVisible();
  },
};

/**
 * Auto-sizing, end to end in a real browser: the injected script measures the
 * framed page and posts its height out, and the frame grows past the 200px it
 * started at. jsdom can only fake that message; here the script actually runs.
 */
export const GrowsToItsContent: Story = {
  args: {
    entry: {
      kind: "html",
      phase: "static",
      title: "A tall artifact",
      height: 200,
      content:
        "<div style=\"font-family:system-ui;padding:16px\">" +
        Array.from({ length: 40 }, (_, i) => `<p>Line ${i + 1} of a full-page artifact.</p>`).join("") +
        "</div>",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const frame = canvas.getByTitle("A tall artifact") as HTMLIFrameElement;

    await waitFor(
      () => expect(Number.parseInt(frame.style.height, 10)).toBeGreaterThan(200),
      { timeout: 4000 },
    );
  },
};

/**
 * A page that stretches its body to the frame must still be measured by its
 * content.
 *
 * `html, body { height: 100% }` is ordinary in a standalone artifact, and it
 * makes the document's own scrollHeight equal to whatever the frame currently
 * is. Measuring that is a ratchet: the frame can grow but never shrink, because
 * the thing being measured is the frame. Here the content is ~120px inside a
 * 600px placeholder, so a correct measurement shrinks the frame and a
 * document-level one leaves it at 600.
 */
export const StretchedBodyStillSizesToContent: Story = {
  args: {
    entry: {
      kind: "html",
      phase: "static",
      title: "A stretched artifact",
      height: 600,
      content:
        "<style>html,body{height:100%;margin:0}</style>" +
        "<div style=\"height:120px;background:#eef\">Short content in a tall frame</div>",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const frame = canvas.getByTitle("A stretched artifact") as HTMLIFrameElement;

    await waitFor(
      () => expect(Number.parseInt(frame.style.height, 10)).toBeLessThan(300),
      { timeout: 4000 },
    );
  },
};

/**
 * Content that appears after load resizes the frame.
 *
 * A quiz revealing an answer, a tab switching, a chart finishing: none of that
 * changes the size of a body already stretched to the frame, so a ResizeObserver
 * alone never fires. The MutationObserver is what catches it.
 */
export const GrowsWhenContentAppears: Story = {
  args: {
    entry: {
      kind: "html",
      phase: "static",
      title: "A growing artifact",
      height: 300,
      content:
        "<style>html,body{height:100%;margin:0}</style>" +
        "<div id=\"box\" style=\"height:80px\">Before</div>" +
        "<script>setTimeout(function(){" +
        "var d=document.createElement('div');d.style.height='900px';d.textContent='revealed';" +
        "document.body.appendChild(d)},50)</" + "script>",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const frame = canvas.getByTitle("A growing artifact") as HTMLIFrameElement;

    await waitFor(
      () => expect(Number.parseInt(frame.style.height, 10)).toBeGreaterThan(900),
      { timeout: 4000 },
    );
  },
};

/**
 * Content with nothing to measure by element still gets measured.
 *
 * `story.html({ content })` takes any string, so a fragment can be bare text
 * with no element children at all, or text alongside only non-rendered ones —
 * a `<style>` block, a `<script>`. Measuring the tallest child then yields
 * zero, which posts nothing and pins the frame at whatever height the entry
 * declared. Falling back to body's own box is what gives that text a box to be
 * measured in.
 *
 * Both directions, because the fallback has to track the text and not just
 * return some number once: the frame shrinks off its 500px placeholder to the
 * one line it starts with, then grows past it when the text does.
 */
export const BareTextIsMeasured: Story = {
  args: {
    entry: {
      kind: "html",
      phase: "static",
      title: "A bare-text artifact",
      height: 500,
      content:
        "Just some plain text, no elements at all." +
        "<script>setTimeout(function(){" +
        "document.body.appendChild(document.createTextNode(' padding'.repeat(4000)))" +
        "},50)</" + "script>",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const frame = canvas.getByTitle("A bare-text artifact") as HTMLIFrameElement;

    // One line of text, measured, not the 500px placeholder.
    await waitFor(
      () => expect(Number.parseInt(frame.style.height, 10)).toBeLessThan(200),
      { timeout: 4000 },
    );
    // And it follows the text as it grows.
    await waitFor(
      () => expect(Number.parseInt(frame.style.height, 10)).toBeGreaterThan(500),
      { timeout: 4000 },
    );
  },
};
