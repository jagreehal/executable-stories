import type { Browser, BrowserType, LaunchOptions } from '@playwright/test';
import type { Scenario } from 'executable-stories-showcase';
import { z } from 'zod';
import { CliError } from './errors.js';

/** The CLI flags that shape the browser, shared by shoot, record, doctor and mcp. */
export interface BrowserFlags {
  viewport?: string;
  scale?: string;
  'color-scheme'?: string;
  locale?: string;
  timezone?: string;
}

const ColorScheme = z.enum(['light', 'dark', 'no-preference']).optional();

/** Playwright context options from the browser flags, with the scenario's own viewport first. */
export function contextOptions(scenario: Scenario | undefined, flags: BrowserFlags) {
  const viewport = scenario?.viewport ?? parseViewport(flags.viewport ?? '1280x720');
  const scale = flags.scale === undefined ? undefined : Number(flags.scale);

  if (scale !== undefined && !(scale > 0)) {
    throw new CliError('INVALID_ARGUMENT', `--scale must be a positive number, not "${flags.scale}"`);
  }

  const colorScheme = ColorScheme.safeParse(flags['color-scheme']);

  if (!colorScheme.success) {
    throw new CliError(
      'INVALID_ARGUMENT',
      `--color-scheme must be light, dark or no-preference, not "${flags['color-scheme']}"`,
    );
  }

  return {
    viewport,
    deviceScaleFactor: scale,
    colorScheme: colorScheme.data,
    locale: flags.locale,
    timezoneId: flags.timezone,
  };
}

function parseViewport(text: string) {
  const match = /^(\d+)x(\d+)$/.exec(text);

  if (!match) throw new CliError('INVALID_ARGUMENT', `--viewport must look like 1440x900, not "${text}"`);

  return { width: Number(match[1]), height: Number(match[2]) };
}

/** Chromium from @playwright/test, with the install command when it's missing. */
export async function launchChromium(options?: LaunchOptions): Promise<Browser> {
  const hint = 'Install it: npm i -D @playwright/test && npx playwright install chromium';
  let chromium: BrowserType;

  try {
    ({ chromium } = await import('@playwright/test'));
  } catch {
    throw new CliError('BROWSER_MISSING', `@playwright/test isn't installed. ${hint}`);
  }

  try {
    return await chromium.launch(options);
  } catch (err) {
    const message = err instanceof Error ? err.message.split('\n')[0] : String(err);
    throw new CliError('BROWSER_MISSING', `Chromium didn't start (${message}). ${hint}`);
  }
}

/** Fail fast, with the fix, when nothing answers at the app's URL. */
export async function checkServer(baseURL: string) {
  try {
    await fetch(baseURL, { signal: AbortSignal.timeout(5000) });
  } catch {
    throw new CliError(
      'DEV_SERVER_DOWN',
      `Nothing answers at ${baseURL}. Start the dev server first, or pass the --base-url it prints.`,
    );
  }
}

/**
 * The app URL for a path an agent asked for. `//host/x` and `/\host/x` start with `/` but
 * resolve to another host, so the result must keep the app's origin.
 */
export const appUrl = (path: string, baseURL: string): URL => {
  const url = new URL(path, baseURL);

  if (url.origin !== new URL(baseURL).origin) {
    throw new CliError('INVALID_ARGUMENT', `"${path}" leaves the app at ${new URL(baseURL).origin}; pass a path on it`);
  }

  return url;
};

/** The link that opens a scenario in strict mode, as shoot and agents use it. */
export const scenarioLink = (baseURL: string, scenario: Scenario) =>
  `${baseURL.replace(/\/$/, '')}${scenario.path ?? '/'}?scenario=${
    encodeURIComponent(scenario.name)
  }&scenario-strict`;
