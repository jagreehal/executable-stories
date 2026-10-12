// Exits non-zero when an output the docs need is missing. `pnpm walkthrough` clears
// docs/ before each run, so every file checked here comes from this run.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';

const run = JSON.parse(readFileSync('reports/raw-run.json', 'utf8'));

const walkthroughs = run.testCases.length;

const problems = [];

for (const file of ['docs/walkthroughs.md', 'docs/walkthroughs.html']) {
  if (!existsSync(file) || statSync(file).size === 0) problems.push(`${file} missing or empty`);
}

if (
  existsSync('docs/walkthroughs.md') && readFileSync('docs/walkthroughs.md', 'utf8').includes('data:image')
) {
  problems.push('docs/walkthroughs.md embeds base64 images instead of linking docs/assets');
}

const gifs = existsSync('docs/gif') ? readdirSync('docs/gif').filter((f) => f.endsWith('.gif')).length : 0;

if (gifs !== walkthroughs) problems.push(`${gifs} GIF(s) for ${walkthroughs} walkthrough(s)`);

if (problems.length) {
  for (const p of problems) console.error(`✗ ${p}`);
  process.exit(1);
}

console.log(`✓ ${walkthroughs} walkthrough(s): docs/walkthroughs.md, docs/walkthroughs.html, ${gifs} GIF(s)`);
