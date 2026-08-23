---
title: Import XML invoice (Rust)
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

## Rust code

```rust
use executable_stories::Story;

#[test]
fn test_import_xml_invoice() {
    let mut s = Story::new("Import XML invoice");
    s.given("the invoice XML is");
    s.code("Invoice", "<invoice>\n  <id>INV-100</id>\n  <amount>42.50</amount>\n  <currency>USD</currency>\n</invoice>", Some("xml"));
    s.when("the user imports the invoice");
    s.then("the invoice should be saved");
    s.then("the invoice total should be 42.50 USD");
}
```
