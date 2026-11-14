import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ReportTrace } from '../src/components/ReportTrace';

const spans = [
  {
    spanId: 'p',
    name: 'POST /checkout',
    startTimeMs: 0,
    durationMs: 610,
    status: 'error' as const,
  },
  {
    spanId: 'q',
    parentSpanId: 'p',
    name: 'payments.charge',
    startTimeMs: 95,
    durationMs: 410,
    status: 'error' as const,
  },
];

describe('ReportTrace logs', () => {
  it('puts each log under the span that wrote it, and unmatched logs last', () => {
    const { container } = render(
      <ReportTrace
        spans={spans}
        logs={[
          { spanId: 'q', severity: 'error', body: 'card declined by issuer' },
          { spanId: 'gone', body: 'from a span not in the trace' },
        ]}
      />,
    );
    expect(screen.getByText(/2 spans, 2 logs/)).toBeTruthy();
    const items = [...container.querySelectorAll('li')].map(
      (li) => li.textContent,
    );
    expect(items[1]).toContain('payments.charge');
    expect(items[2]).toBe('ERRORcard declined by issuer');
    expect(items[3]).toBe('from a span not in the trace');
  });

  it('says nothing about logs when there are none', () => {
    render(<ReportTrace spans={spans} />);
    expect(screen.getByText(/2 spans,/).textContent).not.toMatch(/log/);
  });
});

describe("ReportTrace span events", () => {
  it("shows an exception under its span with the stack a click away, and counts it", () => {
    const { container } = render(
      <ReportTrace
        spans={[
          spans[0]!,
          {
            ...spans[1]!,
            events: [
              {
                name: "exception",
                timeMs: 200,
                attributes: {
                  "exception.type": "TypeError",
                  "exception.message": "cart is undefined",
                  "exception.stacktrace": "TypeError: cart is undefined\n    at checkout.ts:42",
                },
              },
              { name: "console.warning", attributes: { "console.message": "slow response" } },
            ],
          },
        ]}
      />,
    );
    expect(screen.getByText(/2 spans, 1 exception,/)).toBeTruthy();
    const items = [...container.querySelectorAll(":scope ul > li")].map((li) => li.textContent);
    expect(items[1]).toContain("payments.charge");
    expect(items[2]).toMatch(/^TypeError: cart is undefinedstack/);
    expect(items[3]).toBe("WARNINGslow response");
    expect(container.querySelector("pre")?.textContent).toContain("checkout.ts:42");
  });
});

describe("ReportTrace step lane", () => {
  const step = (index: number, keyword: "Given" | "When" | "Then", text: string, startedAtMs?: number, shot?: string) => ({
    id: `s--step-${index}`,
    index,
    keyword,
    text,
    status: "passed" as const,
    durationMs: 1,
    ...(startedAtMs === undefined ? {} : { startedAtMs }),
    docEntries: shot ? [{ kind: "screenshot" as const, phase: "runtime" as const, path: shot, alt: text }] : [],
  });

  it("marks where each step began on the trace's time axis, with its screenshot", () => {
    const { container } = render(
      <ReportTrace
        spans={spans}
        steps={[
          step(0, "Given", "a cart with one item", 0),
          step(1, "When", "Lena pays", 305, "shots/pay.png"),
          // Outside the trace window, and with no time: not placed.
          step(2, "Then", "the order is confirmed", 5000),
          step(3, "Then", "a receipt is sent"),
        ]}
      />,
    );
    const lane = container.querySelector("[data-es-trace-steps]")!;
    const marks = [...lane.querySelectorAll("[title]")];
    expect(marks.map((m) => m.getAttribute("title"))).toEqual(["Given a cart with one item", "When Lena pays"]);
    expect((marks[1] as HTMLElement).style.left).toBe("50%");
    expect(marks[1]!.querySelector("img")?.getAttribute("src")).toBe("shots/pay.png");
    // A guide line crosses each span's bar at each step.
    expect(container.querySelectorAll("li:not([data-es-trace-steps]) [aria-hidden]")).toHaveLength(4);
  });

  it("draws no lane when no step began inside the trace", () => {
    const { container } = render(<ReportTrace spans={spans} steps={[step(0, "Given", "x")]} />);
    expect(container.querySelector("[data-es-trace-steps]")).toBeNull();
  });
});

describe("ReportTrace with logs and no drawable spans", () => {
  it("still shows the logs", () => {
    const { container } = render(
      <ReportTrace
        spans={[{ spanId: "x", name: "untimed", status: "ok" }]}
        logs={[{ severity: "ERROR", body: "stock reservation failed" }]}
      />,
    );
    expect(screen.getByText("Trace (1 log)")).toBeTruthy();
    expect(container.querySelector("li")?.textContent).toBe("ERRORstock reservation failed");
  });

  it("shows logs when there are no spans at all, and nothing when there is neither", () => {
    render(<ReportTrace spans={undefined} logs={[{ body: "hello" }]} />);
    expect(screen.getByText("hello")).toBeTruthy();
    const { container } = render(<ReportTrace spans={undefined} />);
    expect(container.innerHTML).toBe("");
  });
});
