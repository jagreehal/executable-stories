import { describe, expect, it } from 'vitest';
import { buildComment, MARKER } from '../../../actions/showcase-screenshots/comment.mjs';

const shot = (
  name: string,
  compare?: { status: 'same' | 'changed' | 'new'; ratio: number; image: string | null; },
) => ({
  name,
  ok: true,
  codes: [],
  error: null,
  screenshot: `/tmp/after/${name}.png`,
  compare,
});

describe('the showcase-screenshots comment', () => {
  it('shows changed and new states with their images and reasons, and folds the rest', () => {
    const body = buildComment({
      shots: [
        shot('orders-error', { status: 'changed', ratio: 0.0123, image: '/tmp/after/orders-error.diff.png' }),
        shot('orders-new', { status: 'new', ratio: 1, image: null }),
        shot('orders-empty', { status: 'same', ratio: 0, image: null }),
        { ...shot('orders-slow'), ok: false, codes: ['READY_TIMEOUT'], error: 'never ready' },
      ],
      affected: [{
        name: 'orders-error',
        reasons: [{ kind: 'endpoint', detail: 'src/api.ts calls /api/orders' }],
      }],
      unmatched: ['src/theme.css'],
      all: true,
      links: { 'orders-error.diff.png': 'https://x/e.png', 'orders-new.png': 'https://x/n.png' },
      sha: 'abcdef1234',
    });

    expect(body.startsWith(MARKER)).toBe(true);
    expect(body).toContain(
      '**1** changed · **1** new · **1** unchanged · **1** failing · at abcdef1 · every state shot',
    );
    expect(body).toContain(
      '#### `orders-error` · changed (1.2% of pixels)\n<sub>endpoint: src/api.ts calls /api/orders</sub>',
    );
    expect(body).toContain('![orders-error](https://x/e.png)');
    expect(body).toContain('![orders-new](https://x/n.png)');
    expect(body).toContain('- `orders-slow`: READY_TIMEOUT: never ready');
    expect(body).toContain('<summary>Unchanged (1)</summary>');
    expect(body).toContain('every state was shot');
  });

  it('says so when nothing is affected, and when images went unpublished', () => {
    expect(buildComment({ shots: [], affected: [], unmatched: [], all: false, links: {}, sha: 'abc1234' }))
      .toContain('No UI state is affected by this change.');

    const fork = buildComment({
      shots: [shot('a', { status: 'new', ratio: 1, image: null })],
      affected: [],
      unmatched: [],
      all: false,
      links: {},
      sha: 'abc1234',
      note: 'from a fork',
    });

    expect(fork).toContain('> from a fork');
    expect(fork).toContain('_Image not published._');
  });
});

describe('the showcase-screenshots publish step', () => {
  it('publishes only real images from the shoot folder, whatever the results file names', async () => {
    const { execFileSync } = await import('node:child_process');
    const { mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');

    const work = mkdtempSync(join(tmpdir(), 'es-shots-'));
    mkdirSync(join(work, 'after'));
    writeFileSync(join(work, 'after', 'good.png'), 'png');
    writeFileSync(join(work, 'after', 'changed.diff.png'), 'png');
    symlinkSync('/etc/hosts', join(work, 'after', 'link.png'));

    // What a pull request's code could write into step 1's results.
    const shotOf = (name: string, screenshot: string, compare?: object) => ({ ...shot(name), screenshot, compare });
    writeFileSync(
      join(work, 'result.json'),
      JSON.stringify({
        shots: [
          shotOf('good', '/anywhere/good.png'),
          shotOf('changed', 'x', { status: 'changed', ratio: 0.5, image: 'changed.diff.png' }),
          shotOf('escape', '../../../../etc/hosts'),
          shotOf('newline', 'a\n100644 blob x\tevil.png'),
          shotOf('link', 'link.png'),
          shotOf('missing', 'nowhere.png'),
        ],
        affected: [],
        unmatched: [],
        all: false,
      }),
    );

    const event = join(work, 'event.json');
    writeFileSync(
      event,
      JSON.stringify({
        pull_request: {
          number: 7,
          head: { sha: 'abc1234', repo: { full_name: 'o/r' } },
          base: { repo: { full_name: 'o/r' } },
        },
      }),
    );

    // Stands in for the CLI: records what it was asked to publish.
    const args = join(work, 'args.json');
    const fake = join(work, 'fake-cli.mjs');
    writeFileSync(
      fake,
      `import { writeFileSync } from 'node:fs'; writeFileSync(${JSON.stringify(args)}, JSON.stringify(process.argv.slice(2))); console.log('[]');`,
    );

    execFileSync('node', ['../../actions/showcase-screenshots/publish.mjs'], {
      env: {
        ...process.env,
        GITHUB_EVENT_PATH: event,
        GITHUB_REPOSITORY: 'o/r',
        INPUT_OUT: work,
        INPUT_CLI: `node ${fake}`,
        INPUT_COMMENT: 'false',
      },
    });

    const published: string[] = JSON.parse(readFileSync(args, 'utf8'));
    const files = published.slice(1, published.indexOf('--folder'));

    expect(published[0]).toBe('publish');
    expect(files).toEqual([join(work, 'after', 'good.png'), join(work, 'after', 'changed.diff.png')]);
    expect(published).toContain('pr-7');
  });
});
