/**
 * Cypress support file for executable-stories.
 * Register this in cypress/support/e2e.ts (or support file) so story meta
 * is sent to Node after each test for the reporter to consume.
 *
 * @example
 * In cypress/support/e2e.ts:
 * import 'executable-stories-cypress/support';
 */

import { getAndClearMeta, stepTrail } from "./story-api";

const TASK_NAME = "executableStories:recordMeta";

afterEach(function () {
  // Read while the story is still active: the queue stopped where the test failed.
  const failureTrail = this.currentTest?.state === "failed" ? stepTrail() : "";
  const payload = getAndClearMeta();
  if (payload) {
    const projectRoot = Cypress.config("projectRoot");
    cy.task(TASK_NAME, { ...payload, projectRoot, ...(failureTrail ? { failureTrail } : {}) });
  }
});
