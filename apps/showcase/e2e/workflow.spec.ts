import { expect, type Page, test } from '@playwright/test';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { openScenario } from 'executable-stories-showcase/playwright';
import { E2E_SAVE_DIR } from './save-dir';

const heading = (page: Page) => page.getByRole('main').getByRole('heading', { level: 2 });

const panel = async (page: Page) => {
  const toggle = page.getByRole('button', { name: /^Scenario:/ });

  if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
};

test('switching swaps fixtures in place (no reload) and keeps strict mode', async ({ page }) => {
  await openScenario(page, 'default'); // strict
  await page.evaluate(() => (window.sameDocument = true));
  await panel(page);
  await page.getByRole('link', { name: /^empty/ }).click();

  await expect(page.getByRole('main').getByText('No countries match')).toBeVisible();
  expect(await page.evaluate(() => window.sameDocument)).toBe(true);
  expect(new URL(page.url()).searchParams.has('scenario-strict')).toBe(true);
  await expect(page.getByRole('button', { name: /Scenario: empty \(strict\)/ })).toBeVisible();
});

test('an explicit ?scenario-strict wins over a stored non-strict selection', async ({ page }) => {
  await openScenario(page, 'empty', { strict: false });
  await page.goto('/?scenario-strict');
  await expect(page.getByRole('button', { name: /Scenario: empty \(strict\)/ })).toBeVisible();
});

test('scenarios combine: later names win', async ({ page }) => {
  await openScenario(page, 'chewbacca');
  await panel(page);
  await page.getByRole('button', { name: 'Combine search-no-results with the current scenario' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-scenario', 'chewbacca,search-no-results');
  await expect(page.getByRole('searchbox', { name: 'Search countries' })).toHaveValue('zzz');

  // A combined scenario can be edited and applied as it is.
  await page.getByText('Edit current scenario').click();
  await page.getByRole('button', { name: 'Apply edited scenario' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'kebab-case' })).toHaveCount(0);
  await expect(page.locator('html')).toHaveAttribute('data-scenario', 'chewbacca,search-no-results');
});

test('inspect live state, edit it, save it as a scenario, share the link', async ({ page, context }) => {
  await openScenario(page, 'default');
  await panel(page);

  // Inspect: the cache editor follows the running app.
  await page.getByText('Live state: tanstack-query').click();
  const live = page.getByRole('textbox', { name: 'Live state tanstack-query' });
  await expect(live).toHaveValue(/"Aruba"/);

  // Edit: applies immediately, no reload.
  await page.evaluate(() => (window.sameDocument = true));

  const atlantis = {
    name: 'Atlantis',
    cca2: 'XA',
    capital: 'Poseidonia',
    region: 'Ocean',
    languages: { atl: 'Atlantean' },
  };

  await live.fill(JSON.stringify([{ queryKey: ['countries'], data: [atlantis] }]));
  await page.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(heading(page)).toHaveText('1 country');
  expect(await page.evaluate(() => window.sameDocument)).toBe(true);

  // App-driven URL state is captured too.
  await page.getByRole('searchbox', { name: 'Search countries' }).fill('Atl');

  // Save: name it, get a self-contained link.
  await page.getByText('Save as scenario').click();
  await page.getByRole('textbox', { name: 'Scenario name' }).fill('atlantis-search');
  await page.getByRole('button', { name: 'Copy link' }).first().click();
  const link = await page.getByRole('textbox', { name: 'Saved scenario link' }).inputValue();
  expect(link).toContain('#scenario-data=');

  // Share: a fresh browser reproduces the screen, cache and URL included.
  const other = await context.browser()!.newContext();
  const fresh = await other.newPage();
  await fresh.goto(link);
  await expect(fresh.locator('html')).toHaveAttribute('data-scenario', 'atlantis-search');
  await expect(fresh.getByRole('searchbox', { name: 'Search countries' })).toHaveValue('Atl');
  await expect(fresh.getByRole('main').getByRole('heading', { level: 2 })).toHaveText(
    '1 country beginning with “Atl”',
  );
  await expect(fresh.getByRole('heading', { name: 'Atlantis' })).toBeVisible();
  await other.close();
});

test('save as scenario rejects invalid names and rule violations', async ({ page }) => {
  await openScenario(page, 'default');
  await panel(page);
  await page.getByText('Save as scenario').click();
  await page.getByRole('textbox', { name: 'Scenario name' }).fill('Not Kebab');
  await page.getByRole('button', { name: 'Download JSON' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'kebab-case' })).toBeVisible();
});

