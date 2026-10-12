import { z } from 'zod';
import { captureScenario } from './capture.js';
import { isLoopbackSaveUrl, PARAM, readInline, SAVE_ENDPOINT, scenarioHref } from './link.js';
import { checkReadySelector, closestReadySelector, suggestReadySelectors } from './ready.js';
import type { ScenarioSession } from './runtime.js';
import { parseScenario, type Scenario } from './schema.js';

const OPEN_KEY = 'scenario-panel:open';

// "Saved …" survives the reload Vite does when a new file lands in the scenarios glob.
const FLASH_KEY = 'scenario-panel:flash';

// The panel posts the captured scenario to `url`, so only a loopback save server is accepted.
const SaveProbeSchema = z.object({ dir: z.string(), url: z.string().refine(isLoopbackSaveUrl).optional() });

const SaveResultSchema = z.object({ path: z.string().optional(), error: z.string().optional() });

const FlashSchema = z.object({ message: z.string(), at: z.number() });

export interface PanelOptions {
  /** Corner to dock in, e.g. to avoid a chat widget. Default "bottom-right". */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  /** Default: the maximum, so the panel stays above app overlays. */
  zIndex?: number;
  /** "auto" follows the OS colour scheme. Default "auto". */
  theme?: 'auto' | 'light' | 'dark';
  /**
   * Relative `$schema` path stamped on Download JSON, e.g. `../scenario.schema.json`.
   * Copy link stays schema-free.
   */
  schemaPath?: string;
}

/**
 * Add the floating scenario panel to the page. Framework-agnostic.
 * Remove it with `panel.remove()`; it unsubscribes from the session.
 */
export function mountPanel(session: ScenarioSession, options: PanelOptions = {}) {
  if (!customElements.get('scenario-panel')) {
    customElements.define('scenario-panel', ScenarioPanel);
  }

  const el = new ScenarioPanel();
  el.session = session;
  el.schemaPath = options.schemaPath;
  const [v, h] = (options.position ?? 'bottom-right').split('-');
  el.dataset.v = v;
  el.dataset.h = h;

  if (options.zIndex !== undefined) el.style.zIndex = String(options.zIndex);

  if (options.theme && options.theme !== 'auto') el.dataset.theme = options.theme;
  document.body.append(el);

  return el;
}

// Next.js loads client modules on the server too, where HTMLElement is undefined. Only
// mountPanel creates a panel, and it runs in a browser, so on the server any base will do.
const Base: typeof HTMLElement = globalThis.HTMLElement ?? Object;

class ScenarioPanel extends Base {
  session!: ScenarioSession;
  schemaPath?: string;
  private render?: () => void;
  private unsubscribe?: () => void;
  private stopPick?: () => void;

  disconnectedCallback() {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.stopPick?.();
    this.stopPick = undefined;
  }

