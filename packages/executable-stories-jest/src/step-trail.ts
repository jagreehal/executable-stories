/** Starts the story's step checklist in a failure message. */
export const STEP_TRAIL_MARKER = '\n\nStory steps:\n';

/**
 * Remove the step checklist from a failure message or stack. Jest's failure
 * messages are whole stacks, so the frames after the checklist stay.
 */
export function stripStepTrail(text: string): string {
  // A timeout's message is a quoted string, so keep its closing quote.
  return text.replace(/\n\nStory steps:(?:\n {2}[✓✗] [^\n]*?)+("?)(?=\n|$)/, '$1');
}
