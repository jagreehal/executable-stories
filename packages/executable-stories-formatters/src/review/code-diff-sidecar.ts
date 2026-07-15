/**
 * Code Diff sidecar assembly — the authoring seam for Code Diff evidence.
 *
 * Authors (normally the `explain-change` skill) never hand-write content
 * anchors. The sidecar names a file and a unique substring of one changed
 * line; assembly locates that line in the `git diff --histogram` patch and
 * builds the real content anchor from it. A match that fails to locate still
 * produces an annotation, explicitly marked `unresolved` (orphaned or
 * ambiguous), so authoring mistakes surface visibly instead of disappearing.
 */

import type { CodeDiffAnnotationInput, CodeDiffInput } from "../types/review";
import type { FileDiff } from "../types/diff";
import { createAnchor, parseUnifiedDiff } from "./diff-anchor";

/** Hand-authored (or agent-authored) annotation entry in the sidecar file. */
export interface CodeDiffSidecarAnnotation {
  /** Repo-relative path of the changed file. */
  file: string;
  /** Substring of exactly one changed line in the patch. */
  match: string;
  /** Explanatory prose (plain text — rendered verbatim). */
  text: string;
  label?: string;
  scenarioIds?: string[];
}

/** The sidecar document (JSON). The patch itself is supplied separately. */
export interface CodeDiffSidecar {
  title: string;
  /** Canonical HTTPS patch URL — audit provenance only. */
  patchUrl?: string;
  baseLabel?: string;
  headLabel?: string;
  /** Ordered by concept, not Git file order. */
  annotations: CodeDiffSidecarAnnotation[];
}

/** Locate the changed lines containing `match` in the file's hunks. */
function locateMatches(
  file: FileDiff,
  match: string
): Array<{ hunkIndex: number; lineIndex: number }> {
  const out: Array<{ hunkIndex: number; lineIndex: number }> = [];
  file.hunks.forEach((hunk, hunkIndex) => {
    hunk.lines.forEach((line, lineIndex) => {
      if (line.kind !== "context" && line.text.includes(match)) {
        out.push({ hunkIndex, lineIndex });
      }
    });
  });
  return out;
}

/** Walk back to the start of the contiguous changed run containing `lineIndex`. */
function runStart(file: FileDiff, hunkIndex: number, lineIndex: number): number {
  const lines = file.hunks[hunkIndex].lines;
  let start = lineIndex;
  while (start > 0 && lines[start - 1].kind !== "context") start--;
  return start;
}

/**
 * Assemble a {@link CodeDiffInput} from a sidecar and a unified patch.
 * Returns authoring warnings alongside — a located match gets a real content
 * anchor; a missed or non-unique match gets a bare anchor that resolves
 * orphaned, plus a warning saying why.
 */
export function assembleCodeDiff(args: {
  sidecar: CodeDiffSidecar;
  patch: string;
}): { input: CodeDiffInput; warnings: string[] } {
  const { sidecar, patch } = args;
  const files = parseUnifiedDiff(patch);
  const warnings: string[] = [];

  if (sidecar.patchUrl !== undefined && !sidecar.patchUrl.startsWith("https://")) {
    warnings.push(
      `patchUrl "${sidecar.patchUrl}" is not https: — it will render as inert text, not a link`
    );
  }

  const annotations: CodeDiffAnnotationInput[] = sidecar.annotations.map(
    (entry) => {
      const base = {
        text: entry.text,
        label: entry.label,
        scenarioIds: entry.scenarioIds,
      };
      const file = files.find(
        (f) => f.newPath === entry.file || f.oldPath === entry.file
      );
      const matches = file ? locateMatches(file, entry.match) : [];

      if (file && matches.length === 1) {
        const { hunkIndex, lineIndex } = matches[0];
        const anchor = createAnchor({
          file,
          hunkIndex,
          lineIndex: runStart(file, hunkIndex, lineIndex),
        });
        return { ...base, anchor };
      }

      warnings.push(
        !file
          ? `annotation "${entry.label ?? entry.match}": file "${entry.file}" is not in the patch`
          : matches.length === 0
            ? `annotation "${entry.label ?? entry.match}": no changed line in "${entry.file}" contains "${entry.match}"`
            : `annotation "${entry.label ?? entry.match}": "${entry.match}" matches ${matches.length} changed lines in "${entry.file}" — make it unique`
      );
      return {
        ...base,
        unresolved: (file && matches.length > 1 ? "ambiguous" : "orphaned") as
          | "ambiguous"
          | "orphaned",
      };
    }
  );

  return {
    input: {
      title: sidecar.title,
      patch,
      patchUrl: sidecar.patchUrl,
      baseLabel: sidecar.baseLabel,
      headLabel: sidecar.headLabel,
      annotations,
    },
    warnings,
  };
}
