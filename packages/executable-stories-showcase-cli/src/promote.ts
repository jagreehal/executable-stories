import { existsSync, readdirSync, readFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { createCatalog, parseScenario, type Scenario, type ScenarioRule } from 'executable-stories-showcase';

/**
 * Move `proposed/*.json` into the catalog dir after each draft resolves against
 * the existing catalog. Refuses duplicate names.
 */
export function promoteScenarios(
  dir: string,
  { rules = [], dryRun = false }: { rules?: ScenarioRule[]; dryRun?: boolean; } = {},
) {
  const proposedDir = join(dir, 'proposed');

  const moved: string[] = [];
  const skipped: string[] = [];

  if (!existsSync(proposedDir)) {
    console.log(`No ${proposedDir}; nothing to promote.`);

    return { moved, skipped };
  }

  const existingFiles = readdirSync(dir).filter((f) => f.endsWith('.json'));
  const existing = existingFiles.map((f) => readJson(join(dir, f)));
  const proposed = readdirSync(proposedDir).filter((f) => f.endsWith('.json'));

  if (!proposed.length) {
    console.log(`No drafts in ${proposedDir}.`);

    return { moved, skipped };
  }

  for (const file of proposed) {
    const from = join(proposedDir, file);
    let draft: Scenario;

    try {
      draft = parseScenario(readJson(from), file);
    } catch (err) {
      skipped.push(file);
      console.error(`✗ ${file}: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }

    const { name } = draft;

    if (existing.some((s) => s.name === name)) {
      skipped.push(file);
      console.error(`✗ ${file}: scenario "${name}" already exists in ${dir}`);
      continue;
    }

    if (existingFiles.includes(file)) {
      skipped.push(file);
      console.error(`✗ ${file}: ${join(dir, file)} already exists`);
      continue;
    }

    try {
      const next = createCatalog([...existing, draft], { rules });
      next.resolve(next.get(name)!);
    } catch (err) {
      skipped.push(file);
      console.error(`✗ ${file}: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }

    const to = join(dir, file);

    if (dryRun) console.log(`~ ${from} → ${to}`);
    else {
      renameSync(from, to);
      console.log(`+ ${to}`);
    }

    moved.push(file);
    existing.push(draft);
    existingFiles.push(file);
  }

  if (dryRun && moved.length) {
    console.log(`\nDry run: ${moved.length} would move, ${skipped.length} skipped.`);
  } else if (moved.length) {
    console.log(`\nPromoted ${moved.length}; review with validate, then shoot.`);
  }

  return { moved, skipped };
}

function readJson(file: string) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (err) {
    throw new Error(`${file}: ${err instanceof Error ? err.message : String(err)}`, { cause: err });
  }
}
