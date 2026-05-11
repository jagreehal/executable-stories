import type { CliDeps, Op, Plan, Result } from './types';

export async function applyPlan(
  args: { plan: Plan; dryRun: boolean; force: boolean },
  deps: CliDeps,
): Promise<Result> {
  const { plan, dryRun, force } = args;
  const written: string[] = [];
  const installed: string[] = [];
  const patched: string[] = [];
  const skipped: Result['skipped'] = [];
  const notes: string[] = [];

  for (const op of plan.ops) {
    if (dryRun) {
      notes.push(`[dry-run] ${describeOp(op)}`);
      continue;
    }
    switch (op.kind) {
      case 'write':
        await applyWrite(op, force, deps, written, skipped);
        break;
      case 'install':
        await applyInstall(op, deps, installed);
        break;
      case 'patch-package-json':
        await applyPatch(op, force, deps, patched, skipped);
        break;
      case 'note':
        notes.push(`${op.level}: ${op.message}`);
        break;
    }
  }

  return { ok: true, written, installed, patched, skipped, notes };
}

function describeOp(op: Op): string {
  switch (op.kind) {
    case 'write':
      return `write ${op.path}`;
    case 'install':
      return `install ${op.deps.join(' ')} in ${op.target}`;
    case 'patch-package-json':
      return `patch ${op.target}/package.json scripts: ${Object.keys(op.scripts).join(', ')}`;
    case 'note':
      return op.message;
  }
}

async function applyWrite(
  op: Extract<Op, { kind: 'write' }>,
  force: boolean,
  deps: CliDeps,
  written: string[],
  skipped: Result['skipped'],
): Promise<void> {
  if (await deps.fs.exists(op.path)) {
    const existing = await deps.fs.readFile(op.path);
    if (existing === op.contents) {
      skipped.push({ path: op.path, reason: 'identical' });
      return;
    }
    if (!force) {
      skipped.push({ path: op.path, reason: 'exists; use --force to overwrite' });
      return;
    }
  }
  await deps.fs.mkdir(parentDir(op.path));
  await deps.fs.writeFile(op.path, op.contents);
  written.push(op.path);
}

async function applyInstall(
  op: Extract<Op, { kind: 'install' }>,
  deps: CliDeps,
  installed: string[],
): Promise<void> {
  const pmCmd = op.packageManager;
  const args = pmCmd === 'npm'
    ? ['install', '--save-dev', ...op.deps]
    : ['add', '-D', ...op.deps];
  const r = await deps.spawn(pmCmd, args, { cwd: op.target });
  if (r.code !== 0) {
    const stderr = r.stderr.trim() || '(no stderr output)';
    const manual = `${pmCmd} ${args.join(' ')}`;
    throw new Error(
      `${pmCmd} dependency install failed in ${op.target}\n` +
      `command: ${manual}\n` +
      `stderr: ${stderr}\n` +
      `next steps:\n` +
      `  1. Run with --dry-run to inspect planned operations.\n` +
      `  2. Re-run install manually in target: cd ${op.target} && ${manual}\n` +
      `  3. Verify your package manager and lockfile are healthy.`,
    );
  }
  installed.push(...op.deps);
}

async function applyPatch(
  op: Extract<Op, { kind: 'patch-package-json' }>,
  force: boolean,
  deps: CliDeps,
  patched: string[],
  skipped: Result['skipped'],
): Promise<void> {
  const path = `${op.target}/package.json`;
  const raw = await deps.fs.readFile(path);
  const pkg = JSON.parse(raw);
  pkg.scripts = pkg.scripts ?? {};
  let changed = false;
  for (const [name, value] of Object.entries(op.scripts)) {
    const existing = pkg.scripts[name];
    if (existing === value) {
      skipped.push({ path: `${path}#scripts.${name}`, reason: 'identical' });
      continue;
    }
    if (existing && !force) {
      skipped.push({ path: `${path}#scripts.${name}`, reason: `exists: ${existing}` });
      continue;
    }
    pkg.scripts[name] = value;
    changed = true;
  }
  if (changed) {
    await deps.fs.writeFile(path, JSON.stringify(pkg, null, 2) + '\n');
    patched.push(path);
  }
}

function parentDir(path: string): string {
  if (/^[A-Za-z]:\\[^\\]+$/.test(path) || /^[A-Za-z]:\\[^\\]*\.[^\\]+$/.test(path)) {
    return `${path.slice(0, 2)}\\`;
  }
  const normalized = path.replace(/\\/g, '/');
  const idx = normalized.lastIndexOf('/');
  if (idx <= 0) return '.';
  const dir = normalized.slice(0, idx);
  if (/^[A-Za-z]:$/.test(dir) && path.includes('\\')) return `${dir}\\`;
  return dir.replace(/\//g, path.includes('\\') ? '\\' : '/');
}
