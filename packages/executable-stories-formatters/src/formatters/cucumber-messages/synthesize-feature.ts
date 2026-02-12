/**
 * Synthesize .feature file text and a line map from TestCaseResult[].
 *
 * Used to produce Source and GherkinDocument messages when real .feature
 * files don't exist (all test cases come from e.g. Jest/Vitest/Playwright).
 */

import type { TestCaseResult } from "../../types/test-result";

/** Map from scenario name → { scenarioLine, stepLines: Map<stepIndex, line> } */
export interface LineMap {
  featureLine: number;
  scenarios: Map<
    string,
    { scenarioLine: number; stepLines: Map<number, number> }
  >;
  /** Tag lines for each scenario, keyed by scenario name */
  scenarioTagLines: Map<string, number>;
  /** Feature-level tag line (if any) */
  featureTagLine?: number;
}

export interface SynthesizedFeature {
  /** The synthesized .feature text */
  text: string;
  /** Line map for building the GherkinDocument AST */
  lineMap: LineMap;
  /** Extracted feature name */
  featureName: string;
  /** Feature-level tags (union of all scenario tags) */
  featureTags: string[];
}

/**
 * Extract a feature name from grouped test cases.
 *
 * Uses the first element of the first titlePath, or derives from the URI.
 */
export function extractFeatureName(
  testCases: TestCaseResult[],
  uri: string
): string {
  for (const tc of testCases) {
    if (tc.titlePath.length > 0) {
      return tc.titlePath[0];
    }
  }
  // Fallback: derive from filename
  const basename = uri.replace(/^.*[\\/]/, "").replace(/\.[^.]+$/, "");
  return basename
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Synthesize a .feature file from a group of test cases belonging to the same source file.
 */
export function synthesizeFeature(
  uri: string,
  testCases: TestCaseResult[]
): SynthesizedFeature {
  const featureName = extractFeatureName(testCases, uri);

  // Collect feature-level tags (union of all scenario tags)
  const featureTagSet = new Set<string>();
  for (const tc of testCases) {
    for (const tag of tc.tags) {
      featureTagSet.add(tag);
    }
  }
  const featureTags = [...featureTagSet].sort();

  const lines: string[] = [];
  const lineMap: LineMap = {
    featureLine: 0,
    scenarios: new Map(),
    scenarioTagLines: new Map(),
  };

  let currentLine = 1;

  // Feature-level tags
  if (featureTags.length > 0) {
    lines.push(featureTags.map((t) => `@${t}`).join(" "));
    lineMap.featureTagLine = currentLine;
    currentLine++;
  }

  // Feature declaration
  lines.push(`Feature: ${featureName}`);
  lineMap.featureLine = currentLine;
  currentLine++;

  // Blank line after feature
  lines.push("");
  currentLine++;

  for (const tc of testCases) {
    const scenario = tc.story.scenario;

    // Scenario tags
    if (tc.tags.length > 0) {
      lines.push(`  ${tc.tags.map((t) => `@${t}`).join(" ")}`);
      lineMap.scenarioTagLines.set(scenario, currentLine);
      currentLine++;
    }

    // Scenario declaration
    const scenarioLine = currentLine;
    lines.push(`  Scenario: ${scenario}`);
    currentLine++;

    // Steps
    const stepLines = new Map<number, number>();
    for (let i = 0; i < tc.story.steps.length; i++) {
      const step = tc.story.steps[i];
      stepLines.set(i, currentLine);
      lines.push(`    ${step.keyword} ${step.text}`);
      currentLine++;
    }

    lineMap.scenarios.set(scenario, { scenarioLine, stepLines });

    // Blank line between scenarios
    lines.push("");
    currentLine++;
  }

  return {
    text: lines.join("\n"),
    lineMap,
    featureName,
    featureTags,
  };
}
