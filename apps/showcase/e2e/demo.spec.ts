import { expect, type Page, test } from '@playwright/test';
import { openInlineScenario, openScenario, unhandledRequests } from 'executable-stories-showcase/playwright';

const heading = (page: Page) => page.getByRole('main').getByRole('heading', { level: 2 });

test.afterEach(async ({ page }) => {
  // Strict runs: every request must come from the scenario, never a real backend.
  if (!test.info().title.includes('strict')) expect(await unhandledRequests(page)).toEqual([]);
});

test('default: every country, paginated', async ({ page }) => {
  await openScenario(page, 'default');
  await expect(heading(page)).toHaveText('248 countries');
  await expect(page.getByText('Page 1 of 25')).toBeVisible();
});

test('empty and one-country edge cases', async ({ page }) => {
  await openScenario(page, 'empty');
  await expect(page.getByRole('main').getByText('No countries match')).toBeVisible();
  await openScenario(page, 'one-country');
  await expect(heading(page)).toHaveText('1 country');
});

test('url layer: pagination, search, UI-only state, and null removal', async ({ page }) => {
  await openScenario(page, 'twenty-one-countries');
  await expect(page.locator('.card')).toHaveCount(1);

  await openScenario(page, 'search-no-results');
  await expect(page.getByRole('searchbox', { name: 'Search countries' })).toHaveValue('zzz');

  await openScenario(page, 'filters-open-impossible-combo');
  await expect(page.getByRole('radio', { name: 'Europe' })).toBeChecked();
  await expect(heading(page)).toHaveText('0 countries');

  await openScenario(page, 'filters-cleared');
  await expect(page.getByRole('radio', { name: 'All' })).toBeChecked();
  expect(new URL(page.url()).searchParams.has('lang')).toBe(false);
});

test('loading, error and recovery via sequence', async ({ page }) => {
  await openScenario(page, 'loading');
  await openScenario(page, 'server-error');
  await expect(page.getByRole('alert')).toContainText('Server is busy');

  await openScenario(page, 'flaky-then-recovers');
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(heading(page)).toHaveText('3 countries');
});

test('adapter: cached data shown while refetch hangs', async ({ page }) => {
  await openScenario(page, 'stale-while-refreshing');
  await expect(page.getByRole('heading', { name: 'Japan' })).toBeVisible();
});

test('inline scenario object extends a catalog one', async ({ page }) => {
  await openInlineScenario(page, {
    name: 'inline-test',
    extends: 'default',
    network: [{
      path: '/api/countries',
      response: {
        body: [{ name: 'Atlantis', cca2: 'XA', capital: 'Poseidonia', region: 'Ocean', languages: {} }],
      },
    }],
    ready: 'text=Atlantis',
  });
  await expect(heading(page)).toHaveText('1 country');
});

test('a shared link cannot serve its own HTML as a page on the app', async ({ page }) => {
  await openInlineScenario(page, {
    name: 'page-takeover',
    extends: 'default',
    network: [{
      path: '/',
      response: { text: '<h1 id="pwned">not the app</h1>', headers: { 'content-type': 'text/html' } },
    }],
  });
  // The worker is running now; a page load must still reach the app, not the fixture.
  await page.reload();
  await expect(heading(page)).toBeVisible();
  await expect(page.locator('#pwned')).toHaveCount(0);
});

test("a shared link cannot replace scripts the app loads later", async ({ page }) => {
  await openInlineScenario(page, {
    name: 'script-takeover',
    extends: 'default',
    network: [{
      path: '*/lazy-chunk.js',
      response: { text: 'window.pwned = true;', headers: { 'content-type': 'text/javascript' } },
    }],
  });
  // A chunk loaded lazily, as a route or the panel's Save does, with the fixtures live.
  await page.evaluate(() => import(`${location.origin}/lazy-chunk.js`).catch(() => {}));
  expect(await page.evaluate(() => 'pwned' in window)).toBe(false);
});

test('a shared link cannot run a script from a URL with no extension', async ({ page }) => {
  await openInlineScenario(page, {
    name: 'script-takeover',
    extends: 'default',
    network: [{ path: '*/plain-script', response: { text: 'window.pwned = true;' } }],
  });
  await page.evaluate(() =>
    new Promise((done) => {
      const script = Object.assign(document.createElement('script'), { src: '/plain-script', onload: done, onerror: done });
      document.head.append(script);
    })
  );
  expect(await page.evaluate(() => 'pwned' in window)).toBe(false);
});

