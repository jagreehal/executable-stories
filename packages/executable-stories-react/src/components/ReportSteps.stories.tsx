import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { ReportSteps } from "./ReportSteps";
import { failedScenario, passedScenario } from "../test/fixtures";

const meta: Meta<typeof ReportSteps> = {
  title: "Report/Steps",
  component: ReportSteps,
};
export default meta;

type Story = StoryObj<typeof ReportSteps>;

// All-passed steps with given/when/then/and keyword variety (the And reads as an
// indented continuation with a muted keyword).
export const Passed: Story = {
  args: { scenario: passedScenario() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/a returning customer with a saved card/i)).toBeVisible();
    await expect(canvas.getByText(/a receipt is emailed/i)).toBeVisible();
    // No step error → no alert.
    await expect(canvas.queryByRole("alert")).toBeNull();
  },
};

// A failed step surfaces its error message as an alert; the failing keyword here
// is an explicit "But".
export const WithFailedStep: Story = {
  args: { scenario: failedScenario() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/the order is not placed/i)).toBeVisible();
    const alert = canvas.getByRole("alert");
    await expect(alert).toHaveTextContent(/AssertionError/);
  },
};

// Full keyword variety in one story: Given / When / Then (auto-And on repeat) /
// And / But, with a mix of passed and skipped statuses.
export const KeywordVariety: Story = {
  args: {
    scenario: passedScenario({
      steps: [
        { id: "kv1", index: 0, keyword: "Given", text: "the user account exists", status: "passed", durationMs: 12, docEntries: [] },
        { id: "kv2", index: 1, keyword: "Given", text: "the account is suspended", status: "passed", durationMs: 8, docEntries: [] },
        { id: "kv3", index: 2, keyword: "When", text: "the user submits valid credentials", status: "passed", durationMs: 20, docEntries: [] },
        { id: "kv4", index: 3, keyword: "Then", text: "the user sees an error message", status: "passed", durationMs: 15, docEntries: [] },
        { id: "kv5", index: 4, keyword: "And", text: "the failure is logged", status: "passed", durationMs: 5, docEntries: [] },
        { id: "kv6", index: 5, keyword: "But", text: "the session is not created", status: "skipped", durationMs: 0, docEntries: [] },
      ],
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/the user account exists/i)).toBeVisible();
    await expect(canvas.getByText("But")).toBeVisible();
    await expect(canvas.getByText("And")).toBeVisible();
  },
};
