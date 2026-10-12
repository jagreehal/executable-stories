import type { Page } from '@playwright/test';
import { DATA_KEY, PARAM, STRICT_PARAM } from './link.js';
import type { ScenarioInput } from './schema.js';

export interface OpenOptions {
  /** App path to open. Default "/". */
  path?: string;
  /** Fail unmocked requests instead of letting them reach a real backend. Default true. */
  strict?: boolean;
  /** Show the dev panel. False hides it, for screenshots that go into product docs. Default true. */
  panel?: boolean;
}

/**
 * Open the app in a catalog scenario and wait until the UI shows it: the scenario is
 * active and its `ready` selector, if any, is visible.
 */
export async function openScenario(page: Page, name: string, options: OpenOptions = {}) {
  await open(page, name, new URLSearchParams({ [PARAM]: name }), '', options);
}

/**
 * Like `openScenario`, for a scenario defined in the test rather than the catalog.
 * It opens as an inline link, so off localhost the app needs `startScenarios({ allowLinks: true })`.
 */
export async function openInlineScenario(page: Page, scenario: ScenarioInput, options: OpenOptions = {}) {
  const hash = `#${new URLSearchParams({ [DATA_KEY]: JSON.stringify(scenario) })}`;
  await open(page, scenario.name, new URLSearchParams(), hash, { path: scenario.path, ...options });
}

async function open(
  page: Page,
  name: string,
  search: URLSearchParams,
  hash: string,
  { path = '/', strict = true, panel = true }: OpenOptions,
) {
  // Relative to the test's baseURL; `//host`, `/\host` or a full URL would open another site.
  if (!/^\/(?![/\\])/.test(path)) {
    throw new Error(`[executable-stories-showcase] path "${path}" must be a path on the app, such as /orders/42`);
  }

  if (strict) search.set(STRICT_PARAM, '');
  await setPanel(page, panel);
  // Leave the page first: a hash-only change would not reload the app.
  await page.goto('about:blank');
  await page.goto(`${path}?${search}${hash}`);
  const html = page.locator(`html[data-scenario="${name}"]`);
  await html.waitFor({ state: 'attached' });
  const ready = await html.getAttribute('data-scenario-ready');

  if (ready) await page.locator(ready).first().waitFor();
}

declare global {
  /** Exposed by `openScenario({ panel: false })`: whether this page should hide the panel. */
  var executableStoriesShowcasePanelHidden: (() => Promise<boolean>) | undefined;
}

// Per page: whether the panel is hidden. The init script asks on every load, so a later
// open can show the panel again on any Playwright version.
const panelHidden = new WeakMap<Page, { hidden: boolean; }>();

async function setPanel(page: Page, show: boolean) {
  const state = panelHidden.get(page);

  if (state) {
    state.hidden = !show;

    return;
  }

  if (show) return;
  const created = { hidden: true };
  panelHidden.set(page, created);
  await page.exposeFunction('executableStoriesShowcasePanelHidden', () => created.hidden);
  // Hide before the app's scripts run, so the panel never shows, not even in a video;
  // then show it again if this page no longer wants it hidden.
  await page.addInitScript(() => {
    const style = document.createElement('style');
    style.textContent = 'scenario-panel { display: none !important; }';
    // Init scripts can run before <html> exists: attach as soon as it does.
    const attach = () => document.documentElement.append(style);

    if (document.documentElement) attach();
    else {
      new MutationObserver((_, observer) => {
        if (!document.documentElement) return;
        observer.disconnect();
        attach();
      }).observe(document, { childList: true });
    }

    void globalThis.executableStoriesShowcasePanelHidden?.().then((hidden) => {
      if (!hidden) style.remove();
    });
  });
}

/** Requests the active scenario didn't cover, e.g. to assert none in strict runs. */
export const unhandledRequests = (page: Page): Promise<string[]> =>
  page.evaluate(() => globalThis.executableStoriesShowcaseUnhandled ?? []);

/**
 * Draw a mouse pointer that follows Playwright's mouse, since recorded videos don't show one.
 * It glides between points and pulses on click. Call before the page loads, e.g. before `openScenario`.
 */
export async function showCursor(page: Page) {
  await page.addInitScript(() => {
    const cursor = document.createElement('div');
    cursor.setAttribute('aria-hidden', 'true');
    cursor.style.cssText = [
      'position:fixed',
      'left:0',
      'top:0',
      'width:18px',
      'height:18px',
      'margin:-9px 0 0 -9px',
      'border-radius:50%',
      'background:rgba(20,20,20,.55)',
      'border:2px solid #fff',
      'box-shadow:0 1px 4px rgba(0,0,0,.4)',
      'pointer-events:none',
      'z-index:2147483647',
      'transform:translate(-40px,-40px)',
      'transition:transform .25s ease-out,scale .1s',
    ].join(';');

    const place = (e: MouseEvent) => (cursor.style.transform = `translate(${e.clientX}px,${e.clientY}px)`);
    addEventListener('mousemove', place, true);
    addEventListener('mousedown', () => (cursor.style.scale = '0.7'), true);
    addEventListener('mouseup', () => (cursor.style.scale = '1'), true);

    const attach = () => document.documentElement.append(cursor);

    if (document.documentElement) attach();
    else addEventListener('DOMContentLoaded', attach);
  });
}
