/**
 * CucumberMessagesFormatter — produces NDJSON compatible with @cucumber/html-formatter.
 *
 * Message stream order:
 * Meta → Source* → GherkinDocument* → Pickle* → TestRunStarted →
 * [TestCase, TestCaseStarted, TestStep*, TestCaseFinished]* → TestRunFinished
 */

import type { TestRunResult, TestCaseResult } from "../../types/test-result";
import type { Envelope, Meta } from "../../types/cucumber-messages";
import { synthesizeFeature } from "./synthesize-feature";
import { buildGherkinDocumentEnvelopes } from "./build-gherkin-document";
import { buildPickleEnvelopes } from "./build-pickles";
import {
  buildTestRunStarted,
  buildTestRunFinished,
  buildTestCaseExecutionEnvelopes,
} from "./build-execution";

export interface CucumberMessagesOptions {
  /** Strategy for deriving Source.uri. Default: "sourceFile" */
  uriStrategy?: "sourceFile" | "virtual";
  /** Whether to emit Source/GherkinDocument for synthesized features. Default: true */
  includeSynthetics?: boolean;
  /** Salt for deterministic IDs. Default: "" */
  idSalt?: string;
  /** Tool metadata for Meta envelope */
  meta?: { toolName?: string; toolVersion?: string };
}

export class CucumberMessagesFormatter {
  private options: Required<
    Pick<CucumberMessagesOptions, "uriStrategy" | "includeSynthetics" | "idSalt">
  > & { meta?: CucumberMessagesOptions["meta"] };

  constructor(options: CucumberMessagesOptions = {}) {
    this.options = {
      uriStrategy: options.uriStrategy ?? "sourceFile",
      includeSynthetics: options.includeSynthetics ?? true,
      idSalt: options.idSalt ?? "",
      meta: options.meta,
    };
  }

  /**
   * Format a TestRunResult into an array of Envelope objects.
   */
  format(run: TestRunResult): Envelope[] {
    const envelopes: Envelope[] = [];
    const salt = this.options.idSalt;

    // 1. Meta envelope
    envelopes.push(this.buildMetaEnvelope(run));

    // Group test cases by source file
    const grouped = this.groupBySourceFile(run.testCases);

    // 2. Source + GherkinDocument + Pickle envelopes (definition phase)
    const allPickleEnvelopes: Envelope[] = [];

    for (const [uri, testCases] of grouped) {
      const synthesized = synthesizeFeature(uri, testCases);

      if (this.options.includeSynthetics) {
        const { sourceEnvelope, gherkinDocumentEnvelope } =
          buildGherkinDocumentEnvelopes(uri, testCases, synthesized, salt);
        envelopes.push(sourceEnvelope);
        envelopes.push(gherkinDocumentEnvelope);
      }

      const pickles = buildPickleEnvelopes(uri, testCases, salt);
      allPickleEnvelopes.push(...pickles);
    }

    // All pickles after all source/gherkin documents
    envelopes.push(...allPickleEnvelopes);

    // 3. TestRunStarted
    envelopes.push(buildTestRunStarted(run));

    // 4. Execution envelopes per test case
    for (const [uri, testCases] of grouped) {
      for (const tc of testCases) {
        const executionEnvelopes = buildTestCaseExecutionEnvelopes(
          uri,
          tc,
          salt
        );
        envelopes.push(...executionEnvelopes);
      }
    }

    // 5. TestRunFinished (always last)
    envelopes.push(buildTestRunFinished(run));

    return envelopes;
  }

  /**
   * Format as NDJSON string (one JSON line per envelope).
   */
  formatToString(run: TestRunResult): string {
    const envelopes = this.format(run);
    return envelopes.map((e) => JSON.stringify(e)).join("\n") + "\n";
  }

  /**
   * Build the Meta envelope.
   */
  private buildMetaEnvelope(run: TestRunResult): Envelope {
    const meta: Meta = {
      protocolVersion: "25.0.1",
      implementation: {
        name: this.options.meta?.toolName ?? "executable-stories",
        version:
          this.options.meta?.toolVersion ?? run.packageVersion ?? "0.0.0",
      },
      runtime: {
        name: "node.js",
        version: process.version,
      },
      os: {
        name: process.platform,
      },
      cpu: {
        name: process.arch,
      },
    };

    return { meta };
  }

  /**
   * Group test cases by source file, preserving order.
   */
  private groupBySourceFile(
    testCases: TestCaseResult[]
  ): Map<string, TestCaseResult[]> {
    const grouped = new Map<string, TestCaseResult[]>();
    for (const tc of testCases) {
      const uri = tc.sourceFile;
      const existing = grouped.get(uri);
      if (existing) {
        existing.push(tc);
      } else {
        grouped.set(uri, [tc]);
      }
    }
    return grouped;
  }
}
