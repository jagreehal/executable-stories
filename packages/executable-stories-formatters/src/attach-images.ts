/**
 * The gh command that puts a run's evidence in a pull request.
 *
 * GitHub CLI 2.99 added `--attach`: it uploads a local image or video, and
 * rewrites the markdown reference to that file in the body it posts. That is
 * the whole mechanism, so the report needs no asset host, no orphan branch and
 * no `contents: write` token to show a reviewer what the run saw.
 *
 * The paths come from `collectReportAssets`, which is the same list the report
 * uploader keys on, so a file cannot be attached under one name and referenced
 * under another.
 */
import { collectReportAssets } from "executable-stories-core/report-assets";
import { toStoryReport } from "executable-stories-core/converters/story-report";
import type { TestRunResult } from "executable-stories-core/types/test-result";

export interface GhAttachCommandArgs {
  run: TestRunResult;
  /** Path to the markdown body gh will post. */
  bodyFile: string;
  /** Pull request number, when the caller knows it. */
  pr?: number;
}

/**
 * The command, or undefined when the run points at no local file: a body with
 * nothing to attach is posted with plain `gh pr comment`, and printing a hint
 * that attaches nothing would be noise.
 */
export function buildGhAttachCommand(args: GhAttachCommandArgs): string | undefined {
  const assets = collectReportAssets(toStoryReport(args.run));
  if (assets.length === 0) return undefined;

  // gh rejects the same file twice, and collectReportAssets already
  // de-duplicates, so the list maps one-to-one onto the flags.
  const attachments = assets.map((path) => `--attach '${path}'`).join(" \\\n  ");
  return `gh pr comment ${args.pr ?? "<number>"} --body-file ${args.bodyFile} \\\n  ${attachments}`;
}
