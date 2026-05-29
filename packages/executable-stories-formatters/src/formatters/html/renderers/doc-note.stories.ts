import type { Meta, StoryObj } from '@storybook/html';
import { escapeHtml } from '../template';
import { renderDocNote } from './doc-entries';

const deps = {
  escapeHtml,
  syntaxHighlighting: false,
  markdownEnabled: false,
  mermaidEnabled: false,
};
const meta: Meta = { title: 'Doc Entries/Note' };
export default meta;

export const ShortNote: StoryObj = {
  render: () =>
    renderDocNote(
      {
        kind: 'note',
        phase: 'static',
        text: 'This test verifies login functionality.',
      },
      deps,
    ),
};
