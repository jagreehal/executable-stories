import { expect, test } from '@playwright/test';
import { readdirSync } from 'node:fs';
import { openScenario } from 'executable-stories-showcase/playwright';

// One baseline per scenario. Update with `pnpm e2e:update` after an intended UI change.
for (const file of readdirSync('examples/demo-react/scenarios').filter((f) => f.endsWith('.json'))) {
  const name = file.replace(/\.json$/, '');
  test(`looks right: ${name}`, async ({ page }) => {
    await openScenario(page, name);
    await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true });
  });
}
