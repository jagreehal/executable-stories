import type { TestRunResult } from "./test-result.js";

export interface Formatter {
  name: string;
  fileExtension?: string;
  format(run: TestRunResult): string;
}

export interface ExecutableStoriesConfig {
  formatters?: Record<string, Formatter>;
}
