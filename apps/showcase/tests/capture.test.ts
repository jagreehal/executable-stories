// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { createCatalog, diffScenario } from '../../../packages/executable-stories-showcase/src/catalog.ts';
import {
  checkReadySelector,
  closestReadySelector,
  selectorForElement,
  suggestReadySelectors,
} from '../../../packages/executable-stories-showcase/src/ready.ts';
import { parseScenario } from '../../../packages/executable-stories-showcase/src/schema.ts';

describe('diffScenario', () => {
  const catalog = createCatalog([
    {
      name: 'base',
      description: 'base only',
      tags: ['t'],
      ready: 'text=base',
      path: '/',
      url: { a: '1', b: '1' },
      network: [
        { path: '/x', response: { body: 'base' } },
        { path: '/y', response: { body: 'y' } },
        { path: '/y', query: { p: '2' }, response: { body: 'y2' } },
      ],
      state: { s: { keep: 1, over: 1, drop: 1 } },
    },
    {
      name: 'leaf',
      extends: 'base',
      description: 'leaf only',
      ready: 'text=leaf',
      url: { a: null, b: '2' },
      network: [
        { path: '/x', response: { body: 'leaf' } },
        { path: '/y', query: { p: '2' }, remove: true },
        { path: '/z', response: { body: 'z' } },
      ],
      state: { s: { over: 2, drop: null, extra: 3 } },
    },
  ]);

  it('round-trips through resolve', () => {
    const flatBase = catalog.resolve(catalog.get('base')!);
    const captured = catalog.resolve(catalog.get('leaf')!);
    const diff = diffScenario(captured, flatBase);
    expect(diff.extends).toBe('base');
    expect(diff.ready).toBe('text=leaf');
    expect(diff.description).toBe('leaf only');

    const again = createCatalog([catalog.get('base')!, diff]).resolve(
      parseScenario(diff),
    );

    expect(again.url).toEqual(captured.url);
    expect(again.state).toEqual(captured.state);
    expect(again.network).toEqual(captured.network);
    expect(again.path).toEqual(captured.path);
    expect(again.ready).toBe(captured.ready);
  });

  it('round-trips a null slice over a base that sets it', () => {
    const nulls = createCatalog([
      { name: 'signed-in', state: { user: { id: 1 }, cart: { n: 1 } } },
      { name: 'signed-out', extends: 'signed-in', state: { user: null } },
    ]);
    const flatBase = nulls.resolve(nulls.get('signed-in')!);
    const captured = nulls.resolve(nulls.get('signed-out')!);
    const diff = diffScenario(captured, flatBase);

    expect(captured.state).toEqual({ user: null, cart: { n: 1 } });
    expect(createCatalog([flatBase, diff]).resolve(parseScenario(diff)).state).toEqual(captured.state);
  });

  it('inherits a slice the capture has no adapter for', () => {
    const flatBase = catalog.resolve(catalog.get('base')!);
    const diff = diffScenario(catalog.resolve(parseScenario({ name: 'bare' })), flatBase);

    expect(diff.state).toBeUndefined();
  });

  it('omits fields equal to the base', () => {
    const base = catalog.get('base');

    expect(base).toBeDefined();

    const flatBase = catalog.resolve(base!);

    const same = parseScenario({
      name: 'twin',
      ready: 'text=twin',
      path: flatBase.path,
      url: flatBase.url,
      network: flatBase.network,
      state: flatBase.state,
    });

    const diff = diffScenario(catalog.resolve(same), flatBase);

    expect(diff).toEqual({
      name: 'twin',
      extends: 'base',
      ready: 'text=twin',
    });
  });

  it('keeps the first of duplicate captured routes, the one MSW serves', () => {
    const flatBase = catalog.resolve(catalog.get('base')!);

    const captured = catalog.resolve(parseScenario({
      ...flatBase,
      name: 'dup',
      network: [
        { path: '/x', response: { body: 'served' } },
        { path: '/x', response: { body: 'shadowed' } },
        ...flatBase.network!.filter((e) => e.path !== '/x'),
      ],
    }));

    expect(diffScenario(captured, flatBase).network?.map((e) => e.response?.body)).toEqual(['served']);
  });

  it('returns a full snapshot with no base', () => {
    const leaf = catalog.get('leaf');

    expect(leaf).toBeDefined();

    const captured = catalog.resolve(leaf!);
    const full = diffScenario(captured);
    expect(full.extends).toBeUndefined();
    expect(full.network?.length).toBeGreaterThan(0);
    expect(full.ready).toBe('text=leaf');
  });
});

