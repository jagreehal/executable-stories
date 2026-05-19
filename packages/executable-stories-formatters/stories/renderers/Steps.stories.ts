import { renderSteps } from "../../src/formatters/html/renderers/steps";
import { getStatusIcon } from "../../src/formatters/html/renderers/status";
import { escapeHtml } from "../../src/formatters/html/template";
import type { Meta, StoryObj } from "@storybook/html";
import type { StoryStep } from "../../src/types/story";

const meta: Meta = { title: "Renderers/Steps" };
export default meta;

const deps = {
  escapeHtml,
  getStatusIcon,
  renderDocs: () => "",
};

const s = (keyword: StoryStep["keyword"], text: string): StoryStep => ({
  keyword,
  text,
});

export const AllPassed: StoryObj = {
  render: () =>
    renderSteps(
      {
        steps: [
          s("Given", "a registered user"),
          s("When", "the user submits valid credentials"),
          s("Then", "the user sees the dashboard"),
        ],
        stepResults: [
          { index: 0, status: "passed", durationMs: 8 },
          { index: 1, status: "passed", durationMs: 42 },
          { index: 2, status: "passed", durationMs: 15 },
        ],
      },
      deps,
    ),
};

export const WithFailure: StoryObj = {
  render: () =>
    renderSteps(
      {
        steps: [
          s("Given", "a registered user"),
          s("When", "the user submits an invalid password"),
          s("Then", "an error message is shown"),
        ],
        stepResults: [
          { index: 0, status: "passed", durationMs: 8 },
          { index: 1, status: "passed", durationMs: 42 },
          { index: 2, status: "failed", durationMs: 15 },
        ],
      },
      deps,
    ),
};

export const WithContinuation: StoryObj = {
  render: () =>
    renderSteps(
      {
        steps: [
          s("Given", "a registered user account exists"),
          s("And", "the account is suspended"),
          s("When", "the user submits valid credentials"),
          s("Then", "the user should see an error"),
          s("But", "the session should not be created"),
        ],
        stepResults: [
          { index: 0, status: "passed", durationMs: 4 },
          { index: 1, status: "passed", durationMs: 3 },
          { index: 2, status: "passed", durationMs: 28 },
          { index: 3, status: "passed", durationMs: 9 },
          { index: 4, status: "passed", durationMs: 6 },
        ],
      },
      deps,
    ),
};

export const WithSkipped: StoryObj = {
  render: () =>
    renderSteps(
      {
        steps: [
          s("Given", "a configured system"),
          s("When", "the slow operation runs"),
          s("Then", "the result is reported"),
        ],
        stepResults: [
          { index: 0, status: "passed", durationMs: 2 },
          { index: 1, status: "failed", durationMs: 1200 },
          { index: 2, status: "skipped", durationMs: 0 },
        ],
      },
      deps,
    ),
};
