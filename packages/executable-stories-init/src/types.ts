export type PackageManager = 'pnpm' | 'npm' | 'yarn';
export type Framework = 'vitest' | 'playwright';

export type WorkspacePackage = { name: string; path: string };

export type RepoFacts = {
  cwd: string;
  packageManager: PackageManager;
  isMonorepo: boolean;
  workspacePackages: WorkspacePackage[];
  candidates: WorkspacePackage[]; // monorepo: [root, ...workspacePackages]; single: [root]
  hasTypeScript: (target: string) => boolean;
  hasDependency: (target: string, dep: string) => boolean;
  hasVitest: (target: string) => boolean;
  hasPlaywright: (target: string) => boolean;
  hasExistingVitestConfig: (target: string) => boolean;
  hasExistingPlaywrightConfig: (target: string) => boolean;
};

export type ResolvedFlags = {
  targets: string[]; // absolute paths
  frameworks: Framework[];
  writeTsconfig: boolean;
  force: boolean;
};

export type Op =
  | { kind: 'install'; target: string; deps: string[]; dev: true; packageManager: PackageManager }
  | { kind: 'write'; target: string; path: string; contents: string }
  | { kind: 'patch-package-json'; target: string; scripts: Record<string, string> }
  | { kind: 'note'; level: 'info' | 'warn'; message: string };

export type Plan = {
  ops: Op[];
  summary: { targets: string[]; frameworks: Framework[]; packageManager: PackageManager };
};

export type Result = {
  ok: boolean;
  written: string[];
  installed: string[];
  patched: string[];
  skipped: { path: string; reason: string }[];
  notes: string[];
};

export type CliOpts = { json: boolean; interactive: boolean };

export type CliDeps = {
  cwd: string;
  fs: {
    readFile: (path: string) => Promise<string>;
    writeFile: (path: string, contents: string) => Promise<void>;
    exists: (path: string) => Promise<boolean>;
    mkdir: (path: string) => Promise<void>;
  };
  spawn: (cmd: string, args: string[], opts: { cwd: string }) => Promise<{ code: number; stdout: string; stderr: string }>;
  opts: CliOpts;
};