test('strict: a removed fixture fails loudly instead of reaching the network', async ({ page }) => {
  await openInlineScenario(page, {
    name: 'missing-fixture',
    extends: 'default',
    network: [{ method: 'GET', path: '/api/countries', remove: true }],
    ready: 'role=alert',
  });
  await expect(page.getByRole('alert')).toContainText('No scenario handler for GET');
  expect(await unhandledRequests(page)).toEqual([expect.stringMatching(/^GET .*\/api\/countries$/)]);
});

test('rules: a scenario that breaks a business rule does not load', async ({ page }) => {
  await page.goto(`/#scenario-data=${
    encodeURIComponent(JSON.stringify({
      name: 'dupes',
      network: [{ path: '/api/countries', response: { body: [{ cca2: 'FR' }, { cca2: 'FR' }] } }],
    }))
  }`);
  await expect(page.locator('.fatal')).toContainText('repeats cca2: FR');
});

test('the scenario survives navigation that drops the query; ?scenario= resets', async ({ page }) => {
  await openScenario(page, 'empty');
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-scenario', 'empty');
  expect(page.url()).toContain('scenario=empty');

  await page.goto('/?scenario=');
  await expect(page.locator('html')).toHaveAttribute('data-scenario', 'default');
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-scenario', 'default');
});

test('panel: switch scenario, then edit and share a flattened snapshot', async ({ page }) => {
  await openScenario(page, 'default');
  await page.getByRole('button', { name: /Scenario: default/ }).click();
  await page.getByRole('link', { name: /^chewbacca/ }).click();
  await expect(page).toHaveURL(/scenario=chewbacca/);
  await expect(page.getByRole('heading', { name: 'Kashyyyk' })).toBeVisible();

  await page.getByText('Edit current scenario').click();
  const json = page.getByRole('textbox', { name: 'Scenario JSON' });
  await json.fill(JSON.stringify({ name: 'edited', extends: 'chewbacca', url: { q: 'Kash' } }));
  await page.getByRole('button', { name: 'Apply edited scenario' }).click();
  await expect(heading(page)).toHaveText('1 country beginning with “Kash”');

  const snapshot = JSON.parse(new URLSearchParams(new URL(page.url()).hash.slice(1)).get('scenario-data')!);
  expect(snapshot.extends).toBeUndefined();
  expect(snapshot.network[0].response.body[0].name).toBe('Kashyyyk');

  // The editor stays open for the next tweak; invalid JSON explains itself.
  await json.fill('{"name": "Not Kebab"}');
  await page.getByRole('button', { name: 'Apply edited scenario' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'kebab-case' })).toBeVisible();
});

test('reset stays on the same origin when the path starts with //', async ({ page, baseURL }) => {
  await page.goto(`${baseURL}//evil.example/?scenario=empty`);
  await expect(page.locator('html')).toHaveAttribute('data-scenario', 'empty');
  await page.getByRole('button', { name: /^Scenario:/ }).click();
  const reset = page.getByRole('link', { name: 'Reset' });
  expect(new URL((await reset.getAttribute('href')) ?? '').origin).toBe(baseURL);
});

for (const handle of [true, false]) {
  test(`panel: false hides the dev panel, and a later open shows it (addInitScript handle: ${handle})`, async ({ page }) => {
    if (!handle) {
      // Older Playwright versions return nothing from addInitScript.
      const addInitScript = page.addInitScript.bind(page);
      Object.assign(page, {
        addInitScript: async (...args: Parameters<typeof addInitScript>) => void await addInitScript(...args),
      });
    }

    await openScenario(page, 'default', { panel: false });
    await expect(page.locator('scenario-panel')).toBeHidden();
    await openScenario(page, 'empty');
    await expect(page.locator('scenario-panel')).toBeVisible();
    await openScenario(page, 'default', { panel: false });
    await expect(page.locator('scenario-panel')).toBeHidden();
  });
}

test('unknown scenario names the known ones', async ({ page }) => {
  await page.goto('/?scenario=nope');
  await expect(page.locator('.fatal')).toContainText('Unknown scenario "nope". Known scenarios: chewbacca');
});
