import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Catalog } from 'executable-stories-showcase';
import { type BrowserFlags, checkServer, contextOptions, launchChromium, scenarioLink } from './browser.js';
import { CliError, type ErrorCode } from './errors.js';
import { inspectScenario } from './inspect.js';

export interface Check {
  name: string;
  status: 'ok' | 'warn' | 'fail';
  detail: string;
  code?: ErrorCode;
  fix?: string;
}

const message = (err: Error | string) => (err instanceof Error ? err.message : err).split('\n')[0] ?? '';

/**
 * Answer "is this app wired up and worth driving?" one check at a time, each with its fix.
 * Read-only: it opens one scenario and writes nothing.
 */
export async function runDoctor(
  { dir, baseURL, loadCatalog, flags, cwd = process.cwd() }: {
    dir: string;
    baseURL: string;
    loadCatalog: () => Catalog;
    flags: BrowserFlags;
    cwd?: string;
  },
): Promise<Check[]> {
  const checks: Check[] = [];

  const fail = (name: string, err: Error | string, fix?: string) =>
    checks.push({
      name,
      status: 'fail',
      detail: message(err),
      code: err instanceof CliError ? err.code : undefined,
      fix,
    });

  let catalog: Catalog | undefined;

  try {
    catalog = loadCatalog();
    const problems = catalog.check();

    if (problems.length) {
      fail(
        'scenarios',
        `${problems.length} invalid: ${problems[0]}`,
        'executable-stories-showcase validate lists them all',
      );
    } else checks.push({ name: 'scenarios', status: 'ok', detail: `${catalog.list.length} in ${dir}` });
  } catch (err) {
    fail('scenarios', err instanceof Error ? err : String(err), 'executable-stories-showcase validate explains it');
  }

  checks.push(...setupChecks(cwd));

  try {
    await checkServer(baseURL);
    checks.push({ name: 'dev server', status: 'ok', detail: baseURL });
  } catch (err) {
    fail('dev server', err instanceof Error ? err : String(err));

    return checks;
  }

  // Scenarios that fail to resolve are reported above; the rest can still be checked.
  const resolved = (catalog?.list ?? []).flatMap((s) => {
    try {
      return [catalog?.resolve(s) ?? s];
    } catch {
      return [];
    }
  });

  const mocks = resolved.some((r) => !!r.network?.length || !!r.handlers?.length);

  if (mocks) {
    const worker = await fetch(new URL('/mockServiceWorker.js', baseURL)).catch(() => undefined);

    if (worker?.ok && worker.headers.get('content-type')?.includes('javascript')) {
      checks.push({ name: 'MSW worker', status: 'ok', detail: '/mockServiceWorker.js is served' });
    } else {
      checks.push({
        name: 'MSW worker',
        status: 'fail',
        code: 'WORKER_NOT_SERVED',
        detail: 'Scenarios mock the network, but /mockServiceWorker.js is not served',
        fix:
          "Vite: add msw({ mode: 'worker-only' }) from msw/vite to plugins. Otherwise: npx msw init public",
      });
    }
  }

  const browser = await launchChromium().catch((err: Error) => err);

  if (browser instanceof Error) {
    fail('browser', browser);

    return checks;
  }

  try {
    const context = await browser.newContext({ baseURL, ...contextOptions(undefined, flags) });
    const page = await context.newPage();
    page.setDefaultTimeout(10_000);
    const scenario = resolved.find((r) => r.name === 'default') ?? resolved[0];

    if (!scenario) {
      await page.goto('/?scenario=');

      const started = await page.waitForFunction(() => globalThis.executableStoriesShowcasePage, null, {
        timeout: 10_000,
      })
        .then(() => true, () => false);

      checks.push(
        started
          ? { name: 'session', status: 'ok', detail: 'startScenarios runs on page load' }
          : {
            name: 'session',
            status: 'fail',
            code: 'SESSION_NOT_STARTED',
            detail: 'startScenarios never ran on page load',
            fix: SESSION_FIX,
          },
      );
    } else {
      const result = await inspectScenario(page, scenario, { link: scenarioLink(baseURL, scenario) });

      if (result.codes.includes('SESSION_NOT_STARTED')) {
        checks.push({
          name: 'session',
          status: 'fail',
          code: 'SESSION_NOT_STARTED',
          detail: `"${scenario.name}" never became active: ${result.error ?? ''}`,
          fix: SESSION_FIX,
        });
      } else if (result.codes.includes('SCENARIO_NOT_IN_APP')) {
        checks.push({
          name: 'session',
          status: 'fail',
          code: 'SCENARIO_NOT_IN_APP',
          detail: `The session runs, but the app has no scenario "${scenario.name}"`,
          fix:
            `The app loads scenarios from a different folder or list than ${dir}: pass the folder the app uses, add the file to the app's list (Next.js lists imports by hand), or restart the dev server if the file is new`,
        });
      } else {
        checks.push({ name: 'session', status: 'ok', detail: `"${scenario.name}" opens: ${result.link}` });

        if (result.codes.includes('READY_TIMEOUT')) {
          checks.push({
            name: 'ready',
            status: 'warn',
            code: 'READY_TIMEOUT',
            detail: `"${scenario.name}" never showed ${scenario.ready}`,
            fix: result.ready?.suggestions.length
              ? `Selectors on the page: ${result.ready.suggestions.join(', ')}`
              : undefined,
          });
        }

        if (result.unhandled.length) {
          checks.push({
            name: 'network',
            status: 'warn',
            code: 'UNMOCKED_REQUEST',
            detail: `"${scenario.name}" left ${result.unhandled.length} request(s) unmocked, e.g. ${
              result.unhandled[0]
            }`,
            fix: 'Mock them in the scenario, or list third-party SDKs in startScenarios({ ignore })',
          });
        }

        const save = await page.evaluate(async (endpoint) => {
          const res = await fetch(endpoint, { headers: { accept: 'application/json' } }).catch(() => undefined);
          // An app without the save route answers with its HTML page, as the panel's probe expects.
          const isJson = res?.ok && res.headers.get('content-type')?.includes('json');

          return res && isJson ? JSON.stringify(await res.json()) : null;
        }, '/__executable-stories-showcase/save');

        checks.push(
          save
            ? {
              name: 'save to project',
              status: 'ok',
              detail: `The panel saves into ${JSON.parse(save).dir}`,
            }
            : {
              name: 'save to project',
              status: 'warn',
              detail: 'The panel can only Download JSON',
              fix:
                "Vite: executableStoriesShowcase({ dir }) from 'executable-stories-showcase/vite'. Next.js: createSaveRoute (README)",
            },
        );
      }
    }
  } catch (err) {
    // Report, don't throw: the checks so far are the answer, and --json must stay valid.
    fail('session', err instanceof Error ? err : String(err));
  } finally {
    await browser.close();
  }

  return checks;
}

