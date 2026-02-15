/**
 * Tests for otel-reporter-spans.ts helpers.
 *
 * Uses @playwright/test (same as all other tests in this package).
 * The mock autotel API lets us verify span creation, attributes,
 * status mapping, and lifecycle without a real OTel backend.
 */
import { test, expect } from "@playwright/test";
import {
  tryLoadAutotel,
  shouldInstrumentStep,
  createTestSpan,
  createStepSpan,
  type AutotelApi,
} from "../otel-reporter-spans.js";

// ============================================================================
// Mock autotel factory
// ============================================================================

interface MockSpanRecord {
  name: string;
  attributes: Record<string, unknown>;
  status?: { code: number; message?: string };
  ended: boolean;
}

function createMockAutotel(): { api: AutotelApi; spans: MockSpanRecord[] } {
  const spans: MockSpanRecord[] = [];

  const api: AutotelApi = {
    span(name: string, attributes?: Record<string, unknown>) {
      const spanRecord: MockSpanRecord = {
        name,
        attributes: { ...attributes },
        status: undefined,
        ended: false,
      };
      spans.push(spanRecord);
      return {
        end() {
          spanRecord.ended = true;
        },
        setStatus(s: { code: number; message?: string }) {
          spanRecord.status = s;
        },
        setAttribute(key: string, value: unknown) {
          spanRecord.attributes[key] = value;
        },
      };
    },
    SpanStatusCode: { UNSET: 0, ERROR: 2 },
  };

  return { api, spans };
}

// ============================================================================
// tryLoadAutotel
// ============================================================================

test.describe("tryLoadAutotel", () => {
  test("returns null gracefully when autotel is not installed", () => {
    // autotel is not in devDependencies, so this should return null
    const result = tryLoadAutotel();
    expect(result).toBeNull();
  });
});

// ============================================================================
// shouldInstrumentStep
// ============================================================================

test.describe("shouldInstrumentStep", () => {
  test('accepts category "test.step"', () => {
    expect(
      shouldInstrumentStep({ category: "test.step", title: "anything" }),
    ).toBe(true);
  });

  test('accepts "Given something"', () => {
    expect(shouldInstrumentStep({ title: "Given something" })).toBe(true);
  });

  test('accepts "When action"', () => {
    expect(shouldInstrumentStep({ title: "When action" })).toBe(true);
  });

  test('accepts "Then result"', () => {
    expect(shouldInstrumentStep({ title: "Then result" })).toBe(true);
  });

  test('accepts "And more"', () => {
    expect(shouldInstrumentStep({ title: "And more" })).toBe(true);
  });

  test('accepts "But not this"', () => {
    expect(shouldInstrumentStep({ title: "But not this" })).toBe(true);
  });

  test('accepts "Arrange data"', () => {
    expect(shouldInstrumentStep({ title: "Arrange data" })).toBe(true);
  });

  test('accepts "Act on it"', () => {
    expect(shouldInstrumentStep({ title: "Act on it" })).toBe(true);
  });

  test('accepts "Assert result"', () => {
    expect(shouldInstrumentStep({ title: "Assert result" })).toBe(true);
  });

  test('rejects "hook" category with non-story title', () => {
    expect(
      shouldInstrumentStep({
        category: "hook",
        title: "beforeEach hook",
      }),
    ).toBe(false);
  });

  test('rejects "fixture" category', () => {
    expect(
      shouldInstrumentStep({
        category: "fixture",
        title: "page setup",
      }),
    ).toBe(false);
  });

  test("rejects undefined category + non-story title", () => {
    expect(
      shouldInstrumentStep({ title: "some random step" }),
    ).toBe(false);
  });

  test("rejects step with no title and no category", () => {
    expect(shouldInstrumentStep({})).toBe(false);
  });

  test('documents false-positive: "And this works as a regular step" with undefined category returns true', () => {
    // This is an acceptable v1 tradeoff -- we match on keyword prefix
    expect(
      shouldInstrumentStep({
        title: "And this works as a regular step",
      }),
    ).toBe(true);
  });
});

