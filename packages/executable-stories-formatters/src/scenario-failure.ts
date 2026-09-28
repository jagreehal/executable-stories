import type { TestCaseResult } from "executable-stories-core/types/test-result";

/**
 * The error message a reader should see for a failed scenario: the failing
 * step's message when one is isolated (most specific), otherwise the
 * scenario-level error. Shared by the agent-facing commands (`check`,
 * `triage`) so the choice stays consistent between them.
 */
export function failingScenarioMessage(tc: TestCaseResult): string | undefined {
  const failingStep = tc.stepResults.find((s) => s.status === "failed" && s.errorMessage);
  return failingStep?.errorMessage ?? tc.errorMessage;
}

/** The failed assertion's expected and actual values, from the step that carries them. */
export function failingComparison(tc: TestCaseResult): { expected?: string; actual?: string } {
  const step = tc.stepResults.find((s) => s.expected !== undefined || s.actual !== undefined);
  return {
    ...(step?.expected !== undefined ? { expected: step.expected } : {}),
    ...(step?.actual !== undefined ? { actual: step.actual } : {}),
  };
}
