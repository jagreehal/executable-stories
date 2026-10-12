import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { captureScenario } from '../../../packages/executable-stories-showcase/src/capture.ts';
import { parseScenario } from '../../../packages/executable-stories-showcase/src/schema.ts';
import {
  currentSession,
  navigate,
  startScenarios,
  type TypedAdapter,
} from '../../../packages/executable-stories-showcase/src/runtime.ts';

const NumberSchema = z.number();

// A minimal browser for state-only scenarios (no network, so MSW never loads).
function browser(href: string) {
  vi.stubGlobal('location', new URL(href));
  vi.stubGlobal('history', {
    state: null,
    replaceState: (_state: null, _title: string, url: URL) => vi.stubGlobal('location', new URL(url)),
  });
  vi.stubGlobal('document', { documentElement: { dataset: {} } });
  const store = new Map<string, string>();
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
  });
}

afterEach(() => vi.unstubAllGlobals());

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const slowAdapter = (log: string[]): TypedAdapter<number> => ({
  key: 'count',
  schema: NumberSchema,
  async apply(n) {
    await sleep(20);
    log.push(`applied ${n}`);
  },
  read: () => 7,
});

const counted = (...counts: number[]) =>
  counts.map((count, i) => ({ name: ['one', 'two', 'three'][i] ?? `n${i}`, state: { count } }));

describe('startScenarios', () => {
  beforeEach(() => browser('http://app.test/'));

  it('waits for async adapters before returning', async () => {
    browser('http://app.test/?scenario=one');
    const log: string[] = [];
    const session = await startScenarios({ scenarios: counted(5), adapters: [slowAdapter(log)] });
    expect(log).toEqual(['applied 5']);
    expect(document.documentElement.dataset.scenario).toBe('one');
    expect(session.resolved?.name).toBe('one');
  });

  it('rejects when initial state is invalid', async () => {
    browser('http://app.test/?scenario=bad');
    await expect(
      startScenarios({
        scenarios: [{ name: 'bad', state: { count: 'x' } }],
        adapters: [{ key: 'count', schema: NumberSchema, apply() {} }],
      }),
    ).rejects.toThrow(/invalid state\["count"\]/);
  });

  it('connects adapters even when no scenario is selected', async () => {
    const session = await startScenarios({ scenarios: counted(5), adapters: [slowAdapter([])] });
    expect(session.active).toBeNull();
    expect(session.keys()).toEqual(['count']);
    expect(session.read('count')).toBe(7);
  });

  it('a superseded switch never touches state, even when it would finish last', async () => {
    browser('http://app.test/?scenario=one');
    let value = 0;
    const delays = new Map([[2, 50]]); // "two" is slow

    const adapter: TypedAdapter<number> = {
      key: 'count',
      schema: NumberSchema,
      async apply(n) {
        await sleep(delays.get(n) ?? 5);
        value = n;
      },
      read: () => value,
    };

    const session = await startScenarios({ scenarios: counted(1, 2, 3), adapters: [adapter] });
    await Promise.all([session.open('two'), session.open('three')]);
    await sleep(80);
    expect([session.active?.name, location.search, value]).toEqual(['three', '?scenario=three', 3]);
  });

  it('a switch with any invalid state changes nothing', async () => {
    browser('http://app.test/?scenario=ok');
    const applied: string[] = [];

    const session = await startScenarios({
      scenarios: [{ name: 'ok', state: { a: 1, b: 1 } }, { name: 'bad', state: { a: 2, b: 'not a number' } }],
      adapters: ['a', 'b'].map((key): TypedAdapter<number> => ({
        key,
        schema: NumberSchema,
        apply: (n) => void applied.push(`${key}=${n}`),
      })),
    });

    await expect(session.open('bad')).rejects.toThrow(/invalid state\["b"\]/);
    expect(applied).toEqual(['a=1', 'b=1']);
    expect(session.active?.name).toBe('ok');
  });

  it('validates before reloading: an invalid scenario that changes the URL never navigates', async () => {
    browser('http://app.test/?scenario=ok');

    const session = await startScenarios({
      scenarios: [{ name: 'ok', state: { n: 1 } }, {
        name: 'bad',
        url: { q: 'changed' },
        state: { n: 'not a number' },
      }],
      adapters: [{ key: 'n', schema: NumberSchema, apply() {} }],
    });

    await expect(session.open('bad')).rejects.toThrow(/invalid state\["n"\]/);
    expect(location.href).toBe('http://app.test/?scenario=ok');
  });

  it('isolates a throwing listener: others still update and switches still commit', async () => {
    browser('http://app.test/?scenario=one');
    const session = await startScenarios({ scenarios: counted(1, 2), adapters: [slowAdapter([])] });
    let calls = 0;
    session.onChange(() => {
      throw new Error('listener failed');
    });
    session.onChange(() => calls++);
    await session.open('two');
    expect(session.active?.name).toBe('two');
    expect(calls).toBeGreaterThan(0);
  });

  it('destroy() unsubscribes adapters, drops listeners and queued switches', async () => {
    browser('http://app.test/?scenario=one');
    let subscribed = 0;

    const adapter: TypedAdapter<number> = {
      key: 'count',
      schema: NumberSchema,
      apply() {},
      subscribe: () => {
        subscribed++;

        return () => subscribed--;
      },
    };

    const session = await startScenarios({ scenarios: counted(1), adapters: [adapter] });
    let notified = 0;
    session.onChange(() => notified++);
    expect(subscribed).toBe(1);

    session.destroy();
    expect(subscribed).toBe(0);
    expect(session.keys()).toEqual([]);
    expect(currentSession()).toBeNull();
    expect(document.documentElement.dataset.scenario).toBeUndefined();
    await expect(session.open('one')).rejects.toThrow(/destroyed/);
    session.connect(adapter).update(5); // a late component mount is a no-op
    expect([notified, subscribed]).toEqual([0, 0]);
  });
});

