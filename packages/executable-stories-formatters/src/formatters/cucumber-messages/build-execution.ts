/**
 * Build execution envelopes: TestCase, TestCaseStarted/Finished,
 * TestStepStarted/Finished, and Attachment messages.
 *
 * Attachment placement:
 * - Step-level doc screenshots → Attachment tied to that specific step
 * - Test-case level attachments → Attachment tied to failed step or last step
 * - All Attachment envelopes appear after the relevant TestStepFinished
 */

import type { TestCaseResult, TestRunResult } from "../../types/test-result";
import type { StoryStep } from "../../types/story";
import type {
  Envelope,
  TestCase,
  TestStep,
  TestCaseStarted,
  TestStepStarted,
  TestStepFinished,
  TestCaseFinished,
  TestRunStarted,
  TestRunFinished,
  CucumberAttachment,
  AttachmentContentEncoding,
} from "../../types/cucumber-messages";
import {
  deterministicId,
  msToTimestamp,
  msToDuration,
  statusToCucumberStatus,
} from "../../utils/cucumber-messages";

/**
 * Build TestRunStarted envelope.
 */
export function buildTestRunStarted(run: TestRunResult): Envelope {
  return {
    testRunStarted: {
      timestamp: msToTimestamp(run.startedAtMs),
    },
  };
}

/**
 * Build TestRunFinished envelope.
 */
export function buildTestRunFinished(run: TestRunResult): Envelope {
  const allPassed = run.testCases.every((tc) => tc.status === "passed");
  return {
    testRunFinished: {
      timestamp: msToTimestamp(run.finishedAtMs),
      success: allPassed,
    },
  };
}

/**
 * Build all execution envelopes for a single test case:
 * TestCase, then for each attempt:
 *   TestCaseStarted, [TestStepStarted + TestStepFinished + Attachment*]*, TestCaseFinished
 *
 * When tc.attempts exists with multiple entries, prior attempts are emitted
 * with willBeRetried=true, and the final attempt with willBeRetried=false.
 */
export function buildTestCaseExecutionEnvelopes(
  uri: string,
  tc: TestCaseResult,
  salt: string
): Envelope[] {
  const envelopes: Envelope[] = [];
  const scenarioName = tc.story.scenario;

  const pickleId = deterministicId("pickle", salt, uri, scenarioName);
  const testCaseId = deterministicId("testCase", salt, uri, scenarioName);

  // Build test steps (shared across all attempts — the TestCase is the same)
  const testSteps: TestStep[] = tc.story.steps.map((_step, i) => ({
    id: deterministicId("testStep", salt, uri, scenarioName, String(i)),
    pickleStepId: deterministicId(
      "pickleStep",
      salt,
      uri,
      scenarioName,
      String(i)
    ),
    stepDefinitionIds: [],
  }));

  // TestCase envelope (emitted once, before all attempts)
  const testCase: TestCase = {
    id: testCaseId,
    pickleId,
    testSteps,
  };
  envelopes.push({ testCase });

  // If there are explicit attempts, emit each one
  if (tc.attempts && tc.attempts.length > 1) {
    for (let a = 0; a < tc.attempts.length; a++) {
      const attempt = tc.attempts[a];
      const isLastAttempt = a === tc.attempts.length - 1;

      const attemptEnvelopes = buildAttemptEnvelopes({
        testCaseId,
        testSteps,
        tc,
        uri,
        scenarioName,
        salt,
        attemptNumber: attempt.attempt,
        attemptStatus: attempt.status,
        attemptDurationMs: attempt.durationMs,
        attemptErrorMessage: attempt.errorMessage,
        willBeRetried: !isLastAttempt,
        // Only emit attachments and doc screenshots on the final attempt
        emitAttachments: isLastAttempt,
      });
      envelopes.push(...attemptEnvelopes);
    }
  } else {
    // Single attempt (normal case)
    const attemptEnvelopes = buildAttemptEnvelopes({
      testCaseId,
      testSteps,
      tc,
      uri,
      scenarioName,
      salt,
      attemptNumber: tc.retry,
      attemptStatus: undefined, // Use tc.stepResults
      attemptDurationMs: undefined,
      attemptErrorMessage: undefined,
      willBeRetried: false,
      emitAttachments: true,
    });
    envelopes.push(...attemptEnvelopes);
  }

  return envelopes;
}

interface AttemptParams {
  testCaseId: string;
  testSteps: TestStep[];
  tc: TestCaseResult;
  uri: string;
  scenarioName: string;
  salt: string;
  attemptNumber: number;
  attemptStatus: import("../../types/test-result.js").TestStatus | undefined;
  attemptDurationMs: number | undefined;
  attemptErrorMessage: string | undefined;
  willBeRetried: boolean;
  emitAttachments: boolean;
}

/**
 * Build envelopes for a single attempt:
 * TestCaseStarted, [TestStepStarted, TestStepFinished, Attachment*]*, TestCaseFinished
 */
