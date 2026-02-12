/**
 * Cypress Node plugin: registers the task that receives story meta from the browser.
 * Use in cypress.config.ts (or plugins file) so the reporter can merge meta with run results.
 *
 * @example
 * // cypress.config.ts
 * import { defineConfig } from 'cypress';
 * import { registerExecutableStoriesPlugin } from 'executable-stories-cypress/plugin';
 *
 * export default defineConfig({
 *   e2e: {
 *     setupNodeEvents(on) {
 *       registerExecutableStoriesPlugin(on);
 *     },
 *   },
 * });
 */

import { recordMeta, getMeta } from "./store";

const TASK_NAME = "executableStories:recordMeta";
const GET_STORED_META_TASK = "executableStories:getStoredMeta";

/** Minimal type for Cypress plugin `on` (task registration) */
export interface PluginEvents {
  (event: "task", tasks: Record<string, (arg: unknown) => unknown>): void;
}

/**
 * Register the executable-stories task on the Cypress `on` handler.
 * Call this from setupNodeEvents in your Cypress config.
 */
/** Argument for getStoredMeta task (used by tests to assert on recorded meta). */
export interface GetStoredMetaArg {
  specRelative: string;
  titlePath: string[];
}

export function registerExecutableStoriesPlugin(on: PluginEvents): void {
  on("task", {
    [TASK_NAME]: (payload: unknown) => recordMeta(payload as import("./types").RecordMetaPayload),
    [GET_STORED_META_TASK]: (arg: unknown) => {
      const { specRelative, titlePath } = arg as GetStoredMetaArg;
      return getMeta(specRelative, titlePath) ?? null;
    },
  });
}
