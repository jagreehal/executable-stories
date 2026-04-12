---
title: Import XML invoice (pytest)
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

## pytest code

```python
from executable_stories import story

def test_import_xml_invoice():
    story.init("Import XML invoice")
    story.given("the invoice XML is")
    story.code("Invoice", """<invoice>
  <id>INV-100</id>
  <amount>42.50</amount>
  <currency>USD</currency>
</invoice>""", lang="xml")
    story.when("the user imports the invoice")
    story.then("the invoice should be saved")
    story.then("the invoice total should be 42.50 USD")
```
