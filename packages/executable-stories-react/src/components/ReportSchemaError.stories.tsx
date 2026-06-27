import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { ReportSchemaError } from "./ReportSchemaError";
import type { ReportParseError } from "../result";

const meta: Meta<typeof ReportSchemaError> = {
  title: "Report/SchemaError",
  component: ReportSchemaError,
};
export default meta;

type Story = StoryObj<typeof ReportSchemaError>;

// Validation failure with a list of issues (rendered in a collapsible <details>).
const validationFailed: ReportParseError = {
  code: "VALIDATION_FAILED",
  message: "The report JSON did not match the StoryReport schema.",
  issues: [
    { path: "features[0].scenarios[0].status", message: "must be one of passed|failed|skipped|pending" },
    { path: "summary.total", message: "must be a number" },
  ],
};

export const ValidationFailed: Story = {
  args: { error: validationFailed },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const alert = canvas.getByRole("alert");
    await expect(alert).toHaveTextContent(/could not be displayed/i);
    await expect(canvas.getByText(/2 validation issues/)).toBeVisible();
  },
};

// A version mismatch adds the "upgrade the package" guidance.
const versionMismatch: ReportParseError = {
  code: "SCHEMA_VERSION_MISMATCH",
  message: "Report schema version 2.0 is newer than the supported 1.x.",
};

export const VersionMismatch: Story = {
  args: { error: versionMismatch },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const alert = canvas.getByRole("alert");
    await expect(alert).toHaveTextContent(/newer than this version/i);
  },
};

// Plain invalid input with no issue list.
const invalidInput: ReportParseError = {
  code: "INVALID_INPUT",
  message: "Expected a JSON object but received a string.",
};

export const InvalidInput: Story = {
  args: { error: invalidInput },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("alert")).toHaveTextContent(/Expected a JSON object/);
    await expect(canvas.queryByText(/validation issue/)).toBeNull();
  },
};
