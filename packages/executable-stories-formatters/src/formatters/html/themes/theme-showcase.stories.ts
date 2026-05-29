import type { Meta, StoryObj } from '@storybook/html';
import {
  renderDocCode,
  renderDocNote,
  renderDocTable,
} from '../renderers/doc-entries';
import { renderSummary } from '../renderers/summary';
import { escapeHtml } from '../template';
import { getAvailableThemes, resolveTheme } from './index';

const meta: Meta = { title: 'Themes/Showcase' };
export default meta;

const docDeps = {
  escapeHtml,
  syntaxHighlighting: false,
  markdownEnabled: false,
  mermaidEnabled: false,
};

function buildSampleHtml(): string {
  const summary = renderSummary(
    { total: 12, passed: 9, failed: 2, skipped: 1 },
    {},
  );
  const code = renderDocCode(
    {
      kind: 'code',
      phase: 'runtime',
      lang: 'typescript',
      content: 'const result = add(2, 3);\nexpect(result).toBe(5);',
      label: 'Implementation',
    },
    docDeps,
  );
  const table = renderDocTable(
    {
      kind: 'table',
      phase: 'static',
      label: 'Test Matrix',
      columns: ['Input A', 'Input B', 'Expected'],
      rows: [
        ['1', '2', '3'],
        ['10', '20', '30'],
      ],
    },
    docDeps,
  );
  const note = renderDocNote(
    {
      kind: 'note',
      phase: 'static',
      text: 'This test verifies the calculator API.',
    },
    docDeps,
  );

  return `
    <header class="header">
      <h1>Theme Preview</h1>
    </header>
    ${summary}
    <div class="feature">
      <div class="feature-header" role="button" aria-expanded="true">
        <div class="feature-info">
          <div class="feature-title">Calculator</div>
          <div class="feature-path">src/calc/add.test.ts</div>
        </div>
        <div class="feature-stats">
          <span class="stat passed">✓ 2</span>
          <span class="stat failed">✗ 1</span>
          <span class="stat skipped">○ 0</span>
        </div>
      </div>
      <div class="feature-content">
        <div class="scenario">
          <div class="scenario-header" role="button" aria-expanded="true">
            <div class="scenario-info">
              <div class="scenario-title">
                <span class="status-icon status-passed">✓</span>
                <span class="scenario-name">Calculator adds two numbers</span>
              </div>
            </div>
            <span class="scenario-duration">0.02s</span>
          </div>
          <div class="scenario-content">
            <div class="story-docs">${note}${code}${table}</div>
            <div class="steps">
              <div class="step">
                <span class="step-status status-passed">✓</span>
                <span class="step-keyword">Given </span>
                <span class="step-text">the calculator is initialized</span>
              </div>
              <div class="step">
                <span class="step-status status-passed">✓</span>
                <span class="step-keyword">When </span>
                <span class="step-text">the user enters "2 + 3"</span>
              </div>
              <div class="step">
                <span class="step-status status-passed">✓</span>
                <span class="step-keyword">Then </span>
                <span class="step-text">the result should be 5</span>
              </div>
            </div>
          </div>
        </div>
        <div class="scenario">
          <div class="scenario-header" role="button" aria-expanded="true">
            <div class="scenario-info">
              <div class="scenario-title">
                <span class="status-icon status-failed">✗</span>
                <span class="scenario-name">Division by zero shows error</span>
              </div>
            </div>
            <span class="scenario-duration">0.05s</span>
          </div>
          <div class="scenario-content">
            <div class="steps">
              <div class="step">
                <span class="step-status status-passed">✓</span>
                <span class="step-keyword">Given </span>
                <span class="step-text">the calculator is initialized</span>
              </div>
              <div class="step">
                <span class="step-status status-failed">✗</span>
                <span class="step-keyword">When </span>
                <span class="step-text">the user divides by zero</span>
              </div>
            </div>
            <div class="error-box">
              <pre class="error-message">Expected: "Cannot divide by zero"\nReceived: undefined</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function makeStory(themeName: string): StoryObj {
  return {
    render: () => {
      const theme = resolveTheme(themeName);
      const wrapper = document.createElement('div');
      wrapper.setAttribute('data-theme', 'light');
      wrapper.setAttribute('data-detail-level', 'full');

      const style = document.createElement('style');
      style.textContent = theme.css;
      wrapper.appendChild(style);

      const container = document.createElement('div');
      container.className = 'container';
      container.innerHTML = buildSampleHtml();
      wrapper.appendChild(container);

      return wrapper;
    },
  };
}

export const Default = makeStory('default');
export const Corporate = makeStory('corporate');
export const Terminal = makeStory('terminal');
export const Minimal = makeStory('minimal');
export const Playful = makeStory('playful');
export const Dashboard = makeStory('dashboard');
