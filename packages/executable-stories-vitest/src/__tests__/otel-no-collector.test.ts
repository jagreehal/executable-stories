/**
 * A test whose trace collected nothing must be untouched by this.
 *
 * That covers the common case, a suite that never configured OpenTelemetry at
 * all, and the ordinary one where a collector is installed but this particular
 * trace produced no spans. The drain runs on every test carrying a trace id, so
 * it has to be a silent no-op rather than an error or an empty array the
 * reporter then has to filter.
 *
 * It does not assert that no collector exists: test files can share a worker,
 * and a collector another file installed lives on the same realm.
 */
import { afterAll, describe, expect, it, vi } from "vitest";

const TRACE_ID = "99998888777766665555444433332222";

vi.mock("executable-stories-core/utils/otel-detect", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    tryGetActiveOtelContext: () => ({ traceId: TRACE_ID, spanId: "root" }),
  };
});

import { story } from "../story-api";

describe("a trace that collected nothing", () => {
  let underTest: { meta: Record<string, unknown> } | undefined;

  afterAll(() => {
    // Not an empty array: absent means "nothing was collected", and the
    // reporter's span handling never has to distinguish the two.
    expect(underTest?.meta.otelSpans).toBeUndefined();
    // The story itself is unaffected.
    expect(underTest?.meta.story).toBeDefined();
  });

  it("leaves the test meta alone", ({ task }) => {
    underTest = task as unknown as { meta: Record<string, unknown> };
    story.init(task);
    story.given("a suite with no OpenTelemetry setup");
  });
});
