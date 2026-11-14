/**
 * Spans other processes exported, joined to scenarios by trace id, and the
 * traces no scenario owns named as context breaks.
 */
import { toStoryReport } from 'executable-stories-core/converters/story-report';
import type { TestRunResult } from 'executable-stories-core/types/test-result';
import { describe, expect, it } from 'vitest';
import {
  attachLogs,
  attachTraces,
  describeUnlinked,
  parseOtelLogs,
  parseOtelTraces,
} from '../src/otel-traces';

const TRACE_A = 'a'.repeat(32);
const TRACE_B = 'b'.repeat(32);
const TRACE_LOST = 'c'.repeat(32);

function run(): TestRunResult {
  const tc = (
    id: string,
    scenario: string,
    traceId: string,
    startedAtMs: number,
  ) => ({
    id,
    sourceFile: 'a.story.test.ts',
    sourceLine: 1,
    status: 'passed',
    durationMs: 100,
    attachments: [],
    stepResults: [],
    titlePath: [],
    retry: 0,
    retries: 0,
    tags: [],
    story: {
      scenario,
      steps: [],
      startedAtMs,
      meta: { otel: { traceId } },
      otelSpans: [{ spanId: 'ffffffffffffffff', name: 'test', status: 'ok' }],
    },
  });
  return {
    projectRoot: '/repo',
    runId: 'r',
    startedAtMs: 1000,
    finishedAtMs: 2000,
    durationMs: 1000,
    testCases: [
      tc('s1', 'Checkout', TRACE_A, 1000),
      tc('s2', 'Refund', TRACE_B, 1500),
    ],
  } as unknown as TestRunResult;
}

/** One OTLP/JSON export request, as a collector's file exporter writes per line. */
function otlp(service: string, spans: Array<Record<string, unknown>>) {
  return {
    resourceSpans: [
      {
        resource: {
          attributes: [
            { key: 'service.name', value: { stringValue: service } },
          ],
        },
        scopeSpans: [{ spans }],
      },
    ],
  };
}

const ns = (ms: number) => String(ms * 1e6);

describe('parseOtelTraces', () => {
  it('reads OTLP NDJSON, keeping resource attributes and timing on each span', () => {
    const line = otlp('orders', [
      {
        traceId: TRACE_A,
        spanId: '1'.repeat(16),
        parentSpanId: 'ffffffffffffffff',
        name: 'GET /orders/{id}',
        startTimeUnixNano: ns(1010),
        endTimeUnixNano: ns(1030),
        status: { code: 2, message: 'boom' },
        attributes: [
          { key: 'http.route', value: { stringValue: '/orders/{id}' } },
          { key: 'http.response.status_code', value: { intValue: '500' } },
        ],
      },
    ]);
    const spans = parseOtelTraces(
      `${JSON.stringify(line)}\n${JSON.stringify(line)}\n`,
    );
    expect(spans).toHaveLength(2);
    expect(spans[0]).toMatchObject({
      traceId: TRACE_A,
      name: 'GET /orders/{id}',
      startTimeMs: 1010,
      durationMs: 20,
      status: 'error',
      statusMessage: 'boom',
      attributes: {
        'service.name': 'orders',
        'http.route': '/orders/{id}',
        'http.response.status_code': 500,
      },
    });
  });

  it('decodes base64 ids from protobuf-JSON encoders', () => {
    const traceId = Buffer.from(TRACE_A, 'hex').toString('base64');
    const spanId = Buffer.from('1'.repeat(16), 'hex').toString('base64');
    const [span] = parseOtelTraces(
      JSON.stringify(otlp('svc', [{ traceId, spanId, name: 'x' }])),
    );
    expect(span.traceId).toBe(TRACE_A);
    expect(span.spanId).toBe('1'.repeat(16));
  });

  it("reads an OTLP HTTP GET /v1/traces readback", () => {
    const readback = {
      count: 1,
      traces: [
        {
          traceId: TRACE_B,
          spans: [
            {
              traceId: TRACE_B,
              spanId: '2'.repeat(16),
              name: 'charge',
              startTime: 1600,
              duration: 5,
              attributes: { 'service.name': 'payments' },
              status: { code: 'OK' },
            },
          ],
        },
      ],
    };
    expect(parseOtelTraces(JSON.stringify(readback))).toEqual([
      {
        traceId: TRACE_B,
        spanId: '2'.repeat(16),
        name: 'charge',
        startTimeMs: 1600,
        durationMs: 5,
        status: 'ok',
        attributes: { 'service.name': 'payments' },
      },
    ]);
  });
});

