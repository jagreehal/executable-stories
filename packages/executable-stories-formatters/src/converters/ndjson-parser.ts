/**
 * NDJSON-to-TestRunResult parser.
 *
 * Parses Cucumber Messages NDJSON (one JSON envelope per line) back into
 * a TestRunResult suitable for rendering by HtmlFormatter or other formatters.
 *
 * This is the NDJSON compat path: it produces a minimal but sufficient
 * TestRunResult. Fields not present in the NDJSON stream are given
 * sensible defaults.
 */

import type { StoryMeta, StoryStep, StepKeyword, DocEntry, DocPhase } from "../types/story";
import type {
  TestRunResult,
  TestCaseResult,
  TestCaseAttempt,
  StepResult,
  TestStatus,
  Attachment,
} from "../types/test-result";
import type {
  Envelope,
  Pickle,
  PickleStep,
  GherkinDocument,
  Source,
  TestCase,
  TestCaseStarted,
  TestCaseFinished,
  TestStepFinished,
  TestStepResultStatus,
  CucumberAttachment,
  Timestamp,
} from "../types/cucumber-messages";

// ============================================================================
// Internal index types
// ============================================================================

interface PickleIndex {
  pickle: Pickle;
  uri: string;
}

interface StepDefinition {
  keyword: StepKeyword;
  text: string;
}

interface TestCaseIndex {
  testCase: TestCase;
  pickleId: string;
}

interface TestCaseStartedIndex {
  testCaseStarted: TestCaseStarted;
  testCaseId: string;
}

interface TestCaseFinishedIndex {
  testCaseStartedId: string;
  willBeRetried: boolean;
}

