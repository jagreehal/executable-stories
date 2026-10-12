import { expect, type Page, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { openInlineScenario, openScenario } from 'executable-stories-showcase/playwright';

// Sign-in flows. Without a scenario the app talks to a stand-in backend (examples/auth-flows/backend.ts).
test.use({ baseURL: 'http://localhost:5182' });

const signIn = async (page: Page, password = 'password') => {
  await page.getByLabel('Email', { exact: true }).fill('ada@example.com');
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Continue' }).click();
};

const enterCode = async (page: Page, code: string) => {
  await page.getByLabel('Code', { exact: true }).fill(code);
  await page.getByRole('button', { name: 'Verify' }).click();
};

const signedIn = (page: Page) =>
  expect(page.getByRole('heading', { name: 'Signed in as ada@example.com' })).toBeVisible();

test('email code: any password and code get in', async ({ page }) => {
  await openScenario(page, 'email-code');
  await signIn(page, 'anything');
  await enterCode(page, '000000');
  await signedIn(page);
});

test('a wrong code, then the right one', async ({ page }) => {
  await openScenario(page, 'wrong-then-right-code');
  await signIn(page);
  await enterCode(page, '111111');
  await expect(page.getByRole('alert')).toHaveText('That code is wrong');
  await enterCode(page, '123456');
  await signedIn(page);
});

test('straight to the code screen', async ({ page }) => {
  await openScenario(page, 'code-screen');
  await expect(page.getByText('We sent a code to ada@example.com.')).toBeVisible();
  await enterCode(page, '123456');
  await signedIn(page);
});

test('a locked account', async ({ page }) => {
  await openScenario(page, 'login-locked');
  await signIn(page);
  await expect(page.getByRole('alert')).toHaveText('Too many attempts. Try again in 15 minutes.');
});

test('magic links: valid and expired', async ({ page }) => {
  await openScenario(page, 'magic-link', { path: '/magic' });
  await signedIn(page);
  await openScenario(page, 'magic-link-expired', { path: '/magic' });
  await expect(page.getByRole('alert')).toHaveText('This link has expired');
});

test('skip login, and a session the server rejects', async ({ page }) => {
  await openScenario(page, 'signed-in');
  await signedIn(page);
  await openScenario(page, 'session-expired');
  await expect(page.getByRole('alert')).toHaveText('Your session expired');
});

test('Google sign-in runs for real, against the emulator', async ({ page }) => {
  // A redirect to another origin: no network mock can stand in for this, so the emulator does.
  await page.goto('/');
  await page.getByRole('link', { name: 'Sign in with Google' }).click();
  await expect(page).toHaveTitle(/Sign in to Google/);
  await page.getByRole('button', { name: /ada@example\.com/ }).click();
  await signedIn(page);
});

test('back from Google without signing in', async ({ page }) => {
  await openScenario(page, 'google-cancelled');
  await expect(page.getByRole('alert')).toHaveText('Google sign-in was cancelled');
});

test('record the real flow, then replay it offline', async ({ page, browser }) => {
  // Record: no scenario, so requests reach the backend, whose code is 123456.
  await page.goto('/?scenario-record');
  await signIn(page);
  await enterCode(page, '111111');
  await expect(page.getByRole('alert')).toHaveText('That code is wrong');
  await enterCode(page, '123456');
  await signedIn(page);

  await page.getByRole('button', { name: /^Scenario:.*recording 2/ }).click();
  await page.getByText('Save as scenario').click();
  await page.getByLabel('Scenario name').fill('recorded-sign-in');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download JSON' }).click();
  const recorded = JSON.parse(readFileSync(await (await download).path(), 'utf8'));

  expect(recorded.network).toEqual([
    { method: 'POST', path: '/api/login', response: { status: 200, body: { mfa: 'email' } } },
    {
      method: 'POST',
      path: '/api/verify-code',
      sequence: [
        { status: 401, body: { message: 'That code is wrong' } },
        // The real token never leaves the browser that recorded it.
        { status: 200, body: { token: '[redacted]', email: 'ada@example.com' } },
      ],
    },
  ]);

  // Replay in a fresh browser, strict: a request the recording doesn't cover would fail.
  // Without the captured state, the flow starts again from the sign-in screen.
  const replay = await (await browser.newContext({ baseURL: 'http://localhost:5182' })).newPage();
  await openInlineScenario(replay, { ...recorded, state: undefined }, { strict: true });
  await signIn(replay);
  await enterCode(replay, 'anything');
  await expect(replay.getByRole('alert')).toHaveText('That code is wrong');
  await enterCode(replay, 'anything');
  await signedIn(replay);
  expect(await replay.evaluate(() => globalThis.executableStoriesShowcaseUnhandled)).toEqual([]);
});
