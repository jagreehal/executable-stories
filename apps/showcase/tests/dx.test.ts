import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { appUrl } from '../../../packages/executable-stories-showcase-cli/src/browser.ts';
import { CliError } from '../../../packages/executable-stories-showcase-cli/src/errors.ts';
import {
  failurePage,
  type Inspection,
  networkEntryFor,
} from '../../../packages/executable-stories-showcase-cli/src/inspect.ts';
import { createMcpHandler, tool } from '../../../packages/executable-stories-showcase-cli/src/mcp-protocol.ts';
import { ffmpegArgs, visibleCrop } from '../../../packages/executable-stories-showcase-cli/src/record.ts';
import { createCatalog, diffScenario } from '../../../packages/executable-stories-showcase/src/catalog.ts';
import { unsignedJwt } from '../../../packages/executable-stories-showcase/src/jwt.ts';
import { openScenario } from '../../../packages/executable-stories-showcase/src/playwright.ts';
import { redactSecrets, withoutSecretParams } from '../../../packages/executable-stories-showcase/src/redact.ts';
import type { Json } from '../../../packages/executable-stories-showcase/src/schema.ts';

const decode = (part: string) =>
  JSON.parse(
    new TextDecoder().decode(
      Uint8Array.from(atob(part.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)),
    ),
  );

describe('unsignedJwt', () => {
  it('round-trips claims in any script, base64url-encoded and unsigned', () => {
    const claims = { sub: 'u1', name: 'José 李雷 Zoë مرحبا 👋', exp: 4_102_444_800 };
    const token = unsignedJwt(claims);
    const [header = '', payload = '', signature] = token.split('.');

    expect(token).toMatch(/^[\w-]+\.[\w-]+\.$/);
    expect(decode(header)).toEqual({ alg: 'none', typ: 'JWT' });
    expect(decode(payload)).toEqual(claims);
    expect(signature).toBe('');
  });
});

describe('scenario handlers and viewport', () => {
  const catalog = createCatalog([
    { name: 'base', handlers: ['user'], viewport: { width: 390, height: 844 } },
    { name: 'child', extends: 'base', handlers: ['statementsEmpty', 'user'] },
  ]);

  it('inherit: handlers combine without repeats, viewport carries over', () => {
    const child = catalog.resolve(catalog.get('child')!);

    expect(child.handlers).toEqual(['statementsEmpty', 'user']);
    expect(child.viewport).toEqual({ width: 390, height: 844 });
  });

  it('diff writes only handlers the base lacks', () => {
    const base = catalog.resolve(catalog.get('base')!);
    const diff = diffScenario(catalog.resolve(catalog.get('child')!), base);

    expect(diff.handlers).toEqual(['statementsEmpty']);
    expect(diff.viewport).toBeUndefined();
  });
});

describe('ffmpegArgs', () => {
  it('trims, crops to even sizes and encodes MP4 that plays everywhere', () => {
    const args = ffmpegArgs({
      input: 'in.webm',
      output: 'out.mp4',
      format: 'mp4',
      start: 1.234,
      crop: { x: 10.4, y: 20.6, width: 301, height: 199.5 },
    });

    expect(args).toEqual(expect.arrayContaining(['-ss', '1.23', '-vf', 'crop=300:198:10:21', 'yuv420p']));
  });

  it('builds a palette for GIFs', () => {
    const args = ffmpegArgs({ input: 'in.webm', output: 'out.gif', format: 'gif', start: 0 });

    expect(args[args.indexOf('-vf') + 1]).toBe(
      'fps=12,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer',
    );
  });
});

describe('redactSecrets', () => {
  it('blanks secret-like keys and re-issues signed JWTs unsigned with the same claims', () => {
    const signed = `${unsignedJwt({ sub: 'u1', name: 'Zoë' }).slice(0, -1)}.c2lnbmF0dXJl`;

    const { value, redacted } = redactSecrets({
      user: { name: 'Amara', accessToken: signed, refresh_token: 'opaque-123', password: 'hunter2' },
      apiKey: 'sk-live-1',
      items: [{ sessionId: 'abc' }],
      count: 2,
    });

    expect(value).toEqual({
      user: {
        name: 'Amara',
        accessToken: unsignedJwt({ sub: 'u1', name: 'Zoë' }),
        refresh_token: '[redacted]',
        password: '[redacted]',
      },
      apiKey: '[redacted]',
      items: [{ sessionId: '[redacted]' }],
      count: 2,
    });
    expect(redacted).toEqual([
      'user.accessToken',
      'user.refresh_token',
      'user.password',
      'apiKey',
      'items[0].sessionId',
    ]);
  });

  it('redacts everything nested under a secret key', () => {
    const { value } = redactSecrets({
      privateKey: { kty: 'EC', d: 'raw-key-material' },
      secret: { value: 'abc', rotations: [{ v: 'old' }] },
      tokens: { remaining: 3 },
    });

    expect(value).toEqual({
      privateKey: { kty: '[redacted]', d: '[redacted]' },
      secret: { value: '[redacted]', rotations: [{ v: '[redacted]' }] },
      tokens: { remaining: 3 },
    });
  });

  it('leaves ordinary data, and already-unsigned tokens, alone', () => {
    const token = unsignedJwt({ sub: 'u1' });
    const body = { id: 'v1.2.3', title: 'Passport renewal', token, tokens: 3 };

    expect(redactSecrets(body)).toEqual({ value: body, redacted: [] });
  });
});

