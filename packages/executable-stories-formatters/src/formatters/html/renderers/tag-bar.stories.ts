import type { Meta, StoryObj } from '@storybook/html';
import { escapeHtml } from '../template';
import { renderTagBar } from './tag-bar';

const meta: Meta = {
  title: 'Renderers/TagBar',
  parameters: {
    docs: {
      description: {
        component:
          'Collapsible tag filter bar. Pills toggle on click; the live JS in the report wires them into the filter pipeline.',
      },
    },
  },
};
export default meta;

const deps = { escapeHtml };

function withToggle(html: string): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML = html;
  // Make the toggle work locally so users can preview both states
  const toggle = root.querySelector('.tag-bar-toggle');
  const bar = root.querySelector('.tag-bar');
  toggle?.addEventListener('click', () => {
    const collapsed = bar?.classList.toggle('tag-bar-collapsed');
    toggle.setAttribute('aria-expanded', String(!collapsed));
  });
  root.querySelectorAll<HTMLButtonElement>('.tag-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      const pressed = pill.getAttribute('aria-pressed') === 'true';
      pill.setAttribute('aria-pressed', String(!pressed));
      pill.classList.toggle('active', !pressed);
    });
  });
  return root;
}

export const FewTags: StoryObj = {
  render: () =>
    withToggle(
      renderTagBar(
        { tags: ['smoke', 'regression', 'wip'], totalScenarios: 12 },
        deps,
      ),
    ),
};

export const ManyTags: StoryObj = {
  render: () =>
    withToggle(
      renderTagBar(
        {
          tags: [
            'smoke',
            'regression',
            'auth',
            'checkout',
            'billing',
            'ui',
            'api',
            'slow',
            'flaky',
            'wip',
            'p0',
            'p1',
            'needs-review',
          ],
          totalScenarios: 240,
        },
        deps,
      ),
    ),
};

export const Empty: StoryObj = {
  render: () => {
    const html = renderTagBar({ tags: [], totalScenarios: 0 }, deps);
    return (
      html ||
      '<p style="color:var(--muted-foreground)">No tags — bar is suppressed.</p>'
    );
  },
};
