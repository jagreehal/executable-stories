import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { CliError } from './errors.js';

/** Shipped in the package, so the guidance always matches the installed version. */
const SKILLS = fileURLToPath(new URL('../skills/', import.meta.url));

export const SKILL_NAMES = [
  'executable-stories-showcase',
  'create-scenario-map',
  'scenario-pr',
  'scenario-coverage-loop',
];

const topics = () =>
  readdirSync(join(SKILLS, 'executable-stories-showcase/references')).map((f) => f.replace(/\.md$/, '')).toSorted();

/** The skill's overview, or one topic of it. */
export function guide(topic?: string): string {
  if (!topic) return readFileSync(join(SKILLS, 'executable-stories-showcase/SKILL.md'), 'utf8');

  if (!topics().includes(topic)) {
    throw new CliError('INVALID_ARGUMENT', `Unknown topic "${topic}". Topics: ${topics().join(', ')}`);
  }

  return readFileSync(join(SKILLS, `executable-stories-showcase/references/${topic}.md`), 'utf8');
}

/**
 * Copy the skills into `.agents/skills/` (Codex, Cursor and others read it) and link them
 * from `.claude/skills/` for Claude Code. Rerun after an upgrade to update them.
 */
export function installSkills(cwd: string): string[] {
  return SKILL_NAMES.map((name) => {
    const target = join(cwd, '.agents/skills', name);
    rmSync(target, { recursive: true, force: true });
    mkdirSync(dirname(target), { recursive: true });
    cpSync(join(SKILLS, name), target, { recursive: true });

    const link = join(cwd, '.claude/skills', name);
    mkdirSync(dirname(link), { recursive: true });

    if (existsSync(link) || isLink(link)) rmSync(link, { recursive: true, force: true });

    try {
      symlinkSync(relative(dirname(link), target), link, 'dir');
    } catch {
      // Windows without Developer Mode can't create symlinks: copy instead.
      cpSync(target, link, { recursive: true });
    }

    return `Installed skill ${relative(cwd, target).replaceAll('\\', '/')} (and .claude/skills/${name})`;
  });
}

const isLink = (path: string) => {
  try {
    return lstatSync(path).isSymbolicLink();
  } catch {
    return false;
  }
};

const McpConfig = z.looseObject({ mcpServers: z.record(z.string(), z.unknown()).optional() });

/**
 * Register `executable-stories-showcase mcp` with Claude Code (`.mcp.json`) and, when the project uses it,
 * Cursor (`.cursor/mcp.json`). An existing entry is kept.
 */
export function registerMcp(cwd: string, args: string[]): string[] {
  // Windows can't spawn npx directly from an MCP client: go through cmd.
  const server = process.platform === 'win32'
    ? { command: 'cmd', args: ['/c', 'npx', 'executable-stories-showcase', ...args] }
    : { command: 'npx', args: ['executable-stories-showcase', ...args] };

  const files = ['.mcp.json', ...(existsSync(join(cwd, '.cursor')) ? ['.cursor/mcp.json'] : [])];

  return files.map((file) => {
    const path = join(cwd, file);
    const config = existsSync(path) ? McpConfig.parse(JSON.parse(readFileSync(path, 'utf8'))) : {};

    if (config.mcpServers?.['executable-stories-showcase']) return `Kept the executable-stories-showcase server in ${file}`;
    writeFileSync(
      path,
      `${
        JSON.stringify(
          { ...config, mcpServers: { ...config.mcpServers, 'executable-stories-showcase': server } },
          null,
          2,
        )
      }\n`,
    );

    return `Registered the executable-stories-showcase MCP server in ${file}`;
  });
}
