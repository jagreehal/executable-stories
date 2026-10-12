const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'META', 'LINK', 'HEAD', 'HTML']);

const MAX_TEXT = 60;

const CHROME =
  'header, nav, aside, footer, [role=banner], [role=navigation], [role=complementary], [role=contentinfo]';

// Roles whose accessible name comes from their text. Others (alert, status, region…) are
// named only by aria-label/labelledby, so Playwright's [name=…] never matches their text.
const NAME_FROM_CONTENT = new Set([
  'button',
  'cell',
  'checkbox',
  'columnheader',
  'gridcell',
  'heading',
  'link',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'option',
  'radio',
  'row',
  'rowheader',
  'switch',
  'tab',
  'tooltip',
  'treeitem',
]);

// Implicit roles implicitRole knows; for any other role only an explicit role="…" is checkable.
const IMPLICIT_ROLES = new Set([
  'button',
  'link',
  'heading',
  'img',
  'textbox',
  'searchbox',
  'checkbox',
  'radio',
  'combobox',
]);

/** Playwright selector for an element the user marked as the scenario's ready signal. */
export function selectorForElement(el: Element): string | undefined {
  if (!(el instanceof Element) || SKIP.has(el.tagName) || el.closest('scenario-panel')) {
    return undefined;
  }

  for (const attr of ['data-testid', 'data-test-id']) {
    const testId = el.getAttribute(attr);

    if (testId) return `[${attr}=${JSON.stringify(testId)}]`;
  }

  const role = roleOf(el);
  const name = role && accessibleName(el, role);

  if (role && name && name.length <= MAX_TEXT) {
    return `role=${role}[name=${JSON.stringify(name)}]`;
  }

  const text = ownText(el);

  if (text && text.length <= MAX_TEXT) {
    const selector = `text=${JSON.stringify(text)}`;
    const check = checkReadySelector(selector, el.ownerDocument);

    if (check.status === 'match' && check.count === 1) return selector;
  }

  if (role) return `role=${role}`;

  return undefined;
}

/**
 * The nearest element at or above `el` that has a ready selector, so clicking an icon or a
 * wrapper still marks something.
 */
export function closestReadySelector(el: Element): { element: Element; selector: string; } | undefined {
  for (let node: Element | null = el; node && node !== node.ownerDocument.body; node = node.parentElement) {
    const selector = selectorForElement(node);

    if (selector) return { element: node, selector };
  }

  return undefined;
}

/**
 * Ranked Playwright selectors for visible, distinctive UI, offered when the user
 * hasn't marked ready. Prefers test ids, then named roles, then unique short text.
 */
export function suggestReadySelectors(
  root?: ParentNode | null,
  { limit = 3 }: { limit?: number; } = {},
): string[] {
  const target = root ?? globalThis.document?.body;

  if (!target) return [];

  const ranked: { score: number; selector: string; }[] = [];
  const seen = new Set<string>();

  const walk = (node: Element) => {
    if (SKIP.has(node.tagName) || node.localName === 'scenario-panel' || !isVisible(node)) return;

    const selector = selectorForElement(node);
    // A count or a single character ("0" in "0 countries") is too generic to suggest.
    const tooShort = selector?.startsWith('text=') && selector.length < 'text=""'.length + 3;

    if (selector && !tooShort && !seen.has(selector)) {
      seen.add(selector);
      ranked.push({ score: scoreSelector(selector, node), selector });
    }

    for (const child of node.children) walk(child);
  };

  if (target instanceof Element) walk(target);
  else for (const child of target.children) walk(child);

  return ranked.toSorted((a, b) => b.score - a.score).slice(0, limit).map((r) => r.selector);
}

export type ReadyCheck =
  /** `first` is what `openScenario` waits on; `visible` says whether it's showing now. */
  | { status: 'match'; count: number; first: Element; visible: boolean; }
  | { status: 'none'; }
  /** A selector form this page can't evaluate (xpath, chains, regex…); Playwright still can. */
  | { status: 'unchecked'; }
  | { status: 'invalid'; error: string; };

/**
 * Evaluate a ready selector against the live page the way Playwright would, for the forms
 * the panel generates and plain CSS. Anything else comes back `unchecked`, never a guess.
 */
export function checkReadySelector(selector: string, doc: Document = document): ReadyCheck {
  const s = selector.trim();

  if (!s || s.includes('>>')) return { status: 'unchecked' };

  const found = s.startsWith('text=')
    ? matchText(s.slice(5), doc)
    : s.startsWith('role=')
    ? matchRole(s.slice(5), doc)
    : s.startsWith('css=') || !/^[a-z-]+=/i.test(s)
    ? matchCss(s.replace(/^css=/, ''), doc)
    : undefined;

  if (!found) return { status: 'unchecked' };

  if ('error' in found) return { status: 'invalid', error: found.error };

  const [first] = found;

  return first
    ? { status: 'match', count: found.length, first, visible: isShown(first) }
    : { status: 'none' };
}

type Found = Element[] | { error: string; } | undefined;

function matchText(body: string, doc: Document): Found {
  const quoted = unquote(body);

  // Quoted: an element with a text node equal to it, case-sensitive.
  if (quoted !== undefined) {
    return appElements(doc).filter((el) =>
      [...el.childNodes].some((n) =>
        n.nodeType === Node.TEXT_NODE && collapse(n.textContent ?? '') === quoted
      )
    );
  }

  if (body.startsWith('/')) return undefined;

  // Unquoted: the smallest elements whose text contains it, ignoring case.
  const needle = collapse(body).toLowerCase();

  if (!needle) return undefined;

  const has = (el: Element) => collapse(el.textContent ?? '').toLowerCase().includes(needle);

  return appElements(doc).filter((el) => has(el) && ![...el.children].some(has));
}

