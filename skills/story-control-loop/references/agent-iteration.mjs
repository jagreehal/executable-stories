#!/usr/bin/env node
// /iterate support for a story-control-loop workflow. Plain Node 22+, no dependencies; needs `gh`.
//
//   footer: print the PR body footer. Its hidden marker routes /iterate back to the workflow
//           that opened the PR, so every loop can listen for /iterate and only one answers.
//   prompt: print the prompt for an /iterate run: the request, the PR, its comments and the
//           memory file, with instructions to update the PR and write lasting lessons to memory.
//
//   node agent-iteration.mjs footer --workflow agent-<slug> --memory .github/agent-memory/<slug>.md
//   COMMENT_BODY="$BODY" node agent-iteration.mjs prompt --workflow agent-<slug> \
//     --memory .github/agent-memory/<slug>.md --repo owner/repo --pr <number>
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

// Comments go into an agent's prompt, so only people who can write to the repo get a say: the same
// rule the workflow's gate applies to /iterate. author_association isn't enough, because GitHub
// tags read-only collaborators COLLABORATOR too.
const WRITERS = new Set(['admin', 'maintain', 'write']);
const permissions = new Map();

function canWrite(repo, login) {
  if (!/^[A-Za-z0-9-]+$/.test(login ?? '')) return false;

  if (!permissions.has(login)) {
    let permission = 'none';

    try {
      permission = gh(
        `repos/${repo}/collaborators/${login}/permission`,
      ).permission;
    } catch {
      // No answer counts as no permission.
    }

    permissions.set(login, WRITERS.has(permission));
  }

  return permissions.get(login);
}

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    workflow: { type: 'string' },
    memory: { type: 'string' },
    repo: { type: 'string' },
    pr: { type: 'string' },
  },
});

const [command] = positionals;
const { workflow, memory } = values;

if (!workflow || !memory)
  throw new Error('--workflow and --memory are required');

if (command === 'footer') {
  process.stdout.write(footer());
} else if (command === 'prompt') {
  if (!values.repo || !values.pr)
    throw new Error('prompt needs --repo and --pr');
  process.stdout.write(prompt(values.repo, values.pr));
} else {
  throw new Error(`command must be footer or prompt, not "${command}"`);
}

function footer() {
  return `

---

Opened by the \`${workflow}\` loop. Comment \`/iterate <feedback>\` to have it update this PR;
lasting lessons go to \`${memory}\` and steer future runs.

<!-- story-control-loop:workflow=${workflow};memory=${memory} -->
`;
}

function prompt(repo, number) {
  const pr = gh(`repos/${repo}/pulls/${number}`);
  // --slurp wraps each page in an outer array.
  const comments = [
    ...gh(`repos/${repo}/issues/${number}/comments`, true).flat(),
    ...gh(`repos/${repo}/pulls/${number}/comments`, true).flat(),
  ].filter((c) => canWrite(repo, c.user?.login));
  const request =
    (process.env.COMMENT_BODY ?? '').trim().replace(/^\/iterate\b\s*/i, '') ||
    'Iterate on this PR using the comments below.';

  return `# Iteration request

${request}

# Instructions

You are iterating on PR #${pr.number}, opened by the \`${workflow}\` loop.

1. Treat the iteration request as the current instruction.
2. Change this PR's branch if the request asks for a code, test or docs change. Run the test
   command before you finish; it must pass. Never delete, skip or empty a scenario.
3. If the request is a lesson for future runs, add it to ${memory} in the section it belongs to.
   Keep that file short: no transcripts, no details of this one PR.
4. Commit what you change. The workflow pushes it; you have no GitHub access.
5. Finish with a short summary of what changed and whether you updated the memory file.

# Agent memory

${existsSync(memory) ? readFileSync(memory, 'utf8') : '(none yet)'}

# Pull request

#${pr.number} ${pr.title} (${pr.head?.ref} into ${pr.base?.ref})

${pr.body ?? ''}

# Comments

${comments.map(describe).join('\n\n---\n\n') || '(none)'}
`;
}

function describe(c) {
  const where = c.path
    ? ` on ${c.path}:${c.line ?? c.original_line ?? '?'}`
    : '';

  return `${c.user?.login ?? 'unknown'}${where}:\n\n${c.body ?? ''}`;
}

function gh(path, paginate = false) {
  const args = ['api', path, ...(paginate ? ['--paginate', '--slurp'] : [])];

  return JSON.parse(
    execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }),
  );
}
