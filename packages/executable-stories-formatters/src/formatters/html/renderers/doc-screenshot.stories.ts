import type { Meta, StoryObj } from '@storybook/html';
import { escapeHtml } from '../template';
import { renderDocScreenshot } from './doc-entries';

const meta: Meta = { title: 'Doc Entries/Screenshot' };
export default meta;

// 1x1 red PNG, base64-encoded
const redPng =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==';

const baseDeps = {
  escapeHtml,
  syntaxHighlighting: false,
  markdownEnabled: false,
  mermaidEnabled: false,
  embedScreenshots: true,
};

export const DataUri: StoryObj = {
  render: () =>
    renderDocScreenshot(
      {
        kind: 'screenshot',
        phase: 'runtime',
        path: `data:image/png;base64,${redPng}`,
        alt: 'Login form after submission',
      },
      baseDeps,
    ),
};

export const RemoteUrl: StoryObj = {
  render: () =>
    renderDocScreenshot(
      {
        kind: 'screenshot',
        phase: 'runtime',
        path: 'https://placehold.co/600x300/png?text=Screenshot',
        alt: 'Dashboard preview',
      },
      baseDeps,
    ),
};

export const MissingFile: StoryObj = {
  name: 'Missing file (placeholder)',
  render: () =>
    renderDocScreenshot(
      {
        kind: 'screenshot',
        phase: 'runtime',
        path: '/home/runner/work/missing/screenshot.png',
        alt: 'Should render the unavailable placeholder',
      },
      { ...baseDeps, readScreenshot: () => undefined },
    ),
};

export const NoCaption: StoryObj = {
  render: () =>
    renderDocScreenshot(
      {
        kind: 'screenshot',
        phase: 'runtime',
        path: `data:image/png;base64,${redPng}`,
      },
      baseDeps,
    ),
};
