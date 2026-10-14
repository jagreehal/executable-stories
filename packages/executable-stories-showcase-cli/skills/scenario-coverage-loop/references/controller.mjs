// Picks the next states for the coverage loop from `executable-stories-showcase coverage --json`.
// Usage: node scripts/scenario-coverage-next.mjs coverage.json [batch=3] > selected.md
// Prints Markdown for the agent's prompt, or nothing when no state is missing.
// Adapt SCOPE and rank() to what the team agreed; keep it deterministic.
/* global process, console -- a Node script the user copies into their repo */
import { readFileSync } from 'node:fs';

const [file, batch = '3'] = process.argv.slice(2);

const report = JSON.parse(readFileSync(file, 'utf8'));

// Features the loop may add states for; empty means all of them.
const SCOPE = [];

// Lower first: empty and error states, then the map's own order.
const rank = (row) => (/empty|error|fail/i.test(row.state) ? 0 : 1);

const next = report.missingStates
  .map((row, order) => ({ row, order }))
  .filter(({ row }) => !SCOPE.length || SCOPE.includes(row.feature))
  .toSorted((a, b) => rank(a.row) - rank(b.row) || a.order - b.order)
  .slice(0, Number(batch))
  .map(({ row }) => row);

// The map's planned name, or <feature>-<state> in kebab-case.
const nameOf = (row) =>
  row.scenario ||
  `${row.feature}-${row.state}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

if (next.length) {
  console.log(
    `Coverage now: ${report.covered}/${report.covered + report.missing} states.\n`,
  );
  console.log('Add a scenario for each of these states:\n');

  for (const r of next) {
    console.log(
      `- ${r.feature} / ${r.state} (route ${r.route || '?'}), name it \`${nameOf(r)}\`; map row at ${r.at}`,
    );
  }
}
