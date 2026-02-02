---
title: Shipping eligibility (Vitest)
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

## Vitest code

```typescript
const shippingEligibilityExamples = [
  { total: "10", country: "US", eligible: "yes" },
  { total: "10", country: "CA", eligible: "yes" },
  { total: "10", country: "CU", eligible: "no" },
];
for (const row of shippingEligibilityExamples) {
  story(`Shipping eligibility: ${row.country} -> ${row.eligible}`, (s: StepsApi) => {
    s.given(`the cart total is ${row.total}`);
    s.given(`the destination country is "${row.country}"`);
    s.when("shipping eligibility is checked");
    s.then(`shipping should be "${row.eligible}"`);
  });
}
```
