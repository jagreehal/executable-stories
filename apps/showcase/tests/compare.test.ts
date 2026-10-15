import { chromium } from '@playwright/test';
import { afterAll, expect, it as test } from 'vitest';
import { compareImages } from '../../../packages/executable-stories-showcase-cli/src/compare.ts';

// These open and close many pages, which a single-process Chromium (ES_CHROMIUM_SINGLE_PROCESS, for
// agent sandboxes) can't survive. CI runs a normal Chromium, so they run there.
const sandboxed = Boolean(process.env.ES_CHROMIUM_SINGLE_PROCESS);
const it = sandboxed ? test.skip : test;
const browser = sandboxed ? undefined! : await chromium.launch();

afterAll(() => browser?.close());

/** A screenshot of a 200x100 page with a box in the given colour and width. */
const shot = async (color: string, width = 40) => {
  const page = await browser.newPage({ viewport: { width: 200, height: 100 } });
  await page.setContent(
    `<body style="margin:0"><div style="width:${width}px;height:20px;background:${color}"></div>`,
  );
  const png = await page.screenshot();
  await page.close();

  return png;
};

it('finds no change between identical screenshots, and draws nothing', async () => {
  const a = await shot('red');

  expect(await compareImages(browser, a, a)).toEqual({ changed: 0, total: 20_000 });
});

it('counts changed pixels and draws before | after | changed', async () => {
  const result = await compareImages(browser, await shot('red'), await shot('blue'));

  expect(result.changed).toBe(40 * 20);
  // Three 200px panels with two 16px gaps, under a 28px label row.
  expect(result.image?.readUInt32BE(16)).toBe(200 * 3 + 16 * 2);
  expect(result.image?.readUInt32BE(20)).toBe(100 + 28);
});

it('counts area only one image covers as changed', async () => {
  const page = await browser.newPage({ viewport: { width: 200, height: 120 } });
  await page.setContent('<body style="margin:0">');
  const taller = await page.screenshot();
  await page.close();

  const result = await compareImages(browser, await shot('white', 0), taller);

  expect(result.changed).toBe(200 * 20);
});