describe('failure pages', () => {
  const failed: Inspection = {
    name: 'orders-empty',
    ok: false,
    codes: ['READY_TIMEOUT', 'UNMOCKED_REQUEST'],
    link: 'http://localhost:5173/orders?scenario=orders-empty&scenario-strict',
    unhandled: ['GET http://localhost:5173/api/orders?page=2', 'POST https://api.other.test/v1/events'],
    pageErrors: [],
    consoleErrors: [],
    error: 'Timeout 10000ms exceeded',
    ready: { selector: 'text=No orders', status: 'none', suggestions: ['text="No orders yet"'] },
  };

  it('turn unmocked requests into network entries to paste', () => {
    expect(networkEntryFor(failed.unhandled[0] ?? '', 'http://localhost:5173')).toEqual({
      method: 'GET',
      path: '/api/orders',
      query: { page: '2' },
      response: { status: 200, body: {} },
    });
    expect(networkEntryFor(failed.unhandled[1] ?? '', 'http://localhost:5173').path).toBe(
      'https://api.other.test/v1/events',
    );
  });

  it('say what failed, how to reopen it and what to change', () => {
    const page = failurePage(failed, {
      screenshot: 'shots/orders-empty.png',
      appOrigin: 'http://localhost:5173',
    });

    expect(page).toContain('# orders-empty: READY_TIMEOUT, UNMOCKED_REQUEST');
    expect(page).toContain(failed.link);
    expect(page).toContain('`text=No orders` matches nothing on the page.');
    expect(page).toContain('- `text="No orders yet"`');
    expect(page).toContain('"path": "/api/orders"');
  });
});

describe('MCP protocol', () => {
  const handle = createMcpHandler([
    tool({
      name: 'echo',
      description: 'Echo',
      input: z.object({ word: z.string() }),
      run: async ({ word }) => [{ type: 'text', text: word }],
    }),
    tool({
      name: 'boom',
      description: 'Fails',
      input: z.object({}),
      run: async () => {
        throw new CliError('UNKNOWN_SCENARIO', 'nope');
      },
    }),
  ], { name: 'executable-stories-showcase', version: '1.0.0' });

  it('initializes with the client protocol version and lists tools with JSON Schemas', async () => {
    expect(
      await handle({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { protocolVersion: '2025-03-26' },
      }),
    )
      .toMatchObject({ id: 1, result: { protocolVersion: '2025-03-26', capabilities: { tools: {} } } });
    expect(await handle({ jsonrpc: '2.0', method: 'notifications/initialized' })).toBeNull();
    expect(await handle({ jsonrpc: '2.0', id: 2, method: 'tools/list' })).toMatchObject({
      result: {
        tools: [{ name: 'echo', inputSchema: { properties: { word: { type: 'string' } } } }, {
          name: 'boom',
        }],
      },
    });
  });

  it('runs tools, and reports bad arguments and failures as tool errors with codes', async () => {
    const call = (name: string, args: Json) =>
      handle({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name, arguments: args } });

    expect(await call('echo', { word: 'hola' })).toMatchObject({ result: { content: [{ text: 'hola' }] } });
    expect(await call('echo', {})).toMatchObject({ result: { isError: true } });
    expect(await call('boom', {})).toMatchObject({
      result: { isError: true, content: [{ text: '[UNKNOWN_SCENARIO] nope' }] },
    });
    expect(await handle({ jsonrpc: '2.0', id: 4, method: 'nope' })).toMatchObject({
      error: { code: -32601 },
    });
  });
});

describe('error codes', () => {
  it('map to exit codes by class', () => {
    expect(new CliError('READY_TIMEOUT', '').exitCode).toBe(1);
    expect(new CliError('INVALID_ARGUMENT', '').exitCode).toBe(2);
    expect(new CliError('DEV_SERVER_DOWN', '').exitCode).toBe(3);
  });
});

