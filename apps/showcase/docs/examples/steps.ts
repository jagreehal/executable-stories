// steps.ts: scenario name → what to do once it is ready
import type { Page } from '@playwright/test';

export default {
  'search-no-results': async (page: Page) => {
    await page.getByRole('searchbox').click();
    await page.keyboard.type('Atlantis', { delay: 100 });
  },
};
