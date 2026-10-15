// showcase-screenshots, step 2 of 2: publish the images from step 1 and post one PR comment.
// Runs no code from the pull request. It runs the CLI from a checkout of the base, and reads
// step 1's files as untrusted data: names are checked, and only image files in step 1's folder
// are published.
import { execFileSync, execSync } from 'node:child_process';
import { existsSync, lstatSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { buildComment, MARKER } from './comment.mjs';

const input = (name, fallback = '') =>
  process.env[`INPUT_${name.toUpperCase()}`]?.trim() || fallback;

const cli = input('cli', 'npx executable-stories-showcase');
const branch = input('branch', 'scenario-shots');
const work = input('out');

const quote = (s) => `'${s.replaceAll("'", "'\\''")}'`;

const read = (cmd) =>
  execSync(cmd, {
    encoding: 'utf8',
    shell: '/bin/bash',
    stdio: ['ignore', 'pipe', 'inherit'],
  });

// The PR number, head and fork-ness come from this job's own event, not from step 1.
const pr = JSON.parse(
  readFileSync(process.env.GITHUB_EVENT_PATH ?? '', 'utf8'),
).pull_request;

if (!pr) throw new Error('showcase-screenshots runs on pull_request events');

const repo = process.env.GITHUB_REPOSITORY;
const fork = pr.head.repo?.full_name !== pr.base.repo.full_name;
const resultFile = join(work, 'result.json');

if (!existsSync(resultFile))
  throw new Error(`No ${resultFile}: step 1 (shoot) didn't finish`);

const raw = JSON.parse(readFileSync(resultFile, 'utf8'));
const str = (v) => (typeof v === 'string' ? v : '');
const arr = (v) => (Array.isArray(v) ? v : []);

const shots = arr(raw.shots).map((s) => ({
  name: str(s?.name),
  ok: s?.ok === true,
  codes: arr(s?.codes).map(str),
  error: s?.error == null ? null : str(s.error),
  screenshot: str(s?.screenshot),
  compare: s?.compare && {
    status: ['same', 'changed', 'new'].includes(s.compare.status)
      ? s.compare.status
      : 'same',
    ratio: Number(s.compare.ratio) || 0,
    image: s.compare.image == null ? null : str(s.compare.image),
  },
}));

/** A file in step 1's after/ folder, by base name only: never a path step 1 chose. */
const local = (file) => {
  const name = basename(file);
  const path = join(work, 'after', name);

  return /^[\w.-]+\.png$/.test(name) &&
    existsSync(path) &&
    lstatSync(path).isFile()
    ? path
    : undefined;
};

const images = shots.flatMap((s) => {
  if (!s.ok) return [];

  const file =
    s.compare?.status === 'changed'
      ? s.compare.image
      : !s.compare || s.compare.status === 'new'
        ? s.screenshot
        : null;
  const path = file && local(file);

  return path ? [path] : [];
});

let note = str(raw.note) || undefined;
let links = {};

if (images.length && fork) {
  note = [
    note,
    'Images aren’t published for pull requests from forks; they’re in the workflow run’s artifacts.',
  ]
    .filter(Boolean)
    .join(' ');
} else if (images.length) {
  const published = JSON.parse(
    read(
      `${cli} publish ${images.map(quote).join(' ')} --folder pr-${Number(pr.number)} --branch ${quote(branch)} --json`,
    ),
  );

  links = Object.fromEntries(published.map((l) => [l.file, l.url]));
}

const body = buildComment({
  shots,
  affected: arr(raw.affected).map((a) => ({
    name: str(a?.name),
    reasons: arr(a?.reasons).map((r) => ({
      kind: str(r?.kind),
      detail: str(r?.detail),
    })),
  })),
  unmatched: arr(raw.unmatched).map(str),
  all: raw.all === true,
  links,
  sha: pr.head.sha,
  note,
});

const bodyFile = join(work, 'comment.md');
writeFileSync(bodyFile, body);

if (fork || input('comment', 'true') !== 'true') process.exit(0);

// Only the action's own comment, not one that merely carries the marker.
const gh = (args) =>
  execFileSync('gh', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });
const existing = gh([
  'api',
  '--paginate',
  `repos/${repo}/issues/${pr.number}/comments`,
  '--jq',
  `.[] | select(.user.login == "github-actions[bot]" and (.body | contains("${MARKER}"))) | .id`,
])
  .trim()
  .split('\n')[0];

gh(
  existing
    ? [
        'api',
        '-X',
        'PATCH',
        `repos/${repo}/issues/comments/${existing}`,
        '-F',
        `body=@${bodyFile}`,
        '--silent',
      ]
    : [
        'api',
        `repos/${repo}/issues/${pr.number}/comments`,
        '-F',
        `body=@${bodyFile}`,
        '--silent',
      ],
);
