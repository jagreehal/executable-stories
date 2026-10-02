/**
 * Plain-language step text for e2e's non-agent steps.
 *
 * e2e records a step as `api` + `label`, where the label is the locator's own
 * description (`getByRole("button", name: "Increment")`). This module
 * rephrases the common shapes for a living-docs page. Other shapes keep the
 * raw `api label`.
 */

const ROLE_NOUNS: Record<string, string> = {
  textbox: 'field',
  searchbox: 'search field',
  combobox: 'dropdown',
  spinbutton: 'number field',
  img: 'image',
};

/** `getByKind("value"[, name: "name"])` with plain string arguments only; scopes, filters, regexes and nth() stay raw. */
const SIMPLE_QUERY =
  /^getBy(\w+)\(("(?:[^"\\]|\\.)*")(?:, name: ("(?:[^"\\]|\\.)*"))?\)$/;

function unquote(json: string): string {
  try {
    return JSON.parse(json) as string;
  } catch {
    return json;
  }
}

/** A locator description as a noun phrase, or `undefined` when it is not a simple query. */
export function describeTarget(label: string): string | undefined {
  const match = SIMPLE_QUERY.exec(label);
  if (!match) return undefined;
  const [, kind, rawValue, rawName] = match;
  const value = unquote(rawValue!);
  const name = rawName === undefined ? undefined : unquote(rawName);
  switch (kind) {
    case 'Role': {
      const noun = ROLE_NOUNS[value] ?? value;
      return name === undefined ? `the ${noun}` : `the "${name}" ${noun}`;
    }
    case 'Text':
      return `the text "${value}"`;
    case 'Label':
    case 'Placeholder':
      return `the "${value}" field`;
    case 'AltText':
      return `the "${value}" image`;
    case 'TestId':
    case 'Title':
      return `the "${value}" element`;
    default:
      return undefined;
  }
}

const ACTIONS: Record<string, string> = {
  click: 'click',
  tap: 'tap',
  dblclick: 'double-click',
  hover: 'hover over',
  check: 'check',
  uncheck: 'uncheck',
  fill: 'fill in',
  clear: 'clear',
  press: 'press a key on',
  pressSequentially: 'type into',
  selectOption: 'choose an option in',
  longPress: 'long-press',
  swipe: 'swipe',
  focus: 'focus',
};

/** `expect.toX` → what it claims about the target. */
const CLAIMS: Record<string, [positive: string, negative: string]> = {
  toBeVisible: ['is visible', 'is not visible'],
  toBeHidden: ['is hidden', 'is not hidden'],
  toBeEnabled: ['is enabled', 'is not enabled'],
  toBeDisabled: ['is disabled', 'is not disabled'],
  toBeChecked: ['is checked', 'is not checked'],
  toBeFocused: ['is focused', 'is not focused'],
  toBeSelected: ['is selected', 'is not selected'],
  toBeExpanded: ['is expanded', 'is not expanded'],
  toBeAttached: ['is on the page', 'is not on the page'],
  toHaveText: ['shows the expected text', 'does not show the given text'],
  toContainText: [
    'contains the expected text',
    'does not contain the given text',
  ],
  toHaveValue: ['has the expected value', 'does not have the given value'],
  toHaveCount: [
    'appears the expected number of times',
    'does not appear the given number of times',
  ],
  toHaveAccessibleName: [
    'has the expected accessible name',
    'does not have the given accessible name',
  ],
  toHaveAttribute: [
    'has the expected attribute',
    'does not have the given attribute',
  ],
};

const APP: Record<string, string> = {
  'app.back': 'go back',
  'app.restart': 'restart the app',
  'app.clearState': 'clear the app state',
  'session.launch': 'launch the app session',
  'session.close': 'close the app session',
};

/** Step text for one non-agent step. */
export function phraseStep(api: string, label: string): string {
  const raw = label ? `${api} ${label}` : api;

  if (api === 'app.open') return label ? `open ${label}` : 'open the app';
  if (api === 'app.screenshot')
    return label ? `take a screenshot: ${label}` : 'take a screenshot';
  if (api === 'session.save')
    return label ? `save the session as ${label}` : 'save the session';
  if (APP[api]) return APP[api];

  const action = /^locator\.(\w+)$/.exec(api)?.[1];
  if (action !== undefined) {
    if (action === 'waitFor') {
      // `<target> → <state>`
      const [target, state] = label.split(' → ');
      const noun = target === undefined ? undefined : describeTarget(target);
      return noun && state ? `wait until ${noun} is ${state}` : raw;
    }
    const verb = ACTIONS[action];
    const noun = describeTarget(label);
    return verb && noun ? `${verb} ${noun}` : raw;
  }

  const claim = /^expect\.(not\.)?(\w+)$/.exec(api);
  if (claim) {
    const words = CLAIMS[claim[2]!];
    const noun = describeTarget(label);
    return words && noun ? `${noun} ${words[claim[1] ? 1 : 0]}` : raw;
  }

  return raw;
}
