import { Command } from 'commander';
import process from 'node:process';
import { resolve } from 'node:path';
import * as p from '@clack/prompts';
import { buildOpts, buildDeps } from './factory';
import { detectRepo } from './detect';
import { resolvePlan } from './plan';
import { applyPlan } from './apply';
import { renderJson } from './render/json';
import { renderHuman } from './render/human';
import { runWizard } from './wizard';
import type { Framework, ResolvedFlags, Plan } from './types';
import { resolveTargets } from './targets';
import { formatCliError } from './errors';

async function confirmPlan(plan: Plan): Promise<boolean> {
  const lines = [
    `Targets: ${plan.summary.targets.join(', ')}`,
    `Frameworks: ${plan.summary.frameworks.join(', ')}`,
    '',
    'Operations:',
    ...plan.ops.map((op) => {
      switch (op.kind) {
        case 'install': return `  install ${op.deps.join(' ')} (${op.packageManager})`;
        case 'write': return `  write ${op.path}`;
        case 'patch-package-json': return `  patch ${op.target}/package.json scripts: ${Object.keys(op.scripts).join(', ')}`;
        case 'note': return `  ${op.level}: ${op.message}`;
      }
    }),
  ];
  p.note(lines.join('\n'), 'plan preview');
  const ok = await p.confirm({ message: 'Proceed?', initialValue: true });
  return !p.isCancel(ok) && ok === true;
}

const program = new Command();

program
  .name('executable-stories-init')
  .description('Bootstrap executable-stories (Vitest + Playwright) into a TypeScript repo')
  .argument('[target]', 'target directory (defaults to cwd)')
  .option('--vitest', 'set up Vitest')
  .option('--playwright', 'set up Playwright')
  .option('--both', 'set up both Vitest and Playwright')
  .option('--ts', 'write tsconfig.json if missing')
  .option('--no-ts', 'do not write tsconfig.json')
  .option('-y, --yes', 'accept all defaults, non-interactive')
  .option('--dry-run', 'print plan but do not write or install')
  .option('--json', 'machine-readable JSON output (implies --yes)')
  .option('--interactive', 'force interactive prompts')
  .option('--force', 'overwrite differing existing files')
  .option('--target <pkg...>', 'workspace package(s) to set up (default: prompt or root)')
  .action(async (target: string | undefined, opts: Record<string, unknown>) => {
    const cliOpts = buildOpts(opts as { json?: boolean; interactive?: boolean; yes?: boolean });
    try {
      const cwd = resolve((target as string | undefined) ?? process.cwd());
      const deps = buildDeps(cliOpts, cwd);
      const facts = await detectRepo({ cwd }, deps);

      const frameworks: Framework[] = opts.both
        ? ['vitest', 'playwright']
        : ([opts.vitest && 'vitest', opts.playwright && 'playwright'].filter(Boolean) as Framework[]);

      if (frameworks.length === 0 && cliOpts.json) {
        console.error(formatCliError('--json requires at least one of --vitest, --playwright, --both', true));
        process.exit(2);
      }

      if (frameworks.length === 0) {
        const chosen = await runWizard({ facts }, deps);
        if (!chosen) process.exit(130);
        frameworks.push(...chosen.frameworks);
      }

      const targets = await resolveTargets(opts.target as string[] | undefined, facts, cliOpts);
      if (targets.length === 0) process.exit(130);
      const flags: ResolvedFlags = {
        targets,
        frameworks,
        writeTsconfig: opts.ts === true && targets.some((t) => !facts.hasTypeScript(t)),
        force: Boolean(opts.force),
      };

      const plan = await resolvePlan({ facts, flags }, deps);

      if (cliOpts.interactive && !opts.dryRun) {
        const ok = await confirmPlan(plan);
        if (!ok) {
          if (!cliOpts.json) console.log('Cancelled.');
          process.exit(130);
        }
      }

      const result = await applyPlan({ plan, dryRun: Boolean(opts.dryRun), force: flags.force }, deps);

      if (cliOpts.json) {
        console.log(renderJson({ plan, result }));
      } else {
        renderHuman({ plan, result });
      }

      process.exit(result.ok ? 0 : 1);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(formatCliError(message, cliOpts.json));
      process.exit(1);
    }
  });

await program.parseAsync(process.argv);