interface StepResultAccumulator {
  testStepId: string;
  status: TestStatus;
  durationMs: number;
  errorMessage?: string;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Parse an NDJSON string into a TestRunResult.
 *
 * @param ndjson - NDJSON string (one JSON envelope per line)
 * @returns TestRunResult reconstructed from the envelopes
 */
export function parseNdjson(ndjson: string): TestRunResult {
  const lines = ndjson.trim().split("\n").filter(Boolean);
  const envelopes: Envelope[] = lines.map((line) => JSON.parse(line));
  return parseEnvelopes(envelopes);
}

/**
 * Parse an array of Envelope objects into a TestRunResult.
 *
 * @param envelopes - Array of Cucumber Messages envelopes
 * @returns TestRunResult reconstructed from the envelopes
 */
export function parseEnvelopes(envelopes: Envelope[]): TestRunResult {
  // Indexes for cross-referencing
  const sources = new Map<string, Source>();             // uri → Source
  const gherkinDocs = new Map<string, GherkinDocument>(); // uri → GherkinDocument
  const pickles = new Map<string, PickleIndex>();         // pickleId → { pickle, uri }
  const testCases = new Map<string, TestCaseIndex>();     // testCaseId → { testCase, pickleId }
  const testCaseStarteds = new Map<string, TestCaseStartedIndex>(); // testCaseStartedId → { ... }
  const testCaseFinisheds = new Map<string, TestCaseFinishedIndex>(); // testCaseStartedId → { ... }
  const testCaseIdToStartedIds = new Map<string, string[]>(); // testCaseId → testCaseStartedId[]
  const stepResults = new Map<string, StepResultAccumulator[]>();   // testCaseStartedId → step results
  const attachments = new Map<string, CucumberAttachment[]>();      // testCaseStartedId → attachments

  let startedAtMs = 0;
  let finishedAtMs = 0;
  let success = true;
  let toolName = "unknown";
  let toolVersion = "0.0.0";

  // Single-pass index building
  for (const envelope of envelopes) {
    if ("meta" in envelope) {
      toolName = envelope.meta.implementation.name;
      toolVersion = envelope.meta.implementation.version;
    }

    if ("source" in envelope) {
      sources.set(envelope.source.uri, envelope.source);
    }

    if ("gherkinDocument" in envelope) {
      const doc = envelope.gherkinDocument;
      gherkinDocs.set(doc.uri, doc);
    }

    if ("pickle" in envelope) {
      const p = envelope.pickle;
      pickles.set(p.id, { pickle: p, uri: p.uri });
    }

    if ("testCase" in envelope) {
      const tc = envelope.testCase;
      testCases.set(tc.id, { testCase: tc, pickleId: tc.pickleId });
    }

    if ("testCaseStarted" in envelope) {
      const tcs = envelope.testCaseStarted;
      testCaseStarteds.set(tcs.id, {
        testCaseStarted: tcs,
        testCaseId: tcs.testCaseId,
      });
      stepResults.set(tcs.id, []);
      attachments.set(tcs.id, []);
      // Group by testCaseId for retry detection
      const existing = testCaseIdToStartedIds.get(tcs.testCaseId) ?? [];
      existing.push(tcs.id);
      testCaseIdToStartedIds.set(tcs.testCaseId, existing);
    }

    if ("testCaseFinished" in envelope) {
      const tcf = envelope.testCaseFinished;
      testCaseFinisheds.set(tcf.testCaseStartedId, {
        testCaseStartedId: tcf.testCaseStartedId,
        willBeRetried: tcf.willBeRetried,
      });
    }

    if ("testStepFinished" in envelope) {
      const tsf = envelope.testStepFinished;
      const results = stepResults.get(tsf.testCaseStartedId);
      if (results) {
        results.push({
          testStepId: tsf.testStepId,
          status: cucumberStatusToTestStatus(tsf.testStepResult.status),
          durationMs: durationToMs(tsf.testStepResult.duration),
          errorMessage: tsf.testStepResult.message,
        });
      }
    }

    if ("attachment" in envelope) {
      const att = envelope.attachment;
      const list = attachments.get(att.testCaseStartedId);
      if (list) {
        list.push(att);
      }
    }

    if ("testRunStarted" in envelope) {
      startedAtMs = timestampToMs(envelope.testRunStarted.timestamp);
    }

    if ("testRunFinished" in envelope) {
      finishedAtMs = timestampToMs(envelope.testRunFinished.timestamp);
      success = envelope.testRunFinished.success;
    }
  }

  // Reconstruct TestCaseResults (one per TestCase, grouping retries)
  const testCaseResults: TestCaseResult[] = [];

  for (const [testCaseId, tcIndex] of testCases) {
    const pickleIndex = pickles.get(tcIndex.pickleId);
    if (!pickleIndex) continue;

    const pickle = pickleIndex.pickle;
    const uri = pickleIndex.uri;

    // Get all started IDs for this test case (sorted by attempt number)
    const startedIds = testCaseIdToStartedIds.get(testCaseId) ?? [];
    if (startedIds.length === 0) continue;

    // Sort by attempt number
    const sortedStarteds = startedIds
      .map((id) => testCaseStarteds.get(id)!)
      .filter(Boolean)
      .sort((a, b) => a.testCaseStarted.attempt - b.testCaseStarted.attempt);

    // The final attempt is the last one (or the one with willBeRetried=false)
    const finalStarted = sortedStarteds[sortedStarteds.length - 1];
    const finalStartedId = finalStarted.testCaseStarted.id;

    // Build step-to-result mapping via testStepId
    const testStepIdToIndex = new Map<string, number>();
    for (let i = 0; i < tcIndex.testCase.testSteps.length; i++) {
      testStepIdToIndex.set(tcIndex.testCase.testSteps[i].id, i);
    }

    // Reconstruct StorySteps from pickle steps + gherkin doc
    const storySteps = reconstructStorySteps(pickle, uri, gherkinDocs);

    // Use final attempt's step results
    const tcStepResults = stepResults.get(finalStartedId) ?? [];
    const tcAttachments = attachments.get(finalStartedId) ?? [];

    // Reconstruct StepResults in order
    const orderedStepResults: StepResult[] = storySteps.map((_, i) => ({
      index: i,
      status: "passed" as TestStatus,
      durationMs: 0,
    }));

    for (const sr of tcStepResults) {
      const stepIndex = testStepIdToIndex.get(sr.testStepId);
      if (stepIndex !== undefined && stepIndex < orderedStepResults.length) {
        orderedStepResults[stepIndex] = {
          index: stepIndex,
          status: sr.status,
          durationMs: sr.durationMs,
          errorMessage: sr.errorMessage,
        };
      }
    }

    // Derive overall status from step results
    const overallStatus = deriveOverallStatus(orderedStepResults);
    const totalDurationMs = orderedStepResults.reduce(
      (sum, sr) => sum + sr.durationMs,
      0
    );

    // Reconstruct tags
    const tags = pickle.tags.map((t) => t.name.replace(/^@/, ""));

    // Reconstruct attachments (from final attempt)
    const resolvedAttachments: Attachment[] = tcAttachments.map((att) => ({
      name: att.mediaType,
      mediaType: att.mediaType,
      body: att.body,
      contentEncoding: att.contentEncoding,
    }));

    // Extract titlePath from feature name + scenario name
    const featureName = extractFeatureName(uri, gherkinDocs);
    const titlePath = featureName
      ? [featureName, pickle.name]
      : [pickle.name];

    // Build StoryMeta
    const story: StoryMeta = {
      scenario: pickle.name,
      steps: storySteps,
      tags: tags.length > 0 ? tags : undefined,
    };

    // Build error info
    const failedStep = orderedStepResults.find((sr) => sr.status === "failed");

    // Build attempts array if there are retries
    let attempts: TestCaseAttempt[] | undefined;
    if (sortedStarteds.length > 1) {
      attempts = sortedStarteds.map((started) => {
        const sId = started.testCaseStarted.id;
        const sStepResults = stepResults.get(sId) ?? [];
        const attemptStatus = deriveOverallStatus(
          buildOrderedStepResults(sStepResults, testStepIdToIndex, storySteps.length)
        );
        const attemptDurationMs = sStepResults.reduce(
          (sum, sr) => sum + sr.durationMs, 0
        );
        const attemptFailedStep = sStepResults.find((sr) => sr.status === "failed");
        return {
          attempt: started.testCaseStarted.attempt,
          status: attemptStatus,
          durationMs: attemptDurationMs,
          errorMessage: attemptFailedStep?.errorMessage,
        };
      });
    }

    const testCaseResult: TestCaseResult = {
      id: tcIndex.testCase.id,
      story,
      sourceFile: uri,
      sourceLine: 1,
      status: overallStatus,
      durationMs: totalDurationMs,
      errorMessage: failedStep?.errorMessage,
      attachments: resolvedAttachments,
      stepResults: orderedStepResults,
      titlePath,
      retry: finalStarted.testCaseStarted.attempt,
      retries: sortedStarteds.length > 1 ? sortedStarteds.length - 1 : 0,
      tags,
      attempts,
    };

    testCaseResults.push(testCaseResult);
  }

  const durationMs =
    finishedAtMs > 0 && startedAtMs > 0
      ? finishedAtMs - startedAtMs
      : testCaseResults.reduce((sum, tc) => sum + tc.durationMs, 0);

  return {
    testCases: testCaseResults,
    startedAtMs,
    finishedAtMs,
    durationMs,
    projectRoot: "",
    runId: "",
    packageVersion: toolVersion !== "0.0.0" ? toolVersion : undefined,
  };
}

// ============================================================================
// Helpers
// ============================================================================

function cucumberStatusToTestStatus(status: TestStepResultStatus): TestStatus {
  switch (status) {
    case "PASSED":
      return "passed";
    case "FAILED":
      return "failed";
    case "SKIPPED":
      return "skipped";
    case "PENDING":
    case "UNDEFINED":
      return "pending";
    default:
      return "skipped";
  }
}

function timestampToMs(ts: Timestamp): number {
  return ts.seconds * 1000 + Math.round(ts.nanos / 1_000_000);
}

function durationToMs(d: { seconds: number; nanos: number }): number {
  return d.seconds * 1000 + Math.round(d.nanos / 1_000_000);
}

/**
 * Reconstruct StorySteps from pickle steps, using GherkinDocument for keywords.
 */
function reconstructStorySteps(
  pickle: Pickle,
  uri: string,
  gherkinDocs: Map<string, GherkinDocument>
): StoryStep[] {
  const doc = gherkinDocs.get(uri);

  // Build AST step ID → keyword map from GherkinDocument
  const astStepKeywords = new Map<string, string>();
  if (doc) {
    for (const child of doc.feature.children) {
      const scenario = child.scenario ?? child.background;
      if (scenario) {
        for (const step of scenario.steps) {
          astStepKeywords.set(step.id, step.keyword.trim());
        }
      }
    }
  }

  return pickle.steps.map((ps) => {
    // Look up the keyword from the AST step
    let keyword: StepKeyword = "Given";
    if (ps.astNodeIds.length > 0) {
      const astKeyword = astStepKeywords.get(ps.astNodeIds[0]);
      if (astKeyword && isStepKeyword(astKeyword)) {
        keyword = astKeyword;
      }
    }

    // Fallback: derive keyword from pickle step type
    if (!ps.astNodeIds.length || !astStepKeywords.has(ps.astNodeIds[0])) {
      keyword = pickleStepTypeToKeyword(ps.type);
    }

    const step: StoryStep = {
      keyword,
      text: ps.text,
    };

    // Reconstruct docs from pickle step argument
    const docs = pickleStepArgumentToDocs(ps);
    if (docs.length > 0) {
      step.docs = docs;
    }

    return step;
  });
}

function isStepKeyword(s: string): s is StepKeyword {
  return ["Given", "When", "Then", "And", "But"].includes(s);
}

function pickleStepTypeToKeyword(
  type: string
): StepKeyword {
  switch (type) {
    case "Context":
      return "Given";
    case "Action":
      return "When";
    case "Outcome":
      return "Then";
    default:
      return "Given";
  }
}

function extractFeatureName(
  uri: string,
  gherkinDocs: Map<string, GherkinDocument>
): string | undefined {
  const doc = gherkinDocs.get(uri);
  if (doc) {
    return doc.feature.name;
  }
  return undefined;
}

function deriveOverallStatus(stepResults: StepResult[]): TestStatus {
  if (stepResults.some((sr) => sr.status === "failed")) return "failed";
  if (stepResults.every((sr) => sr.status === "skipped")) return "skipped";
  if (stepResults.some((sr) => sr.status === "pending")) return "pending";
  if (stepResults.every((sr) => sr.status === "passed")) return "passed";
  return "passed";
}

/**
 * Build ordered step results from accumulated results for a specific attempt.
 */
function buildOrderedStepResults(
  accumulators: StepResultAccumulator[],
  testStepIdToIndex: Map<string, number>,
  stepCount: number
): StepResult[] {
  const results: StepResult[] = Array.from({ length: stepCount }, (_, i) => ({
    index: i,
    status: "passed" as TestStatus,
    durationMs: 0,
  }));

  for (const sr of accumulators) {
    const stepIndex = testStepIdToIndex.get(sr.testStepId);
    if (stepIndex !== undefined && stepIndex < results.length) {
      results[stepIndex] = {
        index: stepIndex,
        status: sr.status,
        durationMs: sr.durationMs,
        errorMessage: sr.errorMessage,
      };
    }
  }

  return results;
}

/**
 * Convert a pickle step's argument (DocString/DataTable) back to DocEntry[].
 */
function pickleStepArgumentToDocs(ps: PickleStep): DocEntry[] {
  if (!ps.argument) return [];
  const docs: DocEntry[] = [];
  const phase: DocPhase = "static";

  if (ps.argument.dataTable) {
    const table = ps.argument.dataTable;
    if (table.rows.length > 0) {
      const columns = table.rows[0].cells.map((c) => c.value);
      const rows = table.rows.slice(1).map((r) => r.cells.map((c) => c.value));
      docs.push({
        kind: "table",
        label: "",
        columns,
        rows,
        phase,
      });
    }
  }

  if (ps.argument.docString) {
    const ds = ps.argument.docString;
    const mediaType = ds.mediaType ?? "text/plain";

    if (mediaType === "text/plain") {
      docs.push({
        kind: "note",
        text: ds.content,
        phase,
      });
    } else if (mediaType === "text/markdown") {
      docs.push({
        kind: "section",
        title: "",
        markdown: ds.content,
        phase,
      });
    } else if (mediaType === "text/x-mermaid") {
      docs.push({
        kind: "mermaid",
        code: ds.content,
        phase,
      });
    } else if (mediaType === "application/json") {
      try {
        docs.push({
          kind: "custom",
          type: "json",
          data: JSON.parse(ds.content),
          phase,
        });
      } catch {
        docs.push({
          kind: "code",
          label: "",
          content: ds.content,
          lang: "json",
          phase,
        });
      }
    } else {
      // Default: treat as code block with mediaType as lang
      docs.push({
        kind: "code",
        label: "",
        content: ds.content,
        lang: mediaType,
        phase,
      });
    }
  }

  return docs;
}
