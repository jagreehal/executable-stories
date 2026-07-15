import type { Meta, StoryObj } from "@storybook/react-vite";
import type { StoryReport } from "executable-stories-core";
import { expect, within } from "storybook/test";
import { ReportErrorShell, ReportTitleBlock } from "./ReportShell";
import { ReportContext } from "../context/ReportContext";
import type { ReportParseError } from "../result";
import { reportFixture } from "../test/fixtures";

/**
 * ReportShell exports the report's shared chrome: `ReportTitleBlock` (the
 * `<h1>` + summary + meta header, used by both the static and interactive views)
 * and `ReportErrorShell` (the `<main>` shown when a report fails to parse).
 */
const meta: Meta = {
  title: "Report/Shell",
};
export default meta;

// ReportTitleBlock renders ReportSummary + ReportMeta, both of which read from
// ReportContext (useReport), so the header must sit inside a provider.
function withReport(report: StoryReport, title?: string) {
  return function Render() {
    return (
      <ReportContext.Provider value={{ report, customRenderers: {}, renderers: {} }}>
        <ReportTitleBlock {...(title !== undefined && { title })} />
      </ReportContext.Provider>
    );
  };
}

export const TitleBlock: StoryObj = {
  render: withReport(reportFixture({ startedAtMs: 1_717_000_000_000 }), "Checkout report"),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { level: 1, name: "Checkout report" })).toBeVisible();
    // Stat cards, not a text summary; meta renders as a bordered card.
    await expect(canvas.getByLabelText("Run summary")).toHaveTextContent(/Total/);
    // Metadata is tucked inside a collapsed "Run details" disclosure card.
    await expect(canvas.getByText("Run details")).toBeVisible();
    const meta = canvas.getByLabelText("Run metadata");
    expect(meta.closest("[data-es-meta-card]")).not.toBeNull();
  },
};

export const TitleBlockDefaultTitle: StoryObj = {
  render: withReport(reportFixture()),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { level: 1, name: "Story Report" })).toBeVisible();
  },
};

// The error shell renders its own <main> landmark with the schema-error alert.
const validationError: ReportParseError = {
  code: "VALIDATION_FAILED",
  message: "The report JSON did not match the StoryReport schema.",
  issues: [
    { path: "features[0].scenarios[0].status", message: "must be one of passed|failed|skipped|pending" },
  ],
};

export const ErrorShell: StoryObj = {
  render: () => <ReportErrorShell error={validationError} title="Test report" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("main", { name: "Test report" })).toBeVisible();
    const alert = canvas.getByRole("alert");
    await expect(alert).toHaveTextContent(/could not be displayed/i);
    await expect(alert).toHaveTextContent(/did not match the StoryReport schema/);
  },
};
