/**
 * Cypress support file for executable-stories.
 * Register this in cypress/support/e2e.ts (or support file) so story meta
 * is sent to Node after each test for the reporter to consume.
 *
 * @example
 * In cypress/support/e2e.ts:
 * import 'executable-stories-cypress/support';
 */

import { getAndClearMeta } from "./story-api";

const TASK_NAME = "executableStories:recordMeta";

afterEach(function () {
  const payload = getAndClearMeta();
  if (payload) {
    cy.task(TASK_NAME, payload);
  }
});
