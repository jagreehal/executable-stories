import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { initScenarios } from '../../../packages/executable-stories-showcase-cli/src/init.ts';
import { promoteScenarios } from '../../../packages/executable-stories-showcase-cli/src/promote.ts';
import type { ScenarioInput } from '../../../packages/executable-stories-showcase/src/schema.ts';

describe('initScenarios', () => {
  it('writes default.json and scenario.schema.json without overwriting', () => {
    const root = mkdtempSync(join(tmpdir(), 'ss-init-'));
    writeFileSync(join(root, 'vite.config.ts'), 'export default {}\n');
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    initScenarios('src/scenarios', root);

    const def = join(root, 'src/scenarios/default.json');
    const schema = join(root, 'src/scenario.schema.json');
    expect(existsSync(def)).toBe(true);
    expect(existsSync(schema)).toBe(true);
    expect(JSON.parse(readFileSync(def, 'utf8')).name).toBe('default');
    const out = log.mock.calls.flat().join('\n');
    expect(out).toMatch(/startScenarios/);
    // Root-relative so the glob works from whichever file the snippet is pasted into.
    expect(out).toContain(`import.meta.glob<ScenarioInput>('/src/scenarios/*.json'`);
    log.mockClear();

    writeFileSync(def, '{"name":"default","description":"kept"}\n');
    initScenarios('src/scenarios', root);
    expect(JSON.parse(readFileSync(def, 'utf8')).description).toBe('kept');
    expect(log.mock.calls.flat().join('\n')).toMatch(/Kept existing src\/scenarios\/default\.json/);

    log.mockRestore();
  });
});

describe('initScenarios for Next.js', () => {
  it('prints the save route for the scenarios folder', () => {
    const root = mkdtempSync(join(tmpdir(), 'ss-init-next-'));
    writeFileSync(join(root, 'next.config.ts'), 'export default {}\n');
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    initScenarios('scenarios', root);

    const out = log.mock.calls.flat().join('\n');
    expect(out).toContain('app/%5F%5Fexecutable-stories-showcase/save/route.ts');
    expect(out).toContain(`createSaveRoute({ dir: 'scenarios' })`);
    log.mockRestore();
  });
});

describe('promoteScenarios', () => {
  it('moves valid proposed drafts and refuses duplicates', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ss-promote-'));
    writeFileSync(
      join(dir, 'default.json'),
      JSON.stringify({ name: 'default', network: [{ path: '/a', response: { body: 1 } }] }),
    );
    mkdirSync(join(dir, 'proposed'));
    writeFileSync(
      join(dir, 'proposed', 'empty.json'),
      JSON.stringify({
        name: 'empty',
        extends: 'default',
        network: [{ path: '/a', response: { body: [] } }],
        ready: 'text=Empty',
      }),
    );
    writeFileSync(
      join(dir, 'proposed', 'default.json'),
      JSON.stringify({ name: 'default', ready: 'text=dup' }),
    );

    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const result = promoteScenarios(dir);
    expect(result.moved).toEqual(['empty.json']);
    expect(result.skipped).toContain('default.json');
    expect(existsSync(join(dir, 'empty.json'))).toBe(true);
    expect(existsSync(join(dir, 'proposed', 'empty.json'))).toBe(false);
    err.mockRestore();
    log.mockRestore();
  });
});

describe('promoteScenarios with invalid JSON', () => {
  it('skips an unparseable draft and moves the rest', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ss-promote-bad-'));
    writeFileSync(join(dir, 'default.json'), JSON.stringify({ name: 'default' }));
    mkdirSync(join(dir, 'proposed'));
    writeFileSync(join(dir, 'proposed', 'invalid.json'), '{ nope');
    writeFileSync(join(dir, 'proposed', 'ok.json'), JSON.stringify({ name: 'ok', extends: 'default' }));

    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const result = promoteScenarios(dir);
    expect(result).toEqual({ moved: ['ok.json'], skipped: ['invalid.json'] });
    expect(err.mock.calls.flat().join('\n')).toMatch(/invalid\.json/);
    err.mockRestore();
    log.mockRestore();
  });

  it('names the catalog file that is not valid JSON', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ss-promote-badcat-'));
    writeFileSync(join(dir, 'default.json'), '{ nope');
    mkdirSync(join(dir, 'proposed'));
    writeFileSync(join(dir, 'proposed', 'ok.json'), JSON.stringify({ name: 'ok' }));

    expect(() => promoteScenarios(dir)).toThrow(/default\.json/);
  });
});

