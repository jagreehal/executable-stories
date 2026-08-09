import type { TestRunResult } from "executable-stories-core/types/test-result";
import type { SyncTargets } from "../sync/adapters/index";

export interface Formatter {
  name: string;
  fileExtension?: string;
  format(run: TestRunResult): string;
}

export interface ExecutableStoriesConfig {
  formatters?: Record<string, Formatter>;
  /**
   * Test-management targets for `coverage` and `sync`. Shape only — credentials
   * are read from the environment so this file stays committable.
   */
  sync?: SyncTargets;
}
