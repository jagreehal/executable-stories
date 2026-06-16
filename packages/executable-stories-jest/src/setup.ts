/**
 * Jest setup file for executable-stories.
 *
 * Add this to your Jest config's setupFilesAfterEnv:
 *
 * @example
 * ```js
 * // jest.config.js
 * export default {
 *   setupFilesAfterEnv: ['executable-stories-jest/setup'],
 *   reporters: [
 *     'default',
 *     ['executable-stories-jest/reporter', {
 *       formats: ['markdown', 'html'],
 *       outputDir: 'docs',
 *       outputName: 'user-stories',
 *     }],
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
