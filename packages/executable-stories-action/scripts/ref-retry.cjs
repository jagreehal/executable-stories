// Commits to an orphan branch go through the Git Data API with the branch tip as parent.
// Two runs writing the same branch race at createRef (orphan init) or updateRef; the loser
// gets a 422. The API has no compare-and-swap, so the fix is to re-read the tip and try again:
// `attempt` must read the tip itself on every call.
// CommonJS so actions/github-script can require() it.

function isRefConflict(e) {
  return e?.status === 422 || /fast forward|reference already exists/i.test(e?.message ?? '');
}

async function withRefRetry(attempt, { attempts = 3, onRetry = () => {} } = {}) {
  for (let n = 1; ; n++) {
    try {
      return await attempt();
    } catch (e) {
      if (!isRefConflict(e) || n >= attempts) throw e;
      onRetry(n, attempts);
    }
  }
}

module.exports = { isRefConflict, withRefRetry };