function matchRole(body: string, doc: Document): Found {
  const m = /^([a-z]+)(?:\[name=(".*")\])?$/.exec(body);

  if (!m) return undefined;

  const [, role, rawName] = m;
  const name = rawName === undefined ? undefined : unquote(rawName);

  if (rawName !== undefined && name === undefined) return undefined;

  // Like Playwright's role engine, hidden elements don't count.
  const found = appElements(doc).filter((el) =>
    roleOf(el) === role && isShown(el) && !el.closest('[aria-hidden=true]')
    && (name === undefined || accessibleName(el, role) === name)
  );

  // We only know some implicit roles (<main> is "main", <p> is "paragraph"…), so a miss
  // on any other role isn't proof of absence.
  if (!found.length && !IMPLICIT_ROLES.has(role)) return undefined;

  return found;
}

function matchCss(css: string, doc: Document): Found {
  try {
    return [...doc.querySelectorAll(css)].filter((el) => !el.closest('scenario-panel'));
  } catch {
    return { error: 'Not a valid CSS selector' };
  }
}

/** A JSON-style "quoted" string, or undefined when `s` isn't one. */
function unquote(s: string): string | undefined {
  if (!s.startsWith('"') || !s.endsWith('"') || s.length < 2) return undefined;

  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}

function appElements(doc: Document): Element[] {
  const out: Element[] = [];

  const walk = (el: Element) => {
    if (SKIP.has(el.tagName) || el.localName === 'scenario-panel') return;
    out.push(el);

    for (const child of el.children) walk(child);
  };

  if (doc.body) walk(doc.body);

  return out;
}

function scoreSelector(selector: string, el: Element): number {
  let score = 0;

  if (selector.startsWith('[data-test')) score += 100;
  else if (selector.startsWith('role=') && selector.includes('[name=')) score += 80;
  else if (selector.startsWith('text=')) score += 60;
  else if (selector.startsWith('role=')) score += 40;

  // Prefer leaf-ish content over giant containers.
  if (el.children.length === 0) score += 10;

  if (el.tagName === 'H1' || el.tagName === 'H2' || el.tagName === 'H3') score += 15;

  const role = el.getAttribute('role');

  if (role === 'alert' || role === 'status') score += 20;

  // Headers, navs, sidebars and inputs render in every state, so they make weak ready signals.
  if (el.closest(CHROME)) score -= 50;

  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') score -= 50;

  return score;
}

function roleOf(el: Element): string | undefined {
  return el.getAttribute('role')?.trim().split(/\s+/)[0] || implicitRole(el);
}

function implicitRole(el: Element): string | undefined {
  const tag = el.tagName;

  if (tag === 'BUTTON') return 'button';

  if (tag === 'A' && el.hasAttribute('href')) return 'link';

  if (tag === 'H1' || tag === 'H2' || tag === 'H3' || tag === 'H4' || tag === 'H5' || tag === 'H6') {
    return 'heading';
  }

  if (tag === 'IMG') return 'img';

  if (tag === 'INPUT') {
    const type = (el.getAttribute('type') ?? 'text').toLowerCase();

    if (type === 'submit' || type === 'button') return 'button';

    if (type === 'checkbox') return 'checkbox';

    if (type === 'radio') return 'radio';

    if (type === 'search') return 'searchbox';

    return 'textbox';
  }

  if (tag === 'TEXTAREA') return 'textbox';

  if (tag === 'SELECT') return 'combobox';

  return undefined;
}

/** The accessible name Playwright's `[name=…]` compares against, for the common cases. */
function accessibleName(el: Element, role: string): string | undefined {
  const labelledBy = el.getAttribute('aria-labelledby');

  if (labelledBy) {
    const text = collapse(
      labelledBy.split(/\s+/).map((id) => el.ownerDocument.getElementById(id)?.textContent ?? '').join(' '),
    );

    if (text) return text;
  }

  const label = collapse(el.getAttribute('aria-label') ?? '');

  if (label) return label;

  if (
    el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement
  ) {
    const fromLabel = collapse([...(el.labels ?? [])].map((l) => l.textContent ?? '').join(' '));

    if (fromLabel) return fromLabel;

    if (!(el instanceof HTMLSelectElement) && el.placeholder) return collapse(el.placeholder);
  }

  if (el instanceof HTMLImageElement && el.alt) return collapse(el.alt);

  if (NAME_FROM_CONTENT.has(role)) return collapse(el.textContent ?? '') || undefined;

  return collapse(el.getAttribute('title') ?? '') || undefined;
}

/** The element's first own text node, which is what a quoted `text=` selector matches. */
function ownText(el: Element): string {
  for (const n of el.childNodes) {
    const text = n.nodeType === Node.TEXT_NODE ? collapse(n.textContent ?? '') : '';

    if (text) return text;
  }

  // No own text: a lone descendant text still identifies this element's content.
  return el.children.length === 1 ? ownText(el.children[0]) : '';
}

function collapse(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function isVisible(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return true;
  const style = el.ownerDocument.defaultView?.getComputedStyle(el);

  if (style && (style.display === 'none' || style.visibility === 'hidden')) return false;

  if (el.hidden || el.getAttribute('aria-hidden') === 'true') return false;

  return true;
}

/** Rendered including ancestors: what Playwright's waitFor needs. */
function isShown(el: Element): boolean {
  for (let node: Element | null = el; node; node = node.parentElement) {
    if (!(node instanceof HTMLElement)) continue;

    if (node.hidden) return false;
    const style = node.ownerDocument.defaultView?.getComputedStyle(node);

    if (style && (style.display === 'none' || style.visibility === 'hidden')) return false;
  }

  return true;
}
