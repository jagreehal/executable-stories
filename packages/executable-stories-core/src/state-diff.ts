/**
 * State diffing — what changed between two `story.state()` snapshots.
 *
 * Derived, never stored: adapters emit raw snapshots only, and this single
 * pure function computes the frame-to-frame changes at render time (React
 * storyboard, Astro views, Markdown formatter all bundle it from core).
 * Non-JS adapters never reimplement diffing.
 *
 * Semantics are JSON semantics: objects diff by key, arrays by index,
 * everything else by strict deep equality. Deterministic output order —
 * changed/added keys in `after` order, removed keys in `before` order.
 */

/** How one path differs between snapshots. */
export type StateChangeKind = "added" | "removed" | "changed";

/** One difference between two state snapshots. */
export interface StateChange {
  /** Dot/bracket path from the root ("items[1].qty", "total"; "" = root). */
  path: string;
  kind: StateChangeKind;
  /** Value before the change (absent for "added"). */
  before?: unknown;
  /** Value after the change (absent for "removed"). */
  after?: unknown;
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => deepEqual(v, b[i]));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const ak = Object.keys(a);
    const bk = Object.keys(b);
    return ak.length === bk.length && ak.every((k) => k in b && deepEqual(a[k], b[k]));
  }
  return false;
}

const joinKey = (path: string, key: string): string => (path === "" ? key : `${path}.${key}`);

function walk(path: string, before: unknown, after: unknown, out: StateChange[]): void {
  if (Object.is(before, after)) return;

  if (Array.isArray(before) && Array.isArray(after)) {
    const shared = Math.min(before.length, after.length);
    for (let i = 0; i < shared; i++) walk(`${path}[${i}]`, before[i], after[i], out);
    for (let i = shared; i < after.length; i++) out.push({ path: `${path}[${i}]`, kind: "added", after: after[i] });
    for (let i = shared; i < before.length; i++) out.push({ path: `${path}[${i}]`, kind: "removed", before: before[i] });
    return;
  }

  if (isPlainObject(before) && isPlainObject(after)) {
    for (const key of Object.keys(after)) {
      const p = joinKey(path, key);
      if (key in before) walk(p, before[key], after[key], out);
      else out.push({ path: p, kind: "added", after: after[key] });
    }
    for (const key of Object.keys(before)) {
      if (!(key in after)) out.push({ path: joinKey(path, key), kind: "removed", before: before[key] });
    }
    return;
  }

  if (!deepEqual(before, after)) out.push({ path, kind: "changed", before, after });
}

/**
 * Diff two state snapshots. Empty array means "no change". A type change at
 * a path (object → array, number → string) reports as one "changed" entry at
 * that path rather than descending further.
 */
export function diffStateValues(before: unknown, after: unknown): StateChange[] {
  const out: StateChange[] = [];
  walk("", before, after, out);
  return out;
}

/** Compact single-line JSON for change summaries; truncated past `maxLen`. */
export function formatStateValue(value: unknown, maxLen = 60): string {
  const s = value === undefined ? "undefined" : JSON.stringify(value);
  return s.length > maxLen ? `${s.slice(0, maxLen - 1)}…` : s;
}

/**
 * Human-readable one-liners for a change list, in order:
 * `items[1].qty: 1 → 2`, `+ items[2]: {...}`, `− coupon`.
 * Shared by the Markdown formatter and available to any renderer that wants
 * text output; the React storyboard renders changes itself.
 */
export function summarizeStateChanges(changes: StateChange[]): string[] {
  return changes.map((c) => {
    const at = c.path === "" ? "(root)" : c.path;
    switch (c.kind) {
      case "added":
        return `+ ${at}: ${formatStateValue(c.after)}`;
      case "removed":
        return `− ${at}`;
      case "changed":
        return `${at}: ${formatStateValue(c.before)} → ${formatStateValue(c.after)}`;
    }
  });
}
