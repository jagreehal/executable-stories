/**
 * Anchoring spike tests — the load-bearing set from the Code Diff spec:
 * an annotation survives a whitespace-only regeneration, survives a rename,
 * relocates under fuzz when context shifts, becomes ambiguous on duplicate
 * lines, becomes orphaned when its lines are rewritten, and never silently
 * reattaches.
 */

import { describe, expect, it } from "vitest";

import {
  createAnchor,
  parseUnifiedDiff,
  relocateAnchor,
} from "../src/review/diff-anchor";
import { totalsPatch as basePatch } from "./stubs";

function anchorOnFirstAdd(patch: string) {
  const files = parseUnifiedDiff(patch);
  const lineIndex = files[0].hunks[0].lines.findIndex((l) => l.kind !== "context");
  return createAnchor({ file: files[0], hunkIndex: 0, lineIndex });
}

describe("parseUnifiedDiff", () => {
  it("parses files, hunks, and line kinds", () => {
    const files = parseUnifiedDiff(basePatch);
    expect(files).toHaveLength(1);
    expect(files[0].oldPath).toBe("src/cart/totals.ts");
    expect(files[0].newPath).toBe("src/cart/totals.ts");
    expect(files[0].hunks).toHaveLength(1);
    const hunk = files[0].hunks[0];
    expect(hunk.oldStart).toBe(10);
    expect(hunk.newStart).toBe(10);
    expect(hunk.header).toBe("export function total(items: Item[]) {");
    expect(hunk.lines.map((l) => l.kind)).toEqual([
      "context", "context", "del", "add", "add", "context", "context", "context",
    ]);
  });

  it("consumes hunk bodies by count, so content resembling headers stays content", () => {
    const patch = `--- a/notes.md
+++ b/notes.md
@@ -1,3 +1,4 @@
 intro
+--- not a file header ---
 middle
 end
`;
    const files = parseUnifiedDiff(patch);
    expect(files).toHaveLength(1);
    expect(files[0].hunks[0].lines[1]).toEqual({
      kind: "add",
      text: "--- not a file header ---",
    });
  });

  it("treats /dev/null as an absent path", () => {
    const patch = `diff --git a/new.ts b/new.ts
--- /dev/null
+++ b/new.ts
@@ -0,0 +1,1 @@
+export const x = 1;
`;
    const [file] = parseUnifiedDiff(patch);
    expect(file.oldPath).toBeUndefined();
    expect(file.newPath).toBe("new.ts");
  });
});

describe("relocateAnchor", () => {
  it("anchors exactly (fuzz 0) in the same patch", () => {
    const anchor = anchorOnFirstAdd(basePatch);
    const result = relocateAnchor(anchor, parseUnifiedDiff(basePatch));
    expect(result).toEqual({
      state: "anchored",
      fileIndex: 0,
      file: "src/cart/totals.ts",
      hunkIndex: 0,
      lineIndex: 2,
      lineCount: 3,
      fuzz: 0,
    });
  });

  it("survives a whitespace-only regeneration", () => {
    const anchor = anchorOnFirstAdd(basePatch);
    const reindented = basePatch
      .split("\n")
      .map((l) =>
        /^(diff |--- |\+\+\+ |@@)/.test(l) || l === ""
          ? l
          : l[0] + "    " + l.slice(1).trim()
      )
      .join("\n");
    const result = relocateAnchor(anchor, parseUnifiedDiff(reindented));
    expect(result.state).toBe("anchored");
    expect(result.fuzz).toBe(0);
  });

  it("survives a file rename", () => {
    const anchor = anchorOnFirstAdd(basePatch);
    const renamed = basePatch.replaceAll("src/cart/totals.ts", "src/cart/pricing.ts");
    const result = relocateAnchor(anchor, parseUnifiedDiff(renamed));
    expect(result.state).toBe("anchored");
    expect(result.file).toBe("src/cart/pricing.ts");
  });

  it("relocates under fuzz when outermost context changes", () => {
    const anchor = anchorOnFirstAdd(basePatch);
    const shifted = basePatch.replace("   let sum = 0;", "   let sum = 0; // seed");
    const result = relocateAnchor(anchor, parseUnifiedDiff(shifted));
    expect(result.state).toBe("anchored");
    expect(result.fuzz).toBeGreaterThan(0);
  });

  it("becomes ambiguous on duplicate identical changes with identical context", () => {
    const patch = `--- a/config.ts
+++ b/config.ts
@@ -1,3 +1,4 @@
 {
+  retries: 3,
   a: 1,
 }
@@ -10,3 +11,4 @@
 {
+  retries: 3,
   a: 1,
 }
`;
    const files = parseUnifiedDiff(patch);
    const anchor = createAnchor({ file: files[0], hunkIndex: 0, lineIndex: 1 });
    expect(relocateAnchor(anchor, files)).toEqual({ state: "ambiguous" });
  });

  it("becomes orphaned when the anchored lines are rewritten, never reattaching", () => {
    const anchor = anchorOnFirstAdd(basePatch);
    const rewritten = basePatch
      .replace("+    sum += item.price * item.quantity;", "+    sum += lineTotal(item);")
      .replace("+    sum += item.tax;", "+    sum += taxFor(item);");
    const result = relocateAnchor(anchor, parseUnifiedDiff(rewritten));
    expect(result).toEqual({ state: "orphaned" });
  });

  it("prefers an exact match in the anchor's own file over duplicates elsewhere", () => {
    const anchor = anchorOnFirstAdd(basePatch);
    const copy = basePatch.replaceAll("src/cart/totals.ts", "src/cart/copy.ts");
    const files = parseUnifiedDiff(basePatch + copy);
    const result = relocateAnchor(anchor, files);
    expect(result.state).toBe("anchored");
    expect(result.file).toBe("src/cart/totals.ts");
  });

  it("relocates when the hunk moves within the file", () => {
    const anchor = anchorOnFirstAdd(basePatch);
    const moved = basePatch.replace("@@ -10,6 +10,7 @@", "@@ -42,6 +42,7 @@");
    const result = relocateAnchor(anchor, parseUnifiedDiff(moved));
    expect(result.state).toBe("anchored");
    expect(result.fuzz).toBe(0);
  });

  it("gives identical content the same anchor hash and different content a different one", () => {
    const a = anchorOnFirstAdd(basePatch);
    const b = anchorOnFirstAdd(basePatch);
    const c = anchorOnFirstAdd(
      basePatch.replace("+    sum += item.tax;", "+    sum += item.shipping;")
    );
    expect(a.hash).toBe(b.hash);
    expect(a.hash).not.toBe(c.hash);
  });
});
