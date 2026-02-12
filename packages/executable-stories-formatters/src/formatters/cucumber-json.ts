/**
 * Cucumber JSON Formatter - Layer 3.
 *
 * Transforms canonical TestRunResult into Cucumber JSON format
 * compatible with cucumber-js v11.x output.
 */

import type { StoryStep, DocEntry } from "../types/story";
import type {
  TestRunResult,
  TestCaseResult,
  StepResult,
  Attachment,
} from "../types/test-result";
import type {
  IJsonFeature,
  IJsonScenario,
  IJsonStep,
  IJsonTag,
  IJsonEmbedding,
  IJsonStepResult,
} from "../types/cucumber-json";
import { slugify, generateFeatureId, generateScenarioId } from "../converters/acl/ids";
import { createLineContext, advancePastFeature, advancePastScenario, generateStepLine } from "../converters/acl/lines";

/** Options for Cucumber JSON formatting */
export interface CucumberJsonOptions {
  /** Pretty-print JSON output. Default: false */
  pretty?: boolean;
  /** Include trailing space in keywords. Default: true */
  keywordSpacing?: boolean;
}

/**
 * Cucumber JSON Formatter.
 *
 * Transforms TestRunResult into an array of IJsonFeature objects
 * that match the Cucumber JSON format specification.
 */
export class CucumberJsonFormatter {
  private options: Required<CucumberJsonOptions>;

  constructor(options: CucumberJsonOptions = {}) {
    this.options = {
      pretty: options.pretty ?? false,
      keywordSpacing: options.keywordSpacing ?? true,
    };
  }

  /**
   * Format a test run into Cucumber JSON features.
   *
   * Groups test cases by source file (one feature per file).
   *
   * @param run - Canonical test run result
   * @returns Array of Cucumber JSON features
   */
  format(run: TestRunResult): IJsonFeature[] {
    // Group test cases by source file
    const byFile = new Map<string, TestCaseResult[]>();
    for (const tc of run.testCases) {
      const file = tc.sourceFile;
      const existing = byFile.get(file);
      if (existing) {
        existing.push(tc);
      } else {
        byFile.set(file, [tc]);
      }
    }

    // Build features
    const features: IJsonFeature[] = [];
    for (const [uri, testCases] of byFile) {
      features.push(this.buildFeature(uri, testCases));
    }

    return features;
  }

  /**
   * Format and serialize to JSON string.
   *
   * @param run - Canonical test run result
   * @returns JSON string
   */
  formatToString(run: TestRunResult): string {
    const features = this.format(run);
    return this.options.pretty
      ? JSON.stringify(features, null, 2)
      : JSON.stringify(features);
  }

  /**
   * Build a single feature from test cases in the same file.
   */
  private buildFeature(uri: string, testCases: TestCaseResult[]): IJsonFeature {
    const featureName = this.extractFeatureName(uri, testCases);
    const featureId = generateFeatureId(uri);

    // Extract feature-level tags (union of all scenario tags)
    const featureTags = this.extractFeatureTags(testCases);

    // Build scenarios with deterministic line numbers
    let lineCtx = createLineContext();
    lineCtx = advancePastFeature(lineCtx);

    const elements: IJsonScenario[] = [];
    for (const tc of testCases) {
      const [scenarioLine, nextCtx] = advancePastScenario(lineCtx, tc.story.steps.length);
      elements.push(this.buildScenario(tc, featureId, scenarioLine));
      lineCtx = nextCtx;
    }

    return {
      description: "",
      elements,
      id: featureId,
      keyword: "Feature",
      line: 1,
      name: featureName,
      tags: featureTags,
      uri,
    };
  }

  /**
   * Extract feature name from URI or test cases.
   *
   * Uses the top-level suite path if available, otherwise file name.
   */
  private extractFeatureName(uri: string, testCases: TestCaseResult[]): string {
    // Try to get common suite path prefix
    const suitePaths = testCases
      .map((tc) => tc.titlePath)
      .filter((p) => p.length > 0);

    if (suitePaths.length > 0) {
      // Use the first element of the first suite path as feature name
      const firstPath = suitePaths[0];
      if (firstPath.length > 0) {
        return firstPath[0];
      }
    }

    // Fall back to filename without extension
    const filename = uri.split("/").pop() ?? uri;
    return filename.replace(/\.[^.]+$/, "").replace(/[._-]/g, " ");
  }

