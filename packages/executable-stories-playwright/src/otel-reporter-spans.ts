/**
 * OTel span generation helpers for the Playwright reporter.
 *
 * Uses autotel for span creation with the same lazy-loading pattern
 * as story-api.ts (createRequire). All helpers follow the fn(args, deps)
 * convention for explicit dependency injection.
 */

import { createRequire } from "node:module";

// ============================================================================
// Autotel API surface
// ============================================================================

/** Minimal autotel API surface we use */
export interface AutotelApi {
  span: (
    name: string,
    attributes?: Record<string, unknown>,
  ) => {
    end: () => void;
    setStatus: (status: { code: number; message?: string }) => void;
    setAttribute: (key: string, value: unknown) => void;
  };
  SpanStatusCode: { UNSET: number; ERROR: number };
}

// ============================================================================
// Lazy loader
// ============================================================================

/**
 * Lazy-load autotel. Returns null if unavailable.
 * Same createRequire pattern as story-api.ts.
 */
export function tryLoadAutotel(): AutotelApi | null {
  try {
    const reqUrl =
      import.meta.url ??
      (typeof __filename !== "undefined" ? `file://${__filename}` : undefined);
    if (!reqUrl) return null;
    const req = createRequire(reqUrl);
    const autotel = req("autotel");
    if (typeof autotel?.span !== "function") return null;
    return autotel as AutotelApi;
  } catch {
    return null;
  }
}

// ============================================================================
// Step filtering
// ============================================================================

/**
 * Step filtering — explicit, heavily tested.
 * Returns true for test.step category and story step keywords.
 */
export function shouldInstrumentStep(step: {
  category?: string;
  title?: string;
}): boolean {
  return step.category === "test.step" || isStoryStep(step);
}

/**
 * Check if a step title starts with a story keyword.
 * Documented tradeoff: may match non-story steps starting with these words
 * (e.g. "And this works"). Acceptable for v1.
 */
function isStoryStep(step: { title?: string }): boolean {
  if (!step.title) return false;
  return /^(Given|When|Then|And|But|Arrange|Act|Assert)\s/.test(step.title);
}

// ============================================================================
// Status mapping
// ============================================================================

/**
 * Map test/step status to OTel SpanStatusCode.
 * Single helper used by both test and step spans.
 *
 * "passed"/"skipped" -> UNSET
 * "failed"/"timedOut"/"interrupted" -> ERROR
 */
function mapToSpanStatus(
  status: string,
  SpanStatusCode: { UNSET: number; ERROR: number },
): { code: number; message?: string } {
  switch (status) {
    case "passed":
    case "skipped":
      return { code: SpanStatusCode.UNSET };
    case "failed":
    case "timedOut":
    case "interrupted":
      return { code: SpanStatusCode.ERROR, message: status };
    default:
      return { code: SpanStatusCode.UNSET };
  }
}

// ============================================================================
// Test span
// ============================================================================

/**
 * Create a test-level span.
 *
 * Attribute naming convention:
 * - code.filepath, code.lineno -- OTel code conventions
 * - test.name, test.suite, test.status -- test attributes
 * - story.scenario, story.tags, story.tickets -- story-specific
 */
export function createTestSpan(
  args: {
    testTitle: string;
    suitePath?: string[];
    sourceFile?: string;
    sourceLine?: number;
  },
  deps: { autotel: AutotelApi },
): { endSpan: (status: string, errorMessage?: string) => void } {
  const attributes: Record<string, unknown> = {
    "test.name": args.testTitle,
  };
  if (args.suitePath?.length) {
    attributes["test.suite"] = args.suitePath.join(" > ");
  }
  if (args.sourceFile) {
    attributes["code.filepath"] = args.sourceFile;
  }
  if (args.sourceLine !== undefined) {
    attributes["code.lineno"] = args.sourceLine;
  }

  const span = deps.autotel.span(`test: ${args.testTitle}`, attributes);

  return {
    endSpan(status: string, errorMessage?: string) {
      span.setAttribute("test.status", status);
      const spanStatus = mapToSpanStatus(status, deps.autotel.SpanStatusCode);
      if (errorMessage) {
        spanStatus.message = errorMessage;
      }
      span.setStatus(spanStatus);
      span.end();
    },
  };
}

// ============================================================================
// Step span
// ============================================================================

/**
 * Create a step-level span.
 *
 * Attribute naming:
 * - test.step.name -- step title
 * - test.step.category -- step category
 */
export function createStepSpan(
  args: {
    stepTitle: string;
    stepCategory?: string;
  },
  deps: { autotel: AutotelApi },
): { endSpan: (errorMessage?: string) => void } {
  const attributes: Record<string, unknown> = {
    "test.step.name": args.stepTitle,
  };
  if (args.stepCategory) {
    attributes["test.step.category"] = args.stepCategory;
  }

  const span = deps.autotel.span(`step: ${args.stepTitle}`, attributes);

  return {
    endSpan(errorMessage?: string) {
      if (errorMessage) {
        span.setStatus({
          code: deps.autotel.SpanStatusCode.ERROR,
          message: errorMessage,
        });
      }
      span.end();
    },
  };
}
