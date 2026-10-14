import { chromium, type Browser, type Page } from '@playwright/test';
import { story } from 'executable-stories-vitest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const catalogue = `<!doctype html>
<style>
  body { font: 18px system-ui; margin: 40px; color: #18181b; }
  input { font: inherit; padding: 10px 14px; width: 320px; border: 2px solid #d4d4d8; border-radius: 8px; }
  ul { list-style: none; padding: 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  li { padding: 24px; border-radius: 12px; background: #f4f4f5; }
</style>
<h1>Lighting</h1>
<input type="search" aria-label="Search" placeholder="Search products">
<ul>
  <li>Desk lamp</li><li>Floor lamp</li><li>Pendant light</li><li>Wall sconce</li><li>Lamp shade</li>
</ul>
<script>
  document.querySelector('input').addEventListener('input', (e) => {
    for (const li of document.querySelectorAll('li')) {
      li.hidden = !li.textContent.toLowerCase().includes(e.target.value.toLowerCase());
    }
  });
</script>`;

let browser: Browser;
let page: Page;

// Screenshots land in public/, which Remotion serves, so the report's paths are staticFile() paths.
const shot = async (name: string, alt: string) => {
  await page.screenshot({ path: `public/shots/${name}.png` });
  story.screenshot({ path: `shots/${name}.png`, alt });
};

beforeAll(async () => {
  browser = await chromium.launch({
    args: process.env.ES_CHROMIUM_SINGLE_PROCESS ? ['--single-process'] : [],
  });
  page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
});

afterAll(() => browser?.close());

describe('Catalogue', () => {
  it('Search the catalogue', async ({ task }) => {
    story.init(task);

    story.given('the lighting catalogue');
    await page.setContent(catalogue);
    await shot('catalogue', 'Five lighting products');

    story.when('the shopper searches for "lamp"');
    await page.getByRole('searchbox').fill('lamp');

    story.then('only lamps are listed');
    await expect.poll(() => page.locator('li:visible').count()).toBe(3);
    await shot('lamps', 'Three lamps');
  });
});
