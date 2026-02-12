/**
 * Story synthesis for plain test results.
 *
 * Fills in missing story metadata so that test cases without BDD steps
 * are not discarded by the ACL's `.filter((tc) => tc.story != null)`.
 */

import type { StepKeyword, StoryStep } from "../types/story";
import type { RawRun, RawTestCase } from "../types/raw";

/** Mapping from lowercase keyword to canonical title case */
const KEYWORD_MAP: Record<string, StepKeyword> = {
  given: "Given",
  when: "When",
  then: "Then",
  and: "And",
  but: "But",
};

/**
 * Normalize a step keyword to title case.
 * "given" → "Given", "THEN" is not a valid keyword and will pass through.
 */
function normalizeKeyword(keyword: string): StepKeyword {
  return KEYWORD_MAP[keyword.toLowerCase()] ?? (keyword as StepKeyword);
}

/**
 * Normalize all step keywords in a StoryStep array to title case.
 */
function normalizeStepKeywords(steps: StoryStep[]): StoryStep[] {
  return steps.map((step) => ({
    ...step,
    keyword: normalizeKeyword(step.keyword),
  }));
}

/**
 * Derive a scenario name from a raw test case.
 */
function deriveScenarioName(tc: RawTestCase): string {
  if (tc.title) return tc.title;
  if (tc.titlePath && tc.titlePath.length > 0) {
    return tc.titlePath[tc.titlePath.length - 1];
  }
  return "Untitled";
}

/**
 * Synthesize story metadata for test cases that are missing it.
 *
 * Rules:
 * - If `story` is missing entirely:
 *   - `scenario` = title (or last element of titlePath, or "Untitled")
 *   - `steps` = `[{ keyword: "Then", text: scenario }]`
 * - If `story` is present but `steps` is empty/missing:
 *   - `steps` = `[{ keyword: "Then", text: story.scenario }]`
 * - Normalize keyword casing in all steps: "given" → "Given", etc.
 *
 * This is a pure function that returns a new RawRun.
 */
export function synthesizeStories(raw: RawRun): RawRun {
  return {
    ...raw,
    testCases: raw.testCases.map(synthesizeTestCase),
  };
}

function synthesizeTestCase(tc: RawTestCase): RawTestCase {
  if (tc.story == null) {
    // No story at all — synthesize from test title
    const scenario = deriveScenarioName(tc);
    return {
      ...tc,
      story: {
        scenario,
        steps: [{ keyword: "Then", text: scenario }],
      },
    };
  }

  // Story exists — check if steps are missing/empty
  const steps = tc.story.steps;
  if (!steps || steps.length === 0) {
    return {
      ...tc,
      story: {
        ...tc.story,
        steps: [{ keyword: "Then", text: tc.story.scenario }],
      },
    };
  }

  // Steps exist — just normalize keyword casing
  return {
    ...tc,
    story: {
      ...tc.story,
      steps: normalizeStepKeywords(steps),
    },
  };
}