describe('ready selectors', () => {
  it('prefers data-testid, then named role, then unique text', () => {
    document.body.innerHTML = `
      <main>
        <h2 data-testid="title">Countries</h2>
        <p role="alert">Upstream timeout</p>
        <button type="button">Retry</button>
      </main>
    `;
    const title = document.querySelector('[data-testid=title]')!;
    expect(selectorForElement(title)).toBe('[data-testid="title"]');

    const alert = document.querySelector('[role=alert]')!;
    // An alert takes no name from its text, so Playwright's [name=…] would never match it.
    expect(selectorForElement(alert)).toBe('text="Upstream timeout"');

    const button = document.querySelector('button')!;
    expect(selectorForElement(button)).toBe('role=button[name="Retry"]');
  });

  it('keeps the data-test-id attribute it found', () => {
    document.body.innerHTML = `<div data-test-id="orders">Orders</div>`;
    expect(selectorForElement(document.querySelector('div')!)).toBe('[data-test-id="orders"]');
  });

  it('quotes text selectors so Playwright matches the whole text', () => {
    document.body.innerHTML = `<p>No orders</p><p>No orders yet</p>`;
    expect(selectorForElement(document.querySelector('p')!)).toBe('text="No orders"');
  });

  it('suggests ranked candidates and skips the panel host', () => {
    document.body.innerHTML = `
      <h2>248 countries</h2>
      <p role="alert">No countries match</p>
      <scenario-panel></scenario-panel>
    `;
    const picks = suggestReadySelectors(document.body, { limit: 3 });
    expect(picks.length).toBeGreaterThan(0);
    expect(picks.some((s) => s.includes('No countries match') || s.includes('alert'))).toBe(true);
    expect(picks.every((s) => !s.includes('scenario-panel'))).toBe(true);
  });

  it('walks up from an unnamed element to the nearest one with a selector', () => {
    document.body.innerHTML =
      `<button type="button"><svg><path></path></svg> Retry</button><div><span></span></div>`;
    const hit = closestReadySelector(document.querySelector('path')!);

    expect(hit?.selector).toBe('role=button[name="Retry"]');
    expect(hit?.element).toBe(document.querySelector('button'));
    expect(closestReadySelector(document.querySelector('span')!)).toBeUndefined();
  });

  it('ranks state content above app chrome and inputs', () => {
    document.body.innerHTML = `
      <header><h1>Who speaks what</h1><input type="search" aria-label="Search countries"></header>
      <main><h2>0 countries</h2><p>No countries match.</p><p><b>0</b> results</p></main>
    `;

    const picks = suggestReadySelectors(document.body, { limit: 5 });

    expect(picks.slice(0, 2)).toEqual(['role=heading[name="0 countries"]', 'text="No countries match."']);
    expect(picks).not.toContain('text="0"');
  });
});

// Expected counts come from running each selector through Playwright 1.63 on this markup.
describe('checkReadySelector matches like Playwright', () => {
  const html = `
    <h2>Hello <b>World</b></h2><h3>No Orders</h3><p>Plain <i>mixed</i> text</p><p>  spaced   out </p>
    <button aria-label="Close dialog">x</button><div role="alert">Boom</div>
    <input placeholder="Search countries"><span id="t">Title here</span>
    <section role="region" aria-labelledby="t">x</section><label>Email <input type="email"></label>
    <a href="#">Go <span>home</span></a><button>  Save   draft </button><h2 hidden>Gone</h2>
    <div data-testid="card">c</div><div data-testid="card">d</div>
  `;

  const count = (selector: string) => {
    const check = checkReadySelector(selector);

    return check.status === 'match' ? check.count : check.status;
  };

  it.each(
    [
      ['role=heading[name="Hello"]', 'none'],
      ['role=heading[name="Hello World"]', 1],
      ['role=heading[name="no orders"]', 'none'],
      ['role=heading[name="Gone"]', 'none'],
      ['role=button[name="Close dialog"]', 1],
      ['role=button[name="Save draft"]', 1],
      ['role=link[name="Go home"]', 1],
      ['role=textbox[name="Search countries"]', 1],
      ['role=textbox[name="Email"]', 1],
      ['role=alert', 1],
      ['role=alert[name="Boom"]', 'unchecked'],
      ['role=region[name="Title here"]', 1],
      ['text="Hello"', 1],
      ['text="Hello World"', 'none'],
      ['text="Plain"', 1],
      ['text="spaced out"', 1],
      ['text="no orders"', 'none'],
      ['text=hello', 1],
      ['text=orders', 1],
      ['[data-testid="card"]', 2],
      ['css=h3', 1],
      ['xpath=//h2', 'unchecked'],
      ['h2 >> text=World', 'unchecked'],
      ['text=/hel+o/i', 'unchecked'],
    ] as const,
  )('%s', (selector, expected) => {
    document.body.innerHTML = html;
    expect(count(selector)).toBe(expected);
  });

  it('flags invalid CSS and a hidden first match', () => {
    document.body.innerHTML = html;
    expect(checkReadySelector('div[').status).toBe('invalid');
    expect(checkReadySelector('text="Gone"')).toMatchObject({ status: 'match', count: 1, visible: false });
  });

  it('names headings by their whole text, so the generated selector matches', () => {
    document.body.innerHTML = '<h2>Hello <b>World</b></h2>';
    const selector = selectorForElement(document.querySelector('h2')!)!;

    expect(selector).toBe('role=heading[name="Hello World"]');
    expect(checkReadySelector(selector)).toMatchObject({ status: 'match', count: 1 });
  });
});
