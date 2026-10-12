import type { Page } from '@playwright/test';
import type { ReadyReport, Scenario } from 'executable-stories-showcase';
import { openScenario, unhandledRequests } from 'executable-stories-showcase/playwright';
import type { ErrorCode } from './errors.js';

export interface Inspection {
  name: string;
  ok: boolean;
  /** Why it failed, as stable codes; empty when ok. */
  codes: ErrorCode[];
  /** Reopens this state in strict mode. */
  link: string;
  unhandled: string[];
  pageErrors: string[];
  consoleErrors: string[];
  error: string | null;
  /** Set when the ready selector didn't show: what it matched and what would. */
  ready: (ReadyReport & { selector: string; }) | null;
}

const firstLine = (err: Error | string) => (err instanceof Error ? err.message : err).split('\n')[0] ?? '';

/**
 * Collect uncaught exceptions and console errors from now on. Browser network logs
 * ("Failed to load resource") are left out: error scenarios cause them on purpose, and
 * requests the scenario didn't mock are reported as unhandled instead.
 */
export function watchErrors(page: Page) {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));
  page.on('console', (m) => {
    const text = m.text();
    // Strict mode logs each unmocked request; those are reported as unhandled already.

    const known = text.startsWith('Failed to load resource')
      || /^\[executable-stories-showcase\] ".*" has no handler for /.test(text);

    if (m.type() === 'error' && !known) consoleErrors.push(text);
  });

  return { pageErrors, consoleErrors };
}

/** Open a scenario and report everything an agent needs to fix it. */
export async function inspectScenario(
  page: Page,
  scenario: Scenario,
  { link, strict = true, panel = true }: { link: string; strict?: boolean; panel?: boolean; },
): Promise<Inspection> {
  const errors = watchErrors(page);
  const codes: ErrorCode[] = [];
  let error: string | null = null;
  let ready: Inspection['ready'] = null;

  try {
    await openScenario(page, scenario.name, { path: scenario.path, strict, panel });
  } catch (err) {
    error = firstLine(err instanceof Error ? err : String(err));
    const active = await page.locator('html').getAttribute('data-scenario').catch(() => null);
    // A running session that didn't open the scenario was started with a different catalog.
    const running = await page.evaluate(() => !!globalThis.executableStoriesShowcasePage).catch(() => false);

    if (active !== scenario.name) codes.push(running ? 'SCENARIO_NOT_IN_APP' : 'SESSION_NOT_STARTED');
    else if (scenario.ready) {
      codes.push('READY_TIMEOUT');
      const report = await page.evaluate((s) => globalThis.executableStoriesShowcasePage?.checkReady(s), scenario.ready);

      if (report) ready = { selector: scenario.ready, ...report };
    }
  }

  const unhandled = await unhandledRequests(page).catch(() => []);

  if (unhandled.length) codes.push('UNMOCKED_REQUEST');

  if (errors.pageErrors.length) codes.push('PAGE_ERROR');

  if (errors.consoleErrors.length) codes.push('CONSOLE_ERROR');

  return { name: scenario.name, ok: !codes.length, codes, link, unhandled, ...errors, error, ready };
}

interface DraftEntry {
  method: string;
  path: string;
  query?: Record<string, string>;
  response: { status: number; body: Record<string, never>; };
}

/** A network entry that answers an unmocked request, ready to paste and fill in. */
export function networkEntryFor(label: string, appOrigin: string) {
  const [method = 'GET', href = ''] = label.split(' ');
  const url = new URL(href);

  const entry: DraftEntry = {
    method,
    path: url.origin === appOrigin ? url.pathname : url.origin + url.pathname,
    response: { status: 200, body: {} },
  };

  if (url.search) entry.query = Object.fromEntries(url.searchParams);

  return entry;
}

/**
 * The page an agent reads when a scenario fails: what went wrong, the link that reopens it,
 * and the fix written out where one can be.
 */
export function failurePage(
  r: Inspection,
  { screenshot, appOrigin }: { screenshot: string; appOrigin: string; },
) {
  const out = [
    `# ${r.name}: ${r.codes.join(', ')}`,
    '',
    `- Reopen: ${r.link}`,
    `- Screenshot: ${screenshot}`,
  ];

  if (r.error) out.push(`- Error: ${r.error}`);

  if (r.codes.includes('SESSION_NOT_STARTED')) {
    out.push(
      '',
      '## The scenario never became active',
      '',
      '`<html data-scenario>` never named this scenario. Check that `startScenarios` runs and is awaited before the app',
      'renders, outside any production-only branch, and that the router is created after it (import it dynamically',
      'if it is created when its module loads). `executable-stories-showcase doctor` checks the wiring.',
    );
  }

  if (r.codes.includes('SCENARIO_NOT_IN_APP')) {
    out.push(
      '',
      "## The app doesn't have this scenario",
      '',
      'The session runs, but its catalog has no scenario by this name. The app loads scenarios from its own',
      'folder or list: check that this file is in it (Next.js lists imports by hand), and reload or restart the',
      'dev server if the file is new.',
    );
  }

  if (r.ready) {
    const found = r.ready.status === 'match'
      ? `matches ${r.ready.count} element(s) but none became visible`
      : r.ready.status === 'none'
      ? 'matches nothing on the page'
      : r.ready.status === 'invalid'
      ? `is not a valid selector (${r.ready.error})`
      : "uses a form this check can't evaluate; Playwright still waited and timed out";

    out.push('', '## Ready selector', '', `\`${r.ready.selector}\` ${found}.`);

    if (r.ready.suggestions.length) {
      out.push(
        '',
        'Distinctive selectors on the page now (if the screenshot shows the right state, use one as `ready`):',
        '',
      );

      for (const s of r.ready.suggestions) out.push(`- \`${s}\``);
    }
  }

  if (r.unhandled.length) {
    out.push(
      '',
      '## Unmocked requests',
      '',
      "Add these to the scenario's `network` (fill in real bodies, or record them with `?scenario-record`),",
      'or `extends` a scenario that has them. Third-party SDKs belong in `startScenarios({ ignore })`.',
      '',
      '```json',
      JSON.stringify(r.unhandled.map((u) => networkEntryFor(u, appOrigin)), null, 2),
      '```',
    );
  }

  if (r.pageErrors.length) out.push('', '## Uncaught exceptions', '', ...r.pageErrors.map((e) => `- ${e}`));

  if (r.consoleErrors.length) out.push('', '## console.error', '', ...r.consoleErrors.map((e) => `- ${e}`));

  return `${out.join('\n')}\n`;
}
