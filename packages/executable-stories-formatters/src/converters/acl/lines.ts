/**
 * Deterministic line number generation for Cucumber JSON compatibility.
 *
 * When actual line numbers aren't available, we generate deterministic
 * line numbers based on position in the file.
 */

/**
 * Generate deterministic line numbers for scenarios in a file.
 *
 * Starts at line 2 (after feature declaration) and increments by
 * steps count + buffer for each scenario.
 *
 * @param scenarioIndex - Index of the scenario in the file (0-based)
 * @param stepsCount - Number of steps in the scenario
 * @param prevEndLine - End line of previous scenario (default 1)
 * @returns Deterministic line number
 */
export function generateScenarioLine(
  scenarioIndex: number,
  stepsCount: number,
  prevEndLine: number = 1
): number {
  // Each scenario needs:
  // - 1 line for scenario declaration
  // - n lines for steps
  // - 1 blank line after
  const linesPerScenario = 1 + stepsCount + 1;

  if (scenarioIndex === 0) {
    // First scenario starts at line 3 (Feature on 1, blank on 2)
    return 3;
  }

  return prevEndLine + linesPerScenario;
}

/**
 * Generate step line numbers for a scenario.
 *
 * @param scenarioLine - The scenario's line number
 * @param stepIndex - Index of the step (0-based)
 * @returns Line number for the step
 */
export function generateStepLine(scenarioLine: number, stepIndex: number): number {
  // Steps start on the line after the scenario declaration
  return scenarioLine + 1 + stepIndex;
}

/**
 * Context for tracking line numbers across multiple scenarios.
 */
export interface LineContext {
  /** Current line number */
  currentLine: number;
}

/**
 * Create a new line context starting at line 1.
 */
export function createLineContext(): LineContext {
  return { currentLine: 1 };
}

/**
 * Advance line context past a feature declaration.
 *
 * @param ctx - Line context
 * @returns Updated line context
 */
export function advancePastFeature(ctx: LineContext): LineContext {
  // Feature keyword on line 1, blank line after
  return { currentLine: 3 };
}

/**
 * Get the current scenario line and advance past it.
 *
 * @param ctx - Line context
 * @param stepsCount - Number of steps in the scenario
 * @returns Tuple of [scenarioLine, updatedContext]
 */
export function advancePastScenario(
  ctx: LineContext,
  stepsCount: number
): [number, LineContext] {
  const scenarioLine = ctx.currentLine;
  // Advance past: scenario keyword + steps + blank line
  const newLine = scenarioLine + 1 + stepsCount + 1;
  return [scenarioLine, { currentLine: newLine }];
}
