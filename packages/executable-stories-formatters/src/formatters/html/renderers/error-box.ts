/**
 * Render error box (fn(args, deps)).
 */

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
  const body =
    args.stack != null
      ? `${deps.escapeHtml(args.message)}\n\n${deps.escapeHtml(args.stack)}`
      : deps.escapeHtml(args.message);
  return `<div class="error-box">${body}</div>`;
}
