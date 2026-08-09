---
title: Recipes (Playwright)
description: 32 example scenarios with Playwright code and generated Markdown output
slug: recipes/playwright
---

Every Vitest recipe has a **Playwright equivalent** in [apps/playwright-example](https://github.com/jagreehal/executable-stories/tree/main/apps/playwright-example). The generated output is identical across frameworks — only the test code differs.

You use **native** `test.describe` / `test` and the **`story`** object: call **`story.init(testInfo)`** at the start of each test (pass **`testInfo`** from the callback), then **`story.given`**, **`story.when`**, **`story.then`**. Your test still receives **fixtures** (e.g. `{ page }`) for browser actions.

## Key difference from Vitest

| | Vitest | Playwright |
| - | ------ | ---------- |
| Init | `story.init(task)` | `story.init(testInfo)` |
| Import | `import { story } from 'executable-stories-vitest'` | `import { story } from 'executable-stories-playwright'` |
| Test structure | `describe` / `it` | `test.describe` / `test` |
| Fixtures | `{ task }` | `{ page }`, `{ context }`, `{ browser }`, `testInfo` |
| Top-level helpers | not exported | `given`, `when`, `then`, `and`, `but` exported |
| Failure modifier | `it.fails` | `test.fail` |

## Example: User logs in successfully

### Generated output

```markdown
### User logs in successfully

- **Given** the user account exists
- **And** the user is on the login page
- **And** the account is active
- **When** the user submits valid credentials
- **Then** the user should see the dashboard
```

### Playwright code

```typescript
import { expect, test } from '@playwright/test';
import { story } from 'executable-stories-playwright';

test.describe('Login', () => {
  test('User logs in successfully', async ({ page }, testInfo) => {
    story.init(testInfo);
    story.given('the user account exists');
    story.given('the user is on the login page');
    story.given('the account is active');
    story.when('the user submits valid credentials');
    story.then('the user should see the dashboard');
    await expect(page).toHaveURL(/dashboard/);
  });
});
```

## Example: Login blocked for suspended user (with But)

```typescript
import { test } from '@playwright/test';
import { story } from 'executable-stories-playwright';

test.describe('Login', () => {
  test('Login blocked for suspended user', async ({ page }, testInfo) => {
    story.init(testInfo);
    story.given('the user account exists');
    story.given('the account is suspended');
    story.when('the user submits valid credentials');
    story.then('the user should see an error message');
    story.but('the user should not be logged in');
  });
});
```

## Example: API accepts JSON payload (with doc.json)

```typescript
import { story } from 'executable-stories-playwright';
import { test } from '@playwright/test';

test.describe('API', () => {
  test('API accepts a JSON payload', async ({}, testInfo) => {
    story.init(testInfo);
    story.given('the client has the following JSON payload');
    story.json({
      label: 'Payload',
      value: {
        email: 'user@example.com',
        password: 'secret',
        rememberMe: true,
      },
    });
    story.when('the client sends the request');
    story.then('the response status should be 200');
    story.and('the response body should include "token"');
  });
});
```

## Using Playwright fixtures in step callbacks

If you want step callbacks to receive Playwright fixtures, pass them as the first argument:

```typescript
test('user interacts with page', async ({ page }, testInfo) => {
  story.init({ page }, testInfo);

  await story.given('the user is on the login page', async ({ page }) => {
    await page.goto('/login');
  });

  await story.when('the user submits credentials', async ({ page }) => {
    await page.fill('[name=email]', 'user@example.com');
    await page.click('button[type=submit]');
  });

  story.then('the user sees the dashboard');
  await expect(page).toHaveURL(/dashboard/);
});
```

## Full recipe list

The same 32 scenarios as [Vitest recipes](/recipes/vitest/) are in `apps/playwright-example/src/replicate.story.spec.ts`. Generated docs: `apps/playwright-example/src/replicate.docs.md`.

| Scenario | Pattern | See Vitest recipe |
| -------- | ------- | ----------------- |
| User logs in successfully | Multiple Given, single When, single Then | [Link](/recipes/vitest/user-logs-in-successfully/) |
| User updates profile details | Single Given, multiple When, single Then | [Link](/recipes/vitest/user-updates-profile-details/) |
| Checkout calculates totals | Single Given, single When, multiple Then | [Link](/recipes/vitest/checkout-calculates-totals/) |
| Password reset flow | Multiple Given/When/Then | [Link](/recipes/vitest/password-reset-flow/) |
| Login blocked for suspended user | Use of But | [Link](/recipes/vitest/login-blocked-suspended-user/) |
| Login works (tags) | Story tags | [Link](/recipes/vitest/login-works/) |
| Login errors (outline) | Scenario outline with loop | [Link](/recipes/vitest/login-errors/) |
| Many login attempts (outline) | Scenario outline, multiple outcomes | [Link](/recipes/vitest/many-login-attempts/) |
| Bulk user creation | doc.table | [Link](/recipes/vitest/bulk-user-creation/) |
| Create users from table | Scenario outline with doc.table | [Link](/recipes/vitest/create-users-from-table/) |
| Calculate shipping options | DataTable, multiple Then | [Link](/recipes/vitest/calculate-shipping-options/) |
| Shipping eligibility | Scenario outline by country | [Link](/recipes/vitest/shipping-eligibility/) |
| Tax calculation by region | Scenario outline with multiple rows | [Link](/recipes/vitest/tax-calculation-by-region/) |
| API accepts JSON payload | doc.json (DocString) | [Link](/recipes/vitest/api-accepts-json-payload/) |
| Post JSON payload (outline) | Scenario outline with doc.json | [Link](/recipes/vitest/post-json-payload/) |
| Import XML invoice | doc.code (XML) | [Link](/recipes/vitest/import-xml-invoice/) |
| Import users + welcome email | doc.table + doc.code | [Link](/recipes/vitest/import-users-welcome-email/) |
| Render markdown | doc.code (markdown) | [Link](/recipes/vitest/render-markdown/) |
| Change email address | Shared background | [Link](/recipes/vitest/change-email-address/) |
| Change password | Shared background, different When/Then | [Link](/recipes/vitest/change-password/) |
| Eligible customer gets discount | Rule block, positive path | [Link](/recipes/vitest/eligible-customer-gets-discount/) |
| Ineligible customer no discount | Rule block, negative path | [Link](/recipes/vitest/ineligible-customer-no-discount/) |
| Two step checkout | Multiple When groups | [Link](/recipes/vitest/two-step-checkout/) |
| Payment declined | Negative path with But | [Link](/recipes/vitest/payment-declined/) |
| Guest checkout allowed | doc.note for But | [Link](/recipes/vitest/guest-checkout-allowed/) |
| Logout clears session | Repeated Then steps | [Link](/recipes/vitest/logout-clears-session/) |
| Document status changes | Explicit state transition | [Link](/recipes/vitest/document-status-changes/) |
| Update preferences | DataTable as key-value pairs | [Link](/recipes/vitest/update-preferences/) |
| Configure feature flags | Complex DataTable | [Link](/recipes/vitest/configure-feature-flags/) |
| Create order | Background and tags | [Link](/recipes/vitest/create-order/) |
| Search results show highlights | And after Then | [Link](/recipes/vitest/search-results-show-highlights/) |
| Report shows fields in order | And in middle of Then | [Link](/recipes/vitest/report-shows-fields-in-order/) |

[Playwright story & doc API](/reference/playwright-story-api/) — steps, fixtures, and doc usage.
