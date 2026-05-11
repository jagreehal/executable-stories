import process from 'node:process';
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { spawn as nodeSpawn } from 'node:child_process';
import type { CliDeps, CliOpts } from './types';

export function buildOpts(flags: { json?: boolean; interactive?: boolean; yes?: boolean }): CliOpts {
  const isTty = process.stdin.isTTY ?? false;
  const json = Boolean(flags.json);
  const yes = Boolean(flags.yes);
  const interactive = !yes && !json && (Boolean(flags.interactive) || isTty);
  return { json, interactive };
}

export function buildDeps(opts: CliOpts, cwd: string = process.cwd()): CliDeps {
  return {
    cwd,
    opts,
    fs: {
      readFile: (p) => readFile(p, 'utf8'),
      writeFile: (p, c) => writeFile(p, c),
      exists: async (p) => {
        try { await access(p); return true; } catch { return false; }
      },
      mkdir: async (p) => { await mkdir(p, { recursive: true }); },
    },
    spawn: (cmd, args, { cwd }) =>
      new Promise((resolve) => {
        const child = nodeSpawn(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (d) => { stdout += d.toString(); });
        child.stderr.on('data', (d) => { stderr += d.toString(); });
        child.on('close', (code) => resolve({ code: code ?? 0, stdout, stderr }));
      }),
  };
}
