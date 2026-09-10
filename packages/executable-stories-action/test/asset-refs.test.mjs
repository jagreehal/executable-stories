/**
 * Tests for scripts/asset-refs.mjs — finding media references and repointing them.
 *
 * Run: node --test packages/executable-stories-action/test/asset-refs.test.mjs
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { findReferences, rewriteReferences } from "../scripts/asset-refs.mjs";

describe("rewriteReferences", () => {
  it("does not corrupt a URL it just inserted when one ref contains another", () => {
    // The failure this exists to prevent: replacing refs one at a time rewrites
    // text an earlier replacement inserted. "a.png" appears inside the URL
    // substituted for "assets/a.png", so a second pass nests one URL in the
    // other. No ordering avoids it — only matching positions once.
    const markdown = "![A](assets/a.png)\n![B](a.png)\n";
    const out = rewriteReferences(markdown, {
      "assets/a.png": "https://raw.test/o/r/sha/pr-1/001-a.png",
      "a.png": "https://raw.test/o/r/sha/pr-1/002-a.png",
    });

    assert.equal(
      out,
      "![A](https://raw.test/o/r/sha/pr-1/001-a.png)\n![B](https://raw.test/o/r/sha/pr-1/002-a.png)\n"
    );
    assert.ok(!out.includes("001-https"), "no URL nested inside another");
    assert.equal(out.match(/https:\/\/raw\.test/g).length, 2);
  });

  it("survives a URL that contains the very ref it replaces", () => {
    const out = rewriteReferences("![X](run.webm)\n", {
      "run.webm": "https://raw.test/pr-1/run.webm",
    });
    assert.equal(out, "![X](https://raw.test/pr-1/run.webm)\n");
  });

  it("repoints a video source without disturbing the tag around it", () => {
    const out = rewriteReferences(
      '<video controls preload="metadata" class="doc-video">\n  <source src="assets/run.webm" />\n</video>\n',
      { "assets/run.webm": "https://raw.test/run.webm" }
    );
    assert.match(out, /<source src="https:\/\/raw\.test\/run\.webm" \/>/);
    assert.match(out, /class="doc-video"/);
  });

  it("leaves references it was given no URL for", () => {
    const markdown = "![A](assets/a.png)\n![B](assets/b.png)\n";
    const out = rewriteReferences(markdown, { "assets/a.png": "https://raw.test/a.png" });
    assert.match(out, /!\[B\]\(assets\/b\.png\)/);
  });

  it("is a no-op with an empty map, so an unhosted run is untouched", () => {
    const markdown = "![A](assets/a.png)\n";
    assert.equal(rewriteReferences(markdown, {}), markdown);
    assert.equal(rewriteReferences(markdown, undefined), markdown);
  });

  it("finds the same references the rewriter acts on", () => {
    const markdown =
      '![Shot](assets/a.png)\n<video src="b.mp4"></video>\n<source src="c.webm" />\n';
    assert.deepEqual([...findReferences(markdown).keys()], [
      "assets/a.png",
      "b.mp4",
      "c.webm",
    ]);
  });
});
