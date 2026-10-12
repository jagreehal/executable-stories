import type { Browser, Page } from '@playwright/test';
import { existsSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { type Catalog, parseScenario, type ScenarioInput } from 'executable-stories-showcase';
import { unhandledRequests } from 'executable-stories-showcase/playwright';
import { z } from 'zod';
import { appUrl, type BrowserFlags, checkServer, contextOptions, launchChromium, scenarioLink } from './browser.js';
import { CliError } from './errors.js';
import { inspectScenario, watchErrors } from './inspect.js';
import { type Content, createMcpHandler, serveStdio, tool } from './mcp-protocol.js';

const MAX_SNAPSHOT = 20_000;

export interface McpOptions {
  dir: string;
  baseURL: string;
  /** Reads the scenarios folder again, so files saved during the session show up. */
  loadCatalog: () => Catalog;
  flags: BrowserFlags;
  version: string;
}

const text = (value: string): Content => ({ type: 'text', text: value });

const json = (value: Parameters<typeof JSON.stringify>[0]): Content => text(JSON.stringify(value, null, 2));

/**
 * Tools that let a coding agent open the app in any scenario, look at it, drive it, and save
 * what it shows as a new scenario. One browser page per server; each agent starts its own server.
 */
export function mcpTools({ dir, baseURL, loadCatalog, flags }: McpOptions) {
  let browser: Browser | undefined;
  let page: Page | undefined;
  let errors: ReturnType<typeof watchErrors> = { pageErrors: [], consoleErrors: [] };

  const getPage = async () => {
    if (page && !page.isClosed()) return page;
    await checkServer(baseURL);
    browser ??= await launchChromium();
    const context = await browser.newContext({ baseURL, ...contextOptions(undefined, flags) });
    page = await context.newPage();
    page.setDefaultTimeout(10_000);
    // Agents read the page through the accessibility tree; the dev panel would only add noise.
    await page.addInitScript(() => {
      addEventListener('DOMContentLoaded', () => {
        const style = document.createElement('style');
        style.textContent = 'scenario-panel { display: none !important; }';
        document.head.append(style);
      });
    });
    errors = watchErrors(page);

    return page;
  };

  const status = async (p: Page) => ({
    url: p.url(),
    scenario: await p.evaluate(() => globalThis.executableStoriesShowcasePage?.scenario() ?? null).catch(() => null),
    unhandled: await unhandledRequests(p).catch(() => []),
    pageErrors: errors.pageErrors,
    consoleErrors: errors.consoleErrors,
  });

  const observe = async (p: Page): Promise<Content[]> => {
    const snapshot = await p.locator('body').ariaSnapshot();
    const cut = snapshot.length > MAX_SNAPSHOT ? `${snapshot.slice(0, MAX_SNAPSHOT)}\n… (cut)` : snapshot;

    return [json(await status(p)), text(cut)];
  };

  const screenshot = async (p: Page, selector?: string): Promise<Content> => ({
    type: 'image',
    mimeType: 'image/png',
    data: (await (selector ? p.locator(selector).first().screenshot() : p.screenshot())).toString('base64'),
  });

  const Selector = z.string().min(1).describe(
    'Playwright selector: text="Save", role=button[name="Save"], css, or [data-testid=x]',
  );

  const tools = [
    tool({
      name: 'list_scenarios',
      description:
        'Every scenario in the catalog: name, description, ready selector and the link that opens it.',
      input: z.object({}),
      run: async () => {
        const catalog = loadCatalog();

        return [json(catalog.list.map((s) => ({
          name: s.name,
          description: s.description ?? '',
          ready: s.ready ?? null,
          link: scenarioLink(baseURL, catalog.resolve(s)),
        })))];
      },
    }),
    tool({
      name: 'validate',
      description:
        'Check every scenario parses, resolves its extends and passes the rules. Empty list means valid.',
      input: z.object({}),
      run: async () => [json(loadCatalog().check())],
    }),
    tool({
      name: 'open_scenario',
      description:
        'Open the app in a scenario (strict: unmocked requests get 501) and wait for its ready selector. Returns what went wrong, if anything, with a screenshot.',
      input: z.object({ name: z.string().describe('Scenario name, or several joined with commas') }),
      run: async (input) => {
        const catalog = loadCatalog();
        // The page reports "a,b", so the name must match it exactly.
        const parts = input.name.split(',').map((n) => n.trim());
        const name = parts.join(',');
        const found = parts.every((n) => catalog.get(n));

        if (!found) {
          throw new CliError(
            'UNKNOWN_SCENARIO',
            `Unknown scenario "${name}". Known: ${catalog.list.map((s) => s.name).join(', ')}`,
          );
        }

        const scenario = catalog.resolve(
          catalog.get(name) ?? { name, extends: parts },
        );

        const p = await getPage();
        errors.pageErrors.length = errors.consoleErrors.length = 0;
        const result = await inspectScenario(p, scenario, { link: scenarioLink(baseURL, scenario) });

        return [json(result), await screenshot(p)];
      },
    }),
    tool({
      name: 'open_app',
      description:
        'Open the app at a path without a scenario. record: true lets requests reach the real backend and records their JSON responses, so save_scenario can replay them offline.',
      input: z.object({ path: z.string().startsWith('/').default('/'), record: z.boolean().default(false) }),
      run: async ({ path, record }) => {
        const p = await getPage();
        errors.pageErrors.length = errors.consoleErrors.length = 0;
        const url = appUrl(path, baseURL);
        url.searchParams.set('scenario', '');

        if (record) url.searchParams.set('scenario-record', '');
        await p.goto(url.toString());

        return observe(p);
      },
    }),
    tool({
      name: 'observe',
      description:
        'The page as an accessibility tree (roles, names, text), plus URL, active scenario, unmocked requests and errors.',
      input: z.object({}),
      run: async () => observe(await getPage()),
    }),
    tool({
      name: 'screenshot',
      description: 'A PNG of the page, or of the first element matching selector.',
      input: z.object({ selector: Selector.optional() }),
      run: async ({ selector }) => [await screenshot(await getPage(), selector)],
    }),
    tool({
      name: 'click',
      description: 'Click the first element matching selector.',
      input: z.object({ selector: Selector }),
      run: async ({ selector }) => {
        const p = await getPage();
        await p.locator(selector).first().click();

        return [json(await status(p))];
      },
    }),
    tool({
      name: 'fill',
      description: 'Type a value into the input matching selector, replacing what it holds.',
      input: z.object({ selector: Selector, value: z.string() }),
      run: async ({ selector, value }) => {
        const p = await getPage();
        await p.locator(selector).first().fill(value);

        return [json(await status(p))];
      },
    }),
    tool({
      name: 'press',
      description: 'Press a key on the focused element, e.g. Enter, Escape, Tab, ArrowDown.',
      input: z.object({ key: z.string().min(1) }),
      run: async ({ key }) => {
        const p = await getPage();
        await p.keyboard.press(key);

        return [json(await status(p))];
      },
    }),
    tool({
      name: 'check_ready',
      description:
        'Check a ready selector against the page now: whether it matches and is visible, plus distinctive selectors that would work. Use before save_scenario.',
      input: z.object({ selector: Selector }),
      run: async ({ selector }) => {
        const p = await getPage();
        const report = await p.evaluate((s) => globalThis.executableStoriesShowcasePage?.checkReady(s), selector);

        if (!report) {
          throw new CliError(
            'SESSION_NOT_STARTED',
            'No scenario session on this page: is startScenarios running?',
          );
        }

        return [json(report)];
      },
    }),
    tool({
      name: 'save_scenario',
      description:
        'Save what the app shows now (route, URL params, mocked and recorded responses, adapter state) as <dir>/<name>.json. extends writes only the differences from that scenario. Recorded secrets are redacted.',
      input: z.object({
        name: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'kebab-case, e.g. orders-empty'),
        description: z.string().optional(),
        ready: Selector.optional().describe(
          'Selector visible once this state shows; check it with check_ready first',
        ),
        extends: z.string().optional().describe('Base scenario, usually "default"'),
        replace: z.boolean().default(false).describe('Overwrite an existing file'),
      }),
      run: async ({ replace, ...options }) => {
        const p = await getPage();
        const file = join(dir, `${options.name}.json`);

        if (existsSync(file) && !replace) {
          throw new CliError(
            'INVALID_ARGUMENT',
            `${file} already exists; pass replace: true to overwrite it`,
          );
        }

        const captured: ScenarioInput | undefined = await p.evaluate(
          (o) => globalThis.executableStoriesShowcasePage?.capture(o),
          options,
        );

        if (!captured) {
          throw new CliError(
            'SESSION_NOT_STARTED',
            'No scenario session on this page: is startScenarios running?',
          );
        }

        parseScenario(captured);
        const schema = join(dirname(dir), 'scenario.schema.json');
        const $schema = existsSync(schema) ? relative(dir, schema).replaceAll('\\', '/') : undefined;
        writeFileSync(file, `${JSON.stringify({ $schema, ...captured }, null, 2)}\n`);
        // Resolve with the catalog on disk, so a bad extends or rule shows now, not later.
        const problems = loadCatalog().check().filter((m) => m.includes(`"${options.name}"`));

        // A summary: captured state can be megabytes, too much for an agent's context. The file has it all.
        return [json({
          saved: file,
          problems,
          extends: captured.extends ?? null,
          path: captured.path ?? null,
          url: captured.url ?? {},
          network: (captured.network ?? []).map((e) =>
            `${e.method ?? 'GET'} ${e.path}${e.remove ? ' (removed)' : ''}`
          ),
          handlers: captured.handlers ?? [],
          state: Object.keys(captured.state ?? {}),
          ready: captured.ready ?? null,
        })];
      },
    }),
  ];

  return { tools, close: async () => browser?.close() };
}

export async function serveMcp(options: McpOptions) {
  const { tools, close } = mcpTools(options);
  await serveStdio(createMcpHandler(tools, { name: 'executable-stories-showcase', version: options.version }));
  await close();
}