  /**
   * Extract feature-level tags from all test cases.
   */
  private extractFeatureTags(testCases: TestCaseResult[]): IJsonTag[] {
    // Collect all unique tags
    const allTags = new Set<string>();
    for (const tc of testCases) {
      for (const tag of tc.tags) {
        allTags.add(tag);
      }
    }

    // Convert to IJsonTag format (with @ prefix if not present)
    return [...allTags].sort().map((tag) => ({
      name: tag.startsWith("@") ? tag : `@${tag}`,
      line: 1,
    }));
  }

  /**
   * Build a scenario from a test case.
   */
  private buildScenario(
    tc: TestCaseResult,
    featureId: string,
    scenarioLine: number
  ): IJsonScenario {
    const scenarioName = tc.story.scenario;
    const scenarioId = generateScenarioId(featureId, scenarioName);

    // Build steps
    const steps = this.buildSteps(tc, scenarioLine);

    // Build scenario tags
    const tags: IJsonTag[] = tc.tags.map((tag) => ({
      name: tag.startsWith("@") ? tag : `@${tag}`,
      line: scenarioLine,
    }));

    return {
      description: "",
      id: scenarioId,
      keyword: "Scenario",
      line: scenarioLine,
      name: scenarioName,
      steps,
      tags,
      type: "scenario",
    };
  }

  /**
   * Build steps from story steps and step results.
   */
  private buildSteps(tc: TestCaseResult, scenarioLine: number): IJsonStep[] {
    const storySteps = tc.story.steps;
    const stepResults = tc.stepResults;

    // Create a map of step results by index
    const resultsByIndex = new Map<number, StepResult>();
    for (const sr of stepResults) {
      resultsByIndex.set(sr.index, sr);
    }

    // Check if any step failed (used to decide if last step gets attachments)
    const hasFailedStep = stepResults.some(sr => sr.status === "failed");

    const totalSteps = storySteps.length;
    return storySteps.map((step, index) => {
      const stepResult = resultsByIndex.get(index);
      const stepLine = generateStepLine(scenarioLine, index);
      const isLastStep = index === totalSteps - 1;
      return this.buildStep(step, stepResult, stepLine, index, tc.attachments, isLastStep, hasFailedStep);
    });
  }

  /**
   * Build a single step.
   */
  private buildStep(
    step: StoryStep,
    result: StepResult | undefined,
    line: number,
    index: number,
    attachments: Attachment[],
    isLastStep: boolean,
    hasFailedStep: boolean
  ): IJsonStep {
    // Keyword with optional trailing space
    const keyword = this.options.keywordSpacing
      ? `${step.keyword} `
      : step.keyword;

    // Build result
    const stepResult = this.buildStepResult(result);

    // Build embeddings for attachments (attach to failed step, or last step if no failure)
    const embeddings = this.buildEmbeddings(attachments, result, isLastStep, hasFailedStep);

    // Add screenshot docs as embeddings (always include with their step)
    const screenshotEmbeddings = this.buildScreenshotEmbeddings(step);
    embeddings.push(...screenshotEmbeddings);

    const jsonStep: IJsonStep = {
      keyword,
      line,
      name: step.text,
      result: stepResult,
    };

    // Only include optional fields if they have values
    if (embeddings.length > 0) {
      jsonStep.embeddings = embeddings;
    }

    // Add step arguments (doc strings from docs, data tables)
    const args = this.buildStepArguments(step);
    if (args.length > 0) {
      jsonStep.arguments = args;
    }

    return jsonStep;
  }

  /**
   * Build embeddings from screenshot doc entries.
   */
  private buildScreenshotEmbeddings(step: StoryStep): IJsonEmbedding[] {
    if (!step.docs) {
      return [];
    }

    const embeddings: IJsonEmbedding[] = [];

    for (const doc of step.docs) {
      if (doc.kind !== "screenshot" || !doc.path.startsWith("data:")) {
        continue;
      }

      // Parse data URI: data:image/png;base64,ABC123...
      const match = doc.path.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        embeddings.push({
          data: match[2],
          mime_type: match[1],
          name: doc.alt,
        });
      }
    }

