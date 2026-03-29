---
title: Import XML invoice (JUnit 5)
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

## Kotlin code

```kotlin
import dev.executablestories.junit5.Story
import org.junit.jupiter.api.Test

class InvoiceTest {
    @Test
    fun `import xml invoice`() {
        Story.init("Import XML invoice")
        Story.given("the invoice XML is")
        Story.code("Invoice", """
            <invoice>
              <id>INV-100</id>
              <amount>42.50</amount>
              <currency>USD</currency>
            </invoice>
        """.trimIndent(), "xml")
        Story.`when`("the user imports the invoice")
        Story.then("the invoice should be saved")
        Story.then("the invoice total should be 42.50 USD")
    }
}
```
