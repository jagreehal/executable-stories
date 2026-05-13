import * as p from '@clack/prompts';
import pc from 'picocolors';
import type { CliDeps, Framework, RepoFacts } from './types';

export async function promptTargets(facts: RepoFacts): Promise<string[]> {
  const choice = await p.multiselect({
    message: 'Which package(s)?',
    options: facts.candidates.map((c) => ({ value: c.path, label: c.name })),
    required: true,
  });
  if (p.isCancel(choice)) return [];
  return choice as string[];
}

export async function runWizard(
  args: { facts: RepoFacts },
  _deps: CliDeps,
): Promise<{ frameworks: Framework[] } | null> {
  const { facts } = args;
  p.intro(pc.bgCyan(pc.black(' executable-stories ')));
  p.note(summarise(facts), 'detected');

  const fw = await p.multiselect({
    message: 'Which framework(s)?',
    options: [
      {
        value: 'vitest',
        label: 'Vitest',
        hint: facts.hasVitest(facts.cwd) ? 'already installed' : undefined,
      },
      {
        value: 'playwright',
        label: 'Playwright',
        hint: facts.hasPlaywright(facts.cwd) ? 'already installed' : undefined,
      },
      {
        value: 'jest',
        label: 'Jest',
        hint: facts.hasJest(facts.cwd) ? 'already installed' : undefined,
      },
      {
        value: 'cypress',
        label: 'Cypress',
        hint: facts.hasCypress(facts.cwd) ? 'already installed' : undefined,
      },
    ],
    required: true,
  });
  if (p.isCancel(fw)) {
    p.cancel('Cancelled');
    return null;
  }
  return { frameworks: fw as Framework[] };
}

function summarise(facts: RepoFacts): string {
  return [
    `package manager: ${facts.packageManager}`,
    `typescript: ${facts.hasTypeScript(facts.cwd) ? 'yes' : 'no'}`,
    `monorepo: ${facts.isMonorepo ? `yes (${facts.workspacePackages.length} workspace packages)` : 'no'}`,
  ].join('\n');
}
