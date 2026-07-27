/**
 * Example: a visual storyboard. One `story.screenshot({ page, alt })` per step
 * makes the report render a horizontal filmstrip (Given → When → Then) above
 * the step list — a walkthrough stakeholders can read without the test code.
 */
import { expect, test } from '@playwright/test';
import { story } from 'executable-stories-playwright';

const pageHtml = (title: string, body: string) =>
  `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:2rem"><h1>${title}</h1>${body}</body></html>`;

// `journey:guest-checkout:<n>` composes these scenarios into one ordered
// walkthrough at /journeys/guest-checkout on an Astro site.
test('Browse the catalog', async ({ page }, testInfo) => {
  story.init(testInfo, {
    tags: ['storyboard', 'audience:stakeholder', 'journey:guest-checkout:1', 'state:catalog', 'viewport:desktop'],
  });

  story.given('the catalog lists products');
  await page.setContent(
    pageHtml('Catalog', '<ul><li>Espresso beans — £12</li><li>Filter papers — £4</li><li>Mug — £9</li></ul>'),
  );
  await story.screenshot({ page, alt: 'Catalog with 3 products' });

  story.when('the shopper opens a product');
  await page.setContent(pageHtml('Espresso beans', '<p>£12 · dark roast</p><button>Add to cart</button>'));
  await story.screenshot({ page, alt: 'Product page' });

  story.then('the product can be added to the cart');
  await expect(page.getByRole('button', { name: 'Add to cart' })).toBeVisible();
});

// Same state at a phone viewport: appears beside the desktop card on the
// /states grid — one state, two layouts, compared at a glance.
test('Browse the catalog on mobile', async ({ page }, testInfo) => {
  story.init(testInfo, {
    tags: ['storyboard', 'state:catalog', 'viewport:mobile'],
  });
  await page.setViewportSize({ width: 390, height: 844 });

  story.given('the catalog lists products');
  await page.setContent(
    pageHtml('Catalog', '<ul><li>Espresso beans — £12</li><li>Filter papers — £4</li><li>Mug — £9</li></ul>'),
  );
  await story.screenshot({ page, alt: 'Catalog (mobile)' });

  story.then('the products are readable on a phone');
  await expect(page.getByRole('heading', { name: 'Catalog' })).toBeVisible();
  await story.screenshot({ page, alt: 'Catalog heading (mobile)' });
});

test('Guest checkout walkthrough', async ({ page }, testInfo) => {
  story.init(testInfo, {
    tags: ['storyboard', 'audience:stakeholder', 'capability:checkout', 'journey:guest-checkout:2', 'state:payment'],
  });

  story.given('the cart has items');
  await page.setContent(
    pageHtml('Your cart', '<ul><li>Espresso beans</li><li>Filter papers</li><li>Mug</li></ul><button>Checkout</button>'),
  );
  // Screenshot + state on the same step: the screen the shopper sees, and the
  // backend order record behind it. Same-label states are diffed step to step.
  await story.screenshot({ page, alt: 'Cart with 3 items' });
  story.state({ label: 'order', value: { status: 'cart', items: 3, total: '£25' } });

  story.when('the user completes checkout');
  await page.setContent(
    pageHtml('Payment', '<form><label>Card number <input value="4242 4242 4242 4242"/></label><button>Pay</button></form>'),
  );
  await story.screenshot({ page, alt: 'Payment form' });
  story.state({ label: 'order', value: { status: 'awaiting-payment', items: 3, total: '£25' } });

  story.then('the order confirmation is shown');
  await page.setContent(pageHtml('Thank you', '<p>Order #1042 confirmed.</p>'));
  await expect(page.getByRole('heading', { name: 'Thank you' })).toBeVisible();
  await story.screenshot({ page, alt: 'Order confirmed' });
  story.state({ label: 'order', value: { status: 'paid', items: 3, total: '£25', orderId: 1042 } });
});