  connectedCallback() {
    // Re-attached (e.g. moved in the DOM): resubscribe and redraw.
    if (this.render) {
      this.unsubscribe = this.session.onChange(this.render);
      this.render();

      return;
    }

    const session = this.session;
    const { catalog } = session;
    const root = this.attachShadow({ mode: 'open' });

    root.innerHTML = `
      <style>${STYLES}</style>
      <button class="toggle" aria-expanded="false" aria-controls="drawer"></button>
      <section id="drawer" aria-label="Scenarios" hidden>
        <header>
          <h2>Scenarios</h2>
          <button class="close" aria-label="Close scenarios panel">×</button>
        </header>
        <p class="error" role="alert"></p>
        <input type="search" placeholder="Filter by name, description or tag" aria-label="Filter scenarios">
        <ul class="list"></ul>
        <div class="unmocked" role="status"></div>
        <section class="live" aria-label="Live state"></section>
        <details class="save">
          <summary>Save as scenario</summary>
          <p class="hint">Saves the current URL, network responses and live state. <b>Copy link</b> shares it as is; <b>Download JSON</b> writes a file for your scenarios folder that keeps only what differs from the base.</p>
          <label>Name <input name="save-name" placeholder="e.g. checkout-card-declined" aria-label="Scenario name"></label>
          <label>Description <input name="save-description" aria-label="Scenario description"></label>
          <label>Ready: what's on screen once this state has rendered <input name="save-ready" placeholder='Use Mark ready, or type text="…"' aria-label="Ready selector"></label>
          <p class="ready-check" role="status"></p>
          <div class="row">
            <button type="button" data-act="mark-ready">Mark ready</button>
            <button type="button" data-act="clear-ready">Clear</button>
          </div>
          <div class="candidates" role="group" aria-label="Suggested ready selectors"></div>
          <div class="pick-box" hidden><span></span></div>
          <label>Extends
            <select name="save-base" aria-label="Base scenario to extend"></select>
          </label>
          <div class="row">
            <button data-act="save-project" hidden>Save to project</button>
            <button data-act="save-link">Copy link</button>
            <button data-act="save-json">Download JSON</button>
          </div>
          <p class="save-status" role="status"></p>
          <input class="saved" readonly aria-label="Saved scenario link" hidden>
        </details>
        <details class="edit">
          <summary>Edit current scenario</summary>
          <textarea spellcheck="false" aria-label="Scenario JSON"></textarea>
          <button data-act="apply">Apply edited scenario</button>
        </details>
        <footer>
          <button data-act="copy">Copy link</button>
          <a class="reset">Reset</a>
        </footer>
      </section>`;

    const find = <T extends Element>(selector: string, type: new() => T): T => {
      const el = root.querySelector(selector);

      if (!(el instanceof type)) throw new Error(`executable-stories-showcase panel: missing ${selector}`);

      return el;
    };

    const toggle = find('.toggle', HTMLButtonElement);
    const drawer = find('#drawer', HTMLElement);
    const error = find('.error', HTMLParagraphElement);

    const run = (fn: () => void | Promise<void>) => async () => {
      error.textContent = '';

      try {
        await fn();
      } catch (err) {
        error.textContent = err instanceof Error ? err.message : String(err);
      }
    };

    const href = (s: Scenario) => {
      try {
        return { href: scenarioHref(catalog.resolve(s), { strict: session.strict, record: session.recording }), invalid: false };
      } catch {
        return { href: `?${PARAM}=${encodeURIComponent(s.name)}`, invalid: true };
      }
    };

    find('.list', HTMLUListElement).innerHTML = catalog.list
      .map((s) => ({ s, ...href(s) }))
      .map(
        ({ s, href, invalid }) => `
        <li data-name="${esc(s.name)}" data-search="${
          esc([s.name, s.description, ...(s.tags ?? [])].join(' ').toLowerCase())
        }">
          <a href="${esc(href)}">
            <strong>${esc(s.name)}${invalid ? ' <em>(invalid, opens with error)</em>' : ''}</strong>
            ${s.description ? `<span>${esc(s.description)}</span>` : ''}
            ${s.tags?.length ? `<small>${s.tags.map(esc).join(' · ')}</small>` : ''}
          </a>
          <button class="add" aria-label="Combine ${
          esc(s.name)
        } with the current scenario" title="Combine with the current scenario">+</button>
        </li>`,
      )
      .join('');
    root.querySelectorAll<HTMLLIElement>('li[data-name]').forEach((li) => {
      const name = li.dataset.name!;
      li.querySelector('a')!.onclick = (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return; // let the browser open a new tab
        e.preventDefault();
        void run(() => session.open(name))();
      };

      li.querySelector<HTMLButtonElement>('.add')!.onclick = run(() => {
        const names = new Set((session.active?.name ?? '').split(',').filter(Boolean));
        names.add(name);

        return session.open([...names].join(','));
      });
    });
    const filter = find('input[type=search]', HTMLInputElement);
    filter.oninput = () => {
      const q = filter.value.toLowerCase().trim();
      root.querySelectorAll<HTMLLIElement>('li[data-search]').forEach((li) => {
        li.hidden = !li.dataset.search!.includes(q);
      });
    };

    const editors = new Map<string, { textarea: HTMLTextAreaElement; dirty: boolean; }>();

    const renderLive = () => {
      const keys = session.keys();

      for (const [key, ed] of editors) {
        if (!keys.includes(key)) {
          ed.textarea.closest('details')!.remove();
          editors.delete(key);
        }
      }

      for (const key of keys) {
        let ed = editors.get(key);

        if (!ed) {
          const details = document.createElement('details');
          details.innerHTML = `
            <summary>Live state: <code>${esc(key)}</code></summary>
            <textarea spellcheck="false" aria-label="Live state ${esc(key)}"></textarea>
            <div class="row"><button data-act="live-apply">Apply</button><button data-act="live-revert">Revert</button></div>`;
          find('.live', HTMLElement).append(details);
          const entry = { textarea: details.querySelector('textarea')!, dirty: false };
          entry.textarea.oninput = () => (entry.dirty = true);
          details.ontoggle = () => renderLive();
          details.querySelector<HTMLButtonElement>('[data-act=live-apply]')!.onclick = run(async () => {
            await session.applyState(key, JSON.parse(entry.textarea.value));
            entry.dirty = false;
            renderLive();
          });
          details.querySelector<HTMLButtonElement>('[data-act=live-revert]')!.onclick = () => {
            entry.dirty = false;
            renderLive();
          };

          editors.set(key, ed = entry);
        }

        // Follow the app while open (state can be large), never overwriting what someone is typing.
        if (!ed.dirty && ed.textarea.closest('details')!.open) {
          ed.textarea.value = JSON.stringify(session.read(key) ?? null, null, 2);
        }
      }
    };

    const saveName = find('input[name=save-name]', HTMLInputElement);
    const saveDescription = find('input[name=save-description]', HTMLInputElement);
    const saveReady = find('input[name=save-ready]', HTMLInputElement);
    const saveBase = find('select[name=save-base]', HTMLSelectElement);
    const readyCheck = find('.ready-check', HTMLParagraphElement);
    const saveProject = find('[data-act=save-project]', HTMLButtonElement);
    const saveStatus = find('.save-status', HTMLParagraphElement);
    const candidates = find('.candidates', HTMLElement);
    const saved = find('.saved', HTMLInputElement);
    const saveDetails = find('.save', HTMLDetailsElement);
    const markReadyBtn = find('[data-act=mark-ready]', HTMLButtonElement);

    const fillBaseOptions = () => {
      const preferred = catalog.get('default')?.name
        ?? [session.active?.extends ?? []].flat()[0]
        ?? '';

      const previous = saveBase.value;

      saveBase.innerHTML = `<option value="">(none: save everything)</option>`
        + catalog.list.map((s) => `<option value="${esc(s.name)}">${esc(s.name)}</option>`).join('');

      if (previous && [...saveBase.options].some((o) => o.value === previous)) {
        saveBase.value = previous;
      } else {
        saveBase.value = preferred;
      }
    };

    fillBaseOptions();

    const renderCandidates = () => {
      const picks = suggestReadySelectors(document.body, { limit: 3 });
      candidates.innerHTML = picks.length
        ? `<p class="hint">Suggestions</p><div class="row">${
          picks.map((s) => `<button type="button" data-candidate="${esc(s)}">${esc(s)}</button>`).join('')
        }</div>`
        : '';
      candidates.querySelectorAll<HTMLButtonElement>('[data-candidate]').forEach((btn) => {
        btn.onclick = () => {
          saveReady.value = btn.dataset.candidate ?? '';
          updateReadyCheck();
        };
      });
    };

    saveDetails.ontoggle = () => {
      if (saveDetails.open) {
        fillBaseOptions();
        // Offer, don't fill: the top suggestion is often chrome present in every state.
        renderCandidates();
        updateReadyCheck();
        void probeSaveEndpoint();
      }
    };

    const stopPickMode = () => {
      this.stopPick?.();
      this.stopPick = undefined;
      markReadyBtn.setAttribute('aria-pressed', 'false');
      markReadyBtn.textContent = 'Mark ready';
    };

    const pickBox = find('.pick-box', HTMLDivElement);
    const pickLabel = find('.pick-box span', HTMLSpanElement);

    const outline = (el: Element | undefined, label: string) => {
      if (!el) {
        pickBox.hidden = true;

        return;
      }

      const r = el.getBoundingClientRect();
      Object.assign(pickBox.style, {
        top: `${r.top}px`,
        left: `${r.left}px`,
        width: `${r.width}px`,
        height: `${r.height}px`,
      });
      pickBox.dataset.below = String(r.top < 28);
      pickLabel.textContent = label;
      pickBox.hidden = false;
    };

    // Elements under the pointer, outside the panel, innermost first.
    const appTarget = (e: Event) => {
      const path = e.composedPath();

      if (path.includes(this)) return undefined;

      return path.find((n): n is Element =>
        n instanceof Element && n !== document.documentElement && n !== document.body
      );
    };

    const READY_MESSAGES = {
      empty:
        "No ready selector: the link still works, but shoot and tests won't wait for this state to render.",
      none: 'No match on this page: tests would time out waiting for it.',
      unchecked: "Can't check this kind of selector here; Playwright still can.",
    };

    let readyMatch: Element | undefined;

    const updateReadyCheck = () => {
      const value = saveReady.value.trim();
      const check = value ? checkReadySelector(value) : undefined;
      readyMatch = check?.status === 'match' ? check.first : undefined;

      let tone = 'muted';
      let message: string;

      if (!check) message = READY_MESSAGES.empty;
      else if (check.status === 'invalid') [tone, message] = ['bad', check.error];
      else if (check.status === 'none') [tone, message] = ['bad', READY_MESSAGES.none];
      else if (check.status === 'unchecked') message = READY_MESSAGES.unchecked;
      else if (!check.visible) {
        message = 'Matches, but the first match is hidden: tests wait until it shows.';
      } else if (check.count > 1) {
        message = `Matches ${check.count} elements; tests wait for the first (outlined).`;
      } else [tone, message] = ['ok', '✓ Matches 1 element on this page.'];

      readyCheck.dataset.tone = tone;
      readyCheck.textContent = message;

      // While the field has focus, show which element tests will wait on.
      if (this.shadowRoot?.activeElement === saveReady && !this.stopPick) outline(readyMatch, 'ready');
    };

    saveReady.oninput = updateReadyCheck;
    saveReady.onfocus = updateReadyCheck;

    saveReady.onblur = () => {
      if (!this.stopPick) outline(undefined, '');
    };

    updateReadyCheck();

    const startPickMode = () => {
      stopPickMode();
      markReadyBtn.setAttribute('aria-pressed', 'true');
      markReadyBtn.textContent = 'Click the UI… (Esc cancels)';
      document.documentElement.style.cursor = 'crosshair';

      const onMove = (e: MouseEvent) => {
        const target = appTarget(e);
        const hit = target && closestReadySelector(target);

        if (hit) outline(hit.element, hit.selector);
        else outline(target, 'No selector here: try text, a heading or a button');
      };

      // Swallow presses so the app doesn't react (open menus, follow links) while picking.
      const block = (e: Event) => {
        if (!appTarget(e)) return;
        e.preventDefault();
        e.stopPropagation();
      };

      const onClick = (e: MouseEvent) => {
        const target = appTarget(e);

        if (!target) return;
        block(e);
        const hit = closestReadySelector(target);

        // Stay in pick mode so the user can try another element; the outline says why.
        if (!hit) return;

        saveReady.value = hit.selector;
        updateReadyCheck();
        stopPickMode();
        saveReady.focus();
      };

      const onKey = (e: KeyboardEvent) => {
        if (e.key !== 'Escape') return;
        // Esc only cancels picking; without this the drawer's Esc handler also closes the panel.
        e.stopPropagation();
        stopPickMode();
      };

      const pressEvents = ['pointerdown', 'mousedown', 'pointerup', 'mouseup'] as const;

      document.addEventListener('mousemove', onMove, true);
      document.addEventListener('click', onClick, true);
      document.addEventListener('keydown', onKey, true);

      for (const type of pressEvents) document.addEventListener(type, block, true);

      this.stopPick = () => {
        document.removeEventListener('mousemove', onMove, true);
        document.removeEventListener('click', onClick, true);
        document.removeEventListener('keydown', onKey, true);

        for (const type of pressEvents) document.removeEventListener(type, block, true);

        document.documentElement.style.removeProperty('cursor');
        pickBox.hidden = true;
      };
    };

    markReadyBtn.onclick = () => {
      if (markReadyBtn.getAttribute('aria-pressed') === 'true') stopPickMode();
      else startPickMode();
    };

    find('[data-act=clear-ready]', HTMLButtonElement).onclick = () => {
      saveReady.value = '';
      updateReadyCheck();
    };

    const capture = () => {
      const baseName = saveBase.value;
      const base = baseName ? catalog.get(baseName) : undefined;

      return captureScenario(session, {
        name: saveName.value.trim(),
        description: saveDescription.value.trim(),
        ready: saveReady.value.trim() || undefined,
        base,
        schemaPath: this.schemaPath,
      });
    };

    let probe: Promise<void> | undefined;
    // The Next.js route answers with a loopback save server's URL; Vite saves on its own origin.
    let saveUrl = SAVE_ENDPOINT;

    // The Vite plugin or the Next.js route answers with JSON; anything else (a build, an app
    // without either) returns HTML or a 404, and the button stays hidden.
    const probeSaveEndpoint = () =>
      probe ??= fetch(SAVE_ENDPOINT, { headers: { accept: 'application/json' } })
        .then(async (res) => {
          const isJson = res.ok && res.headers.get('content-type')?.includes('json');
          const probed = isJson ? SaveProbeSchema.safeParse(await res.json()) : undefined;

          if (!probed?.success) return;
          saveUrl = probed.data.url ?? SAVE_ENDPOINT;
          saveProject.textContent = `Save to ${probed.data.dir}`;
          saveProject.hidden = false;
        })
        .catch(() => {});

    const saveToProject = async (overwrite: boolean): Promise<void> => {
      const { forCatalog } = capture();

      const res = await fetch(saveUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ scenario: forCatalog, overwrite }),
      });

      const body = SaveResultSchema.catch({}).parse(await res.json().catch(() => ({})));

      if (res.status === 409 && !overwrite) {
        if (confirm(`${body.path} already exists. Replace it?`)) return saveToProject(true);

        return;
      }

      if (!res.ok) throw new Error(body.error ?? `Save failed (HTTP ${res.status})`);

      const message = `Saved ${body.path}. Commit it with your change.`;
      saveStatus.textContent = message;

      try {
        sessionStorage.setItem(FLASH_KEY, JSON.stringify({ message, at: Date.now() }));
      } catch {
        // Storage blocked: the message won't survive a reload.
      }
    };

    saveProject.onclick = run(async () => {
      saveStatus.textContent = '';
      await session.settleRecording();
      await saveToProject(false);
    });

    try {
      const flash = FlashSchema.safeParse(JSON.parse(sessionStorage.getItem(FLASH_KEY) ?? 'null')).data;
      sessionStorage.removeItem(FLASH_KEY);

      // Only right after a save; a stale one would describe some other session.
      if (flash && Date.now() - flash.at < 10_000) {
        saveStatus.textContent = flash.message;
        saveDetails.open = true;
      }
    } catch {
      // Storage blocked or corrupt: nothing to show.
    }

    find('[data-act=save-link]', HTMLButtonElement).onclick = run(async () => {
      await session.settleRecording();
      const { flat } = capture();
      const link = scenarioHref(flat, { inline: true, strict: session.strict });
      saved.hidden = false;
      saved.value = link;
      saved.select();
      await navigator.clipboard?.writeText(link).catch(() => {});
      updateReadyCheck();
    });
    find('[data-act=save-json]', HTMLButtonElement).onclick = run(async () => {
      await session.settleRecording();
      const { forCatalog } = capture();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(
        new Blob([`${JSON.stringify(forCatalog, null, 2)}\n`], { type: 'application/json' }),
      );
      a.download = `${forCatalog.name}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      updateReadyCheck();
    });

    const editor = find('.edit textarea', HTMLTextAreaElement);

    if (readInline(location.hash)) find('.edit', HTMLDetailsElement).open = true;
    find('[data-act=apply]', HTMLButtonElement).onclick = run(() =>
      session.openInline(parseScenario(JSON.parse(editor.value)))
    );

    find('[data-act=copy]', HTMLButtonElement).onclick = run(async () => {
      try {
        await navigator.clipboard.writeText(location.href);
      } catch {
        prompt('Copy this link', location.href);
      }
    });
    // An absolute same-origin URL: a path starting with "//" must not read as another host.
    const reset = new URL(location.href);
    reset.search = '';
    reset.hash = '';
    reset.searchParams.set(PARAM, '');
    find('.reset', HTMLAnchorElement).href = reset.href;

    const setOpen = (open: boolean) => {
      drawer.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));

      try {
        sessionStorage.setItem(OPEN_KEY, open ? '1' : '');
      } catch {
        // sessionStorage throws when storage is blocked; the panel just forgets
      }
    };

    let stored: string | null = null;

    try {
      stored = sessionStorage.getItem(OPEN_KEY);
    } catch {
      // sessionStorage throws when storage is blocked; the panel just forgets
    }

    setOpen(!!stored);
    toggle.onclick = () => setOpen(!!drawer.hidden);
    find('.close', HTMLButtonElement).onclick = () => {
      setOpen(false);
      toggle.focus();
    };

    drawer.onkeydown = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        toggle.focus();
      }
    };

    let shownScenario: string | undefined;

    const render = () => {
      const { active, strict, unhandled, recording } = session;
      const mode = recording ? ` (recording ${session.recorded().length})` : strict ? ' (strict)' : '';
      toggle.innerHTML = `Scenario: <b>${esc(active?.name ?? 'none')}</b>${mode}`;
      const names = (active?.name ?? '').split(',');
      root.querySelectorAll<HTMLLIElement>('li[data-name]').forEach((li) => {
        const a = li.querySelector('a')!;

        if (names.includes(li.dataset.name!)) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
      // While recording, unmocked requests are the point: they're what gets saved.
      find('.unmocked', HTMLElement).innerHTML = unhandled.length && !recording
        ? `<p>${unhandled.length} request(s) not covered by this scenario${
          strict ? ' (answered 501)' : ''
        }:</p>
           <ul>${unhandled.map((u) => `<li><code>${esc(u)}</code></li>`).join('')}</ul>`
        : '';

      // Set as a property, not markup, so page text selectors never match the panel's JSON.
      if (active?.name !== shownScenario) {
        shownScenario = active?.name;
        editor.value = JSON.stringify(active ?? { name: 'custom', extends: catalog.list[0]?.name }, null, 2);
        fillBaseOptions();
      }

      renderLive();

      // The app re-rendered: the ready selector may match now, or no longer.
      if (saveDetails.open) updateReadyCheck();
    };

    this.render = render;
    render();
    this.unsubscribe = session.onChange(render);
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const STYLES = `
  :host {
    --bg: #ffffff; --fg: #1b1b1f; --muted: #5d5d66; --line: #dcdce2;
    --accent: #4747eb; --accent-fg: #ffffff; --hover: #f2f2f7; --danger: #b42318;
    all: initial; position: fixed; right: 16px; bottom: 16px; z-index: 2147483647;
    font: 14px/1.4 system-ui, sans-serif; color: var(--fg);
  }
  @media (prefers-color-scheme: dark) {
    :host(:not([data-theme="light"])) {
      --bg: #1c1c21; --fg: #ececf1; --muted: #a3a3ad; --line: #34343c;
      --accent: #8c8cff; --accent-fg: #101014; --hover: #26262d; --danger: #ff8a80;
    }
  }
  :host([data-theme="dark"]) {
    --bg: #1c1c21; --fg: #ececf1; --muted: #a3a3ad; --line: #34343c;
    --accent: #8c8cff; --accent-fg: #101014; --hover: #26262d; --danger: #ff8a80;
  }
  :host([data-v="top"]) { bottom: auto; top: 16px; }
  :host([data-h="left"]) { right: auto; left: 16px; }
  :host([data-v="top"]) #drawer { bottom: auto; top: 48px; }
  :host([data-h="left"]) #drawer { right: auto; left: 0; }
  :host([data-h="left"]) .toggle { margin-left: 0; }
  * { box-sizing: border-box; font: inherit; color: inherit; }
  button, a { cursor: pointer; }
  :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .toggle {
    display: block; margin-left: auto; padding: 8px 14px; border: 0; border-radius: 999px;
    background: var(--accent); color: var(--accent-fg); box-shadow: 0 4px 16px #0003;
  }
  .toggle b, strong { font-weight: 700; }
  #drawer {
    position: absolute; right: 0; bottom: 48px; width: min(400px, calc(100vw - 32px));
    max-height: min(680px, calc(100vh - 96px)); overflow: auto; padding: 12px;
    background: var(--bg); border: 1px solid var(--line); border-radius: 12px; box-shadow: 0 12px 40px #0004;
  }
  #drawer[hidden] { display: none; }
  header, footer, .row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .row { justify-content: flex-start; margin-top: 8px; flex-wrap: wrap; }
  h2 { margin: 0; font-size: 16px; font-weight: 700; }
  .close { border: 0; background: none; font-size: 22px; line-height: 1; padding: 4px 8px; border-radius: 6px; }
  input, textarea, select {
    width: 100%; margin: 6px 0; padding: 8px 10px; border: 1px solid var(--line);
    border-radius: 8px; background: var(--bg);
  }
  label { display: block; margin-top: 6px; color: var(--muted); font-size: 12px; }
  label input, label select { color: var(--fg); font-size: 14px; }
  ul { list-style: none; margin: 0; padding: 0; }
  li[hidden] { display: none; }
  .list li { display: flex; align-items: stretch; gap: 4px; }
  .list a {
    flex: 1; min-width: 0; overflow-wrap: anywhere; display: flex; flex-direction: column; gap: 2px; padding: 8px 10px; border-radius: 8px;
    text-decoration: none; border-left: 3px solid transparent;
  }
  .list a:hover { background: var(--hover); }
  .list a[aria-current] { border-left-color: var(--accent); background: var(--hover); }
  .list span { color: var(--muted); }
  .list small { color: var(--muted); font-size: 12px; }
  .add { width: 32px; border: 0; border-radius: 8px; background: none; color: var(--muted); font-size: 18px; }
  .add:hover { background: var(--hover); color: var(--fg); }
  details { margin-top: 12px; border-top: 1px solid var(--line); padding-top: 10px; }
  summary { cursor: pointer; font-weight: 600; }
  code { font: 12px ui-monospace, monospace; }
  textarea { height: 200px; font: 12px/1.45 ui-monospace, monospace; resize: vertical; }
  .hint { margin: 6px 0 0; color: var(--muted); font-size: 12px; }
  .error { color: var(--danger); white-space: pre-wrap; margin: 8px 0; font-size: 12px; }
  .error:empty, .unmocked:empty, .candidates:empty { display: none; }
  .ready-check, .save-status { color: var(--muted); font-size: 12px; margin: 2px 0 0; }
  .ready-check[data-tone=ok] { color: var(--accent); }
  .ready-check[data-tone=bad] { color: var(--danger); }
  .save-status:empty { display: none; }
  details button[hidden] { display: none; }
  .candidates { margin-top: 6px; }
  .pick-box {
    position: fixed; pointer-events: none; box-sizing: border-box;
    border: 2px solid var(--accent); border-radius: 4px; background: #4747eb14;
  }
  .pick-box[hidden] { display: none; }
  .pick-box span {
    position: absolute; left: -2px; bottom: 100%; margin-bottom: 4px; max-width: 360px;
    padding: 2px 6px; border-radius: 4px; background: var(--accent); color: var(--accent-fg);
    font: 12px/1.4 ui-monospace, monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .pick-box[data-below=true] span { bottom: auto; top: 100%; margin: 4px 0 0; }
  .candidates button { font-size: 12px; max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
  .unmocked { margin-top: 10px; padding: 8px 10px; border-radius: 8px; background: var(--hover); color: var(--danger); font-size: 12px; }
  .unmocked p { margin: 0 0 4px; }
  .unmocked ul { padding-left: 16px; list-style: disc; }
  .unmocked code { overflow-wrap: anywhere; }
  em { font-style: normal; color: var(--danger); font-weight: 400; }
  details button, footer button {
    padding: 6px 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--hover);
  }
  button[aria-pressed="true"] { border-color: var(--accent); color: var(--accent); }
  footer { margin-top: 12px; border-top: 1px solid var(--line); padding-top: 10px; }
  footer a { color: var(--accent); }
`;
