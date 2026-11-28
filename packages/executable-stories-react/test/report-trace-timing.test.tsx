import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ReportTrace } from '../src/components/ReportTrace';

const at = 1_784_838_389_419;

describe('ReportTrace timing', () => {
  it('shows sub-millisecond spans in µs and says why they start together', () => {
    const { container } = render(
      <ReportTrace
        spans={[
          {
            spanId: 'r',
            name: 'transfer.settle',
            startTimeMs: at,
            durationMs: 0.232459,
            status: 'ok',
          },
          {
            spanId: 'a',
            parentSpanId: 'r',
            name: 'provider.submit',
            startTimeMs: at,
            durationMs: 0.026375,
            status: 'ok',
          },
          {
            spanId: 'b',
            parentSpanId: 'r',
            name: 'ledger.record',
            startTimeMs: at,
            durationMs: 0.027042,
            status: 'ok',
          },
        ]}
      />,
    );
    expect(screen.getByText(/3 spans, 232 µs/)).toBeTruthy();
    expect(container.textContent).toContain('26 µs');
    expect(container.querySelector('[data-es-trace-note]')).toBeTruthy();
  });

  it('adds no note when spans start at distinct times', () => {
    const { container } = render(
      <ReportTrace
        spans={[
          {
            spanId: 'p',
            name: 'POST /checkout',
            startTimeMs: 0,
            durationMs: 610,
            status: 'ok',
          },
          {
            spanId: 'q',
            parentSpanId: 'p',
            name: 'payments.charge',
            startTimeMs: 95,
            durationMs: 410,
            status: 'ok',
          },
        ]}
      />,
    );
    expect(container.querySelector('[data-es-trace-note]')).toBeNull();
  });
});
