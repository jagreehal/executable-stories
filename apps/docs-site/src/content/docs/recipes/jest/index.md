---
title: Recipes (Jest)
description: 32 example scenarios with Jest code and generated Markdown output
slug: recipes/jest
---

Every Vitest recipe has a **Jest equivalent** in [apps/jest-example](https://github.com/jagreehal/executable-stories/tree/main/apps/jest-example). The generated output is identical across frameworks — only the test code differs.

You use **native** `describe` / `it` and the **`story`** object: call **`story.init()`** at the start of each test (no task argument; Jest gets the test name from `expect.getState()`), then **`story.given`**, **`story.when`**, **`story.then`** (and **`story.and`**, **`story.but`**). Jest also exports top-level `given`, `when`, `then`, `and`, `but` helpers.

## Key difference from Vitest

| | Vitest | Jest |
| - | ------ | ---- |
| Init | `story.init(task)` | `story.init()` |
| Import | `import { story } from 'executable-stories-vitest'` | `import { story } from 'executable-stories-jest'` |
| Setup | none | `setupFilesAfterEnv: ['executable-stories-jest/setup']` |
| Top-level helpers | not exported (no `then`) | `given`, `when`, `then`, `and`, `but` exported |

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

### Jest code

```typescript
import { expect } from '@jest/globals';
import { story } from 'executable-stories-jest';

describe('Login', () => {
  it('User logs in successfully', () => {
    story.init();
    story.given('the user account exists');
    story.given('the user is on the login page');
    story.given('the account is active');
    story.when('the user submits valid credentials');
    story.then('the user should see the dashboard');
    expect(true).toBe(true); // or real assertions
  });
});
```

## Example: Login blocked for suspended user (with But)

```typescript
import { story } from 'executable-stories-jest';

describe('Login', () => {
  it('Login blocked for suspended user', () => {
    story.init();
    story.given('the user account exists');
    story.given('the account is suspended');
    story.when('the user submits valid credentials');
    story.then('the user should see an error message');
    story.but('the user should not be logged in');
  });
});
```

## Example: Bulk user creation (with doc.table)

```typescript
import { story } from 'executable-stories-jest';

describe('Users', () => {
  it('Bulk user creation', () => {
    story.init();
    story.given('the following users exist');
    story.table({
      label: 'Users',
      columns: ['email', 'role', 'status'],
      rows: [
        ['alice@example.com', 'admin', 'active'],
        ['bob@example.com', 'user', 'active'],
        ['eve@example.com', 'user', 'locked'],
      ],
    });
    story.when('the admin opens the user list');
    story.then('the user list should include');
    story.table({
      label: 'Expected',
      columns: ['email', 'role', 'status'],
      rows: [
        ['alice@example.com', 'admin', 'active'],
        ['bob@example.com', 'user', 'active'],
        ['eve@example.com', 'user', 'locked'],
      ],
    });
  });
});
```

## Full recipe list

The same 32 scenarios as [Vitest recipes](/recipes/vitest/) are in `apps/jest-example/src/replicate.story.test.ts`. Generated docs: `apps/jest-example/src/replicate.story.docs.md`.

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

[Jest story & doc API](/reference/jest-story-api/) — steps and doc usage.
