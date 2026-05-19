import { renderErrorBox } from "../../src/formatters/html/renderers/error-box";
import { escapeHtml } from "../../src/formatters/html/template";
import type { Meta, StoryObj } from "@storybook/html";

const meta: Meta = { title: "Renderers/ErrorBox" };
export default meta;

const deps = { escapeHtml };

export const MessageOnly: StoryObj = {
  render: () =>
    renderErrorBox(
      { message: 'Expected "Welcome back" to include "Invalid credentials"' },
      deps,
    ),
};

export const WithStack: StoryObj = {
  render: () =>
    renderErrorBox(
      {
        message: "TypeError: Cannot read properties of undefined (reading 'name')",
        stack:
          "TypeError: Cannot read properties of undefined (reading 'name')\n    at getUserName (src/user.ts:42:18)\n    at processRequest (src/handler.ts:88:12)\n    at async runTest (src/test.ts:15:5)",
      },
      deps,
    ),
};

export const WithAnsiColors: StoryObj = {
  render: () =>
    renderErrorBox(
      {
        message:
          "[31mAssertionError[0m: expected [32m'hello'[0m to equal [32m'world'[0m",
        stack: "at [36msrc/greeting.test.ts:10:5[0m",
      },
      deps,
    ),
};
