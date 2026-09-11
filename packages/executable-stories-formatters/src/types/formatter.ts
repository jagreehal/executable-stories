import type { TestRunResult } from "executable-stories-core/types/test-result";
import type { SyncTargets } from "../sync/adapters/registry";

export interface Formatter {
  name: string;
  fileExtension?: string;
  format(run: TestRunResult): string;
}

export interface ExecutableStoriesConfig {
  formatters?: Record<string, Formatter>;
  /**
   * Default values for CLI flags, keyed by flag name without the dashes
   * (`"html-title": "Checkout"`, `"html-architecture": true`). Anything typed
   * on the command line wins. Plain data, so a `.json` config carries it too —
   * which is the only way the non-JS adapters' users can set these at all.
   */
  defaults?: Record<string, string | number | boolean | (string | number)[]>;
  /**
   * Test-management targets for `coverage` and `sync`. Shape only — credentials
   * are read from the environment so this file stays committable.
   */
  sync?: SyncTargets;
}
