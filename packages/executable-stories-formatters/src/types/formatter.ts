import type { TestRunResult } from "executable-stories-core/types/test-result";

export interface Formatter {
  name: string;
  fileExtension?: string;
  format(run: TestRunResult): string;
}

export interface ExecutableStoriesConfig {
  formatters?: Record<string, Formatter>;
}