// ============================================================================
// createTestSpan
// ============================================================================

test.describe("createTestSpan", () => {
  test("creates span with correct attributes", () => {
    const { api, spans } = createMockAutotel();

    createTestSpan(
      {
        testTitle: "adds two numbers",
        suitePath: ["Calculator", "Addition"],
        sourceFile: "calculator.spec.ts",
        sourceLine: 42,
      },
      { autotel: api },
    );

    expect(spans).toHaveLength(1);
    const span = spans[0];
    expect(span.name).toBe("test: adds two numbers");
    expect(span.attributes["test.name"]).toBe("adds two numbers");
    expect(span.attributes["test.suite"]).toBe("Calculator > Addition");
    expect(span.attributes["code.filepath"]).toBe("calculator.spec.ts");
    expect(span.attributes["code.lineno"]).toBe(42);
  });

  test("endSpan sets test.status attribute", () => {
    const { api, spans } = createMockAutotel();

    const handle = createTestSpan(
      { testTitle: "test1" },
      { autotel: api },
    );
    handle.endSpan("passed");

    expect(spans[0].attributes["test.status"]).toBe("passed");
    expect(spans[0].ended).toBe(true);
  });

  test('endSpan with "passed" sets UNSET status', () => {
    const { api, spans } = createMockAutotel();

    const handle = createTestSpan(
      { testTitle: "test1" },
      { autotel: api },
    );
    handle.endSpan("passed");

    expect(spans[0].status).toEqual({ code: 0 });
  });

  test('endSpan with "failed" sets ERROR status with message', () => {
    const { api, spans } = createMockAutotel();

    const handle = createTestSpan(
      { testTitle: "test1" },
      { autotel: api },
    );
    handle.endSpan("failed", "Expected 1 to equal 2");

    expect(spans[0].status).toEqual({
      code: 2,
      message: "Expected 1 to equal 2",
    });
  });

  test("no test.case. in attribute names", () => {
    const { api, spans } = createMockAutotel();

    createTestSpan(
      {
        testTitle: "test1",
        suitePath: ["Suite"],
        sourceFile: "test.ts",
        sourceLine: 1,
      },
      { autotel: api },
    );

    const keys = Object.keys(spans[0].attributes);
    for (const key of keys) {
      expect(key).not.toContain("test.case.");
    }
  });

  test("omits optional attributes when not provided", () => {
    const { api, spans } = createMockAutotel();

    createTestSpan({ testTitle: "minimal test" }, { autotel: api });

    expect(spans[0].attributes["test.name"]).toBe("minimal test");
    expect(spans[0].attributes["test.suite"]).toBeUndefined();
    expect(spans[0].attributes["code.filepath"]).toBeUndefined();
    expect(spans[0].attributes["code.lineno"]).toBeUndefined();
  });
});

// ============================================================================
// createStepSpan
// ============================================================================

test.describe("createStepSpan", () => {
  test("creates span with test.step.name and test.step.category attributes", () => {
    const { api, spans } = createMockAutotel();

    createStepSpan(
      { stepTitle: "Given a user", stepCategory: "test.step" },
      { autotel: api },
    );

    expect(spans).toHaveLength(1);
    const span = spans[0];
    expect(span.name).toBe("step: Given a user");
    expect(span.attributes["test.step.name"]).toBe("Given a user");
    expect(span.attributes["test.step.category"]).toBe("test.step");
  });

  test("endSpan with error message sets ERROR status", () => {
    const { api, spans } = createMockAutotel();

    const handle = createStepSpan(
      { stepTitle: "Then it fails" },
      { autotel: api },
    );
    handle.endSpan("assertion failed");

    expect(spans[0].status).toEqual({
      code: 2,
      message: "assertion failed",
    });
    expect(spans[0].ended).toBe(true);
  });

  test("endSpan without error just ends the span", () => {
    const { api, spans } = createMockAutotel();

    const handle = createStepSpan(
      { stepTitle: "Given setup" },
      { autotel: api },
    );
    handle.endSpan();

    expect(spans[0].status).toBeUndefined();
    expect(spans[0].ended).toBe(true);
  });

  test("omits category attribute when not provided", () => {
    const { api, spans } = createMockAutotel();

    createStepSpan({ stepTitle: "When action" }, { autotel: api });

    expect(spans[0].attributes["test.step.name"]).toBe("When action");
    expect(spans[0].attributes["test.step.category"]).toBeUndefined();
  });
});