describe('attachTraces', () => {
  const spans = parseOtelTraces(
    JSON.stringify(
      otlp('orders', [
        // Continues the Checkout trace from another process.
        {
          traceId: TRACE_A,
          spanId: '1'.repeat(16),
          parentSpanId: 'ffffffffffffffff',
          name: 'GET /orders',
          startTimeUnixNano: ns(1010),
        },
        // The test process exported its own span too: not duplicated.
        {
          traceId: TRACE_A,
          spanId: 'ffffffffffffffff',
          name: 'test',
          startTimeUnixNano: ns(1000),
        },
        // A request that arrived without traceparent while Checkout ran.
        {
          traceId: TRACE_LOST,
          spanId: '3'.repeat(16),
          name: 'POST /stock',
          startTimeUnixNano: ns(1050),
        },
        // Before the run: not this run's break.
        {
          traceId: 'd'.repeat(32),
          spanId: '4'.repeat(16),
          name: 'GET /health',
          startTimeUnixNano: ns(10),
        },
        // Every parent absent: a fragment, not a fresh trace.
        {
          traceId: 'e'.repeat(32),
          spanId: '5'.repeat(16),
          parentSpanId: '9'.repeat(16),
          name: 'partial',
          startTimeUnixNano: ns(1200),
        },
      ]),
    ),
  );

  it('joins spans to the scenario that ran under their trace id', () => {
    const result = attachTraces(run(), spans);
    expect(result.attached).toBe(1);
    const checkout = result.run.testCases[0].story.otelSpans!;
    expect(checkout.map((s) => s.name)).toEqual(['test', 'GET /orders']);
    expect(checkout[1]).not.toHaveProperty('traceId');
    expect(result.run.testCases[1].story.otelSpans).toHaveLength(1);
  });

  it("names traces that started in the run with no scenario's context", () => {
    const { unlinked } = attachTraces(run(), spans);
    expect(unlinked).toEqual([
      {
        traceId: TRACE_LOST,
        name: 'POST /stock',
        service: 'orders',
        startTimeMs: 1050,
        scenario: { id: 's1', title: 'Checkout' },
      },
    ]);
    expect(describeUnlinked(unlinked)).toEqual([
      'orders: POST /stock during "Checkout"',
    ]);
  });

  it('does not guess a scenario when several were running', () => {
    const overlapping = run();
    overlapping.testCases[1].story.startedAtMs = 1000;
    const { unlinked } = attachTraces(overlapping, spans);
    expect(unlinked[0].scenario).toBeUndefined();
  });
});

describe('logs', () => {
  const otlpLogs = {
    resourceLogs: [
      {
        scopeLogs: [
          {
            logRecords: [
              {
                traceId: TRACE_A,
                spanId: '1'.repeat(16),
                timeUnixNano: ns(1020),
                severityText: 'ERROR',
                body: { stringValue: 'stock reservation failed' },
                attributes: [{ key: 'sku', value: { stringValue: 'A-1' } }],
              },
              {
                traceId: TRACE_A,
                timeUnixNano: ns(1005),
                body: { kvlistValue: { values: [] } },
              },
              // No trace id: belongs to no scenario.
              { body: { stringValue: 'startup' } },
            ],
          },
        ],
      },
    ],
  };

  it('reads OTLP log records that carry a trace id', () => {
    expect(parseOtelLogs(JSON.stringify(otlpLogs))).toEqual([
      {
        traceId: TRACE_A,
        spanId: '1'.repeat(16),
        timeMs: 1020,
        severity: 'ERROR',
        body: 'stock reservation failed',
        attributes: { sku: 'A-1' },
      },
      { traceId: TRACE_A, timeMs: 1005, body: '{"values":[]}' },
    ]);
  });

  it("reads an OTLP HTTP GET /v1/logs readback", () => {
    const readback = {
      count: 1,
      logs: [
        {
          id: 'l1',
          traceId: TRACE_B,
          spanId: '2'.repeat(16),
          severityText: 'INFO',
          body: { refund: 'ok' },
          timestamp: 1600,
        },
      ],
    };
    expect(parseOtelLogs(JSON.stringify(readback))).toEqual([
      {
        traceId: TRACE_B,
        spanId: '2'.repeat(16),
        timeMs: 1600,
        severity: 'INFO',
        body: '{"refund":"ok"}',
      },
    ]);
  });

  it('joins logs to the scenario of their trace, in time order', () => {
    const { run: joined, attached } = attachLogs(
      run(),
      parseOtelLogs(JSON.stringify(otlpLogs)),
    );
    expect(attached).toBe(2);
    expect(joined.testCases[0].story.otelLogs?.map((l) => l.timeMs)).toEqual([
      1005, 1020,
    ]);
    expect(joined.testCases[0].story.otelLogs?.[1]).not.toHaveProperty(
      'traceId',
    );
    expect(joined.testCases[1].story.otelLogs).toBeUndefined();
  });

  it('does not repeat logs when the same source is joined again', () => {
    const logs = parseOtelLogs(JSON.stringify(otlpLogs));
    const once = attachLogs(run(), logs).run;
    // The same records twice in one source, then the whole source again.
    const again = attachLogs(once, [...logs, ...logs]);
    expect(again.attached).toBe(0);
    expect(again.run.testCases[0].story.otelLogs).toHaveLength(2);
  });

  it('carries logs into the StoryReport scenario', () => {
    const { run: joined } = attachLogs(
      run(),
      parseOtelLogs(JSON.stringify(otlpLogs)),
    );
    const report = toStoryReport(joined);
    const scenario = report.features
      .flatMap((f) => f.scenarios)
      .find((s) => s.title === 'Checkout');
    expect(scenario?.otelLogs).toHaveLength(2);
  });
});

