---
title: Login works (Go)
description: Story with tags
---

## Generated output

```markdown
### ✅ Login works
Tags: `smoke`, `auth`

- **Given** the user is on the login page
- **When** the user logs in with valid credentials
- **Then** the user should be logged in
```

## Go code

```go
import (
    "testing"
    es "github.com/jagreehal/executable-stories/packages/executable-stories-go"
)

func TestLoginWorks(t *testing.T) {
    s := es.Init(t, "Login works", es.WithTags("smoke", "auth"))
    s.Given("the user is on the login page")
    s.When("the user logs in with valid credentials")
    s.Then("the user should be logged in")
}
```
