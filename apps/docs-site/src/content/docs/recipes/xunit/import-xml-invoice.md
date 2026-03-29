---
title: Import XML invoice (xUnit)
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

## C# code

```csharp
using ExecutableStories.Xunit;
using Xunit;

public class InvoiceTests : IDisposable
{
    [Fact]
    public void ImportXmlInvoice()
    {
        Story.Init("Import XML invoice");
        Story.Given("the invoice XML is");
        Story.Code("Invoice", @"<invoice>
  <id>INV-100</id>
  <amount>42.50</amount>
  <currency>USD</currency>
</invoice>", "xml");
        Story.When("the user imports the invoice");
        Story.Then("the invoice should be saved");
        Story.Then("the invoice total should be 42.50 USD");
    }

    public void Dispose() => Story.RecordAndClear();
}
```
