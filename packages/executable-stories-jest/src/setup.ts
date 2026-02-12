/**
 * Jest setup file for executable-stories.
 *
 * Add this to your Jest config's setupFilesAfterEnv:
 *
 * @example
 * ```js
 * // jest.config.js
 * export default {
 *   setupFilesAfterEnv: ['jest-executable-stories/setup'],
 *   reporters: [
 *     'default',
 *     ['jest-executable-stories/reporter', { outputFile: 'docs/user-stories.md' }]
 *   ],
 * };
 * ```
 */

import { afterAll } from "@jest/globals";
import { _internal } from "./story-api";

// Register afterAll hook to flush stories at the file level
afterAll(() => {
  _internal.flushStories();
});
