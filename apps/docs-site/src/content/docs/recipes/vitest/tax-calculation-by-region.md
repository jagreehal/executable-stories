---
title: Tax calculation by region (Vitest)
description: Scenario outline with multiple rows
---

## Generated output

Example: `Tax calculation by region: CA`

```markdown
### ✅ Tax calculation by region: CA

- **Given** the cart subtotal is 100.00
- **And** the shipping region is "CA"
- **When** taxes are calculated
- **Then** the tax should be 8.25
- **And** the total should be 108.25
```

## Vitest code

```typescript
const taxExamples = [
  { subtotal: "100.00", region: "CA", tax: "8.25", total: "108.25" },
  { subtotal: "100.00", region: "NY", tax: "8.00", total: "108.00" },
];
for (const row of taxExamples) {
  it(`Tax calculation by region: ${row.region}`, ({ task }) => {
    story.init(task);
    story.given(`the cart subtotal is ${row.subtotal}`);
    story.given(`the shipping region is "${row.region}"`);
    story.when("taxes are calculated");
    story.then(`the tax should be ${row.tax}`);
    story.then(`the total should be ${row.total}`);
  });
}
```
