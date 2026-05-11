import { promptTargets } from './wizard';
import type { CliOpts, RepoFacts } from './types';

function targetLeaf(path: string): string {
  const normalized = path.replace(/\\/g, '/');
  return normalized.split('/').filter(Boolean).at(-1) ?? normalized;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function targetHelpList(facts: RepoFacts): string {
  const names = facts.workspacePackages.map((w) => w.name);
  const leaves = facts.workspacePackages.map((w) => targetLeaf(w.path));
  return unique(['root', ...names, ...leaves]).join(', ');
}

export async function resolveTargets(
  flag: string[] | undefined,
  facts: RepoFacts,
  opts: CliOpts,
): Promise<string[]> {
  if (flag && flag.length > 0) {
    const out: string[] = [];
    for (const t of flag) {
      if (t === 'root') { out.push(facts.cwd); continue; }
      const matches = facts.workspacePackages.filter(
        (w) => w.name === t || targetLeaf(w.path) === t,
      );
      if (matches.length === 1) out.push(matches[0].path);
      else if (matches.length > 1) {
        throw new Error(
          `ambiguous target: ${t}\n` +
          `matches:\n` +
          `${matches.map((w) => `  - ${w.name} (${w.path})`).join('\n')}\n` +
          `tip: use the full workspace package name with --target`,
        );
      }
      else {
        const validNames = targetHelpList(facts);
        throw new Error(
          `unknown target: ${t}\n` +
          `valid targets: ${validNames}\n` +
          `tip: use --target root for the repo root`,
        );
      }
    }
    return unique(out);
  }
  if (!facts.isMonorepo) return [facts.cwd];
  if (!opts.interactive) return [facts.cwd];
  return promptTargets(facts);
}
