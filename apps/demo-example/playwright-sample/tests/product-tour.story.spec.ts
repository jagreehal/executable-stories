import { test } from '@playwright/test';
import { story } from 'executable-stories-playwright';

test('product tour', async ({ page }, testInfo) => {
  story.init({ page }, testInfo, { tags: ['demo', 'product'] });

  await story.given('the user visits the marketing site', async ({ page }) => {
    await page.goto('/');
  });

  await story.when('the user opens the product tour', async ({ page }) => {
    await page.getByRole('button', { name: 'Start tour' }).click();
  });

  story.then('the product value is clear in under 60 seconds');
});