function buildAttemptEnvelopes(params: AttemptParams): Envelope[] {
  const {
    testCaseId, testSteps, tc, uri, scenarioName, salt,
    attemptNumber, attemptStatus, attemptDurationMs, attemptErrorMessage,
    willBeRetried, emitAttachments,
  } = params;

  const envelopes: Envelope[] = [];
  const testCaseStartedId = deterministicId(
    "testCaseStarted",
    salt,
    uri,
    scenarioName,
    String(attemptNumber)
  );

  // TestCaseStarted
  envelopes.push({
    testCaseStarted: {
      id: testCaseStartedId,
      testCaseId,
      timestamp: msToTimestamp(0),
      attempt: attemptNumber,
    },
  });

  // Determine which step receives test-case-level attachments
  const tcAttachmentStepIndex = emitAttachments
    ? findTestCaseAttachmentStepIndex(tc)
    : -1;

  // Step execution envelopes
  let cumulativeMs = 0;

  for (let i = 0; i < testSteps.length; i++) {
    const testStep = testSteps[i];
    const storyStep = tc.story.steps[i];

    // Determine step status for this attempt
    let stepStatus: import("../../types/test-result.js").TestStatus;
    let stepDurationMs: number;
    let stepErrorMessage: string | undefined;

    if (attemptStatus !== undefined) {
      // For prior attempts, derive step statuses from attempt-level status
      // (we don't have per-step data for prior attempts)
      stepStatus = attemptStatus === "failed" && i === tc.story.steps.length - 1
        ? "failed"
        : attemptStatus === "failed" && i < tc.story.steps.length - 1
          ? "passed"
          : attemptStatus;
      stepDurationMs = attemptDurationMs !== undefined
        ? attemptDurationMs / tc.story.steps.length
        : 0;
      stepErrorMessage = stepStatus === "failed" ? attemptErrorMessage : undefined;
    } else {
      // Final/only attempt: use actual step results
      const stepResult = tc.stepResults[i];
      stepStatus = stepResult?.status ?? "passed";
      stepDurationMs = stepResult?.durationMs ?? 0;
      // Include stack trace from test case if this is the failed step
      stepErrorMessage = stepResult?.errorMessage;
      if (stepStatus === "failed" && tc.errorStack && stepErrorMessage) {
        stepErrorMessage = stepErrorMessage + "\n" + tc.errorStack;
      } else if (stepStatus === "failed" && tc.errorStack && !stepErrorMessage) {
        stepErrorMessage = tc.errorStack;
      }
    }

    // TestStepStarted
    envelopes.push({
      testStepStarted: {
        testCaseStartedId,
        testStepId: testStep.id,
        timestamp: msToTimestamp(cumulativeMs),
      },
    });

    // TestStepFinished
    cumulativeMs += stepDurationMs;
    envelopes.push({
      testStepFinished: {
        testCaseStartedId,
        testStepId: testStep.id,
        testStepResult: {
          duration: msToDuration(stepDurationMs),
          status: statusToCucumberStatus(stepStatus),
          message: stepErrorMessage,
        },
        timestamp: msToTimestamp(cumulativeMs),
      },
    });

    // Per-step doc screenshots (only on final attempt)
    if (emitAttachments) {
      const docAttachments = extractDocAttachments(storyStep);
      for (const att of docAttachments) {
        envelopes.push({
          attachment: {
            testCaseStartedId,
            testStepId: testStep.id,
            body: att.body,
            mediaType: att.mediaType,
            contentEncoding: att.contentEncoding,
          },
        });
      }
    }

    // Test-case level attachments (only on final attempt, on failed/last step)
    if (i === tcAttachmentStepIndex) {
      for (const att of tc.attachments) {
        envelopes.push({
          attachment: {
            testCaseStartedId,
            testStepId: testStep.id,
            body: att.body,
            mediaType: att.mediaType,
            contentEncoding: att.contentEncoding,
          },
        });
      }
    }
  }

  // TestCaseFinished
  envelopes.push({
    testCaseFinished: {
      testCaseStartedId,
      timestamp: msToTimestamp(cumulativeMs),
      willBeRetried,
    },
  });

  return envelopes;
}

/**
 * Extract attachments from a step's doc entries.
 *
 * Handles:
 * - screenshot docs with data: URIs → BASE64 attachment
 * - screenshot docs with other paths → IDENTITY attachment
 */
function extractDocAttachments(
  step: StoryStep
): Array<{ body: string; mediaType: string; contentEncoding: AttachmentContentEncoding }> {
  if (!step.docs) return [];

  const attachments: Array<{
    body: string;
    mediaType: string;
    contentEncoding: AttachmentContentEncoding;
  }> = [];

  for (const doc of step.docs) {
    if (doc.kind !== "screenshot") continue;

    // Parse data URI: data:image/png;base64,ABC123...
    const match = doc.path.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      attachments.push({
        body: match[2],
        mediaType: match[1],
        contentEncoding: "BASE64",
      });
    } else {
      // Non-data-URI screenshot (file path or URL) → IDENTITY
      attachments.push({
        body: doc.path,
        mediaType: guessMediaType(doc.path),
        contentEncoding: "IDENTITY",
      });
    }
  }

  return attachments;
}

/**
 * Guess media type from a file path or URL.
 */
function guessMediaType(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  return "image/png"; // Default assumption for screenshots
}

/**
 * Determine which step index should receive test-case-level attachments.
 * Attach to the failed step if one exists, otherwise the last step.
 * Returns -1 if there are no attachments.
 */
function findTestCaseAttachmentStepIndex(tc: TestCaseResult): number {
  if (tc.attachments.length === 0) return -1;

  const failedIndex = tc.stepResults.findIndex((sr) => sr.status === "failed");
  if (failedIndex >= 0) return failedIndex;

  return tc.stepResults.length - 1;
}
