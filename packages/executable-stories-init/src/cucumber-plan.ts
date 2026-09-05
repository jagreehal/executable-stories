/**
 * Turns the `.feature` files in a repo into write ops the normal apply pass
 * handles, so a Cucumber migration goes through the same dry-run, skip-if-exists
 * and --force rules as every other file this CLI writes.
 */

import { relative } from 'node:path';
import fg from 'fast-glob';
import { convertFeature } from './cucumber';
import type { CliDeps, Op } from './types';

export async function planCucumberMigration(
  args: { targets: string[] },
  deps: CliDeps,
): Promise<Op[]> {
  const ops: Op[] = [];

  for (const target of args.targets) {
    // Published packages ship .feature fixtures of their own; converting those
    // would bury the ones the repo actually owns.
    const features = await fg('**/*.feature', {
      cwd: target,
      absolute: true,
      ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
    });

    if (features.length === 0) {
      ops.push({
        kind: 'note',
        level: 'info',
        message: `No .feature files found under ${target}; nothing to convert.`,
      });
      continue;
    }

    for (const feature of features.sort()) {
      const sourcePath = relative(target, feature);
      let converted;
      try {
        converted = convertFeature(await deps.fs.readFile(feature), { sourcePath });
      } catch (error) {
        // One unreadable file in a suite of two hundred should cost that file,
        // not the run.
        ops.push({
          kind: 'note',
          level: 'warn',
          message: `Could not convert ${sourcePath}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        });
        continue;
      }

      const outPath = feature.replace(/\.feature$/, '.story.test.ts');
      ops.push({ kind: 'write', target, path: outPath, contents: converted.source });
      ops.push({
        kind: 'note',
        level: 'info',
        message:
          `${sourcePath}: ${converted.scenarioCount} scenarios converted to ` +
          `${relative(target, outPath)}. Each one fails until you port its step ` +
          `definitions; delete the .feature when they all pass.`,
      });
    }
  }

  return ops;
}
