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

export interface CursorOptions {
  /** `'arrow'` (default), `'dot'`, or your own SVG/HTML markup, drawn with its top-left corner on the mouse. */
  pointer?: 'arrow' | 'dot' | (string & {});
  /** Any CSS color for the pointer, its pulsing halo and the click ripple. Default `#ff3d71`. */
  color?: string;
}

/**
 * Draw a mouse pointer that follows Playwright's mouse, since recorded videos don't show one.
 * It pulses so the eye finds it, glides between points, follows focus (so `fill()` steps show where
 * typing lands), and drops a ripple on each click. One pointer is drawn in the top frame and
 * follows the mouse into iframes. Call before the page loads, e.g. before `openScenario`.
 */
export async function showCursor(page: Page, { pointer = 'arrow', color = '#ff3d71' }: CursorOptions = {}) {
  await page.addInitScript(({ pointer, color }) => {
    type Pointer = { type: 'move' | 'down' | 'up'; x: number; y: number; };

    // Only the top frame draws. Other frames pass their pointer to their parent, which adds the
    // iframe's place, so a page with iframes shows one cursor.
    let show = (p: Pointer) => parent.postMessage({ executableStoriesShowcaseCursor: p }, '*');

    // A click focuses on mousedown, or for a <label> in the click after mouseup; the mouse is already there.
    let clicking = false;

    addEventListener('mousemove', (e) => show({ type: 'move', x: e.clientX, y: e.clientY }), true);
    addEventListener('mousedown', (e) => {
      clicking = true;
      show({ type: 'down', x: e.clientX, y: e.clientY });
    }, true);
    addEventListener('mouseup', (e) => {
      show({ type: 'up', x: e.clientX, y: e.clientY });
      setTimeout(() => (clicking = false));
    }, true);
    addEventListener('keydown', () => (clicking = false), true);
    // fill() and keyboard steps focus a field without moving the mouse. An iframe gets focus when
    // something inside it does; that frame reports where.
    addEventListener('focusin', (e) => {
      if (clicking || !(e.target instanceof Element) || e.target instanceof HTMLIFrameElement) return;
      const r = e.target.getBoundingClientRect();
      show({ type: 'move', x: r.left + Math.min(24, r.width / 2), y: r.top + r.height / 2 });
    }, true);
    addEventListener('message', (e) => {
      const p: Pointer | undefined = e.data?.executableStoriesShowcaseCursor;
      const frame = [...document.querySelectorAll('iframe')].find((f) => f.contentWindow === e.source);

      if (!p || !frame) return;

      // The measured box over the layout size gives the iframe's CSS scale, which applies to its
      // border, padding and the point itself.
      const box = frame.getBoundingClientRect();
      const style = getComputedStyle(frame);
      const scaleX = box.width / frame.offsetWidth || 1;
      const scaleY = box.height / frame.offsetHeight || 1;

      show({
        ...p,
        x: box.left + (frame.clientLeft + parseFloat(style.paddingLeft) + p.x) * scaleX,
        y: box.top + (frame.clientTop + parseFloat(style.paddingTop) + p.y) * scaleY,
      });
    });

    if (window !== window.top) return;

    const style = document.createElement('style');
    style.textContent = `
      .es-cursor, .es-ripple { position: fixed; left: 0; top: 0; pointer-events: none; z-index: 2147483647; }
      .es-cursor { transition: transform .35s cubic-bezier(.2,.7,.3,1); }
      .es-cursor > * { position: absolute; left: 0; top: 0; }
      .es-cursor > :last-child { transition: scale .1s; transform-origin: 0 0; }
      .es-cursor[data-down] > :last-child { scale: .8; }
      .es-halo {
        left: -18px; top: -18px; width: 36px; height: 36px; border-radius: 50%; background: ${color};
        animation: es-cursor-halo 1.2s ease-out infinite;
      }
      .es-ripple {
        width: 44px; height: 44px; margin: -22px 0 0 -22px; border-radius: 50%; box-sizing: border-box;
        border: 4px solid ${color}; animation: es-cursor-ripple .6s ease-out forwards;
      }
      @keyframes es-cursor-halo { from { opacity: .8; scale: .4 } to { opacity: 0; scale: 1.6 } }
      @keyframes es-cursor-ripple { from { opacity: .9; scale: .3 } to { opacity: 0; scale: 2.6 } }`;

    const shapes: Record<string, string> = {
      arrow: `<svg width="24" height="28" viewBox="-1 -1 18 26" style="display:block;filter:drop-shadow(0 1px 2px rgba(0,0,0,.5))">`
        + `<path d="M0 0V20L5.5 15 9 23 12 21.5 8.6 14H16Z" fill="${color}" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
      dot: `<div style="width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;background:${color};border:3px solid #fff;box-sizing:border-box"></div>`,
    };

    // A zero-size box on the mouse: the halo centres on it, the pointer hangs from it.
    const cursor = document.createElement('div');
    cursor.className = 'es-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    cursor.innerHTML = `<div class="es-halo"></div><div>${shapes[pointer] ?? pointer}</div>`;
    // Start mid-screen so the first glide to a target shows in the video.
    cursor.style.transform = `translate(${innerWidth / 2}px,${innerHeight / 2}px)`;

    show = ({ type, x, y }) => {
      if (type === 'up') {
        delete cursor.dataset.down;

        return;
      }

      cursor.style.transform = `translate(${x}px,${y}px)`;

      if (type === 'move') return;

      cursor.dataset.down = '';
      const ripple = document.createElement('div');
      ripple.className = 'es-ripple';
      ripple.setAttribute('aria-hidden', 'true');
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      ripple.addEventListener('animationend', () => ripple.remove());
      document.documentElement.append(ripple);
    };

    const attach = () => document.documentElement.append(style, cursor);

    if (document.documentElement) attach();
    else addEventListener('DOMContentLoaded', attach);
  }, { pointer, color });
}
