/**
 * Tests for scripts/own-comment.cjs — which existing PR comment the action updates.
 *
 * Run: node --test packages/executable-stories-action/test/
 */

import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { describe, it } from "node:test";

const { findOwnComment } = createRequire(import.meta.url)("../scripts/own-comment.cjs");

const marker = "<!-- executable-stories: Executable Stories -->";
const bot = { login: "github-actions[bot]" };

describe("findOwnComment", () => {
  it("finds the action's own comment by its marker", () => {
    const comments = [
      { id: 1, user: { login: "dev" }, body: "looks good" },
      { id: 2, user: bot, body: `${marker}\nreport` },
    ];
    assert.equal(findOwnComment(comments, marker)?.id, 2);
  });

  it("ignores someone else's comment that carries the marker", () => {
    // Updating it would 403, and the report would never post.
    const comments = [
      { id: 1, user: { login: "mallory" }, body: `${marker}\nnot the report` },
      { id: 2, user: bot, body: `${marker}\nreport` },
    ];
    assert.equal(findOwnComment(comments, marker)?.id, 2);
    assert.equal(findOwnComment(comments.slice(0, 1), marker), undefined);
  });

  it("keeps two reports with different titles apart", () => {
    const comments = [{ id: 1, user: bot, body: "<!-- executable-stories: Review -->\nreview" }];
    assert.equal(findOwnComment(comments, marker), undefined);
  });
});
