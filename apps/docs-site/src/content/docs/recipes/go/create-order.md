---
title: Create order (Go)
description: Background and tags
---

## Generated output

```markdown
### ✅ Create order
Tags: `db`, `smoke`

- **Given** the database is seeded
- **And** the API is running
- **When** the client creates an order
- **Then** the response status should be 201
- **And** the order should exist in the database
```

## Go code

```go
import (
    "testing"
    es "github.com/jagreehal/executable-stories/packages/executable-stories-go"
)

func TestCreateOrder(t *testing.T) {
    s := es.Init(t, "Create order", es.WithTags("db", "smoke"))
    s.Given("the database is seeded")
    s.Given("the API is running")
    s.When("the client creates an order")
    s.Then("the response status should be 201")
    s.Then("the order should exist in the database")
}
```
