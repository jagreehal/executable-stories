import { expect, test } from '@playwright/test';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { openScenario } from 'executable-stories-showcase/playwright';
import { E2E_SAVE_DIR } from './save-dir';

// Next.js App Router: the session runs in the browser, after hydration.
test.use({ baseURL: 'http://localhost:5181' });

test('without a scenario the app hits the real API', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Hello from the real API')).toBeVisible();
});

test('a scenario mocks client fetches and sets URL params Next can read', async ({ page }) => {
  // Not strict: Next dev makes its own requests (HMR, RSC).
  await openScenario(page, 'greeting-error', { strict: false });
  await expect(page.getByText('Greeting service down')).toBeVisible();
  await expect(page.getByText('Name from URL: Ada')).toBeVisible();
});

test('scenario cookies reach server components on the next request', async ({ page }) => {
  await openScenario(page, 'admin', { strict: false });
  await expect(page.getByText('Server sees role: guest')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Server sees role: admin')).toBeVisible();
});

test('save to project works through the Next.js route handler', async ({ page }) => {
  const name = `e2e-next-saved-${Date.now()}`;
  const file = join(E2E_SAVE_DIR, `${name}.json`);

  try {
    await openScenario(page, 'admin', { strict: false });
    await page.getByRole('button', { name: /^Scenario:/ }).click();
    await page.getByText('Save as scenario').click();
    await page.getByRole('textbox', { name: 'Scenario name' }).fill(name);
    await page.getByRole('button', { name: /^Save to / }).click();
    await expect(page.locator('scenario-panel .save-status')).toContainText(`${name}.json`);
    // No `default` here, so the panel saves a full snapshot: the admin cookie comes along.
    expect(JSON.parse(readFileSync(file, 'utf8'))).toMatchObject({
      name,
      state: { cookies: { role: 'admin' } },
    });
  } finally {
    if (existsSync(file)) rmSync(file);
  }
});
