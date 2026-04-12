---
title: Checkout calculates totals (xUnit)
description: Single Given, single When, multiple Then
---

## Generated output

```markdown
### ✅ Checkout calculates totals

- **Given** the cart has 2 items
- **When** the user proceeds to checkout
- **Then** the subtotal should be $40.00
- **And** the tax should be $4.00
- **And** the total should be $44.00
```

## C# code

```csharp
using ExecutableStories.Xunit;
using Xunit;

public class CheckoutTests : IDisposable
{
    [Fact]
    public void CheckoutCalculatesTotals()
    {
        Story.Init("Checkout calculates totals");
        Story.Given("the cart has 2 items");
        Story.When("the user proceeds to checkout");
        Story.Then("the subtotal should be $40.00");
        Story.Then("the tax should be $4.00");
        Story.Then("the total should be $44.00");
    }

    public void Dispose() => Story.RecordAndClear();
}
```
