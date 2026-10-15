import type { Page } from '@playwright/test';

// What each demo app scenario does on camera. The pauses give viewers, and the zoom, time to
// follow each click.
const beat = (page: Page) => page.waitForTimeout(700);

export default {
  default: async (page: Page) => {
    await beat(page);
    await page.getByRole('button', { name: /Filters/ }).click();
    await beat(page);
    await page.getByRole('searchbox', { name: 'Search countries' }).click();
    await page.keyboard.type('Ice', { delay: 120 });
  },
  // Cropped to the error message, so the Retry click fills the frame.
  'server-error': {
    element: '[role=alert]',
    steps: async (page: Page) => {
      await beat(page);
      await page.getByRole('button', { name: 'Retry' }).click();
    },
  },
};
