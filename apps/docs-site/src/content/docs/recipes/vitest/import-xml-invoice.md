---
title: Import XML invoice (Vitest)
description: DocString (XML) with doc.code
---

## Generated output

```markdown
### ✅ Import XML invoice

- **Given** the invoice XML is
    **Invoice**
    ```xml
    <invoice>
      <id>INV-100</id>
      <amount>42.50</amount>
      <currency>USD</currency>
    </invoice>
    ```
- **When** the user imports the invoice
- **Then** the invoice should be saved
- **And** the invoice total should be 42.50 USD
```

## Vitest code

```typescript
story("Import XML invoice", (s: StepsApi) => {
  s.given("the invoice XML is");
  s.doc.code("Invoice", `<invoice>
  <id>INV-100</id>
  <amount>42.50</amount>
  <currency>USD</currency>
</invoice>`, "xml");
  s.when("the user imports the invoice");
  s.then("the invoice should be saved");
  s.then("the invoice total should be 42.50 USD");
});
```
