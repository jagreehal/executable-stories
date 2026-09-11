/**
 * StoryReportJsonFormatter — emit the public StoryReport contract as JSON.
 *
 * Wraps toStoryReport with a Formatter-compatible class interface and a
 * pretty-print option.
 */

import { toStoryReport } from "executable-stories-core/converters/story-report";
import type { StoryReport } from "executable-stories-core/types/story-report";
import type { TestRunResult } from "executable-stories-core/types/test-result";

export interface StoryReportJsonOptions {
  /** Pretty-print JSON output with 2-space indent. Default: true. */
  pretty?: boolean;
  /**
   * URL template for tickets that carry no URL of their own (`{ticket}` is the
   * id). The same template the HTML report resolves with, so the contract an
   * agent reads and the page a person opens link a ticket to the same place.
   */
  ticketUrlTemplate?: string;
}

export class StoryReportJsonFormatter {
  private options: StoryReportJsonOptions & { pretty: boolean };

  constructor(options: StoryReportJsonOptions = {}) {
    this.options = {
      ...options,
      pretty: options.pretty ?? true,
    };
  }

  toReport(run: TestRunResult): StoryReport {
    return toStoryReport(run, { ticketUrlTemplate: this.options.ticketUrlTemplate });
  }

  format(run: TestRunResult): string {
    const report = this.toReport(run);
    return this.options.pretty ? JSON.stringify(report, null, 2) : JSON.stringify(report);
  }
}
