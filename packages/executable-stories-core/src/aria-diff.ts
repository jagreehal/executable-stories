/**
 * Screen diffing: what changed on screen between two screenshots, from the
 * accessibility snapshots `story.screenshot({ page, aria: true })` records
 * beside them (Playwright's `ariaSnapshot()` YAML).
 *
 * Text, so a check needs no pixels and no model: a frame whose screen did not
 * change, a column header that went missing, a box that was ticked. Lines are
 * compared as a multiset, not by position, so one element appearing doesn't
 * make everything after it look changed. Pure, like state-diff.
 */

import type { DocEntry } from "./types/story.js";

/** One difference between two screens. `changed` pairs a removed and an added line for the same element. */
export type AriaChange =
  | { kind: "added"; line: string }
  | { kind: "removed"; line: string }
  | { kind: "changed"; before: string; after: string };

/**
 * Roles that only group other elements. Unnamed, their children carry the change;
 * any other unnamed role (`- textbox`, `- button`) is a control in its own right.
 */
const CONTAINER_ROLES = new Set([
  "article", "banner", "complementary", "contentinfo", "document", "form", "generic",
  "grid", "group", "list", "listitem", "main", "menu", "menubar", "navigation",
  "paragraph", "radiogroup", "region", "rowgroup", "table", "tablist", "toolbar",
  "tree", "treegrid",
]);

/**
 * The lines worth comparing, in page order: `- checkbox "Composer" [checked]`
 * becomes `checkbox "Composer" [checked]`. Left out: properties (`/url: …`),
 * bare containers (`- rowgroup:`), and rows, whose name is every cell's text
 * joined, so hiding a column would otherwise change every row.
 */
export function ariaLines(snapshot: string): string[] {
  return snapshot
    .split("\n")
    .map((l) => l.trim().replace(/^- /, "").replace(/:$/, ""))
    .filter((l) => l && !l.startsWith("/") && !CONTAINER_ROLES.has(l) && !/^row\b/.test(l));
}

/** The named element a line describes (`checkbox "Composer"`), so a state change pairs up. Unnamed text never pairs. */
const elementOf = (line: string) => /^\w+ "(?:[^"\\]|\\.)*"/.exec(line)?.[0];

/**
 * Diff two aria snapshots. Empty array means the screens read the same.
 * Order: changed, then added (both in `after` order), then removed (in `before` order). Element
 * states come first because a menu or dialog that opens hides the page behind it from the
 * accessibility tree, and the hundreds of lines that leave with it would bury them.
 */
export function diffAria(before: string, after: string): AriaChange[] {
  const left = new Map<string, number>();
  for (const line of ariaLines(before)) left.set(line, (left.get(line) ?? 0) + 1);
  const added: string[] = [];
  for (const line of ariaLines(after)) {
    const n = left.get(line) ?? 0;
    if (n > 0) left.set(line, n - 1);
    else added.push(line);
  }
  const removed = ariaLines(before).filter((line) => {
    const n = left.get(line) ?? 0;
    if (n > 0) left.set(line, n - 1);
    return n > 0;
  });

  const changed: AriaChange[] = [];
  const appeared: AriaChange[] = [];
  for (const line of added) {
    const element = elementOf(line);
    const i = element === undefined ? -1 : removed.findIndex((r) => elementOf(r) === element);
    if (i >= 0) changed.push({ kind: "changed", before: removed.splice(i, 1)[0]!, after: line });
    else appeared.push({ kind: "added", line });
  }
  return [...changed, ...appeared, ...removed.map((line): AriaChange => ({ kind: "removed", line }))];
}

/** One-liners for a change list: `+ link "Amber Bloom"`, `− columnheader "Composer"`, `checkbox "Composer" [checked] → checkbox "Composer"`. Past `max`, a count of the rest. */
export function summarizeAriaChanges(changes: AriaChange[], max = 20): string[] {
  const lines = changes.slice(0, max).map((c) =>
    c.kind === "added" ? `+ ${c.line}` : c.kind === "removed" ? `− ${c.line}` : `${c.before} → ${c.after}`,
  );
  if (changes.length > max) lines.push(`… and ${changes.length - max} more`);
  return lines;
}

/** A screenshot with a recorded screen, and what changed since the previous one. */
export interface ScreenFrame {
  /** Index of the step the screenshot is attached to. */
  stepIndex: number;
  /** The step's text. */
  step: string;
  alt?: string;
  aria: string;
  /** Changes since the previous screenshot that recorded one; absent on the first. */
  changes?: AriaChange[];
}

/** Every screenshot that recorded its screen, in order, each with its changes since the last. */
export function screenFrames(steps: { text: string; docs?: DocEntry[] }[]): ScreenFrame[] {
  const frames: ScreenFrame[] = [];
  const walk = (docs: DocEntry[], stepIndex: number, step: string) => {
    for (const doc of docs) {
      if (doc.kind === "screenshot" && doc.aria !== undefined) {
        const previous = frames.at(-1);
        frames.push({
          stepIndex,
          step,
          ...(doc.alt !== undefined && { alt: doc.alt }),
          aria: doc.aria,
          ...(previous && { changes: diffAria(previous.aria, doc.aria) }),
        });
      }
      if (doc.children) walk(doc.children, stepIndex, step);
    }
  };
  steps.forEach((s, i) => walk(s.docs ?? [], i, s.text));
  return frames;
}