describe('the saved selection', () => {
  it('is cleared when a scenario fails to load, so the tab recovers', async () => {
    browser('http://app.test/?scenario=bad');
    await expect(
      startScenarios({
        scenarios: [{ name: 'bad', state: { count: 'x' } }],
        adapters: [{ key: 'count', schema: NumberSchema, apply() {} }],
      }),
    ).rejects.toThrow(/invalid state/);
    expect(sessionStorage.getItem('executable-stories-showcase:active')).toBeNull();
  });

  it('survives a failed switch', async () => {
    browser('http://app.test/?scenario=one');
    const session = await startScenarios({ scenarios: counted(1) });
    await expect(session.open('nope')).rejects.toThrow(/Unknown scenario "nope"/);
    expect(sessionStorage.getItem('executable-stories-showcase:active')).toContain('"name":"one"');
  });
});

describe('adapters that only apply on a reload', () => {
  it('switch by navigating instead of in place', async () => {
    browser('http://app.test/?scenario=one');

    const session = await startScenarios({
      scenarios: counted(1, 2),
      adapters: [{ key: 'count', schema: NumberSchema, inPlace: false, apply() {} }],
    });

    await session.open('two');
    expect(session.active?.name).toBe('one');
    expect(location.search).toBe('?scenario=two');
  });
});

describe('state a link must not set (fromLinks: false)', () => {
  const tracked = (applied: string[]): TypedAdapter<string> => ({
    key: 'token',
    schema: z.string(),
    fromLinks: false,
    apply: (t) => void applied.push(t),
  });

  it('applies from a catalog scenario', async () => {
    browser('http://app.test/?scenario=signed-in');
    const applied: string[] = [];
    await startScenarios({
      scenarios: [{ name: 'signed-in', state: { token: 'real' } }],
      adapters: [tracked(applied)],
    });
    expect(applied).toEqual(['real']);
  });

  it('is ignored from an inline link, which anyone can write', async () => {
    const data = JSON.stringify({ name: 'evil', state: { token: 'attacker' } });
    browser(`http://app.test/#${new URLSearchParams({ 'scenario-data': data })}`);
    const applied: string[] = [];
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const session = await startScenarios({ scenarios: [], adapters: [tracked(applied)], allowLinks: true });
    expect(session.active?.name).toBe('evil');
    expect(applied).toEqual([]);
  });
});

describe('inline links off localhost', () => {
  const link = (origin: string) =>
    `${origin}/#${new URLSearchParams({ 'scenario-data': JSON.stringify({ name: 'shared' }) })}`;

  beforeEach(() => void vi.spyOn(console, 'warn').mockImplementation(() => {}));

  it('are refused unless the app allows them', async () => {
    browser(link('https://app.example.com'));
    const session = await startScenarios({ scenarios: [] });

    expect(session.active).toBeNull();
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('allowLinks'));
    session.destroy();
  });

  it('open with allowLinks', async () => {
    browser(link('https://staging.example.com'));
    const session = await startScenarios({ scenarios: [], allowLinks: true });

    expect(session.active?.name).toBe('shared');
    session.destroy();
  });

  it('are refused when remembered by the tab too', async () => {
    browser(link('https://app.example.com'));
    (await startScenarios({ scenarios: [], allowLinks: true })).destroy();

    vi.stubGlobal('location', new URL('https://app.example.com/')); // same tab storage
    const session = await startScenarios({ scenarios: [] });

    expect(session.active).toBeNull();
    session.destroy();
  });

  it('open on localhost by default', async () => {
    browser(link('http://localhost:5173'));
    const session = await startScenarios({ scenarios: [] });

    expect(session.active?.name).toBe('shared');
    session.destroy();
  });
});

