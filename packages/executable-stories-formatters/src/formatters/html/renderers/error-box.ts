/**
 * Render error box (fn(args, deps)).
 */

import { stripAnsi } from "../../../notifiers/ansi-strip";

export interface RenderErrorBoxArgs {
  message: string;
  stack?: string;
}

export interface RenderErrorBoxDeps {
  escapeHtml: (str: string) => string;
}

export function renderErrorBox(
  args: RenderErrorBoxArgs,
  deps: RenderErrorBoxDeps,
): string {
  const message = stripAnsi(args.message);
  const stack = args.stack != null ? stripAnsi(args.stack) : undefined;
  const body =
    stack != null
      ? `${deps.escapeHtml(message)}\n\n${deps.escapeHtml(stack)}`
      : deps.escapeHtml(message);
  return `<div class="error-box">${body}</div>`;
}
