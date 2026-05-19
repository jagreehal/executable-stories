import { highlightStepParams } from "../../src/formatters/html/renderers/step-params";
import { escapeHtml } from "../../src/formatters/html/template";
import type { Meta, StoryObj } from "@storybook/html";

const meta: Meta = {
  title: "Renderers/StepParams highlighter",
  parameters: {
    docs: {
      description: {
        component:
          "Highlights quoted strings and standalone numbers inside step text by wrapping them in `<span class='step-param'>`.",
      },
    },
  },
};
export default meta;

const deps = { escapeHtml };

function row(text: string): string {
  return `<div class="step">
    <span class="step-keyword">When</span>
    <span class="step-text">${highlightStepParams(text, deps)}</span>
  </div>`;
}

export const QuotedStrings: StoryObj = {
  render: () =>
    `<div class="steps">
      ${row('the user enters "alice@example.com" in the email field')}
      ${row('the system sends "Welcome back, Alice!" to the inbox')}
    </div>`,
};

export const Numbers: StoryObj = {
  render: () =>
    `<div class="steps">
      ${row("the cart contains 3 items totaling 42.50 dollars")}
      ${row("the response arrives within 250 milliseconds")}
    </div>`,
};

export const Mixed: StoryObj = {
  render: () =>
    `<div class="steps">
      ${row('the user adds 5 copies of "Wireless Mouse" priced at 19.99 each')}
      ${row('an HTTP 404 is returned for "/missing"')}
    </div>`,
};

export const NoParams: StoryObj = {
  render: () =>
    `<div class="steps">
      ${row("the dashboard loads without errors")}
    </div>`,
};

export const HtmlEscape: StoryObj = {
  name: "Escapes HTML inside params",
  render: () =>
    `<div class="steps">
      ${row('the markdown contains "<script>alert(1)</script>" as a literal string')}
    </div>`,
};