describe('visibleCrop', () => {
  const viewport = { width: 1280, height: 720 };

  it('keeps an element inside the viewport as it is', () => {
    expect(visibleCrop({ x: 10, y: 20, width: 300, height: 200 }, viewport)).toEqual({
      crop: { x: 10, y: 20, width: 300, height: 200 },
      clipped: false,
    });
  });

  it('clips an element larger than the viewport to the part the video shows', () => {
    expect(visibleCrop({ x: -5, y: 100, width: 1400, height: 2000 }, viewport)).toEqual({
      crop: { x: 0, y: 100, width: 1280, height: 620 },
      clipped: true,
    });
  });

  it('finds nothing to crop for an element outside the viewport', () => {
    expect(visibleCrop({ x: 0, y: 900, width: 300, height: 200 }, viewport)).toBeUndefined();
  });
});

describe('saving handler order', () => {
  const catalog = createCatalog([{ name: 'base', handlers: ['first', 'second'] }]);
  const base = catalog.resolve(catalog.get('base')!);

  const roundTrip = (handlers: string[]) => {
    const diff = diffScenario({ name: 'child', handlers }, base);
    const replay = createCatalog([{ name: 'base', handlers: ['first', 'second'] }, diff]);

    return { own: diff.handlers, replayed: replay.resolve(replay.get('child')!).handlers };
  };

  it('writes nothing when the order matches the base', () => {
    expect(roundTrip(['first', 'second'])).toEqual({ own: undefined, replayed: ['first', 'second'] });
  });

  it('keeps a reordering, so the saved scenario replays in the captured order', () => {
    expect(roundTrip(['second', 'first'])).toEqual({ own: ['second'], replayed: ['second', 'first'] });
  });

  it('writes only the new handlers when they come first', () => {
    expect(roundTrip(['extra', 'first', 'second'])).toEqual({
      own: ['extra'],
      replayed: ['extra', 'first', 'second'],
    });
  });

  it('keeps the order of a new handler placed between inherited ones', () => {
    expect(roundTrip(['first', 'extra', 'second']).replayed).toEqual(['first', 'extra', 'second']);
  });
});

describe('redactSecrets with numbers', () => {
  it('redacts numeric secrets too, keeping them numbers', () => {
    expect(redactSecrets({ otp: 123456, cvv: 123, cardNumber: 4242424242424242, sessionId: 99, amount: 12 }))
      .toEqual({
        value: { otp: 0, cvv: 0, cardNumber: 0, sessionId: 0, amount: 12 },
        redacted: ['otp', 'cvv', 'cardNumber', 'sessionId'],
      });
  });
});

describe('MCP calls', () => {
  it('run one at a time, in arrival order, even when sent together', async () => {
    const log: string[] = [];

    const step = (name: string, ms: number) =>
      tool({
        name,
        description: name,
        input: z.object({}),
        run: async () => {
          log.push(`${name} start`);
          await new Promise((resolve) => setTimeout(resolve, ms));
          log.push(`${name} end`);

          return [{ type: 'text', text: name }];
        },
      });

    const handle = createMcpHandler([step('open', 30), step('click', 1)], { name: 't', version: '0' });

    const call = (name: string, id: number) =>
      handle({ jsonrpc: '2.0', id, method: 'tools/call', params: { name } });

    await Promise.all([call('open', 1), call('click', 2)]);
    expect(log).toEqual(['open start', 'open end', 'click start', 'click end']);
  });
});

describe('mcp open_app paths', () => {
  const base = 'http://localhost:5179';

  it('opens a path on the app', () => {
    expect(appUrl('/orders/42?tab=items', base).toString()).toBe('http://localhost:5179/orders/42?tab=items');
  });

  it('refuses a path that resolves to another host', () => {
    for (const path of ['//attacker.example/x', '/\\attacker.example/x', '/\\/attacker.example']) {
      expect(() => appUrl(path, base), path).toThrow(CliError);
    }
  });
});

describe('redactSecrets by value', () => {
  it('redacts credentials whatever key holds them, and keeps ordinary codes', () => {
    const body = {
      header: 'Bearer abc.def',
      data: 'sk_live_51Hx',
      gh: 'ghp_aaaaaaaaaaaaaaaaaaaaaaaa',
      aws: 'AKIAABCDEFGHIJKLMNOP',
      country: { code: 'FR', name: 'France' },
    };

    expect(redactSecrets(body).value).toEqual({
      header: '[redacted]',
      data: '[redacted]',
      gh: '[redacted]',
      aws: '[redacted]',
      country: { code: 'FR', name: 'France' },
    });
  });

  it('leaves OAuth one-time params out of saved URLs', () => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
    expect(withoutSecretParams({ code: 'x1', state: 's', q: 'fr' }, 'test')).toEqual({ q: 'fr' });
  });
});

describe('openScenario path', () => {
  it('refuses a path that would open another site', async () => {
    for (const path of ['//attacker.example', '/\\attacker.example', 'https://attacker.example/']) {
      // The check runs before the page is touched, so no browser is needed.
      await expect(openScenario({} as never, 'x', { path }), path).rejects.toThrow(/must be a path on the app/);
    }
  });
});
