/**
 * Diff anchoring — content-anchored annotation targets for Code Diff evidence.
 *
 * An annotation must stay attached to the right hunk after the patch is
 * regenerated (which, for AI-authored changes, happens constantly). Line
 * numbers are the wrong key: they detach on rebase/force-push. This module
 * anchors by content instead, the way `patch(1)` does — the anchor is the
 * changed lines plus a bounded window of surrounding context, and relocation
 * matches that content in the new patch with progressive fuzz (outermost
 * context lines are dropped first; the changed lines are never dropped).
 *
 * Resolution states:
 * - `anchored`  — exactly one match above the fuzz threshold.
 * - `ambiguous` — multiple matches (e.g. duplicate identical lines); the
 *                 annotation must render visibly un-located, never guessed.
 * - `orphaned`  — no match; the annotation renders with a "could not locate
 *                 in current patch" notice, never silently reattached.
 *
 * Pure functions, no I/O — patches are generated at the CLI/Action layer
 * (with `git diff --histogram` for hunk stability), never by adapters.
 */

import { createHash } from "node:crypto";

import type {
  AnchorResolution,
  DiffAnchor,
  DiffHunk,
  DiffLine,
  FileDiff,
} from "../types/diff";

/** Context lines captured per side when creating an anchor (git's default context size). */
export const CONTEXT_WINDOW = 3;
/** Maximum outermost context lines dropped per side during relocation (patch(1)'s default max fuzz). */
export const MAX_FUZZ = 2;

/** Whitespace-normalize a line for anchor identity and matching. */
const normalize = (line: string): string => line.trim();

const HUNK_HEADER = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@ ?(.*)$/;

