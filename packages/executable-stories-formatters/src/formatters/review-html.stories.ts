import type { Meta, StoryObj } from '@storybook/html';
import { buildReview } from '../review/build-review';
import type { ChangedFile } from '../types/review';
import type { Attachment } from 'executable-stories-core/types/test-result';
import { createFixtureRun, failedScenario, passedScenario } from './html/storybook/fixtures';
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

/** No changed-file context — the report degrades to a claims-only view. */
export const ClaimsOnly: StoryObj = {
  name: 'Claims only (no diff context)',
  render: () => {
    const formatter = new ReviewHtmlFormatter({ title: 'Evidence Review' });
    const html = formatter.format(buildReview(reviewRun(), { changedFiles: [] }));
    return inIframe(html);
  },
};

/** Changed files with no covering scenario surface as an "uncovered" risk band. */
export const UncoveredRisk: StoryObj = {
  name: 'Uncovered changes (risk)',
  render: () => {
    const formatter = new ReviewHtmlFormatter({ title: 'Evidence Review' });
    const html = formatter.format(
      buildReview(reviewRun(), {
        changedFiles: [
          ...changedFiles,
          { path: 'src/checkout/refunds.ts', changeKind: 'modified' },
          { path: 'src/checkout/tax.ts', changeKind: 'added' },
          { path: 'src/checkout/fraud-check.ts', changeKind: 'modified' },
        ],
        baseRef: 'main',
        headRef: 'feature/geo-checkout',
      }),
    );
    return inIframe(html);
  },
};

/** Strong (stakeholder + screenshot + trace), moderate, and weak evidence side by side. */
export const EvidenceSpectrum: StoryObj = {
  name: 'Evidence spectrum',
  render: () => {
    const run = createFixtureRun([
      passedScenario({
        id: 'strong',
        sourceFile: 'src/checkout/payment.e2e.test.ts',
        attachments: [screenshot],
        tags: ['change:feature', 'audience:stakeholder'],
        story: {
          ...passedScenario().story,
          scenario: 'Strong: regional payment route proven end-to-end',
          tags: ['change:feature', 'audience:stakeholder'],
          otelSpans: [{ spanId: 's1', name: 'payment.route', status: 'ok' }],
        },
      }),
      passedScenario({
        id: 'moderate',
        sourceFile: 'src/checkout/currency.test.ts',
        tags: ['change:bugfix', 'audience:engineer'],
        story: {
          ...passedScenario().story,
          scenario: 'Moderate: currency fallback covered with assertions',
          tags: ['change:bugfix', 'audience:engineer'],
          docs: [
            { kind: 'section', phase: 'static', title: 'Why', markdown: 'Restores the pre-regression total.' },
          ],
        },
      }),
      passedScenario({
        id: 'weak',
        sourceFile: 'src/checkout/tax.test.ts',
        tags: ['change:refactor', 'audience:engineer'],
        story: {
          ...passedScenario().story,
          scenario: 'Weak: tax rounding touched but barely exercised',
          tags: ['change:refactor', 'audience:engineer'],
          steps: [],
        },
      }),
    ]);
    const formatter = new ReviewHtmlFormatter({ title: 'Evidence Review' });
    const html = formatter.format(
      buildReview(run, {
        changedFiles: [
          { path: 'src/checkout/payment.ts', changeKind: 'modified' },
          { path: 'src/checkout/currency.ts', changeKind: 'modified' },
          { path: 'src/checkout/tax.ts', changeKind: 'modified' },
        ],
        baseRef: 'main',
        headRef: 'feature/geo-checkout',
      }),
    );
    return inIframe(html);
  },
};

/** A failing scenario surfaces its claim as failed — proof the change is not yet verified. */
export const FailingClaim: StoryObj = {
  name: 'Failing claim',
  render: () => {
    const run = createFixtureRun([
      failedScenario({
        id: 'payment-fail',
        sourceFile: 'src/checkout/payment.e2e.test.ts',
        tags: ['change:feature', 'audience:stakeholder'],
        story: {
          ...failedScenario().story,
          scenario: 'Checkout selects the right regional payment route',
          tags: ['change:feature', 'audience:stakeholder'],
          tickets: [{ id: 'GEO-101', url: 'https://jira.example.com/browse/GEO-101' }],
        },
      }),
      passedScenario({
        id: 'currency-ok',
        sourceFile: 'src/checkout/currency.test.ts',
        tags: ['change:bugfix', 'audience:engineer'],
        story: {
          ...passedScenario().story,
          scenario: 'Currency fallback keeps the existing checkout total',
          tags: ['change:bugfix', 'audience:engineer'],
        },
      }),
    ]);
    const formatter = new ReviewHtmlFormatter({ title: 'Evidence Review' });
    const html = formatter.format(
      buildReview(run, {
        changedFiles,
        baseRef: 'main',
        headRef: 'feature/geo-checkout',
      }),
    );
    return inIframe(html);
  },
};
