import { readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import fg from 'fast-glob';
import type { RepoFacts, PackageManager, WorkspacePackage } from './types';

async function exists(p: string): Promise<boolean> {
  try { await access(p); return true; } catch { return false; }
}

async function readJson(path: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(path, 'utf8')) as Record<string, unknown>;
}

const EMPTY_PKG: Record<string, unknown> = {};

async function detectPackageManager(cwd: string): Promise<PackageManager> {
  const root = await readJson(join(cwd, 'package.json')).catch(() => EMPTY_PKG);
  if (typeof root.packageManager === 'string') {
    if (root.packageManager.startsWith('pnpm')) return 'pnpm';
    if (root.packageManager.startsWith('yarn')) return 'yarn';
    if (root.packageManager.startsWith('npm')) return 'npm';
  }
  if (await exists(join(cwd, 'pnpm-lock.yaml'))) return 'pnpm';
  if (await exists(join(cwd, 'yarn.lock'))) return 'yarn';
  return 'npm';
}

function depPresent(pkg: Record<string, unknown> | undefined, name: string): boolean {
  const deps = pkg?.dependencies as Record<string, unknown> | undefined;
  const devDeps = pkg?.devDependencies as Record<string, unknown> | undefined;
  return Boolean(deps?.[name] || devDeps?.[name]);
}

async function statSet(target: string): Promise<Set<string>> {
  const flags = new Set<string>();
  if (await exists(join(target, 'tsconfig.json'))) flags.add('ts');
  for (const f of ['vitest.config.ts', 'vitest.config.js', 'vitest.config.mjs']) {
    if (await exists(join(target, f))) { flags.add('vitest-config'); break; }
  }
  for (const f of ['playwright.config.ts', 'playwright.config.js', 'playwright.config.mjs']) {
    if (await exists(join(target, f))) { flags.add('playwright-config'); break; }
  }
  for (const f of ['jest.config.ts', 'jest.config.js', 'jest.config.mjs', 'jest.config.cjs', 'jest.config.json']) {
    if (await exists(join(target, f))) { flags.add('jest-config'); break; }
  }
  for (const f of ['cypress.config.ts', 'cypress.config.js', 'cypress.config.mjs', 'cypress.config.cjs']) {
    if (await exists(join(target, f))) { flags.add('cypress-config'); break; }
  }
  return flags;
}

async function readWorkspaceGlobs(cwd: string): Promise<string[] | null> {
  const pw = join(cwd, 'pnpm-workspace.yaml');
  if (await exists(pw)) {
    const text = await readFile(pw, 'utf8');
    // Minimal parser: lines starting with "- " under a top-level `packages:` key.
    const lines = text.split('\n');
    const globs: string[] = [];
    let inPackages = false;
    for (const raw of lines) {
      const line = raw.trim();
      if (line.startsWith('packages:')) { inPackages = true; continue; }
      if (inPackages) {
        if (line.startsWith('- ')) {
          globs.push(line.slice(2).replace(/^["']|["']$/g, ''));
        } else if (line && !line.startsWith('#')) {
          break;
        }
      }
    }
    return globs;
  }
  const rootPkg = await readJson(join(cwd, 'package.json')).catch(() => EMPTY_PKG);
  const workspaces = rootPkg.workspaces;
  if (Array.isArray(workspaces)) return workspaces as string[];
  const workspacePkgs = (workspaces as Record<string, unknown> | undefined)?.packages;
  if (Array.isArray(workspacePkgs)) return workspacePkgs as string[];
  return null;
}

async function listWorkspacePackages(cwd: string): Promise<WorkspacePackage[]> {
  const globs = await readWorkspaceGlobs(cwd);
  if (!globs) return [];
  const pjPaths = await fg(globs.map((g) => g.replace(/\/?$/, '/package.json')), { cwd, absolute: true });
  const out: WorkspacePackage[] = [];
  for (const pj of pjPaths) {
    const pkg = await readJson(pj).catch(() => EMPTY_PKG);
    if (typeof pkg.name === 'string') out.push({ name: pkg.name, path: pj.replace(/\/package\.json$/, '') });
  }
  return out;
}

export async function detectRepo(args: { cwd: string }, _deps: unknown): Promise<RepoFacts> {
  const { cwd } = args;
  const rootPkg = await readJson(join(cwd, 'package.json')).catch(() => EMPTY_PKG);
  const packageManager = await detectPackageManager(cwd);

  const stats = new Map<string, Set<string>>();
  stats.set(cwd, await statSet(cwd));

  const pkgCache = new Map<string, Record<string, unknown>>();
  pkgCache.set(cwd, rootPkg);

  const rootName = typeof rootPkg.name === 'string' ? rootPkg.name : 'root';
  const rootCandidate: WorkspacePackage = { name: rootName, path: cwd };

  const workspacePackages = await listWorkspacePackages(cwd);
  const isMonorepo = workspacePackages.length > 0;
  const candidates: WorkspacePackage[] = isMonorepo
    ? [rootCandidate, ...workspacePackages]
    : [rootCandidate];

  for (const wp of workspacePackages) {
    pkgCache.set(wp.path, await readJson(join(wp.path, 'package.json')).catch(() => EMPTY_PKG));
    stats.set(wp.path, await statSet(wp.path));
  }

  return {
    cwd,
    packageManager,
    isMonorepo,
    workspacePackages,
    candidates,
    hasDependency: (t, dep) => depPresent(pkgCache.get(t) ?? rootPkg, dep),
    hasTypeScript: (t) => stats.get(t)?.has('ts') ?? false,
    hasVitest: (t) => depPresent(pkgCache.get(t) ?? rootPkg, 'vitest'),
    hasPlaywright: (t) => depPresent(pkgCache.get(t) ?? rootPkg, '@playwright/test'),
    hasJest: (t) => depPresent(pkgCache.get(t) ?? rootPkg, 'jest'),
    hasCypress: (t) => depPresent(pkgCache.get(t) ?? rootPkg, 'cypress'),
    hasExistingVitestConfig: (t) => stats.get(t)?.has('vitest-config') ?? false,
    hasExistingPlaywrightConfig: (t) => stats.get(t)?.has('playwright-config') ?? false,
    hasExistingJestConfig: (t) => stats.get(t)?.has('jest-config') ?? false,
    hasExistingCypressConfig: (t) => stats.get(t)?.has('cypress-config') ?? false,
  };
}
