import type { Meta, StoryObj } from '@storybook/html';
import {
  createFixtureRun,
  failedScenario,
  passedScenario,
  skippedScenario,
} from '../storybook/fixtures';
import { escapeHtml } from '../template';
import { getStatusIcon } from './status';
import { renderToc } from './toc';

const meta: Meta = {
  title: 'Renderers/Toc',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Table of contents sidebar. Normally rendered inside a `.report-layout` flex wrapper next to the main content.',
      },
    },
  },
};
export default meta;

const deps = { escapeHtml, getStatusIcon };

function wrapInLayout(html: string): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'report-layout';
  wrap.style.minHeight = '300px';
  wrap.innerHTML =
    html +
    '<div class="main-content" style="flex:1;padding:1rem;color:var(--muted-foreground)">main content area</div>';
  return wrap;
}

export const SingleFile: StoryObj = {
  render: () =>
    wrapInLayout(
      renderToc(
        {
          run: createFixtureRun([
            passedScenario(),
            failedScenario(),
            skippedScenario(),
          ]),
        },
        deps,
      ),
    ),
};

export const MultipleFiles: StoryObj = {
  render: () => {
    const cases = [
      passedScenario({
        id: 'a1',
        sourceFile: 'src/auth/login.story.test.ts',
        titlePath: ['Authentication'],
      }),
      failedScenario({
        id: 'a2',
        sourceFile: 'src/auth/login.story.test.ts',
        titlePath: ['Authentication'],
      }),
      passedScenario({
        id: 'c1',
        sourceFile: 'src/checkout/cart.story.test.ts',
        titlePath: ['Checkout'],
        story: {
          ...passedScenario().story,
          scenario: 'Cart total includes tax',
        },
      }),
      passedScenario({
        id: 'c2',
        sourceFile: 'src/checkout/cart.story.test.ts',
        titlePath: ['Checkout'],
        story: {
          ...passedScenario().story,
          scenario: 'Empty cart blocks checkout',
        },
      }),
      skippedScenario({
        id: 'b1',
        sourceFile: 'src/billing/invoice.story.test.ts',
        titlePath: ['Billing'],
      }),
    ];
    return wrapInLayout(renderToc({ run: createFixtureRun(cases) }, deps));
  },
};
