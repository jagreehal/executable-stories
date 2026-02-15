/**
 * Render meta info section (fn(args, deps)).
 */

export interface RenderMetaInfoArgs {
  startedAtMs: number;
  durationMs: number;
  packageVersion?: string;
  gitSha?: string;
  ciName?: string;
  ciBranch?: string;
  ciUrl?: string;
  ciCommitSha?: string;
  ciBuildNumber?: string;
}

export interface RenderMetaInfoDeps {
  escapeHtml: (str: string) => string;
}

export function renderMetaInfo(
  args: RenderMetaInfoArgs,
  deps: RenderMetaInfoDeps,
): string {
  const items: string[] = [];

  const startDate = new Date(args.startedAtMs);
  items.push(`<dt>Started:</dt><dd>${startDate.toISOString()}</dd>`);

  const duration = (args.durationMs / 1000).toFixed(2);
  items.push(`<dt>Duration:</dt><dd>${duration}s</dd>`);

  if (args.packageVersion) {
    items.push(`<dt>Version:</dt><dd>${deps.escapeHtml(args.packageVersion)}</dd>`);
  }

  if (args.gitSha) {
    const shortSha =
      args.gitSha.length > 7 ? args.gitSha.slice(0, 7) : args.gitSha;
    items.push(`<dt>Git:</dt><dd>${deps.escapeHtml(shortSha)}</dd>`);
  }

  if (args.ciName) {
    // When URL and build number are present, render build number as a link
    if (args.ciUrl && args.ciBuildNumber) {
      items.push(
        `<dt>CI:</dt><dd>${deps.escapeHtml(args.ciName)} <a href="${deps.escapeHtml(args.ciUrl)}">#${deps.escapeHtml(args.ciBuildNumber)}</a></dd>`,
      );
    } else {
      items.push(`<dt>CI:</dt><dd>${deps.escapeHtml(args.ciName)}</dd>`);
    }
  }

  if (args.ciBranch) {
    items.push(`<dt>Branch:</dt><dd>${deps.escapeHtml(args.ciBranch)}</dd>`);
  }

  if (args.ciCommitSha) {
    const shortSha =
      args.ciCommitSha.length > 7
        ? args.ciCommitSha.slice(0, 7)
        : args.ciCommitSha;
    items.push(
      `<dt>Commit:</dt><dd title="${deps.escapeHtml(args.ciCommitSha)}">${deps.escapeHtml(shortSha)}</dd>`,
    );
  }

  return `<dl class="meta-info">${items.join("")}</dl>`;
}
