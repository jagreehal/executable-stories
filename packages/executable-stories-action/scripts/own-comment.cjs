// The action's sticky PR comment: the one carrying its marker AND posted by the action itself.
// The marker alone is not enough: anyone who can comment can paste it, and the action would then
// try to edit a stranger's comment, get a 403, and post no report at all.
// CommonJS so actions/github-script can require() it.

/** The login the action posts as: it always uses the workflow's default token. */
const ACTION_LOGIN = 'github-actions[bot]';

function findOwnComment(comments, marker, login = ACTION_LOGIN) {
  return comments.find((c) => c.user?.login === login && typeof c.body === 'string' && c.body.includes(marker));
}


/**
 * Create or update the sticky comment, unless the PR has moved past the head this run tested.
 *
 * The head is read after the comment list, immediately before the write, so a run overtaken
 * while it paginated leaves the newer run's report in place. A workflow `concurrency` group
 * without cancel-in-progress serializes the runs and closes the remaining API round trip.
 *
 * Returns the comment id, or null when the run was overtaken.
 */
async function writeOwnComment({ github, owner, repo, issue, marker, body, runHead, log = () => {} }) {
  const comments = await github.paginate(github.rest.issues.listComments, { owner, repo, issue_number: issue, per_page: 100 });
  const existing = findOwnComment(comments, marker);

  if (existing?.body === body) {
    // An identical body still costs an API write and bumps updated_at, which shows as PR activity.
    log(`Comment ${existing.id} is already current — nothing to update.`);
    return existing.id;
  }

  if (runHead) {
    const { data: pr } = await github.rest.pulls.get({ owner, repo, pull_number: issue });
    if (pr.head.sha !== runHead) {
      log(`Not commenting: this run tested ${runHead.slice(0, 7)} but the PR head is now ${pr.head.sha.slice(0, 7)}. The newer run owns the comment.`);
      return null;
    }
  }

  if (existing) {
    const { data } = await github.rest.issues.updateComment({ owner, repo, comment_id: existing.id, body });
    log(`Updated existing comment ${data.id}`);
    return data.id;
  }
  const { data } = await github.rest.issues.createComment({ owner, repo, issue_number: issue, body });
  log(`Created comment ${data.id}`);
  return data.id;
}

module.exports = { ACTION_LOGIN, findOwnComment, writeOwnComment };
