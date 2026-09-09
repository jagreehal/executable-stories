/**
 * The `span-graph` format: the architecture a run exercised, as a Mermaid
 * diagram plus the scenarios behind each component.
 *
 * It stays silent on a run with no spans. A page saying "no diagram" in every
 * report of every uninstrumented suite is worse than the format not firing.
 */
import { describe, expect, it } from "vitest";

import { SpanGraphFormatter } from "../../src/formatters/span-graph";
import { stubs } from "../stubs";
import type { OtelSpan } from "executable-stories-core/types/otel";
import type { TestCaseResult } from "executable-stories-core/types/test-result";

function span(
  spanId: string,
  name: string,
  attributes: OtelSpan["attributes"],
  parentSpanId?: string,
  status: OtelSpan["status"] = "ok",
): OtelSpan {
  return { spanId, ...(parentSpanId ? { parentSpanId } : {}), name, status, attributes };
}

function scenario(name: string, otelSpans?: OtelSpan[]): TestCaseResult {
  return stubs.testCaseResult({
    sourceFile: "src/checkout.story.test.ts",
    story: stubs.storyMeta({
      scenario: name,
      steps: [{ keyword: "Then", text: "it works" }],
      ...(otelSpans ? { otelSpans } : {}),
    }),
    stepResults: [{ index: 0, status: "passed", durationMs: 1 }],
  });
}

const INSTRUMENTED = stubs.testRunResult({
  testCases: [
    scenario("Guest checkout succeeds", [
      span("a1", "POST /checkout", { "service.name": "storefront", "http.route": "/checkout" }),
      span("a2", "checkout.submit", { "peer.service": "checkout-api" }, "a1"),
      span("a3", "SELECT orders", { "db.system": "postgres", "db.namespace": "orders" }, "a2"),
    ]),
    scenario("Card declined shows an error", [
      span("b1", "checkout.submit", { "peer.service": "checkout-api" }),
      span("b2", "payments.charge", { "peer.service": "payments" }, "b1", "error"),
    ]),
  ],
});

describe("SpanGraphFormatter", () => {
  it("draws the components a run exercised, in a fenced mermaid block", () => {
    const output = new SpanGraphFormatter().format(INSTRUMENTED);

    expect(output).toContain("```mermaid");
    expect(output).toContain("flowchart LR");
    expect(output).toContain("checkout-api");
    expect(output).toContain("postgres:orders");
  });

  it("lists the scenarios behind each component, which is what makes it checkable", () => {
    const output = new SpanGraphFormatter().format(INSTRUMENTED);

    expect(output).toContain("Guest checkout succeeds");
    expect(output).toContain("Card declined shows an error");
  });

  it("says the picture covers only instrumented paths", () => {
    const output = new SpanGraphFormatter().format(INSTRUMENTED);

    expect(output.toLowerCase()).toContain("instrumented");
  });

  it("returns nothing at all for a run with no spans", () => {
    const output = new SpanGraphFormatter().format(
      stubs.testRunResult({ testCases: [scenario("Nothing is traced")] }),
    );

    expect(output).toBe("");
  });

  it("marks a new-and-broken component the same way in the table as in the diagram", () => {
    // The table and the diagram describe the same component, so they must not
    // disagree about it: green in one and red in the other is worse than either.
    const output = new SpanGraphFormatter({
      delta: { added: ['broken-and-new'], changed: [] },
    }).format(
      stubs.testRunResult({
        testCases: [
          {
            ...scenario('Newly added path fails', [
              span('x', 'payments.charge', { 'peer.service': 'payments' }, undefined, 'error'),
            ]),
            id: 'broken-and-new',
          },
        ],
      }),
    );

    expect(output).toContain('class payments esFailing');
    expect(output).toContain('🔴');
    expect(output).not.toContain('🟢');
  });

  it("is deterministic", () => {
    expect(new SpanGraphFormatter().format(INSTRUMENTED)).toBe(
      new SpanGraphFormatter().format(INSTRUMENTED),
    );
  });
});
