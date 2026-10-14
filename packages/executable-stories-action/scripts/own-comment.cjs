// The action's sticky PR comment: the one carrying its marker AND posted by the action itself.
// The marker alone is not enough: anyone who can comment can paste it, and the action would then
// try to edit a stranger's comment, get a 403, and post no report at all.
// CommonJS so actions/github-script can require() it.

/** The login the action posts as: it always uses the workflow's default token. */
const ACTION_LOGIN = 'github-actions[bot]';

function findOwnComment(comments, marker, login = ACTION_LOGIN) {
  return comments.find((c) => c.user?.login === login && typeof c.body === 'string' && c.body.includes(marker));
}

module.exports = { ACTION_LOGIN, findOwnComment };