describe('destroy() during and across sessions', () => {
  it('a switch in flight when the session is destroyed never commits', async () => {
    browser('http://app.test/?scenario=one');

    const session = await startScenarios({
      scenarios: counted(1, 2),
      adapters: [{
        key: 'count',
        schema: NumberSchema,
        async apply(n) {
          if (n === 2) await sleep(30);
        },
      }],
    });

    const switching = session.open('two');
    await sleep(5); // apply('two') is now pending
    session.destroy();
    await switching;

    expect(session.active?.name).toBe('one');
    expect(location.search).toBe('?scenario=one');
    expect(sessionStorage.getItem('executable-stories-showcase:active')).toContain('"name":"one"');
    expect(document.documentElement.dataset.scenario).toBeUndefined();
  });

  it('a destroyed session applies no further adapters', async () => {
    browser('http://app.test/?scenario=one');
    const applied: string[] = [];

    const adapter = (key: string, delay: number): TypedAdapter<number> => ({
      key,
      schema: NumberSchema,
      async apply(n) {
        if (n === 2) await sleep(delay);
        applied.push(`${key}=${n}`);
      },
    });

    const session = await startScenarios({
      scenarios: [{ name: 'one', state: { a: 1, b: 1 } }, { name: 'two', state: { a: 2, b: 2 } }],
      adapters: [adapter('a', 30), adapter('b', 0)],
    });

    const switching = session.open('two');
    await sleep(5); // adapter "a" is mid-apply
    session.destroy();
    await switching;
    // "a" was already running and finishes; "b" must never start.
    expect(applied).toEqual(['a=1', 'b=1', 'a=2']);
  });

  it("destroying an older session leaves the newer session's markers alone", async () => {
    browser('http://app.test/?scenario=one');
    const scenarios = [{ name: 'one' }, { name: 'two', ready: 'text=Two' }];
    const older = await startScenarios({ scenarios });
    vi.stubGlobal('location', new URL('http://app.test/?scenario=two'));
    const newer = await startScenarios({ scenarios });

    older.destroy();
    const { dataset } = document.documentElement;
    expect(currentSession()).toBe(newer);
    expect([dataset.scenario, dataset.scenarioReady]).toEqual(['two', 'text=Two']);

    newer.destroy();
    expect([dataset.scenario, dataset.scenarioReady]).toEqual([undefined, undefined]);
  });
});

describe("with the app's own MSW worker", () => {
  beforeEach(() => browser('http://app.test/'));

  const get = async (path: string) => {
    const res = await fetch(`http://api.test${path}`, { headers: { accept: 'application/json' } });

    return `${res.status} ${await res.text()}`;
  };

  it("layers scenario handlers over the app's, and restores the app's on destroy", async () => {
    const server = setupServer(
      http.get('http://api.test/user', () => HttpResponse.text('app user')),
      http.get('http://api.test/items', () => HttpResponse.text('app items')),
    );

    server.listen({ onUnhandledFrame: 'bypass' });

    try {
      browser('http://app.test/?scenario=no-items&scenario-strict');

      const session = await startScenarios({
        scenarios: [{
          name: 'no-items',
          network: [{ path: 'http://api.test/items', response: { text: 'scenario items' } }],
        }],
        worker: server,
      });

      expect(await get('/items')).toBe('200 scenario items'); // scenario wins
      expect(await get('/user')).toBe('200 app user'); // app handlers still answer
      expect(await get('/other')).toMatch(/^501 /); // strict catch-all comes last
      expect(session.unhandled).toEqual(['GET http://api.test/other']);

      session.destroy();
      expect(await get('/items')).toBe('200 app items');
      expect(server.listHandlers()).toHaveLength(2);
    } finally {
      server.close();
    }
  });

  it('detaches its recording listeners on destroy', async () => {
    // Any listener: only identity matters here.
    type Listener = (e: never) => void;

    const attached = new Set<Listener>();

    const session = await startScenarios({
      scenarios: [],
      record: true,
      worker: {
        resetHandlers() {},
        listHandlers: () => [],
        events: {
          on: (_event: string, listener: Listener) => void attached.add(listener),
          removeListener: (_event: string, listener: Listener) => void attached.delete(listener),
        },
      },
    });

    expect(attached.size).toBe(3);
    session.destroy();
    expect(attached.size).toBe(0);
  });
});