test('mark ready and download a catalog file that extends default', async ({ page }) => {
  await openScenario(page, 'empty');
  await panel(page);
  await page.getByText('Save as scenario').click();
  await page.getByRole('textbox', { name: 'Scenario name' }).fill('captured-empty');
  await page.getByRole('button', { name: 'Mark ready' }).click();
  await page.getByRole('main').getByText('No countries match').click();
  await expect(page.getByRole('textbox', { name: 'Ready selector' })).toHaveValue(/No countries match|role=/);
  await expect(page.getByLabel('Base scenario to extend')).toHaveValue('default');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download JSON' }).click(),
  ]);

  const downloadPath = await download.path();

  if (!downloadPath) throw new Error('download path missing');

  const json = JSON.parse(readFileSync(downloadPath, 'utf8'));

  expect(json.name).toBe('captured-empty');
  expect(json.extends).toBe('default');
  expect(json.ready).toMatch(/No countries match|role=/);
  expect(json.$schema).toBe('../scenario.schema.json');
});

test('mark ready stays on when the click has no selector, shows why, and Esc cancels', async ({ page }) => {
  await openScenario(page, 'empty');
  await panel(page);
  await page.getByText('Save as scenario').click();
  await page.getByRole('button', { name: 'Mark ready' }).click();

  const main = page.getByRole('main');
  const box = await main.boundingBox();

  if (!box) throw new Error('main not laid out');

  await page.mouse.move(box.x + 5, box.y + box.height - 5);
  await page.mouse.click(box.x + 5, box.y + box.height - 5);
  await expect(page.getByText('No selector here')).toBeVisible();
  await expect(page.getByRole('button', { name: /Click the UI/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('textbox', { name: 'Ready selector' })).toHaveValue('');

  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Mark ready' })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByText('No selector here')).toBeHidden();
});

test('the ready field says what the selector matches, agreeing with Playwright', async ({ page }) => {
  await openScenario(page, 'empty');
  await panel(page);
  await page.getByText('Save as scenario').click();

  const ready = page.getByRole('textbox', { name: 'Ready selector' });
  const status = page.locator('scenario-panel .ready-check');

  await expect(status).toContainText('No ready selector');

  for (
    const [selector, expected] of [
      ['role=heading[name="0 countries"]', /Matches 1 element/],
      ['text="No countries match. Try fewer filters."', /Matches 1 element/],
      ['text="Nothing like this"', /No match on this page/],
      ['role=heading[name="0"]', /No match on this page/],
      ['xpath=//h2', /Can't check/],
    ] as const
  ) {
    await ready.fill(selector);
    await expect(status).toContainText(expected);

    // The panel's verdict has to agree with what openScenario will see (panel excluded).
    if (!selector.startsWith('xpath')) {
      const playwrightCount = await page.locator(selector).count();

      expect(playwrightCount, selector).toBe(expected.source.includes('No match') ? 0 : 1);
    }
  }
});

test('save to project writes the catalog file, and asks before replacing it', async ({ page }) => {
  const name = `e2e-saved-${test.info().workerIndex}-${Date.now()}`;
  const file = join(E2E_SAVE_DIR, `${name}.json`);

  try {
    await openScenario(page, 'empty');
    await panel(page);
    await page.getByText('Save as scenario').click();
    await page.getByRole('textbox', { name: 'Scenario name' }).fill(name);
    await page.getByRole('textbox', { name: 'Ready selector' }).fill('role=heading[name="0 countries"]');

    const save = page.getByRole('button', { name: /^Save to / });

    await save.click();
    await expect(page.locator('scenario-panel .save-status')).toContainText(`${name}.json`);

    const json = JSON.parse(readFileSync(file, 'utf8'));

    expect(json).toMatchObject({ name, extends: 'default', ready: 'role=heading[name="0 countries"]' });

    // Second save: the panel asks first; declining keeps the file.
    await page.getByRole('textbox', { name: 'Ready selector' }).fill('text="changed"');

    const declined = page.waitForEvent('dialog').then(async (d) => {
      expect(d.message()).toContain('already exists');
      await d.dismiss();
    });

    await save.click();
    await declined;
    await expect.poll(() => JSON.parse(readFileSync(file, 'utf8')).ready).toBe(
      'role=heading[name="0 countries"]',
    );

    const accepted = page.waitForEvent('dialog').then((d) => d.accept());

    await save.click();
    await accepted;
    await expect.poll(() => JSON.parse(readFileSync(file, 'utf8')).ready).toBe('text="changed"');
  } finally {
    if (existsSync(file)) rmSync(file);
  }
});

test('switching to a never-ending loading scenario still commits; the latest switch wins', async ({ page }) => {
  await openScenario(page, 'default');
  await panel(page);
  await page.getByRole('link', { name: /^loading/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-scenario', 'loading');
  await expect(page.getByText('Loading countries…')).toBeVisible();
  expect(page.url()).toContain('scenario=loading');

  await page.getByRole('link', { name: /^empty/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-scenario', 'empty');
  await page.waitForTimeout(300); // nothing older may land afterwards
  await expect(page.locator('html')).toHaveAttribute('data-scenario', 'empty');
  await expect(page.getByRole('main').getByText('No countries match')).toBeVisible();
});

test('capturing a refreshing cache keeps it refreshing', async ({ page, context }) => {
  await openScenario(page, 'stale-while-refreshing');
  await panel(page);
  await page.getByText('Save as scenario').click();
  await page.getByRole('textbox', { name: 'Scenario name' }).fill('captured-refresh');
  await page.getByRole('button', { name: 'Copy link' }).first().click();
  const link = await page.getByRole('textbox', { name: 'Saved scenario link' }).inputValue();

  const other = await context.browser()!.newContext();
  const fresh = await other.newPage();
  await fresh.goto(link);
  await expect(fresh.getByRole('heading', { name: 'Japan' })).toBeVisible();
  await expect(fresh.getByText('Refreshing…')).toBeVisible();
  await other.close();
});

test('a switch reloads when the app URL differs, so URL-driven UI resets', async ({ page }) => {
  await openScenario(page, 'default');
  await page.getByRole('searchbox', { name: 'Search countries' }).fill('zzz');
  await panel(page);
  await page.getByRole('link', { name: /^empty/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-scenario', 'empty');
  await page.getByRole('link', { name: /^default/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-scenario', 'default');
  await expect(page.getByRole('searchbox', { name: 'Search countries' })).toHaveValue('');
  await expect(heading(page)).toHaveText('248 countries');
});

test('a rejected switch leaves fixtures and screen untouched', async ({ page }) => {
  await openScenario(page, 'default');
  await panel(page);
  await page.getByText('Edit current scenario').click();
  await page.getByRole('textbox', { name: 'Scenario JSON' }).fill(
    JSON.stringify({
      name: 'bad-cache',
      network: [{ path: '/api/countries', response: { status: 503, body: { message: 'Should not show' } } }],
      state: { 'tanstack-query': [{ data: 1 }] },
    }),
  );
  await page.getByRole('button', { name: 'Apply edited scenario' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'invalid state' })).toBeVisible();
  await page.waitForTimeout(300);
  await expect(page.getByText('Should not show')).toHaveCount(0);
  await expect(heading(page)).toHaveText('248 countries');
  await expect(page.locator('html')).toHaveAttribute('data-scenario', 'default');
});

test('reopening a preset restarts it: sequences replay and edited data is refetched', async ({ page }) => {
  await openScenario(page, 'flaky-then-recovers');
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(heading(page)).toHaveText('3 countries');
  await panel(page);
  await page.getByRole('link', { name: /^flaky-then-recovers/ }).click();
  await expect(page.getByRole('alert')).toContainText('Upstream timeout');

  await page.getByRole('link', { name: /^default/ }).click();
  await expect(heading(page)).toHaveText('248 countries');
  await page.getByText('Live state: tanstack-query').click();
  const atlantis = { name: 'Atlantis', cca2: 'XA', capital: 'Poseidonia', region: 'Ocean', languages: {} };
  await page.getByRole('textbox', { name: 'Live state tanstack-query' }).fill(
    JSON.stringify([{ queryKey: ['countries'], data: [atlantis] }]),
  );
  await page.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(heading(page)).toHaveText('1 country');
  await page.getByRole('link', { name: /^default/ }).click();
  await expect(heading(page)).toHaveText('248 countries');
});