    return embeddings;
  }

  /**
   * Build step result.
   */
  private buildStepResult(result: StepResult | undefined): IJsonStepResult {
    if (!result) {
      return {
        status: "undefined",
        duration: 0,
      };
    }

    // Map canonical status to Cucumber status
    const statusMap: Record<string, IJsonStepResult["status"]> = {
      passed: "passed",
      failed: "failed",
      skipped: "skipped",
      pending: "pending",
    };

    const stepResult: IJsonStepResult = {
      status: statusMap[result.status] ?? "undefined",
      // Duration in nanoseconds (Cucumber uses nanoseconds)
      duration: result.durationMs * 1_000_000,
    };

    if (result.errorMessage) {
      stepResult.error_message = result.errorMessage;
    }

    return stepResult;
  }

  /**
   * Build embeddings (attachments) for a step.
   *
   * Cucumber convention: attach to the failing step, or last step if no failure.
   */
  private buildEmbeddings(
    attachments: Attachment[],
    result: StepResult | undefined,
    isLastStep: boolean,
    hasFailedStep: boolean
  ): IJsonEmbedding[] {
    const isFailed = result?.status === "failed";

    // If this step failed, attach here
    if (isFailed) {
      // Continue to attach
    } else if (isLastStep && !hasFailedStep) {
      // No failed step in scenario, attach to last step
    } else {
      // Not a failed step, and either not last or there's a failed step elsewhere
      return [];
    }

    // Only include BASE64 attachments - IDENTITY attachments are URLs/paths, not embeddable data
    const base64Attachments = attachments.filter(
      (att) => att.contentEncoding === "BASE64"
    );

    if (base64Attachments.length === 0) {
      return [];
    }

    return base64Attachments.map((att) => ({
      data: att.body,
      mime_type: att.mediaType,
      name: att.name,
    }));
  }

  /**
   * Build step arguments from step docs.
   *
   * Converts doc entries to Cucumber step arguments (doc strings, data tables).
   */
  private buildStepArguments(step: StoryStep): Array<{ doc_string?: { content: string; content_type?: string; line: number }; rows?: Array<{ cells: string[] }> }> {
    if (!step.docs || step.docs.length === 0) {
      return [];
    }

    const args: Array<{ doc_string?: { content: string; content_type?: string; line: number }; rows?: Array<{ cells: string[] }> }> = [];

    for (const doc of step.docs) {
      const arg = this.docEntryToArgument(doc);
      if (arg) {
        args.push(arg);
      }
    }

    return args;
  }

  /**
   * Convert a doc entry to a Cucumber step argument.
   */
  private docEntryToArgument(doc: DocEntry): { doc_string?: { content: string; content_type?: string; line: number }; rows?: Array<{ cells: string[] }> } | null {
    switch (doc.kind) {
      case "code":
        return {
          doc_string: {
            content: doc.content,
            content_type: doc.lang,
            line: 0,
          },
        };

      case "table":
        return {
          rows: [
            { cells: doc.columns },
            ...doc.rows.map((row) => ({ cells: row })),
          ],
        };

      case "note":
        return {
          doc_string: {
            content: doc.text,
            content_type: "text/plain",
            line: 0,
          },
        };

      case "mermaid":
        return {
          doc_string: {
            content: doc.code,
            content_type: "text/x-mermaid",
            line: 0,
          },
        };

      case "section":
        return {
          doc_string: {
            content: `# ${doc.title}\n\n${doc.markdown}`,
            content_type: "text/markdown",
            line: 0,
          },
        };

      case "link":
        return {
          doc_string: {
            content: `[${doc.label}](${doc.url})`,
            content_type: "text/markdown",
            line: 0,
          },
        };

      case "kv": {
        const value = typeof doc.value === "string"
          ? doc.value
          : JSON.stringify(doc.value, null, 2);
        return {
          doc_string: {
            content: `${doc.label}: ${value}`,
            content_type: "text/plain",
            line: 0,
          },
        };
      }

      case "tag":
        return {
          doc_string: {
            content: doc.names.map((n) => `@${n}`).join(" "),
            content_type: "text/plain",
            line: 0,
          },
        };

      case "custom":
        return {
          doc_string: {
            content: JSON.stringify(doc.data, null, 2),
            content_type: "application/json",
            line: 0,
          },
        };

      case "screenshot":
        // Screenshots are handled as embeddings, not arguments
        return null;

      default:
        return null;
    }
  }
}
