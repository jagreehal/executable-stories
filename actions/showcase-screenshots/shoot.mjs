// showcase-screenshots, step 1 of 2: shoot the states a pull request touches on its base and on
// its head, and write the results for step 2. Runs the pull request's code, so it gets no token
// and pushes nothing. Inputs arrive as INPUT_* env from action.yml.
import { execSync, spawn } from 'node:child_process';
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { buildComment } from './comment.mjs';

const input = (name, fallback = '') =>
  process.env[`INPUT_${name.toUpperCase()}`]?.trim() || fallback;

const scenarios = input('scenarios');
const dev = input('dev-command');
const baseUrl = input('base-url');
const install = input('install-command', 'npm ci');
const cli = input('cli', 'npx executable-stories-showcase');
const src = input('src');
const shootArgs = input('shoot-args');
const shootAll = input('all-when-unmatched', 'true') === 'true';
const failOnError = input('fail-on-error', 'true') === 'true';
const work = input('out');

mkdirSync(work, { recursive: true });

const run = (cmd) => execSync(cmd, { stdio: 'inherit', shell: '/bin/bash' });

const read = (cmd) =>
  execSync(cmd, {
    encoding: 'utf8',
    shell: '/bin/bash',
    stdio: ['ignore', 'pipe', 'inherit'],
  });

const quote = (s) => `'${s.replaceAll("'", "'\\''")}'`;

const log = (text) => console.log(`\n▶ ${text}`);

/** Start the dev server in its own process group, wait until it answers, and return a stop function. */
async function startApp(label) {
  const output = openSync(join(work, `dev-${label}.log`), 'w');
  const child = spawn('bash', ['-c', dev], {
    detached: true,
    stdio: ['ignore', output, output],
  });
  const exited = new Promise((resolve) => child.once('exit', resolve));

  for (let i = 0; i < 120; i++) {
    const up = await fetch(baseUrl).then(
      (r) => r.status < 500,
      () => false,
    );

    if (up) {
      return async () => {
        try {
          process.kill(-child.pid, 'SIGTERM');
        } catch {
          // Already gone.
        }

        await Promise.race([exited, new Promise((r) => setTimeout(r, 10_000))]);
      };
    }

    if (child.exitCode !== null) break;
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log(readFileSync(join(work, `dev-${label}.log`), 'utf8'));
  throw new Error(`The dev server (${label}) didn't answer at ${baseUrl}`);
}

/** Run shoot and return its JSON report; shoot exits 1 when a state fails, which isn't an error here. */
function shoot(names, out, compare) {
  const flags = [
    `--only ${quote(names.join(','))}`,
    `--out ${quote(out)}`,
    '--json',
    shootArgs,
  ];

  if (compare) flags.push(`--compare ${quote(compare)}`);

  const cmd = `${cli} shoot ${quote(scenarios)} --base-url ${quote(baseUrl)} ${flags.join(' ')}`;

  try {
    return JSON.parse(read(cmd));
  } catch (err) {
    if (err.stdout) return JSON.parse(err.stdout);
    throw err;
  }
}

const listNames = () =>
  JSON.parse(read(`${cli} list ${quote(scenarios)} --json`)).map((s) => s.name);

const pr = JSON.parse(
  readFileSync(process.env.GITHUB_EVENT_PATH ?? '', 'utf8'),
).pull_request;

if (!pr) throw new Error('showcase-screenshots runs on pull_request events');

const head = read('git rev-parse HEAD').trim();

log('Install the change');
run(install);

log('Which states the change touches');

const srcFlag = src ? `--src ${quote(src)}` : '';
const affected = JSON.parse(
  read(
    `${cli} affected ${quote(scenarios)} --base ${pr.base.sha} ${srcFlag} --json`,
  ),
);
const all = shootAll && affected.unmatched.length > 0;
const names = all ? listNames() : affected.scenarios.map((s) => s.name);

console.log(
  all
    ? `Shared files changed: shooting all ${names.length} states`
    : names.join('\n') || 'None',
);

let shots = [];
let note;

if (names.length) {
  log('Shoot the base');
  run(`git switch --detach ${pr.base.sha}`);

  // Only a base without a scenarios folder (this PR adds showcase) goes without before images.
  // A failed install, dev server or shoot fails the run: carrying on would label every existing
  // state "new" and hide the change.
  if (existsSync(scenarios)) {
    run(install);
    const onBase = new Set(listNames());
    const before = names.filter((n) => onBase.has(n));

    if (before.length) {
      const stop = await startApp('base');
      let baseline;

      try {
        baseline = shoot(before, join(work, 'before'));
      } finally {
        await stop();
      }

      // A state that failed on the base was screenshotted mid-failure (a timeout, an error page):
      // comparing against it would report a change that isn't the PR's.
      const broken = baseline.filter((s) => !s.ok);

      if (broken.length) {
        for (const s of broken)
          console.error(
            `  ${s.name}: ${s.codes.join(', ')}${s.error ? `: ${s.error}` : ''}`,
          );

        throw new Error(
          `${broken.length} state(s) fail on the base, so there's nothing sound to compare against: ${broken
            .map((s) => s.name)
            .join(', ')}. Fix them on the base branch first.`,
        );
      }
    }
  } else {
    note = `The base has no ${scenarios} folder, so every state shows as new.`;
    console.log(note);
  }

  log('Shoot the change');
  run(`git switch --detach ${head}`);
  run(install);
  const stop = await startApp('head');

  try {
    const report = shoot(names, join(work, 'after'), join(work, 'before'));
    shots = report.scenarios ?? report;
  } finally {
    await stop();
  }
}

const result = {
  shots,
  affected: affected.scenarios,
  unmatched: affected.unmatched,
  all,
  note,
};

writeFileSync(join(work, 'result.json'), JSON.stringify(result, null, 2));

// The summary needs no token, so it's written here; the comment, with images, comes in step 2.
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    buildComment({ ...result, links: {}, sha: head }),
  );
}

const failing = shots.filter((s) => !s.ok);

if (failing.length && failOnError) {
  console.error(
    `\n${failing.length} state(s) fail on this change: ${failing.map((s) => s.name).join(', ')}`,
  );
  process.exit(1);
}
