import { renderScenario } from "../../src/formatters/html/renderers/scenario";
import {
  passedScenario,
  failedScenario,
  skippedScenario,
  scenarioWithDocs,
} from "../fixtures";
import { scenarioDeps } from "../_shared";
import type { Meta, StoryObj } from "@storybook/html";
import type { TestCaseResult } from "../../src/types/test-result";

const meta: Meta = {
  title: "Renderers/Scenario",
  parameters: {
    docs: {
      description: {
        component:
          "Full scenario block with header, steps, docs, error box, attachments, trace, and action buttons. Failed scenarios get the ✨ copy-as-Claude-prompt button.",
      },
    },
  },
};
export default meta;

const render = (tc: TestCaseResult): string =>
  renderScenario({ tc }, scenarioDeps);

export const Passed: StoryObj = {
  render: () => render(passedScenario()),
};

export const Failed: StoryObj = {
  name: "Failed (with ✨ copy-as-prompt button)",
  render: () => render(failedScenario()),
};

export const Skipped: StoryObj = {
  render: () => render(skippedScenario()),
};

export const WithRichDocs: StoryObj = {
  render: () => render(scenarioWithDocs()),
};

export const StartCollapsed: StoryObj = {
  render: () =>
    renderScenario(
      { tc: passedScenario() },
      { ...scenarioDeps, startCollapsed: true },
    ),
};