const SESSION_FIX =
  'Await startScenarios before rendering, outside production-only code. If the router is created when its module loads, import it after startScenarios: const { router } = await import("./router")';

/** Checks that need no browser: ffmpeg for record, and whether agents can find the skills and MCP server. */
function setupChecks(cwd: string): Check[] {
  const ffmpeg = spawnSync(process.env.FFMPEG_PATH || 'ffmpeg', ['-version']);

  const mcp = ['.mcp.json', '.cursor/mcp.json'].some((f) => {
    const path = join(cwd, f);

    return existsSync(path) && readFileSync(path, 'utf8').includes('"executable-stories-showcase"');
  });

  return [
    ffmpeg.error
      ? {
        name: 'ffmpeg',
        status: 'warn',
        code: 'FFMPEG_MISSING',
        detail: 'Not found: record can only save uncropped WebM',
        fix: 'Install from https://ffmpeg.org/download.html or set FFMPEG_PATH',
      }
      : { name: 'ffmpeg', status: 'ok', detail: 'Found, for record' },
    existsSync(join(cwd, '.agents/skills/executable-stories-showcase'))
      ? { name: 'agent skills', status: 'ok', detail: '.agents/skills/executable-stories-showcase' }
      : {
        name: 'agent skills',
        status: 'warn',
        detail: 'Not installed',
        fix: 'npx executable-stories-showcase init installs them',
      },
    mcp
      ? { name: 'MCP server', status: 'ok', detail: 'Registered for coding agents' }
      : {
        name: 'MCP server',
        status: 'warn',
        detail: 'Not registered',
        fix: 'npx executable-stories-showcase init registers it',
      },
  ];
}