// ============================================================================
// mapToSpanStatus (tested via createTestSpan.endSpan)
// ============================================================================

test.describe("mapToSpanStatus via createTestSpan", () => {
  test('"passed" maps to UNSET', () => {
    const { api, spans } = createMockAutotel();
    const handle = createTestSpan({ testTitle: "t" }, { autotel: api });
    handle.endSpan("passed");
    expect(spans[0].status?.code).toBe(0);
  });

  test('"skipped" maps to UNSET', () => {
    const { api, spans } = createMockAutotel();
    const handle = createTestSpan({ testTitle: "t" }, { autotel: api });
    handle.endSpan("skipped");
    expect(spans[0].status?.code).toBe(0);
  });

  test('"failed" maps to ERROR', () => {
    const { api, spans } = createMockAutotel();
    const handle = createTestSpan({ testTitle: "t" }, { autotel: api });
    handle.endSpan("failed");
    expect(spans[0].status?.code).toBe(2);
  });

  test('"timedOut" maps to ERROR', () => {
    const { api, spans } = createMockAutotel();
    const handle = createTestSpan({ testTitle: "t" }, { autotel: api });
    handle.endSpan("timedOut");
    expect(spans[0].status?.code).toBe(2);
  });

  test('"interrupted" maps to ERROR', () => {
    const { api, spans } = createMockAutotel();
    const handle = createTestSpan({ testTitle: "t" }, { autotel: api });
    handle.endSpan("interrupted");
    expect(spans[0].status?.code).toBe(2);
  });

  test("unknown status maps to UNSET", () => {
    const { api, spans } = createMockAutotel();
    const handle = createTestSpan({ testTitle: "t" }, { autotel: api });
    handle.endSpan("some-unknown-status");
    expect(spans[0].status?.code).toBe(0);
  });
});

// ============================================================================
// Dangling span unwinding
// ============================================================================

test.describe("dangling span unwinding", () => {
  test("creating and ending spans out of order works without errors", () => {
    const { api, spans } = createMockAutotel();

    // Create a test span and multiple step spans
    const testHandle = createTestSpan(
      { testTitle: "interrupted test" },
      { autotel: api },
    );
    const step1 = createStepSpan(
      { stepTitle: "Given setup" },
      { autotel: api },
    );
    const step2 = createStepSpan(
      { stepTitle: "When action" },
      { autotel: api },
    );
    const step3 = createStepSpan(
      { stepTitle: "Then assertion" },
      { autotel: api },
    );

    // End in reverse order (step3 first, step1 last) -- simulating stack unwind
    step3.endSpan("interrupted test");
    step2.endSpan("interrupted test");
    step1.endSpan("interrupted test");
    testHandle.endSpan("interrupted");

    // All 4 spans should be ended
    expect(spans).toHaveLength(4);
    for (const span of spans) {
      expect(span.ended).toBe(true);
    }
  });

  test("ending spans multiple times does not throw", () => {
    const { api, spans } = createMockAutotel();

    const handle = createStepSpan(
      { stepTitle: "Given something" },
      { autotel: api },
    );

    // End twice -- should not throw
    handle.endSpan();
    handle.endSpan("error");

    expect(spans[0].ended).toBe(true);
  });
});
