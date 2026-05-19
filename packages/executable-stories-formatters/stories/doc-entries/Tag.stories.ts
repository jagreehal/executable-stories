import { renderDocTag } from "../../src/formatters/html/renderers/doc-entries";
import { escapeHtml } from "../../src/formatters/html/template";
import type { Meta, StoryObj } from "@storybook/html";

const deps = {
  escapeHtml,
  syntaxHighlighting: false,
  markdownEnabled: false,
  mermaidEnabled: false,
};
const meta: Meta = { title: "Doc Entries/Tag" };
export default meta;

export const SingleTag: StoryObj = {
  render: () =>
    renderDocTag(
      { kind: "tag", phase: "static", names: ["smoke"] },
      deps,
    ),
};

export const MultipleTags: StoryObj = {
  render: () =>
    renderDocTag(
      {
        kind: "tag",
        phase: "static",
        names: ["smoke", "regression", "p0", "auth"],
      },
      deps,
    ),
};
