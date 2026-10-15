import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { CliError } from './errors.js';

const git = (args: string[], input?: string | Buffer, env?: NodeJS.ProcessEnv) =>
  execFileSync('git', args, { input, env, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();

const configured = (key: string) => {
  try {
    return git(['config', key]) !== '';
  } catch {
    return false;
  }
};

/** `owner/repo` from a GitHub remote URL (https or ssh), else undefined. */
export function githubRepo(url: string): string | undefined {
  return /github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?\/?$/.exec(url.trim())?.[1];
}

/**
 * Commit files to `<branch>/<folder>/` and push, without touching the working tree, the index or
 * the current branch: a PR body can show the images, and the code branch stays free of them.
 * Built from git plumbing, so it works in a dirty tree and in CI. Each run adds a commit on top of
 * the branch, replacing only `<folder>`. Returns each file's URL at that commit, so links don't
 * change when the folder is published again.
 */
export function publishFiles(
  { files, folder, branch = 'scenario-shots', remote = 'origin' }: {
    files: string[];
    folder: string;
    branch?: string;
    remote?: string;
  },
) {
  if (!/^[\w.-]+(\/[\w.-]+)*$/.test(folder) || folder.split('/').includes('..')) {
    throw new CliError(
      'INVALID_ARGUMENT',
      `--folder must be a plain relative path, e.g. pr-42, not "${folder}"`,
    );
  }

  const names = files.map((f) => basename(f));
  // Each name becomes a line of `git mktree` input, so a tab or newline in one would add entries of
  // its own. Names usually come from screenshots, which a pull request's code can choose.
  const unsafe = names.find((n) => !/^[\w.-]+$/.test(n) || /^\.+$/.test(n));

  if (unsafe !== undefined) {
    throw new CliError('INVALID_ARGUMENT', `file names may use letters, digits, ".", "_" and "-" only: ${JSON.stringify(unsafe)}`);
  }

  const duplicate = names.find((n, i) => names.indexOf(n) !== i);

  if (duplicate) throw new CliError('INVALID_ARGUMENT', `two files are named ${duplicate}`);

  const repo = githubRepo(git(['remote', 'get-url', remote]));

  let parent: string | undefined;

  try {
    git(['fetch', '--quiet', remote, `+refs/heads/${branch}:refs/remotes/${remote}/${branch}`]);
    parent = git(['rev-parse', `refs/remotes/${remote}/${branch}^{commit}`]);
  } catch {
    // The branch doesn't exist yet: the first commit has no parent.
  }

  const blobs = files.map((file, i) => {
    const sha = git(['hash-object', '-w', '--stdin'], readFileSync(file));

    return `100644 blob ${sha}\t${names[i]}`;
  });

  // Nest the files under each part of the folder, innermost first.
  let tree = git(['mktree'], `${blobs.join('\n')}\n`);
  const parts = folder.split('/');

  for (let depth = parts.length - 1; depth >= 0; depth--) {
    const path = parts.slice(0, depth).join('/');
    const name = parts[depth];
    // Keep what else the branch has at this level, replacing only our entry.
    const existing = parent ? listTree(parent, path).filter((line) => !line.endsWith(`\t${name}`)) : [];
    tree = git(['mktree'], `${[...existing, `040000 tree ${tree}\t${name}`].join('\n')}\n`);
  }

  // CI runners often have no git identity, which commit-tree needs.
  const identity = configured('user.name') && configured('user.email') ? {} : {
    GIT_AUTHOR_NAME: 'executable-stories-showcase',
    GIT_AUTHOR_EMAIL: 'executable-stories-showcase@users.noreply.github.com',
    GIT_COMMITTER_NAME: 'executable-stories-showcase',
    GIT_COMMITTER_EMAIL: 'executable-stories-showcase@users.noreply.github.com',
  };

  const commit = git(
    ['commit-tree', tree, ...(parent ? ['-p', parent] : []), '-m', `Publish ${folder}`],
    undefined,
    { ...process.env, ...identity },
  );

  git(['push', '--quiet', remote, `${commit}:refs/heads/${branch}`]);

  return names.map((name) => ({
    file: name,
    url: repo
      ? `https://github.com/${repo}/blob/${commit}/${folder}/${encodeURIComponent(name)}?raw=true`
      : `${branch}@${commit.slice(0, 12)}:${folder}/${name}`,
  }));
}

function listTree(commit: string, path: string): string[] {
  try {
    const out = git(['ls-tree', path ? `${commit}:${path}` : commit]);

    return out ? out.split('\n') : [];
  } catch {
    return [];
  }
}
