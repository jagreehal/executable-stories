import { expect, type Page, test } from '@playwright/test';
import { glideBeforeActions, showCursor } from 'executable-stories-showcase/playwright';

// Pages served from a stand-in origin, so these need none of the example apps.
const pages = {
  '/focus': `<body style="margin:0">
    <button style="position:absolute;left:100px;top:100px;width:200px;height:40px">Go</button>
    <label style="position:absolute;left:100px;top:200px">Email <input style="margin-left:150px"></label>
    <input id="other" style="position:absolute;left:300px;top:250px">`,
  '/frames':
    `<body style="margin:0"><iframe src="/inner" style="position:absolute;left:300px;top:200px;width:400px;height:300px;border:5px solid"></iframe></body>`,
  '/inner': `<body><button id=b style="margin:50px">inner</button><iframe src="/nested"></iframe></body>`,
  '/nested': `<body><button id=c>nested</button></body>`,
  '/scaled':
    `<body style="margin:0"><iframe src="/inner" style="position:absolute;left:100px;top:50px;width:400px;height:300px;border:5px solid;padding:20px;transform:scale(.5);transform-origin:0 0"></iframe></body>`,
  // Far from where the cursor starts, so a click that doesn't wait lands before it arrives.
  '/far': `<body style="margin:0"><button id=t style="position:absolute;left:20px;top:20px;width:50px">t</button></body>`,
  '/far-field': `<body style="margin:0"><input id=t style="position:absolute;left:20px;top:20px;width:200px"></body>`,
  // Moves, or widens, just after the cursor reaches it.
  '/move':
    `<body style="margin:0"><button id=t style="position:absolute;left:20px;top:100px;width:50px">t</button><script>t.addEventListener('mouseenter',()=>setTimeout(()=>t.style.left='500px',100),{once:true})</script></body>`,
  '/grow':
    `<body style="margin:0"><button id=t style="position:absolute;left:20px;top:100px;width:50px">t</button><script>t.addEventListener('mouseenter',()=>setTimeout(()=>t.style.width='500px',100),{once:true})</script></body>`,
} satisfies Record<string, string>;

test.beforeEach(async ({ page }) => {
  await page.route(
    'http://cursor.test/**',
    (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: Object.entries(pages).find(([path]) => path === new URL(route.request().url()).pathname)?.[1],
      }),
  );
  await showCursor(page);
});

/** Where each drawn cursor sits now, mid-glide included, across every frame. */
const drawn = (page: Page) =>
  Promise.all(
    page.frames().map((frame) =>
      frame.evaluate(() =>
        [...document.querySelectorAll('.es-cursor')].map((c) => {
          const { e, f } = new DOMMatrix(getComputedStyle(c).transform);

          return { x: e, y: f };
        })
      )
    ),
  ).then((all) => all.flat());

/** Where the cursor is gliding to. */
const target = (page: Page) =>
  page.evaluate(() => document.querySelector<HTMLElement>('.es-cursor')!.style.transform.match(/translate\(([^)]*)\)/)![1]);

/** Hover, let the glide finish, and expect one cursor at the target's centre. */
const expectCursorOn = async (page: Page, frame: number, selector: string) => {
  const box = await page.frames()[frame].locator(selector).boundingBox();

  if (!box) throw new Error(`${selector} isn't visible`);

  // Playwright moves the mouse to whole pixels, so allow one.
  await expect.poll(async () => {
    const cursors = await drawn(page);

    return cursors.map((c) =>
      Math.max(Math.abs(c.x - (box.x + box.width / 2)), Math.abs(c.y - (box.y + box.height / 2))) <= 1
    );
  }).toEqual([true]);
};

/** Where the cursor is drawn, and where the click is, at the moment the button goes down. */
const atMousedown = (page: Page) =>
  page.evaluate(() =>
    new Promise<{ click: number; cursor: number; }>((resolve) =>
      addEventListener('mousedown', (e) => {
        const cursor = new DOMMatrix(getComputedStyle(document.querySelector('.es-cursor')!).transform).e;
        resolve({ click: e.clientX, cursor });
      }, { once: true, capture: true })
    )
  );

test('stays on mouse clicks and follows fill() and keyboard focus', async ({ page }) => {
  await page.goto('http://cursor.test/focus');

  // Clicking a focusable element, or a label that focuses its input, leaves the cursor where it clicked.
  await page.mouse.click(200, 120);
  expect(await target(page)).toBe('200px, 120px');
  await page.mouse.click(110, 210);
  expect(await target(page)).toBe('110px, 210px');

  // fill() and Tab focus without moving the mouse, so the cursor goes to the field.
  // It follows a couple of frames later, once a popup has had time to position itself.
  await page.fill('#other', 'x');
  await expect.poll(() => target(page)).not.toBe('110px, 210px');
  await page.mouse.click(200, 120);
  await page.keyboard.press('Tab');
  await expect.poll(() => target(page)).not.toBe('200px, 120px');
});

test('draws one cursor, in the top frame, over targets in nested iframes', async ({ page }) => {
  await page.goto('http://cursor.test/frames');
  await expect.poll(() => drawn(page).then((c) => c.length)).toBe(1);

  await page.frameLocator('iframe').locator('#b').hover();
  await expectCursorOn(page, 1, '#b');

  await page.frameLocator('iframe').frameLocator('iframe').locator('#c').hover();
  await expectCursorOn(page, 2, '#c');
});

test('maps through an iframe’s CSS scale, border and padding', async ({ page }) => {
  await page.goto('http://cursor.test/scaled');
  await page.frameLocator('iframe').locator('#b').hover();
  await expectCursorOn(page, 1, '#b');
});

for (const path of ['/far', '/move', '/grow']) {
  test(`record's click lands once the cursor has arrived (${path})`, async ({ page }) => {
    glideBeforeActions(page);
    await page.goto(`http://cursor.test${path}`);

    const at = atMousedown(page);
    await page.locator('#t').click();
    const { click, cursor } = await at;
    expect(cursor).toBeCloseTo(click, 0);
  });
}

test('typing waits for the cursor to reach the field', async ({ page }) => {
  glideBeforeActions(page);
  await page.goto('http://cursor.test/far-field');
  const box = (await page.locator('#t').boundingBox())!;

  // Where the cursor is drawn when the first character goes in.
  const at = page.evaluate(() =>
    new Promise<number>((resolve) =>
      addEventListener('input', () => {
        resolve(new DOMMatrix(getComputedStyle(document.querySelector('.es-cursor')!).transform).e);
      }, { once: true, capture: true })
    )
  );
  await page.locator('#t').pressSequentially('Lena');
  // Near the right end, clear of the text being typed.
  expect(await at).toBeCloseTo(box.x + box.width - 24, 0);
});

test('size scales the pointer and halo: false drops the halo', async ({ page }) => {
  await showCursor(page, { size: 2, halo: false });
  await page.goto('http://cursor.test/far');

  // beforeEach drew a default cursor too; the last one is this test's.
  const last = page.locator('.es-cursor').last();
  await expect(last.locator('.es-halo')).toHaveCount(0);
  expect((await last.locator('svg').boundingBox())?.width).toBeCloseTo(48, 0);
});
