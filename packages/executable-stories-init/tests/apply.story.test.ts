import { describe, expect, it } from 'vitest';
import { story } from 'executable-stories-vitest';
import { applyPlan } from '../src/apply';
import type { CliDeps, Plan } from '../src/types';

function memDeps(): CliDeps {
  const files = new Map<string, string>();
  return {
    cwd: '/repo',
    opts: { json: false, interactive: false },
    fs: {
      readFile: async (p) => {
        const v = files.get(p);
        if (v === undefined) throw new Error('ENOENT: ' + p);
        return v;
      },
      writeFile: async (p, c) => { files.set(p, c); },
      exists: async (p) => files.has(p),
      mkdir: async () => {},
    },
    spawn: async () => ({ code: 0, stdout: '', stderr: '' }),
  };
}

describe('applyPlan', () => {
  it('Dry-run writes nothing and installs nothing', async ({ task }) => {
    story.init(task);

    story.given('a plan with one write and one install');
    const deps = memDeps();
    const plan: Plan = {
      ops: [
        { kind: 'write', target: '/repo', path: '/repo/x.ts', contents: 'hi' },
        { kind: 'install', target: '/repo', deps: ['vitest'], dev: true, packageManager: 'pnpm' as const },
      ],
      summary: { targets: ['/repo'], frameworks: ['vitest'], packageManager: 'pnpm' },
    };

    story.when('we apply the plan with dryRun=true');
    const result = await applyPlan({ plan, dryRun: true, force: false }, deps);

    story.then('result.written and installed are empty; ok is true; notes describe the ops');
    expect(result.ok).toBe(true);
    expect(result.written).toEqual([]);
    expect(result.installed).toEqual([]);
    expect(result.notes.length).toBe(2);
    expect(result.notes[0]).toContain('[dry-run]');
  });

  it('Re-applying the same plan skips identical files', async ({ task }) => {
    story.init(task);

    story.given('a plan with one write op and a fresh in-memory deps');
    const deps = memDeps();
    const plan: Plan = {
      ops: [{ kind: 'write', target: '/repo', path: '/repo/x.ts', contents: 'hi' }],
      summary: { targets: ['/repo'], frameworks: ['vitest'], packageManager: 'pnpm' },
    };

    story.when('we apply the plan twice');
    const result1 = await applyPlan({ plan, dryRun: false, force: false }, deps);
    const result2 = await applyPlan({ plan, dryRun: false, force: false }, deps);

    story.then('first run wrote the file; second run skipped it as identical');
    expect(result1.written).toEqual(['/repo/x.ts']);
    expect(result2.written).toEqual([]);
    expect(result2.skipped[0]?.reason).toBe('identical');
  });

  it('Differing existing file is skipped without --force', async ({ task }) => {
    story.init(task);

    story.given('a file with different contents already on disk');
    const deps = memDeps();
    await deps.fs.writeFile('/repo/x.ts', 'old');

    story.when('we apply a plan that wants to write new contents to that path');
    const result = await applyPlan({
      plan: {
        ops: [{ kind: 'write', target: '/repo', path: '/repo/x.ts', contents: 'new' }],
        summary: { targets: [], frameworks: [], packageManager: 'pnpm' },
      },
      dryRun: false,
      force: false,
    }, deps);

    story.then('nothing is written and the skip reason mentions --force');
    expect(result.written).toEqual([]);
    expect(result.skipped[0]?.reason).toMatch(/--force/);
  });

  it('Creates parent directory correctly for Windows-style paths', async ({ task }) => {
    story.init(task);

    story.given('a plan with a Windows-style destination path');
    const mkdirCalls: string[] = [];
    const deps = memDeps();
    deps.fs.mkdir = async (p) => { mkdirCalls.push(p); };
    const plan: Plan = {
      ops: [{ kind: 'write', target: 'C:\\repo', path: 'C:\\repo\\src\\x.ts', contents: 'hi' }],
      summary: { targets: ['C:\\repo'], frameworks: ['vitest'], packageManager: 'pnpm' },
    };

    story.when('we apply the plan');
    const result = await applyPlan({ plan, dryRun: false, force: false }, deps);

    story.then('it writes successfully and creates the expected parent path');
    expect(result.ok).toBe(true);
    expect(result.written).toEqual(['C:\\repo\\src\\x.ts']);
    expect(mkdirCalls).toEqual(['C:\\repo\\src']);
  });

  it('Creates drive-root parent directory for Windows drive-root files', async ({ task }) => {
    story.init(task);

    story.given('a plan writing a file directly under a Windows drive root');
    const mkdirCalls: string[] = [];
    const deps = memDeps();
    deps.fs.mkdir = async (p) => { mkdirCalls.push(p); };
    const plan: Plan = {
      ops: [{ kind: 'write', target: 'C:\\', path: 'C:\\file.ts', contents: 'hi' }],
      summary: { targets: ['C:\\'], frameworks: ['vitest'], packageManager: 'pnpm' },
    };

    story.when('we apply the plan');
    const result = await applyPlan({ plan, dryRun: false, force: false }, deps);

    story.then('it creates C:\\ as parent, not C:');
    expect(result.ok).toBe(true);
    expect(result.written).toEqual(['C:\\file.ts']);
    expect(mkdirCalls).toEqual(['C:\\']);
  });

  it('Install failures include actionable next steps', async ({ task }) => {
    story.init(task);

    story.given('a plan with an install op and a failing package-manager command');
    const deps = memDeps();
    deps.spawn = async () => ({ code: 1, stdout: '', stderr: 'network failed' });
    const plan: Plan = {
      ops: [{ kind: 'install', target: '/repo', deps: ['vitest'], dev: true, packageManager: 'pnpm' }],
      summary: { targets: ['/repo'], frameworks: ['vitest'], packageManager: 'pnpm' },
    };

    story.when('we apply the plan');
    const err = await applyPlan({ plan, dryRun: false, force: false }, deps).catch((e) => e as Error);

    story.then('the thrown error includes command context and remediation steps');
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toContain('dependency install failed');
    expect(err.message).toContain('command: pnpm add -D vitest');
    expect(err.message).toContain('Run with --dry-run');
    expect(err.message).toContain('cd /repo && pnpm add -D vitest');
  });
});