describe('named handlers and ignored requests', () => {
  beforeEach(() => browser('http://app.test/'));

  const get = async (path: string) => {
    const res = await fetch(`http://api.test${path}`, { headers: { accept: 'application/json' } });

    return `${res.status} ${await res.text()}`;
  };

  it('answers with handlers named by the scenario, after its network entries', async () => {
    const server = setupServer();
    server.listen({ onUnhandledFrame: 'bypass' });

    try {
      browser('http://app.test/?scenario=empty&scenario-strict');

      const session = await startScenarios({
        scenarios: [{
          name: 'empty',
          handlers: ['statementsEmpty'],
          network: [{
            path: 'http://api.test/statements',
            query: { page: '2' },
            response: { text: 'page 2' },
          }],
        }],
        handlers: {
          statementsEmpty: http.get('http://api.test/statements', () => HttpResponse.text('none')),
        },
        ignore: ['analytics.test', /\/telemetry$/],
        worker: server,
      });

      expect(await get('/statements?page=2')).toBe('200 page 2'); // JSON entry first
      expect(await get('/statements')).toBe('200 none'); // then the named handler
      expect(await get('/telemetry')).toBe('204 '); // ignored: empty, not a 501
      expect(await get('/other')).toMatch(/^501 /);
      expect(session.unhandled).toEqual(['GET http://api.test/other']);
      session.destroy();
    } finally {
      server.close();
    }
  });

  it('blocks the real network under ?scenario-strict with no scenario selected', async () => {
    const server = setupServer();
    server.listen({ onUnhandledFrame: 'bypass' });

    try {
      browser('http://app.test/?scenario-strict');
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const session = await startScenarios({ scenarios: [], worker: server });

      expect(session.strict).toBe(true);
      expect(await get('/other')).toMatch(/^501 /);
      session.destroy();
    } finally {
      server.close();
    }
  });

  it('rejects an unknown handler name, listing the known ones', async () => {
    browser('http://app.test/?scenario=bad');

    await expect(
      startScenarios({ scenarios: [{ name: 'bad', handlers: ['missing'] }], handlers: {} }),
    ).rejects.toThrow('unknown handler "missing". Known handlers: none');
  });
});

describe('page hooks for the CLI and agents', () => {
  it('report the active scenario and capture it, and go away on destroy', async () => {
    browser('http://app.test/?scenario=one');
    const session = await startScenarios({ scenarios: counted(5), adapters: [slowAdapter([])] });
    const hooks = globalThis.executableStoriesShowcasePage;

    expect(hooks?.scenario()).toBe('one');
    expect(await hooks?.capture({ name: 'saved', extends: 'one', ready: 'text=Seven' })).toEqual({
      name: 'saved',
      extends: 'one',
      path: '/',
      state: { count: 7 },
      ready: 'text=Seven',
    });

    session.destroy();
    expect(globalThis.executableStoriesShowcasePage).toBeUndefined();
  });
});

describe('captureScenario', () => {
  it('redacts secrets in adapter state, as recording does for responses', async () => {
    browser('http://app.test/?scenario=signed-in');
    vi.spyOn(console, 'info').mockImplementation(() => {});
    const session = await startScenarios({
      scenarios: [{ name: 'signed-in' }],
      adapters: [{
        key: 'auth',
        apply() {},
        read: () => ({ user: { name: 'Ada' }, accessToken: 'live-token', apiKey: 'sk-live' }),
      }],
    });

    const { flat } = captureScenario(session, { name: 'captured' });

    expect(flat.state?.auth).toEqual({
      user: { name: 'Ada' },
      accessToken: '[redacted]',
      apiKey: '[redacted]',
    });
  });
});

describe('captureScenario null state', () => {
  it('captures a null slice and replays it as null', async () => {
    browser('http://app.test/?scenario=plain');
    const session = await startScenarios({
      scenarios: [{ name: 'plain' }],
      adapters: [{ key: 'user', apply() {}, read: () => null }],
    });

    const { flat, forCatalog } = captureScenario(session, { name: 'signed-out' });
    session.destroy();

    expect(flat.state).toEqual({ user: null });
    expect(forCatalog.state).toEqual({ user: null });

    const applied: unknown[] = [];
    browser('http://app.test/?scenario=signed-out');
    const replay = await startScenarios({
      scenarios: [parseScenario(forCatalog)],
      adapters: [{ key: 'user', apply: (v) => void applied.push(v) }],
    });

    expect(applied).toEqual([null]);
    replay.destroy();
  });
});

describe('captureScenario URL', () => {
  it('leaves secret page params out of the captured url', async () => {
    browser('http://app.test/?scenario=plain&q=fr&token=abc');
    vi.spyOn(console, 'info').mockImplementation(() => {});
    const session = await startScenarios({ scenarios: [{ name: 'plain' }] });

    expect(captureScenario(session, { name: 'captured' }).flat.url).toEqual({ q: 'fr' });
  });
});

describe('navigate', () => {
  it('refuses another origin and javascript: URLs, which would run in the app', () => {
    browser('http://app.test/');
    for (const href of ['https://attacker.example/?scenario=x', 'javascript:alert(1)', '//attacker.example/']) {
      expect(() => navigate(href), href).toThrow(/is not this app/);
    }
  });
});
