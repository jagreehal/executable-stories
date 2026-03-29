---
title: Checkout calculates totals (Go)
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

## Go code

```go
import (
    "testing"
    es "github.com/jagreehal/executable-stories/packages/executable-stories-go"
)

func TestCheckoutCalculatesTotals(t *testing.T) {
    s := es.Init(t, "Checkout calculates totals")
    s.Given("the cart has 2 items")
    s.When("the user proceeds to checkout")
    s.Then("the subtotal should be $40.00")
    s.Then("the tax should be $4.00")
    s.Then("the total should be $44.00")
}
```
