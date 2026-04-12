---
title: Shipping eligibility (Playwright)
description: Scenario outline by country
---

## Generated output

Example: `Shipping eligibility: US -> yes`

```markdown
### ✅ Shipping eligibility: US -> yes

- **Given** the cart total is 10
- **And** the destination country is "US"
- **When** shipping eligibility is checked
- **Then** shipping should be "yes"
```

## Playwright code

```typescript
import { test } from '@playwright/test';
import { story } from 'executable-stories-playwright';

const shippingEligibilityExamples = [
  { total: "10", country: "US", eligible: "yes" },
  { total: "10", country: "CA", eligible: "yes" },
  { total: "10", country: "CU", eligible: "no" },
];
for (const row of shippingEligibilityExamples) {
  test(`Shipping eligibility: ${row.country} -> ${row.eligible}`, async ({}, testInfo) => {
    story.init(testInfo);
    story.given(`the cart total is ${row.total}`);
    story.given(`the destination country is "${row.country}"`);
    story.when("shipping eligibility is checked");
    story.then(`shipping should be "${row.eligible}"`);
  });
}
```
