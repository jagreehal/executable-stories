import { expect, type Page, test } from '@playwright/test';
import { openScenario } from 'executable-stories-showcase/playwright';

// The Preact app: the same page state in a useReducer and in an XState machine, driven by scenarios.
test.use({ baseURL: 'http://localhost:5180' });

const panel = (page: Page) => page.getByRole('button', { name: /^Scenario:/ }).click();

for (const path of ['/', '/xstate']) {
  test(`${path}: presets open by URL, switch live, and the state is editable`, async ({ page }) => {
    await openScenario(page, 'no-results', { path, strict: false });
    await expect(page.getByRole('heading', { name: '0 countries' })).toBeVisible();

    // Presets switch in place.
    await page.evaluate(() => (window.sameDocument = true));
    await panel(page);
    await page.getByRole('link', { name: /^error/ }).click();
    await expect(page.getByText('Server is busy')).toBeVisible();
    await page.getByRole('link', { name: /^geek-country/ }).click();
    await expect(page.getByText('Kashyyyk')).toBeVisible();
    expect(await page.evaluate(() => window.sameDocument)).toBe(true);

    // The live editor follows the app's own state…
    await page.getByText('Live state: page').click();
    const live = page.getByRole('textbox', { name: 'Live state page' });
    await expect(live).toHaveValue(/"Rwookrrorro"/);

    // …and edits go straight into its reducer / machine.
    const edited = JSON.parse(await live.inputValue());
    edited.searchState = { status: 'error', message: 'Edited live' };
    await live.fill(JSON.stringify(edited));
    await page.getByRole('button', { name: 'Apply', exact: true }).click();
    await expect(page.getByText('Edited live')).toBeVisible();
  });
}

test('page presets can be saved and shared as links', async ({ page, context }) => {
  await openScenario(page, 'five-countries', { strict: false });
  await panel(page);
  await page.getByText('Save as scenario').click();
  await page.getByRole('textbox', { name: 'Scenario name' }).fill('my-five');
  await page.getByRole('button', { name: 'Copy link' }).first().click();
  const link = await page.getByRole('textbox', { name: 'Saved scenario link' }).inputValue();

  const fresh = await (await context.browser()!.newContext()).newPage();
  await fresh.goto(link);
  await expect(fresh.locator('html')).toHaveAttribute('data-scenario', 'my-five');
  await expect(fresh.getByRole('heading', { name: '5 countries' })).toBeVisible();
});
