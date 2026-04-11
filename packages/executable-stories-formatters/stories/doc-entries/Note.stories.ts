import { renderDocNote } from "../../src/formatters/html/renderers/doc-entries";
import { escapeHtml } from "../../src/formatters/html/template";
import type { Meta, StoryObj } from "@storybook/html";

const deps = {
  escapeHtml,
  syntaxHighlighting: false,
  markdownEnabled: false,
  mermaidEnabled: false,
};
const meta: Meta = { title: "Doc Entries/Note" };
export default meta;

export const ShortNote: StoryObj = {
  render: () =>
    renderDocNote(
      {
        kind: "note",
        phase: "static",
        text: "This test verifies login functionality.",
      },
      deps,
    ),
};
