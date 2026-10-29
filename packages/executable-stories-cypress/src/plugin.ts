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
 *     setupNodeEvents(on, config) {
 *       return registerExecutableStoriesPlugin(on, config);
 *     },
 *   },
 * });
 */

import { recordMeta, getMeta, clearStore, storeDir, RUN_ENV } from "./store";

const TASK_NAME = "executableStories:recordMeta";
const GET_STORED_META_TASK = "executableStories:getStoredMeta";

/** Minimal type for Cypress plugin `on` (task registration) */
export interface PluginEvents {
  (event: "task", tasks: Record<string, (arg: unknown) => unknown>): void;
}

/** Argument for getStoredMeta task (used by tests to assert on recorded meta). */
export interface GetStoredMetaArg {
  specRelative: string;
  titlePath: string[];
}

/**
 * Register the executable-stories task on the Cypress `on` handler. Call this
 * from setupNodeEvents and return what it returns: given `config`, it adds this
 * run's id to `config.env`, which `cypress.run()` reports back, so
 * `buildRawRunFromCypressResult` reads exactly this run's stories.
 */
export function registerExecutableStoriesPlugin<C extends { env?: Record<string, unknown> }>(
  on: PluginEvents,
  config?: C,
): C | undefined {
  // setupNodeEvents runs as a run starts: begin with an empty store for this run.
  clearStore(process.ppid);
  on("task", {
    [TASK_NAME]: (payload: unknown) => recordMeta(payload as import("./types").RecordMetaPayload),
    [GET_STORED_META_TASK]: (arg: unknown) => {
      const { specRelative, titlePath } = arg as GetStoredMetaArg;
      return getMeta(specRelative, titlePath) ?? null;
    },
  });
  return config && { ...config, env: { ...config.env, [RUN_ENV]: storeDir(process.ppid) } };
}
