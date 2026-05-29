import type { Meta, StoryObj } from '@storybook/html';
import { buildReview } from '../review/build-review';
import type { ChangedFile } from '../types/review';
import type { Attachment } from '../types/test-result';
import { createFixtureRun, passedScenario } from './html/storybook/fixtures';
import { ReviewHtmlFormatter } from './review-html';

const meta: Meta = {
  title: 'Formatters/ReviewHtml',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Output of the Evidence Review HTML formatter. Shows changed-file coverage, graded claims, and ticket provenance for the work under review.',
      },
    },
  },
};
export default meta;

const screenshot: Attachment = {
  name: 'checkout-proof.png',
  mediaType: 'image/png',
  body: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADElEQVR42mP8z8BQDwAFgwJ/lYd9KgAAAABJRU5ErkJggg==',
  contentEncoding: 'BASE64',
};

const changedFiles: ChangedFile[] = [
  { path: 'src/checkout/payment.ts', changeKind: 'modified' },
  { path: 'src/checkout/geo-routing.ts', changeKind: 'added' },
  { path: 'src/checkout/currency.ts', changeKind: 'modified' },
];

function inIframe(html: string): HTMLElement {
  const iframe = document.createElement('iframe');
  iframe.style.width = '100%';
  iframe.style.minHeight = '100vh';
  iframe.style.border = '0';
  iframe.srcdoc = html;
  return iframe;
}

function reviewRun() {
  return createFixtureRun([
    passedScenario({
      id: 'payment',
      sourceFile: 'src/checkout/payment.e2e.test.ts',
      sourceLine: 42,
      attachments: [screenshot],
      tags: ['change:feature', 'audience:stakeholder'],
      story: {
        ...passedScenario().story,
        scenario: 'Checkout selects the right regional payment route',
        tags: ['change:feature', 'audience:stakeholder'],
        tickets: [
          { id: 'GEO-101', url: 'https://jira.example.com/browse/GEO-101' },
          { id: 'GEO-204' },
        ],
        docs: [
          {
            kind: 'section',
            phase: 'static',
            title: 'Why',
            markdown:
              'The current behaviour is the result of the original geo rollout plus a follow-up fix for cross-border card routing.',
          },
        ],
        otelSpans: [{ spanId: 'span-1', name: 'payment.route', status: 'ok' }],
      },
    }),
    passedScenario({
      id: 'currency',
      sourceFile: 'src/checkout/currency.test.ts',
      sourceLine: 18,
      tags: ['change:bugfix', 'audience:engineer'],
      story: {
        ...passedScenario().story,
        scenario: 'Currency fallback keeps the existing checkout total',
        tags: ['change:bugfix', 'audience:engineer'],
        tickets: [{ id: 'PAY-312' }],
      },
    }),
  ]);
}

export const WithTicketProvenance: StoryObj = {
  render: () => {
    const formatter = new ReviewHtmlFormatter({ title: 'Evidence Review' });
    const html = formatter.format(
      buildReview(reviewRun(), {
        changedFiles,
        baseRef: 'main',
        headRef: 'feature/geo-checkout',
      }),
    );
    return inIframe(html);
  },
};
