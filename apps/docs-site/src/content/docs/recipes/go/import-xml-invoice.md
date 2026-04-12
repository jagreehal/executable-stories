---
title: Import XML invoice (Go)
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

## Go code

```go
import (
    "testing"
    es "github.com/jagreehal/executable-stories/packages/executable-stories-go"
)

func TestImportXMLInvoice(t *testing.T) {
    s := es.Init(t, "Import XML invoice")
    s.Given("the invoice XML is")
    s.Code("Invoice", `<invoice>
  <id>INV-100</id>
  <amount>42.50</amount>
  <currency>USD</currency>
</invoice>`, "xml")
    s.When("the user imports the invoice")
    s.Then("the invoice should be saved")
    s.Then("the invoice total should be 42.50 USD")
}
```
