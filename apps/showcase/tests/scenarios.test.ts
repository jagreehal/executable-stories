import { BadRequestError } from '@anthropic-ai/sdk';
import type { MessageCreateParamsNonStreaming } from '@anthropic-ai/sdk/resources/beta/messages';
import { QueryClient } from '@tanstack/react-query';
import Ajv2020 from 'ajv/dist/2020.js';
import { setupServer } from 'msw/node';
import { readdirSync, readFileSync } from 'node:fs';
import { createStore } from 'redux';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createActor, createMachine } from 'xstate';
import { z } from 'zod';
import { createStore as createZustand } from 'zustand/vanilla';
import { rules } from '../examples/demo-react/rules.ts';
import { demoJsonSchema } from '../examples/demo-react/schema.ts';
import {
  type SuggestClient,
  type Suggestion,
  suggestScenarios,
} from '../../../packages/executable-stories-showcase-cli/src/suggest.ts';
import { cookiesAdapter } from '../../../packages/executable-stories-showcase/src/adapters/cookies.ts';
import { reduxAdapter, withScenarioState } from '../../../packages/executable-stories-showcase/src/adapters/redux.ts';
import { tanstackQuery } from '../../../packages/executable-stories-showcase/src/adapters/tanstack-query.ts';
import { xstateAdapter } from '../../../packages/executable-stories-showcase/src/adapters/xstate.ts';
import { zustandAdapter } from '../../../packages/executable-stories-showcase/src/adapters/zustand.ts';
import { createCatalog, defineScenarioRules } from '../../../packages/executable-stories-showcase/src/catalog.ts';
import { isLoopbackSaveUrl, readInline, scenarioHref } from '../../../packages/executable-stories-showcase/src/link.ts';
import { toHandlers } from '../../../packages/executable-stories-showcase/src/network.ts';
import { parseScenario, type ScenarioInput } from '../../../packages/executable-stories-showcase/src/schema.ts';

const dir = new URL('../examples/demo-react/scenarios/', import.meta.url);

const demoRaw = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8')));

describe('parseScenario', () => {
  it('reports readable errors', () => {
    expect(() => parseScenario({ name: 'Bad Name' })).toThrow(/kebab-case/);
    expect(() => parseScenario({ name: 'x', network: [{ path: '/a' }] })).toThrow(
      /exactly one of "response", "sequence" or "remove"/,
    );
  });
});

