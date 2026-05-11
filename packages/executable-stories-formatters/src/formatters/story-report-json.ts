/**
 * StoryReportJsonFormatter — emit the public StoryReport contract as JSON.
 *
 * Wraps toStoryReport with a Formatter-compatible class interface and a
 * pretty-print option.
 */

import { toStoryReport } from "../converters/story-report";
import type { StoryReport } from "../types/story-report";
import type { TestRunResult } from "../types/test-result";

export interface StoryReportJsonOptions {
  /** Pretty-print JSON output with 2-space indent. Default: true. */
  pretty?: boolean;
}

export class StoryReportJsonFormatter {
  private options: Required<StoryReportJsonOptions>;

  constructor(options: StoryReportJsonOptions = {}) {
    this.options = {
      pretty: options.pretty ?? true,
    };
  }

  toReport(run: TestRunResult): StoryReport {
    return toStoryReport(run);
  }

  format(run: TestRunResult): string {
    const report = toStoryReport(run);
    return this.options.pretty ? JSON.stringify(report, null, 2) : JSON.stringify(report);
  }
}
