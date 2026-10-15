import { expect, test } from '@playwright/test';
import { story } from 'executable-stories-playwright';
import { openScenario, showCursor } from 'executable-stories-showcase/playwright';

test('Find a country by the start of its name', async ({ page }, testInfo) => {
  // The page, so the run notes each click and focused field for the camera.
  story.init({ page }, testInfo, { featureVideo: true });
  // A drawn cursor that arrives before each click and keystroke.
  await showCursor(page, { glide: true });

  story.given('the catalogue lists every country');
  await openScenario(page, 'default', { panel: false });
  await expect(page.getByRole('heading', { name: '248 countries' })).toBeVisible();
  await story.screenshot({ page, alt: 'Every country', hold: 1200 });

  story.when('Lena searches for "Ice"');
  await page.getByRole('searchbox', { name: 'Search countries' }).pressSequentially('Ice', { delay: 150 });

  story.then('only Iceland is left');
  await expect(page.getByRole('heading', { name: /^1 country/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Iceland' })).toBeVisible();
  await story.screenshot({ page, alt: 'Iceland', hold: 1500 });
});
