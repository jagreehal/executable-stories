/**
 * Step markers for e2e tests.
 *
 * A marker records where and when the test called it. The reporter groups
 * the e2e steps that ran after a marker under the marker's text:
 *
 * ```ts
 * test('incrementing shows the new count', async ({ app, screen }) => {
 *   story.given('the counter page is open');
 *   await app.open('/');
 *   story.when('the user presses Increment twice');
 *   await screen.getByRole('button', { name: 'Increment' }).click();
 *   await screen.getByRole('button', { name: 'Increment' }).click();
 *   story.then('the count reads 2');
 *   await expect(screen.getByRole('status')).toHaveText('2');
 * });
 * ```
 */

import { appendFileSync, mkdirSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

export type MarkerKeyword = 'Given' | 'When' | 'Then' | 'And' | 'But';

/** One line of a markers file. */
export interface Marker {
  keyword: MarkerKeyword;
  text: string;
  /** Absolute path of the test file that called the marker. */
  file: string;
  line: number;
  /** Orders a marker before a step on its own line; absent reads as the line's start. */
  column?: number;
  /** Epoch milliseconds. */
  at: number;
}

/** Workers and the reporter both resolve this against the project root e2e runs from. */
export const MARKERS_DIR = '.executable-stories/e2e-markers';

const FRAME = /\(?((?:file:\/\/)?[^\s()]+?):(\d+):(\d+)\)?$/;

/** The first stack frame outside this module: the test line that called the marker. */
function callSite():
  { file: string; line: number; column: number } | undefined {
  const frames = (new Error().stack ?? '').split('\n').slice(1);
  let own: string | undefined;
  for (const frame of frames) {
    const match = FRAME.exec(frame.trim());
    if (!match) continue;
    const file = match[1]!.startsWith('file://')
      ? fileURLToPath(match[1]!)
      : match[1]!;
    own ??= file;
    if (file !== own)
      return { file, line: Number(match[2]), column: Number(match[3]) };
  }
  return undefined;
}

function mark(keyword: MarkerKeyword, text: string): void {
  const site = callSite();
  if (site === undefined) return;
  const marker: Marker = { keyword, text, ...site, at: Date.now() };
  const dir = path.resolve(MARKERS_DIR);
  mkdirSync(dir, { recursive: true });
  // One file per worker process; appends from one process stay in order.
  appendFileSync(
    path.join(dir, `${process.pid}.jsonl`),
    `${JSON.stringify(marker)}\n`,
  );
}

/** Step markers. Call before the e2e steps the marker describes; they render under its text. */
export const story = {
  given: (text: string): void => mark('Given', text),
  when: (text: string): void => mark('When', text),
  then: (text: string): void => mark('Then', text),
  and: (text: string): void => mark('And', text),
  but: (text: string): void => mark('But', text),
};