function stripPathPrefix(raw: string): string | undefined {
  const path = raw.split("\t")[0].trim();
  if (path === "/dev/null") return undefined;
  return path.replace(/^[ab]\//, "");
}

/**
 * Parse a unified diff into files and hunks. Hunk bodies are consumed by
 * line count from the `@@` header, so content lines that look like file
 * headers (e.g. a context line starting with `--- `) parse correctly.
 */
export function parseUnifiedDiff(patch: string): FileDiff[] {
  const files: FileDiff[] = [];
  let current: FileDiff | undefined;
  let hunk: DiffHunk | undefined;
  let oldRemaining = 0;
  let newRemaining = 0;

  for (const line of patch.split("\n")) {
    if (hunk && (oldRemaining > 0 || newRemaining > 0)) {
      if (line.startsWith("\\")) continue; // "\ No newline at end of file"
      const kind = line.startsWith("+") ? "add" : line.startsWith("-") ? "del" : "context";
      hunk.lines.push({ kind, text: line.slice(1) });
      if (kind !== "add") oldRemaining--;
      if (kind !== "del") newRemaining--;
      continue;
    }
    hunk = undefined;

    if (line.startsWith("diff --git ")) {
      current = { hunks: [] };
      files.push(current);
      continue;
    }
    if (line.startsWith("--- ")) {
      // Plain patches have no "diff --git" line; "---" starts a new file then.
      if (!current || current.oldPath !== undefined || current.hunks.length > 0) {
        current = { hunks: [] };
        files.push(current);
      }
      current.oldPath = stripPathPrefix(line.slice(4));
      continue;
    }
    if (line.startsWith("+++ ") && current) {
      current.newPath = stripPathPrefix(line.slice(4));
      continue;
    }
    const match = HUNK_HEADER.exec(line);
    if (match && current) {
      hunk = {
        oldStart: Number(match[1]),
        newStart: Number(match[3]),
        header: match[5] ?? "",
        lines: [],
      };
      oldRemaining = match[2] === undefined ? 1 : Number(match[2]);
      newRemaining = match[4] === undefined ? 1 : Number(match[4]);
      current.hunks.push(hunk);
    }
  }
  return files;
}

/**
 * Create an anchor for the contiguous run of changed lines starting at
 * `lines[lineIndex]` in the given hunk (the authoring seam — used by the
 * CLI/sidecar assembly helper, not by hand).
 */
export function createAnchor(args: {
  file: FileDiff;
  hunkIndex: number;
  lineIndex: number;
}): DiffAnchor {
  const { file, hunkIndex, lineIndex } = args;
  const lines = file.hunks[hunkIndex].lines;
  if (lines[lineIndex].kind === "context") {
    throw new Error(`Line ${lineIndex} is a context line; anchors target changed lines`);
  }
  const changed: DiffAnchor["changed"] = [];
  let end = lineIndex;
  while (end < lines.length && lines[end].kind !== "context") {
    changed.push({ kind: lines[end].kind as "add" | "del", text: lines[end].text });
    end++;
  }
  const contextBefore = lines
    .slice(Math.max(0, lineIndex - CONTEXT_WINDOW), lineIndex)
    .map((l) => l.text);
  const contextAfter = lines.slice(end, end + CONTEXT_WINDOW).map((l) => l.text);

  const hash = createHash("sha256")
    .update(
      JSON.stringify({
        changed: changed.map((l) => `${l.kind}:${normalize(l.text)}`),
        before: contextBefore.map(normalize),
        after: contextAfter.map(normalize),
      })
    )
    .digest("hex");

  return {
    hash,
    file: file.newPath ?? file.oldPath ?? "",
    changed,
    contextBefore,
    contextAfter,
  };
}

interface Candidate {
  fileIndex: number;
  file: string;
  hunkIndex: number;
  lineIndex: number;
  lines: DiffLine[];
}

/** All positions in a file where the anchor's changed run matches (kind + normalized text). */
function changedRunCandidates(
  anchor: DiffAnchor,
  file: FileDiff,
  fileIndex: number
): Candidate[] {
  const path = file.newPath ?? file.oldPath ?? "";
  const out: Candidate[] = [];
  file.hunks.forEach((hunk, hunkIndex) => {
    outer: for (let i = 0; i + anchor.changed.length <= hunk.lines.length; i++) {
      for (let j = 0; j < anchor.changed.length; j++) {
        const line = hunk.lines[i + j];
        const want = anchor.changed[j];
        if (line.kind !== want.kind || normalize(line.text) !== normalize(want.text)) {
          continue outer;
        }
      }
      out.push({ fileIndex, file: path, hunkIndex, lineIndex: i, lines: hunk.lines });
    }
  });
  return out;
}

/**
 * Does the candidate's surrounding context match the anchor's, ignoring the
 * `fuzz` outermost lines per side? A required context line falling outside
 * the hunk counts as a mismatch (higher fuzz recovers boundary cases).
 */
function contextMatches(anchor: DiffAnchor, candidate: Candidate, fuzz: number): boolean {
  const before = anchor.contextBefore.slice(Math.min(fuzz, anchor.contextBefore.length));
  const after = anchor.contextAfter.slice(
    0,
    Math.max(0, anchor.contextAfter.length - fuzz)
  );
  for (let i = 0; i < before.length; i++) {
    const line = candidate.lines[candidate.lineIndex - before.length + i];
    if (line === undefined || normalize(line.text) !== normalize(before[i])) return false;
  }
  const end = candidate.lineIndex + anchor.changed.length;
  for (let i = 0; i < after.length; i++) {
    const line = candidate.lines[end + i];
    if (line === undefined || normalize(line.text) !== normalize(after[i])) return false;
  }
  return true;
}

function resolveCandidates(
  anchor: DiffAnchor,
  candidates: Candidate[]
): AnchorResolution | undefined {
  for (let fuzz = 0; fuzz <= MAX_FUZZ; fuzz++) {
    const matches = candidates.filter((c) => contextMatches(anchor, c, fuzz));
    if (matches.length === 1) {
      const m = matches[0];
      return {
        state: "anchored",
        fileIndex: m.fileIndex,
        file: m.file,
        hunkIndex: m.hunkIndex,
        lineIndex: m.lineIndex,
        lineCount: anchor.changed.length,
        fuzz,
      };
    }
    if (matches.length > 1) return { state: "ambiguous" };
  }
  return undefined;
}

/**
 * Relocate an anchor in a (re)generated patch. The anchor's own file is
 * searched first so a duplicate block elsewhere in the repo cannot make an
 * exact in-file match ambiguous; other files are the rename fallback.
 */
export function relocateAnchor(anchor: DiffAnchor, files: FileDiff[]): AnchorResolution {
  const own: Candidate[] = [];
  const others: Candidate[] = [];
  files.forEach((file, fileIndex) => {
    const isOwn = file.newPath === anchor.file || file.oldPath === anchor.file;
    (isOwn ? own : others).push(...changedRunCandidates(anchor, file, fileIndex));
  });
  return (
    resolveCandidates(anchor, own) ??
    resolveCandidates(anchor, others) ?? { state: "orphaned" }
  );
}
