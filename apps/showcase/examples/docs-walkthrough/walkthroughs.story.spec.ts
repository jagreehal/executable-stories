import { expect, test } from '@playwright/test';
import { story } from 'executable-stories-playwright';
import { openScenario } from 'executable-stories-showcase/playwright';

// Each walkthrough opens its exact starting state from a scenario (no backend, no seed
// data), then captures one screenshot per step. `pnpm walkthrough` turns the run into
// docs/walkthroughs.md, an HTML report, and docs/gif/<walkthrough>.gif.

test('Find a country', async ({ page }, testInfo) => {
  story.init(testInfo, { tags: ['docs'], featureVideo: true });
  const search = page.getByRole('searchbox', { name: 'Search countries' });

  story.given('the list shows every country');
  await openScenario(page, 'default', { panel: false });
  await story.screenshot({ page, fullPage: false, alt: 'All 248 countries', highlight: search });

  story.when('you type part of a name into the search box');
  await search.fill('Fra');
  await expect(page.getByRole('heading', { name: 'France' })).toBeVisible();
  await story.screenshot({ page, fullPage: false, alt: 'Searching for "Fra"', highlight: search });

  story.then('only the matching countries are listed');
  await expect(page.getByRole('main').getByRole('heading', { level: 2 })).toHaveText(/^\d+ countr/);
  await story.screenshot({
    page,
    fullPage: false,
    alt: 'France in the results',
    highlight: page.getByRole('heading', { name: 'France' }),
  });
});

test('Recover when the server is busy', async ({ page }, testInfo) => {
  story.init(testInfo, { tags: ['docs'], featureVideo: true });
  const retry = page.getByRole('button', { name: 'Retry' });

  story.given('the server failed to send the list');
  await openScenario(page, 'flaky-then-recovers', { panel: false });
  await expect(page.getByRole('alert')).toBeVisible();
  await story.screenshot({ page, fullPage: false, alt: 'The error message', highlight: retry });

  story.when('you press Retry');
  await retry.click();

  story.then('the list loads');
  await expect(page.getByRole('main').getByRole('heading', { level: 2 })).toHaveText('3 countries');
  await story.screenshot({ page, fullPage: false, alt: 'The list after retrying' });
});
