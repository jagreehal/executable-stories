import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { ReportInteractiveIsland } from "./ReportInteractiveIsland";
import { kitchenSinkReport } from "../test/kitchen-sink";
import { singleScenarioReport } from "../test/fixtures";

const meta: Meta<typeof ReportInteractiveIsland> = {
  title: "Interactive/ReportInteractiveIsland",
  component: ReportInteractiveIsland,
};
export default meta;

type Story = StoryObj<typeof ReportInteractiveIsland>;

/**
 * The island bakes in the syntax-highlighting + mermaid renderers, which load
 * heavy libraries from a CDN at runtime. The asserted "Offline" story disables
 * both so the story stays offline and axe-clean; assertions cover static
 * content only.
 */
export const Offline: Story = {
  args: {
    report: kitchenSinkReport(),
    syntaxHighlighting: false,
    mermaid: false,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("searchbox", { name: "Search" })).toBeVisible();
    await expect(
      canvas.getByRole("heading", { name: /caps the loyalty discount/i }),
    ).toBeVisible();

    // Design guards — the report header must keep its structure so the
    // "squashed" regression can't come back silently:
    // 1. Nav bar: report title <h1> and the search box share one row.
    const navbar = canvasElement.querySelector("[data-es-navbar]");
    expect(navbar).toBeTruthy();
    expect(navbar?.querySelector("h1")).toBeTruthy();
    expect(navbar?.querySelector('input[type="search"]')).toBeTruthy();
    // 2. Summary renders as ≥4 stat cards, not a collapsed text line.
    const summary = canvas.getByLabelText("Run summary");
    expect(summary.querySelectorAll("[data-status]").length).toBeGreaterThanOrEqual(4);
    // 3. Metadata renders inside the bordered "Run details" disclosure card.
    expect(canvas.getByLabelText("Run metadata").closest("[data-es-meta-card]")).not.toBeNull();
    // 4. Table-of-contents sidebar is present (visually hidden below lg, so
    //    assert presence in the DOM rather than visibility).
    expect(canvas.getByRole("navigation", { name: "Table of contents" })).toBeTruthy();
  },
};

/**
 * Embedded configuration (Astro/Starlight): the host owns the page title and
 * the scenario nav lives in Starlight's sidebar, so the island drops BOTH its
 * title block (hideHeader) and its in-content TOC (hideToc) — no second nav rail.
 */
export const Embedded: Story = {
  args: {
    report: kitchenSinkReport(),
    hideHeader: true,
    hideToc: true,
    syntaxHighlighting: false,
    mermaid: false,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Search stays (in-page filtering), but the TOC sidebar must be gone.
    await expect(canvas.getByRole("searchbox", { name: "Search" })).toBeVisible();
    expect(canvas.queryByRole("navigation", { name: "Table of contents" })).toBeNull();
  },
};

/**
 * Default island with the CDN renderers enabled — the configuration a host like
 * Astro hydrates. play assertions stay on static content so they don't depend on
 * the CDN-loaded mermaid/hljs having finished.
 */
/**
 * Sparse standalone report: one feature, one scenario (the Trolley Widget
 * Playwright story). The in-content TOC rail for a single scenario reads as
 * unbalanced dead space — this story is where we iterate the few-scenario
 * layout so the report looks intentional at any size.
 */
export const SingleScenario: Story = {
  args: { report: singleScenarioReport(), syntaxHighlighting: false, mermaid: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Stat cards still render, but a one-scenario report drops the TOC rail so
    // the content is full-width instead of squashed beside a dead nav column.
    expect(canvas.getByLabelText("Run summary").querySelectorAll("[data-status]").length).toBeGreaterThanOrEqual(4);
    expect(canvas.queryByRole("navigation", { name: "Table of contents" })).toBeNull();
    await expect(canvas.getByRole("heading", { name: /loads signed iframe/i })).toBeVisible();
  },
};

export const Default: Story = {
  args: { report: kitchenSinkReport() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { name: /caps the loyalty discount/i }),
    ).toBeVisible();
  },
};
