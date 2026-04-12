---
title: Login blocked for suspended user (Go)
description: Use of But for negative intent
---

## Generated output

```markdown
### ✅ Login blocked for suspended user

- **Given** the user account exists
- **And** the account is suspended
- **When** the user submits valid credentials
- **Then** the user should see an error message
- **But** the user should not be logged in
```

`but()` always renders as "But" (never auto-converted to "And").

## Go code

```go
import (
    "testing"
    es "github.com/jagreehal/executable-stories/packages/executable-stories-go"
)

func TestLoginBlockedSuspendedUser(t *testing.T) {
    s := es.Init(t, "Login blocked for suspended user")
    s.Given("the user account exists")
    s.Given("the account is suspended")
    s.When("the user submits valid credentials")
    s.Then("the user should see an error message")
    s.But("the user should not be logged in")
}
```