describe('extends', () => {
  const catalog = createCatalog([
    {
      name: 'base',
      description: 'base only',
      tags: ['t'],
      ready: 'text=base',
      url: { a: '1', b: '1' },
      network: [
        { path: '/x', response: { body: 'base' } },
        { path: '/y', response: { body: 'y' } },
        { path: '/y', query: { p: '2' }, response: { body: 'y2' } },
      ],
      state: { s: { keep: 1, over: 1, drop: 1 } },
    },
    { name: 'mid', extends: 'base', url: { b: '2' }, state: { s: { over: 2, drop: null } } },
    {
      name: 'leaf',
      extends: 'mid',
      url: { a: null },
      network: [
        { path: '/x', response: { body: 'leaf' } },
        { path: '/y', query: { p: '2' }, remove: true },
      ],
    },
    { name: 'loop-a', extends: 'loop-b' },
    { name: 'loop-b', extends: 'loop-a' },
    { name: 'orphan', extends: 'nope' },
  ]);

  const leaf = catalog.resolve(catalog.get('leaf')!);

  it('merges url and state; null removes', () => {
    expect(leaf.url).toEqual({ b: '2' });
    expect(leaf.state).toEqual({ s: { keep: 1, over: 2 } });
  });

  it('replaces same-route network entries and honours remove', () => {
    expect(leaf.network!.map((n) => n.response!.body)).toEqual(['leaf', 'y']);
  });

  it('does not inherit description, tags, ready or extends', () => {
    expect([leaf.description, leaf.tags, leaf.ready, leaf.extends]).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
  });

  it('normalises standalone scenarios: remove entries and nulls never reach runtime', () => {
    const solo = createCatalog([]).resolve(
      parseScenario({
        name: 'solo',
        url: { q: null },
        network: [{ path: '/x', remove: true }, { path: '/y', response: {} }],
      }),
    );

    expect(solo.network!.map((n) => n.path)).toEqual(['/y']);
    expect(solo.url).toEqual({});
  });

  it('rejects cycles, unknown parents and duplicates', () => {
    expect(() => catalog.resolve(catalog.get('loop-a')!)).toThrow(
      /Circular extends: loop-a -> loop-b -> loop-a/,
    );
    expect(() => catalog.resolve(catalog.get('orphan')!)).toThrow(/unknown "nope"/);
    expect(() => createCatalog([{ name: 'a' }, { name: 'a' }])).toThrow(/Duplicate/);
    expect(() => createCatalog([{ name: 'a,b' }])).toThrow(/can't contain a comma/);
    expect(parseScenario({ name: 'a,b', extends: ['a', 'b'] }).name).toBe('a,b');
    expect(catalog.check()).toHaveLength(3);
  });
});

describe('rules', () => {
  const noAdmins = defineScenarioRules([
    (s) => (s.url?.role === 'admin' ? 'Admins are out of scope' : undefined),
  ]);

  const catalog = createCatalog([{ name: 'base' }, {
    name: 'admin',
    extends: 'base',
    url: { role: 'admin' },
  }], {
    rules: noAdmins,
  });

  it('run on the resolved scenario', () => {
    expect(() => catalog.resolve(catalog.get('base')!)).not.toThrow();
    expect(() => catalog.resolve(catalog.get('admin')!)).toThrow(/breaks rules:\n- Admins are out of scope/);
  });

  it('catch duplicate country codes in the demo', () => {
    const demo = createCatalog(demoRaw, { rules });

    const dupe = parseScenario({
      name: 'dupe',
      network: [{ path: '/api/countries', response: { body: [{ cca2: 'FR' }, { cca2: 'FR' }] } }],
    });

    expect(() => demo.resolve(dupe)).toThrow(/repeats cca2: FR/);
  });
});

describe('links', () => {
  it('keep strict mode', () => {
    const url = new URL(
      scenarioHref(parseScenario({ name: 'empty' }), { base: 'http://app.test/', strict: true }),
    );

    expect(url.searchParams.has('scenario-strict')).toBe(true);
  });

  it('keep record mode', () => {
    const url = new URL(
      scenarioHref(parseScenario({ name: 'empty' }), { base: 'http://app.test/', record: true }),
    );

    expect(url.searchParams.has('scenario-record')).toBe(true);
  });

  it("open the scenario's route, inherited through extends", () => {
    const catalog = createCatalog([
      { name: 'order', path: '/orders/42' },
      { name: 'order-shipped', extends: 'order' },
    ]);

    const resolved = catalog.resolve(catalog.get('order-shipped')!);

    expect(new URL(scenarioHref(resolved, { base: 'http://app.test/dashboard?x=1' })).pathname)
      .toBe('/orders/42');
  });
});

describe('inline links', () => {
  it('are flattened, so they work without the catalog', () => {
    const catalog = createCatalog(demoRaw);
    const resolved = catalog.resolve(catalog.get('chewbacca')!);
    const href = scenarioHref(resolved, { base: 'http://app.test/x?old=1', inline: true });
    const url = new URL(href);
    expect(url.search).toBe('');
    const snapshot = JSON.parse(readInline(url.hash)!);
    expect(snapshot.extends).toBeUndefined();
    expect(snapshot.network).toHaveLength(1);
    expect(createCatalog([]).resolve(parseScenario(snapshot))).toEqual(resolved);
  });
});

describe('toHandlers', () => {
  const server = setupServer();
  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  const use = (network: NonNullable<ScenarioInput['network']>) =>
    server.use(...toHandlers(parseScenario({ name: 't', network }).network));

  const get = (url: string) => fetch(`http://api.test${url}`);

  it('serves status and JSON body, with path params', async () => {
    use([{ path: 'http://api.test/users/:id', response: { status: 404, body: { message: 'nope' } } }]);
    const res = await get('/users/7');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ message: 'nope' });
  });

  it('matches query and falls through otherwise; first entry wins', async () => {
    use([
      { path: 'http://api.test/items', query: { page: '2' }, response: { body: ['p2'] } },
      { path: 'http://api.test/items', response: { body: ['p1'] } },
      { path: 'http://api.test/items', response: { body: ['shadowed'] } },
    ]);
    expect(await (await get('/items?page=2')).json()).toEqual(['p2']);
    expect(await (await get('/items')).json()).toEqual(['p1']);
  });

  it('sends text as text and body as JSON', async () => {
    use([
      { path: 'http://api.test/page', response: { status: 503, text: '<h1>Down</h1>' } },
      { path: 'http://api.test/word', response: { body: 'ok' } },
    ]);
    expect(await (await get('/page')).text()).toBe('<h1>Down</h1>');
    expect(await (await get('/word')).text()).toBe('"ok"');
  });

  it('never answers as script: nosniff on every response, script types fall through', async () => {
    use([
      { path: 'http://api.test/x', response: { text: 'evil()', headers: { 'content-type': 'text/javascript' } } },
      { path: 'http://api.test/x', response: { body: 'data' } },
    ]);
    const res = await get('/x');
    expect(await res.json()).toBe('data');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('plays a sequence and repeats the last response', async () => {
    use([{ path: 'http://api.test/flaky', sequence: [{ status: 500 }, { status: 200, text: 'ok' }] }]);
    expect((await get('/flaky')).status).toBe(500);
    expect(await (await get('/flaky')).text()).toBe('ok');
    expect(await (await get('/flaky')).text()).toBe('ok');
  });
});

describe('JSON Schema agrees with runtime validation', () => {
  const schema = demoJsonSchema();
  const validate = new Ajv2020({ strict: false }).compile(schema);

  const zodOk = (data: ScenarioInput) => {
    try {
      parseScenario(data);

      return true;
    } catch {
      return false;
    }
  };

  it('matches the committed demo/scenario.schema.json', () => {
    const committed = JSON.parse(
      readFileSync(new URL('../examples/demo-react/scenario.schema.json', import.meta.url), 'utf8'),
    );

    expect(committed, 'run `pnpm schema`').toEqual(schema);
  });

  // Scenarios arrive as JSON text (files, URLs, the editor), so the cases do too.
  const cases: [string, string][] = [
    ...demoRaw.map((d): [string, string] => [d.name, JSON.stringify(d)]),
    ['both response and sequence', '{"name":"x","network":[{"path":"/a","response":{},"sequence":[{}]}]}'],
    ['neither', '{"name":"x","network":[{"path":"/a"}]}'],
    ['remove', '{"name":"x","network":[{"path":"/a","remove":true}]}'],
    ['body and text', '{"name":"x","network":[{"path":"/a","response":{"body":1,"text":"1"}}]}'],
    ['bad name', '{"name":"Bad"}'],
    ['null url param', '{"name":"x","url":{"q":null}}'],
    ['bad delay', '{"name":"x","network":[{"path":"/a","response":{"delay":"soon"}}]}'],
  ];

  it.each(cases)('%s', (_, json) => {
    const data = JSON.parse(json);
    expect(validate(data)).toBe(zodOk(data));
  });

  it('describes adapter state', () => {
    const bad = { name: 'x', state: { 'tanstack-query': [{ data: 1 }] } };
    expect(validate(bad)).toBe(false);
  });
});

describe('every demo scenario', () => {
  const catalog = createCatalog(demoRaw, { rules });
  it('resolves, passes the rules and declares when it is ready', () => {
    expect(catalog.check()).toEqual([]);
    expect(catalog.list.filter((s) => !s.ready).map((s) => s.name)).toEqual([]);
  });
});

describe('adapters', () => {
  it('tanstack-query seeds the cache and captures an in-flight refresh as stale', async () => {
    const client = new QueryClient();
    const adapter = tanstackQuery(client);
    await adapter.apply(adapter.schema.parse([{ queryKey: ['countries'], data: [1, 2] }]));
    expect(client.getQueryData(['countries'])).toEqual([1, 2]);
    expect(adapter.read?.()).toEqual([{ queryKey: ['countries'], data: [1, 2] }]);

    await client.prefetchQuery({ queryKey: ['other'], queryFn: () => 'x' });
    void client.refetchQueries({ queryKey: ['other'] });
    expect(adapter.read?.()).toContainEqual({ queryKey: ['other'], data: 'x', stale: true });
    expect(adapter.schema.safeParse([{ queryKey: [] }]).success).toBe(false);
  });

  it('cookies sets and reads document.cookie', () => {
    const jar = new Map<string, string>();
    vi.stubGlobal('document', {
      get cookie() {
        return [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
      },
      set cookie(c: string) {
        const [pair] = c.split(';');
        const i = pair.indexOf('=');
        jar.set(pair.slice(0, i), pair.slice(i + 1));
      },
    });
    const adapter = cookiesAdapter();
    void adapter.apply(adapter.schema.parse({ AuthToken: 'fake token' }));
    expect(jar.get('AuthToken')).toBe('fake%20token');
    expect(adapter.read?.()).toEqual({ AuthToken: 'fake token' });
    vi.unstubAllGlobals();
  });

  it('zustand merges decoded state into the store', async () => {
    const Store = z.object({ count: z.number(), user: z.string() });
    const store = createZustand(() => ({ count: 0, user: 'ann' }));
    const adapter = zustandAdapter(store, { schema: Store.partial() });
    await adapter.apply(adapter.schema.parse({ count: 5 }));
    expect(store.getState()).toEqual({ count: 5, user: 'ann' });
    expect(adapter.read?.()).toEqual({ count: 5, user: 'ann' });
  });

  it('redux deep-merges via withScenarioState and checks the result', () => {
    const CartState = z.object({
      cart: z.object({ items: z.array(z.string()), open: z.boolean() }),
      user: z.string().optional(),
    });

    type CartState = z.output<typeof CartState>;

    const initial: CartState = { cart: { items: [], open: false }, user: 'ann' };

    const reducer = (state: CartState = initial, action: { type: string; }): CartState =>
      action.type === 'open' ? { ...state, cart: { ...state.cart, open: true } } : state;

    const store = createStore(withScenarioState(reducer, CartState));
    void reduxAdapter(store).apply({ cart: { items: ['tea'] }, user: null });
    expect(store.getState()).toEqual({ cart: { items: ['tea'], open: false } });
    store.dispatch({ type: 'open' });
    expect(store.getState().cart.open).toBe(true);
    expect(() => void reduxAdapter(store).apply({ cart: { open: 'yes' } })).toThrow();
  });

  it('xstate resolves a snapshot to start the actor from', async () => {
    const machine = createMachine({
      initial: 'idle',
      context: { attempts: 0, user: 'ann' },
      states: { idle: { on: { GO: 'loading' } }, loading: {}, failed: {} },
    });

    const adapter = xstateAdapter(machine, { context: z.object({ attempts: z.number(), user: z.string() }) });
    await adapter.apply(adapter.schema.parse({ value: 'failed', context: { attempts: 3 } }));
    const actor = createActor(machine, { snapshot: adapter.snapshot }).start();
    expect(actor.getSnapshot().value).toBe('failed');
    expect(actor.getSnapshot().context).toEqual({ attempts: 3, user: 'ann' });
  });
});

describe('suggestScenarios', () => {
  const catalog = createCatalog(demoRaw, { rules });

  const fakeClient = (reply: { parsed_output: Suggestion | null; stop_reason?: string; }) => {
    const calls: MessageCreateParamsNonStreaming[] = [];

    const client: SuggestClient = {
      beta: {
        messages: {
          parse: async (params) => {
            calls.push(params);

            return { stop_reason: 'end_turn', content: [], ...reply };
          },
        },
      },
    };

    return { client, calls };
  };

  it('keeps valid proposals and explains rejected ones', async () => {
    const { client, calls } = fakeClient({
      parsed_output: {
        states: [
          { area: 'list', state: 'populated', evidence: 'App.tsx', covered_by: 'default', priority: 'low' },
          { area: 'list', state: 'single page', evidence: 'App.tsx', covered_by: null, priority: 'medium' },
        ],
        proposals: [
          {
            scenario_json: JSON.stringify({
              name: 'exactly-ten',
              extends: 'default',
              network: [{ path: '/api/countries', response: { body: [] } }],
              ready: 'text=0 countries',
            }),
            covers: 'list / single page',
            rationale: 'boundary',
          },
          { scenario_json: '{"name":"default"}', covers: 'dupe', rationale: '' },
          { scenario_json: '{"name":"x","extends":"missing"}', covers: 'orphan', rationale: '' },
          { scenario_json: 'not json', covers: 'junk', rationale: '' },
        ],
      },
    });

    const result = await suggestScenarios(
      { sources: [{ path: 'App.tsx', content: 'export {}' }], catalog, jsonSchema: {} },
      { client },
    );

    expect(result.accepted.map((a) => a.scenario.name)).toEqual(['exactly-ten']);
    expect(result.rejected.map((r) => r.error)).toEqual([
      expect.stringMatching(/already taken/),
      expect.stringMatching(/unknown "missing"/),
      expect.stringMatching(/JSON/),
    ]);

    const [params] = calls;
    expect(params.model).toBe('claude-opus-5-5');
    expect(params.fallbacks).toBe('default');
    // Fixture bodies are summarised, not sent whole.
    expect(params.messages[0].content).toContain('"items": 248');
    expect(params.messages[0].content).toContain('<source path="App.tsx">');
  });

  it('rejects proposals the supplied JSON Schema rejects (e.g. adapter state shape)', async () => {
    const { client } = fakeClient({
      parsed_output: {
        states: [],
        proposals: [
          {
            scenario_json: JSON.stringify({
              name: 'bad-cache',
              extends: 'default',
              state: { 'tanstack-query': [{ data: 1 }] },
            }),
            covers: 'cache',
            rationale: '',
          },
        ],
      },
    });

    const result = await suggestScenarios({ sources: [], catalog, jsonSchema: demoJsonSchema() }, { client });
    expect(result.accepted).toEqual([]);
    expect(result.rejected[0].error).toMatch(/JSON Schema/);
  });

  it('falls back to plain JSON when a proxy rejects structured output', async () => {
    const calls: MessageCreateParamsNonStreaming[] = [];
    const reply: Suggestion = { states: [], proposals: [] };

    const client: SuggestClient = {
      beta: {
        messages: {
          parse: async (params) => {
            calls.push(params);

            if (params.output_config?.format) {
              throw new BadRequestError(400, {}, 'no format', new Headers());
            }

            const text = `Here:\n\`\`\`json\n${JSON.stringify(reply)}\n\`\`\``;

            return { stop_reason: 'end_turn', parsed_output: null, content: [{ type: 'text', text }] };
          },
        },
      },
    };

    const result = await suggestScenarios({ sources: [], catalog, jsonSchema: {}, model: 'qwen3.8-max' }, {
      client,
    });

    expect(result).toEqual({ states: [], accepted: [], rejected: [] });
    // Non-Claude models get no Claude-only parameters.
    expect(calls.map((c) => [c.model, c.fallbacks, c.betas])).toEqual([
      ['qwen3.8-max', undefined, undefined],
      ['qwen3.8-max', undefined, undefined],
    ]);
  });

  it('surfaces refusals', async () => {
    const { client } = fakeClient({ parsed_output: null, stop_reason: 'refusal' });
    await expect(
      suggestScenarios({ sources: [], catalog, jsonSchema: {} }, { client }),
    ).rejects.toThrow(/declined/);
  });
});

describe('save URL from the save route', () => {
  it('accepts a loopback save server, the one the Next.js route starts', () => {
    expect(isLoopbackSaveUrl('http://127.0.0.1:51234/__executable-stories-showcase/save')).toBe(true);
    expect(isLoopbackSaveUrl('http://localhost:3000/__executable-stories-showcase/save')).toBe(true);
    expect(isLoopbackSaveUrl('http://[::1]:3000/__executable-stories-showcase/save')).toBe(true);
  });

  it('refuses any other host, scheme or path, so captured state never leaves the machine', () => {
    for (const url of [
      'https://attacker.example/__executable-stories-showcase/save',
      'http://127.0.0.1.attacker.example/__executable-stories-showcase/save',
      'https://127.0.0.1:51234/__executable-stories-showcase/save',
      'http://127.0.0.1:51234/upload',
      '//attacker.example/__executable-stories-showcase/save',
      'not a url',
    ]) {
      expect(isLoopbackSaveUrl(url), url).toBe(false);
    }
  });
});
