import * as p from '@clack/prompts';
import pc from 'picocolors';
import process from 'node:process';
import type { Plan, Result } from '../types';

export function renderHuman({ plan, result }: { plan: Plan; result: Result }): void {
  const lines: string[] = [];
  lines.push(pc.bold('Targets:'), '  ' + plan.summary.targets.join('\n  '));
  lines.push(pc.bold('Frameworks:'), '  ' + plan.summary.frameworks.join(', '));
  if (result.written.length) {
    lines.push(pc.green(`+ wrote (${result.written.length})`));
    lines.push(...result.written.map((w) => '  ' + w));
  }
  if (result.installed.length) {
    lines.push(pc.cyan(`↻ installed (${result.installed.length})`));
    lines.push(...result.installed.map((i) => '  ' + i));
  }
  if (result.patched.length) {
    lines.push(pc.cyan(`≡ patched (${result.patched.length})`));
    lines.push(...result.patched.map((i) => '  ' + i));
  }
  if (result.skipped.length) {
    lines.push(pc.yellow(`~ skipped (${result.skipped.length})`));
    lines.push(...result.skipped.map((s) => `  ${s.path}: ${s.reason}`));
  }
  if (result.notes.length) {
    lines.push(pc.dim('notes'));
    lines.push(...result.notes.map((n) => '  ' + n));
  }
  p.note(lines.join('\n'), 'summary');

  const targets = plan.summary.targets;
  const next: string[] = ['For each target:'];
  const pm = plan.summary.packageManager;
  const installCmd = pm === 'yarn' ? 'yarn install' : `${pm} install`;
  const runTest = pm === 'yarn' ? 'yarn test' : `${pm} run test`;
  const playwrightInstall = pm === 'yarn' ? 'yarn playwright install' : `${pm} exec playwright install`;
  const openReport = reportOpenCommand();
  for (const t of targets) {
    next.push(`  cd ${t}`);
    next.push(`  ${installCmd}`);
    next.push(`  ${runTest}`);
    if (plan.summary.frameworks.includes('playwright')) {
      next.push(`  ${playwrightInstall}`);
    }
    next.push(`  ${openReport}`);
    next.push('');
  }
  p.outro(`Next:\n${next.join('\n').trimEnd()}`);
}

function reportOpenCommand(): string {
  switch (process.platform) {
    case 'darwin': return 'open reports/executable-stories.html';
    case 'win32': return 'start reports\\executable-stories.html';
    default: return 'xdg-open reports/executable-stories.html';
  }
}
