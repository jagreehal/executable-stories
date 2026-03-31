---
name: executable-stories-go
description: Write Given/When/Then story tests for Go with structured report generation. Use when creating BDD-style tests in `testing` or generating user story documentation from Go tests.
version: 0.1.0
libraries: ['go', 'testing']
---

# executable-stories-go

Framework-native story testing for Go. Tests and documentation come from the same `testing` code.

## Quick Start

```go
package cart_test

import (
    "testing"

    es "github.com/jagreehal/executable-stories/packages/executable-stories-go"
)

func TestMain(m *testing.M) {
    es.RunAndReport(m)
}

func TestAppliesDiscountCode(t *testing.T) {
    s := es.Init(t, "Applies discount code",
        es.WithTags("checkout"),
        es.WithTicket("CART-42"), // or es.WithTicketURL("CART-42", "https://jira.example.com/CART-42")
    )

    s.Given("a cart with items totaling $100")
    cart := createCart()

    s.When("a 20% discount code is applied")
    applyDiscount(cart, "SAVE20")

    s.Then("the total is $80")
    if cart.Total != 80 {
        t.Fatalf("expected 80, got %d", cart.Total)
    }
}
```

## API Reference

### es.Init(t, scenario, opts...)

Initialize a story for the current test. Pass the active `*testing.T`.

```go
s := es.Init(t, "Login succeeds",
    es.WithTags("smoke", "auth"),
    es.WithTicket("AUTH-42"),
    es.WithMeta(map[string]any{"priority": "high"}),
)
```

### Step Markers

Step markers are documentation-first. Code stays in normal Go scope.

```go
s.Given("a seeded database")
db := seedDB()

s.When("the service loads the account")
account := loadAccount(db)

s.Then("the account is active")
if !account.Active {
    t.Fatal("expected active account")
}
```

| Method    | Keyword | Purpose            |
| --------- | ------- | ------------------ |
| `Given()` | Given   | Precondition/setup |
| `When()`  | When    | Action             |
| `Then()`  | Then    | Assertion          |
| `And()`   | And     | Continuation       |
| `But()`   | But     | Negative contrast  |

Repeated `Given()`, `When()`, and `Then()` calls in the same story auto-render as `And`. Explicit `And()` and `But()` never auto-convert.

### Step Wrappers

Use wrapped steps when you want timing recorded around the closure.

```go
s.Fn("When", "the profile is fetched", func() {
    profile = fetchProfile("user-123")
})

s.Expect("the profile contains the correct name", func() {
    if profile.Name != "Alice" {
        t.Fatal("wrong name")
    }
})
```

### Step Aliases

```go
s.Arrange("setup")
s.Act("action")
s.Assert("check")

s.Setup("initial state")
s.Context("extra context")
s.Execute("operation")
s.Action("user action")
s.Verify("outcome")
```

### Standalone Doc Methods

Call after a step to attach docs to the current step. Call before any step to attach docs at story level.

```go
s.Given("a valid payment request")
s.JSON("Request payload", map[string]any{"amount": 50, "currency": "USD"})
s.Kv("Gateway", "stripe")

s.When("the payment is submitted")
s.Code("Response", `{ "status": "ok" }`, "json")

s.Then("the order is confirmed")
s.Table("Order summary",
    []string{"Item", "Qty", "Price"},
    [][]string{{"Widget", "2", "$25"}},
)
s.Link("API docs", "https://docs.example.com/payments")
s.Note("Payment processed in sandbox mode")
```

| Method         | Purpose          |
| -------------- | ---------------- |
| `Note()`       | Free text note   |
| `Tag()`        | Tags             |
| `Kv()`         | Key-value pair   |
| `JSON()`       | JSON code block  |
| `Code()`       | Code block       |
| `Table()`      | Table            |
| `Link()`       | Hyperlink        |
| `Section()`    | Markdown section |
| `Mermaid()`    | Mermaid diagram  |
| `Screenshot()` | Screenshot       |
| `Custom()`     | Custom entry     |

### Nested Doc Children

Doc entries can be reused as children of another doc entry. When a child is nested later, it is removed from earlier flat story-level or step-level doc lists and kept only under the parent.

```go
s.Given("the first step")
child := s.Note("shared child")

s.When("the second step")
s.Note("parent note", child)
```

Step markers also accept inline doc entries:

```go
child1 := s.Kv("User", "alice")
child2 := s.Note("note about user")

s.Given("a user exists", child1, child2)
```

## Reporting

`RunAndReport(m)` in `TestMain` writes `.executable-stories/raw-run.json` after the test process completes. Override the output path with `EXECUTABLE_STORIES_OUTPUT`.

## Common Mistakes

### Missing TestMain

Without `RunAndReport`, the tests run but no raw JSON is written.

### Passing nil to Init

`Init` requires a real `*testing.T`.

### Calling methods before Init

Create the story first, then call steps and doc helpers on the returned value.