describe('installing the agent skills and MCP server', () => {
  it('copies skills into .agents, links them from .claude, and keeps an existing MCP entry', async () => {
    const { installSkills, registerMcp, SKILL_NAMES } = await import(
      '../../../packages/executable-stories-showcase-cli/src/skills.ts'
    );
    const root = mkdtempSync(join(tmpdir(), 'ss-skills-'));

    installSkills(root);
    installSkills(root); // rerun after an upgrade replaces them
    expect(readFileSync(join(root, '.agents/skills/executable-stories-showcase/SKILL.md'), 'utf8')).toMatch(
      /^---\nname: executable-stories-showcase/,
    );
    expect(existsSync(join(root, '.agents/skills/executable-stories-showcase/references/mcp.md'))).toBe(true);
    expect(readFileSync(join(root, '.claude/skills/create-scenario-map/SKILL.md'), 'utf8')).toContain(
      'create-scenario-map',
    );

    // Agents find a skill by its frontmatter name, which must match its folder.
    for (const name of SKILL_NAMES) {
      expect(readFileSync(join(root, `.agents/skills/${name}/SKILL.md`), 'utf8')).toMatch(
        new RegExp(`^---\\nname: ${name}\\n`),
      );
    }

    writeFileSync(join(root, '.mcp.json'), '{"mcpServers":{"other":{"command":"x"}}}');
    expect(registerMcp(root, ['mcp', 'src/scenarios', '--base-url', 'http://localhost:5173'])).toEqual([
      'Registered the executable-stories-showcase MCP server in .mcp.json',
    ]);
    const config = JSON.parse(readFileSync(join(root, '.mcp.json'), 'utf8'));
    expect(Object.keys(config.mcpServers)).toEqual(['other', 'executable-stories-showcase']);
    expect(config.mcpServers['executable-stories-showcase'].args).toContain('mcp');
    expect(registerMcp(root, [])).toEqual(['Kept the executable-stories-showcase server in .mcp.json']);
  });
});

describe('doctor', () => {
  /** A page whose session has started, showing `active` (or no scenario). */
  const app = async (active?: string) => {
    const { createServer } = await import('node:http');
    const marker = active ? `document.documentElement.dataset.scenario = ${JSON.stringify(active)};` : '';

    const server = createServer((_, res) =>
      res.end(`<script>globalThis.executableStoriesShowcasePage = {}; ${marker}</script>`)
    );

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();

    return { server, baseURL: `http://127.0.0.1:${address instanceof Object ? address.port : 0}` };
  };

  const doctor = async (baseURL: string, scenarios: ScenarioInput[]) => {
    const { createCatalog } = await import('../../../packages/executable-stories-showcase/src/catalog.ts');
    const { runDoctor } = await import('../../../packages/executable-stories-showcase-cli/src/doctor.ts');

    return runDoctor({
      dir: 'scenarios',
      baseURL,
      loadCatalog: () => createCatalog(scenarios),
      flags: {},
      cwd: mkdtempSync(join(tmpdir(), 'ss-doctor-')),
    });
  };

  it('reports a scenario with a broken extends instead of throwing', { timeout: 30_000 }, async () => {
    const { server, baseURL } = await app();

    try {
      const checks = await doctor(baseURL, [{ name: 'broken', extends: 'missing' }]);

      expect(checks.find((c) => c.name === 'scenarios')).toMatchObject({ status: 'fail' });
      expect(checks.find((c) => c.name === 'session')).toMatchObject({ status: 'ok' });
    } finally {
      server.close();
    }
  });

  it('warns, not fails, when the save route answers with the app page', { timeout: 30_000 }, async () => {
    const { server, baseURL } = await app('wanted');

    try {
      const checks = await doctor(baseURL, [{ name: 'wanted' }]);

      expect(checks.find((c) => c.name === 'session')).toMatchObject({ status: 'ok' });
      expect(checks.find((c) => c.name === 'save to project')).toMatchObject({ status: 'warn' });
      expect(checks.filter((c) => c.status === 'fail')).toEqual([]);
    } finally {
      server.close();
    }
  });

  it('fails when the app runs a session without the scenario', { timeout: 30_000 }, async () => {
    const { server, baseURL } = await app('other');

    try {
      const checks = await doctor(baseURL, [{ name: 'wanted' }]);

      expect(checks.find((c) => c.name === 'session')).toMatchObject({
        status: 'fail',
        code: 'SCENARIO_NOT_IN_APP',
      });
    } finally {
      server.close();
    }
  });
});
