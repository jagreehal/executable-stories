import { describe, expect, it, vi } from 'vitest';
import { story } from 'executable-stories-vitest';
import { renderHuman } from '../src/render/human';
import type { Plan, Result } from '../src/types';

const { noteMock, outroMock } = vi.hoisted(() => ({
  noteMock: vi.fn(),
  outroMock: vi.fn(),
}));

vi.mock('@clack/prompts', () => ({
  note: noteMock,
  outro: outroMock,
}));

function makeArgs(pm: Plan['summary']['packageManager']): { plan: Plan; result: Result } {
  return {
    plan: {
      ops: [],
      summary: { targets: ['/repo'], frameworks: ['playwright'], packageManager: pm },
    },
    result: {
      ok: true,
      written: [],
      installed: [],
      patched: [],
      skipped: [],
      notes: [],
    },
  };
}

describe('renderHuman', () => {
  it('Renders npm next commands', ({ task }) => {
    story.init(task);
    noteMock.mockClear();
    outroMock.mockClear();

    story.given('an npm plan summary');
    const args = makeArgs('npm');

    story.when('we render the human summary');
    renderHuman(args);

    story.then('next commands use npm-specific syntax');
    const outro = String(outroMock.mock.calls[0]?.[0] ?? '');
    expect(outro).toContain('npm install');
    expect(outro).toContain('npm run test');
    expect(outro).toContain('npm exec playwright install');
    expect(outro).toContain('For each target:');
  });

  it('Renders pnpm next commands', ({ task }) => {
    story.init(task);
    noteMock.mockClear();
    outroMock.mockClear();

    story.given('a pnpm plan summary');
    const args = makeArgs('pnpm');

    story.when('we render the human summary');
    renderHuman(args);

    story.then('next commands use pnpm-specific syntax');
    const outro = String(outroMock.mock.calls[0]?.[0] ?? '');
    expect(outro).toContain('pnpm install');
    expect(outro).toContain('pnpm run test');
    expect(outro).toContain('pnpm exec playwright install');
    expect(outro).toContain('For each target:');
  });

  it('Renders yarn next commands', ({ task }) => {
    story.init(task);
    noteMock.mockClear();
    outroMock.mockClear();

    story.given('a yarn plan summary');
    const args = makeArgs('yarn');

    story.when('we render the human summary');
    renderHuman(args);

    story.then('next commands use yarn-specific syntax');
    const outro = String(outroMock.mock.calls[0]?.[0] ?? '');
    expect(outro).toContain('yarn install');
    expect(outro).toContain('yarn test');
    expect(outro).toContain('yarn playwright install');
    expect(outro).toContain('For each target:');
  });

  it('Renders per-target blocks when multiple targets are selected', ({ task }) => {
    story.init(task);
    noteMock.mockClear();
    outroMock.mockClear();

    story.given('a plan with two targets');
    const args = makeArgs('pnpm');
    args.plan.summary.targets = ['/repo/a', '/repo/b'];

    story.when('we render the human summary');
    renderHuman(args);

    story.then('next steps include explicit per-target command blocks');
    const outro = String(outroMock.mock.calls[0]?.[0] ?? '');
    expect(outro).toContain('cd /repo/a');
    expect(outro).toContain('cd /repo/b');
  });

  it('Uses a platform-appropriate command to open the HTML report', ({ task }) => {
    story.init(task);
    noteMock.mockClear();
    outroMock.mockClear();

    story.given('a plan rendered on the current platform');
    const args = makeArgs('pnpm');

    story.when('we render the human summary');
    renderHuman(args);

    story.then('the output includes an OS-appropriate open command');
    const outro = String(outroMock.mock.calls[0]?.[0] ?? '');
    if (process.platform === 'darwin') expect(outro).toContain('open reports/executable-stories.html');
    else if (process.platform === 'win32') expect(outro).toContain('start reports\\executable-stories.html');
    else expect(outro).toContain('xdg-open reports/executable-stories.html');
  });
});
