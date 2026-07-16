/**
 * Diff types — parsed unified patches and content-anchored annotation targets.
 *
 * These are contract types: they serialize into the review result JSON
 * (`ReviewResult.codeDiffs`), so they live in the type layer like every other
 * review contract. The parsing/anchoring implementation is `review/diff-anchor`.
 */

/** One line of a hunk body. */
export interface DiffLine {
  kind: "add" | "del" | "context";
  text: string;
}

/** One `@@` hunk. */
export interface DiffHunk {
  oldStart: number;
  newStart: number;
  /** Trailing section heading from the `@@` line, if any. */
  header: string;
  lines: DiffLine[];
}

/** One file's diff. `oldPath`/`newPath` are undefined for /dev/null (add/delete). */
export interface FileDiff {
  oldPath?: string;
  newPath?: string;
  hunks: DiffHunk[];
}

/**
 * A content-anchored annotation target. Stores the actual lines (relocation
 * needs them for fuzzy matching); `hash` is the derived stable identity.
 */
export interface DiffAnchor {
  /** sha256 over normalized changed + context lines — stable identity. */
  hash: string;
  /** Path hint (file the anchor was created in). Preferred during relocation, but anchors survive renames. */
  file: string;
  /** The anchored changed lines (add/del), in order. Never dropped during fuzz. */
  changed: Array<{ kind: "add" | "del"; text: string }>;
  /** Hunk lines preceding the changed run (outermost first). */
  contextBefore: string[];
  /** Hunk lines following the changed run (innermost first). */
  contextAfter: string[];
}

export type AnchorState = "anchored" | "ambiguous" | "orphaned";

/** Where (and whether) an anchor relocated in a regenerated patch. */
export interface AnchorResolution {
  state: AnchorState;
  /** The remaining fields are set together when `state` is `anchored`: */
  /** Index into the parsed files array — renderers index directly, no path search. */
  fileIndex?: number;
  /** Display path of the matched file. */
  file?: string;
  hunkIndex?: number;
  /** Index within `hunk.lines` of the first changed line. */
  lineIndex?: number;
  /** Length of the anchored changed run (for highlighting). */
  lineCount?: number;
  /** How many outermost context lines (per side) were ignored to match. */
  fuzz?: number;
}