describe('span events', () => {
  it('keeps exception and console events from OTLP and devtools spans', () => {
    const otlpSpan = parseOtelTraces(
      JSON.stringify(
        otlp('web', [
          {
            traceId: TRACE_A,
            spanId: '6'.repeat(16),
            name: 'checkout.submit',
            startTimeUnixNano: ns(1010),
            events: [
              {
                name: 'exception',
                timeUnixNano: ns(1015),
                attributes: [
                  { key: 'exception.type', value: { stringValue: 'TypeError' } },
                  { key: 'exception.message', value: { stringValue: 'cart is undefined' } },
                ],
              },
            ],
          },
        ]),
      ),
    )[0];
    expect(otlpSpan.events).toEqual([
      {
        name: 'exception',
        timeMs: 1015,
        attributes: { 'exception.type': 'TypeError', 'exception.message': 'cart is undefined' },
      },
    ]);

    const devtoolsSpan = parseOtelTraces(
      JSON.stringify({
        traces: [
          {
            spans: [
              {
                traceId: TRACE_B,
                spanId: '7'.repeat(16),
                name: 'page',
                startTime: 1600,
                duration: 1,
                status: { code: 'UNSET' },
                attributes: {},
                events: [
                  { name: 'console.error', timestamp: 1601, attributes: { 'console.message': 'boom' } },
                  { name: 'console.warning', timestamp: 1602, attributes: {} },
                ],
              },
            ],
          },
        ],
      }),
    )[0];
    expect(devtoolsSpan.events).toEqual([
      { name: 'console.error', timeMs: 1601, attributes: { 'console.message': 'boom' } },
      { name: 'console.warning', timeMs: 1602 },
    ]);
  });

  it('leaves events off a span that has none', () => {
    const [span] = parseOtelTraces(
      JSON.stringify(otlp('web', [{ traceId: TRACE_A, spanId: '8'.repeat(16), name: 'quiet' }])),
    );
    expect(span).not.toHaveProperty('events');
  });
});

describe('span kind', () => {
  it('reads the kind from OTLP (numbered from 1) and from devtools (spelled out)', () => {
    const [server] = parseOtelTraces(
      JSON.stringify(otlp('api', [{ traceId: TRACE_A, spanId: '9'.repeat(16), name: 'POST /orders', kind: 2 }])),
    );
    expect(server.kind).toBe('server');
    const [client] = parseOtelTraces(
      JSON.stringify({
        traces: [{ spans: [{ traceId: TRACE_A, spanId: 'a'.repeat(16), name: 'call', kind: 'CLIENT', status: { code: 'UNSET' } }] }],
      }),
    );
    expect(client.kind).toBe('client');
    const [unspecified] = parseOtelTraces(
      JSON.stringify(otlp('api', [{ traceId: TRACE_A, spanId: 'b'.repeat(16), name: 'x', kind: 0 }])),
    );
    expect(unspecified).not.toHaveProperty('kind');
  });
});
