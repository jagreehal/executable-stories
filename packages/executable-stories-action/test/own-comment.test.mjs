/**
 * Tests for scripts/own-comment.cjs — which existing PR comment the action updates.
 *
 * Run: node --test packages/executable-stories-action/test/
 */

import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { describe, it } from "node:test";

const { findOwnComment, writeOwnComment } = createRequire(import.meta.url)("../scripts/own-comment.cjs");

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

describe("writeOwnComment", () => {
  /** A fake API whose PR head moves to `pushedHead` while the comments are being listed. */
  function api({ comments = [], pushedHead }) {
    let head = "old";
    const writes = [];
    const github = {
      paginate: async () => {
        if (pushedHead) head = pushedHead;
        return comments;
      },
      rest: {
        issues: {
          listComments: () => {},
          updateComment: async ({ comment_id, body }) => (writes.push({ comment_id, body }), { data: { id: comment_id } }),
          createComment: async ({ body }) => (writes.push({ body }), { data: { id: 99 } }),
        },
        pulls: { get: async () => ({ data: { head: { sha: head } } }) },
      },
    };
    return { github, writes };
  }
  const args = { owner: "o", repo: "r", issue: 7, marker, body: `${marker}\nold report`, runHead: "old" };

  it("does not overwrite a newer run's comment when the PR moved while comments were listed", async () => {
    const { github, writes } = api({ comments: [{ id: 2, user: bot, body: `${marker}\nnewer report` }], pushedHead: "new" });
    assert.equal(await writeOwnComment({ github, ...args }), null);
    assert.deepEqual(writes, []);
  });

  it("updates its own comment when the PR head is still the tested one", async () => {
    const { github, writes } = api({ comments: [{ id: 2, user: bot, body: `${marker}\nstale` }] });
    assert.equal(await writeOwnComment({ github, ...args }), 2);
    assert.deepEqual(writes, [{ comment_id: 2, body: args.body }]);
  });
});
